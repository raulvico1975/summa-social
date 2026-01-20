/**
 * POST /api/remittances/in/repair
 *
 * Repara una remesa IN corrupta o inconsistent.
 *
 * Repair = PURGA (soft-delete filles existents) + REPROCESS (crear filles noves)
 *
 * Característiques:
 * - NOMÉS soft-delete de filles existents (mai hard-delete)
 * - Idempotent si mateix hash i estat coherent
 * - Suport per remeses legacy (sense doc remittances/)
 * - Locks amb TTL 5min i heartbeat
 * - Invariants BLOQUEJANTS (R-SUM-1, R-COUNT-1)
 *
 * @see /docs/plans/noble-zooming-quilt.md per documentació completa
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, type WriteBatch } from 'firebase-admin/firestore';
import {
  verifyAdminMembership,
  type AdminAuthResult,
} from '../../../../../lib/fiscal/remittances/admin-auth';
import {
  acquireLockWithHeartbeat,
  releaseLock,
  isLockError,
  type LockState,
} from '../../../../../lib/fiscal/remittances/locks';
import { BATCH_SIZE, PARENT_REMITTANCE_FIELDS } from '../../../../../lib/fiscal/remittances/constants';
import {
  getActiveChildTransactionIds,
  softArchiveTransactionsByIds,
  deletePendingItems,
} from '../../../../../lib/fiscal/remittances/children-ops';
import {
  computeInputHashServer,
  assertSumInvariantExact,
  assertCountInvariant,
  sumCents,
  toEuros,
  RemittanceInvariantError,
  type HashableItem,
} from '../../../../../lib/fiscal/remittance-invariants';

// =============================================================================
// TIPUS
// =============================================================================

/** Motiu pel qual un item està pendent */
type RemittancePendingReason =
  | 'NO_TAXID'
  | 'INVALID_DATA'
  | 'NO_MATCH'
  | 'DUPLICATE'
  | 'NO_IBAN_MATCH'
  | 'AMBIGUOUS_IBAN';

interface RepairRemittanceItem {
  contactId: string;
  amountCents: number;
  iban?: string | null;
  name?: string;
  taxId?: string | null;
  sourceRowIndex: number;
}

interface RepairRemittancePendingItem {
  nameRaw: string;
  taxId: string | null;
  iban: string | null;
  amountCents: number;
  reason: RemittancePendingReason;
  sourceRowIndex: number;
  ambiguousDonorIds?: string[];
}

interface RepairRemittanceRequest {
  orgId: string;
  parentTxId: string;
  items: RepairRemittanceItem[];
  pendingItems?: RepairRemittancePendingItem[];
}

interface RepairRemittanceResponse {
  success: boolean;
  idempotent: boolean;
  remittanceId?: string;
  archivedCount?: number;
  createdCount?: number;
  pendingCount?: number;
  error?: string;
  code?: string;
}

// =============================================================================
// VALIDACIÓ
// =============================================================================

function validateRequest(body: unknown): {
  valid: true;
  data: RepairRemittanceRequest;
} | { valid: false; error: string; code: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Body invàlid', code: 'INVALID_BODY' };
  }

  const req = body as Record<string, unknown>;

  if (typeof req.orgId !== 'string' || !req.orgId.trim()) {
    return { valid: false, error: 'orgId obligatori', code: 'MISSING_ORG_ID' };
  }

  if (typeof req.parentTxId !== 'string' || !req.parentTxId.trim()) {
    return { valid: false, error: 'parentTxId obligatori', code: 'MISSING_PARENT_TX_ID' };
  }

  if (!Array.isArray(req.items) || req.items.length === 0) {
    return { valid: false, error: 'items obligatori i no pot ser buit', code: 'MISSING_ITEMS' };
  }

  // Validar cada item
  for (let i = 0; i < req.items.length; i++) {
    const item = req.items[i] as Record<string, unknown>;

    if (typeof item.contactId !== 'string' || !item.contactId.trim()) {
      return {
        valid: false,
        error: `items[${i}].contactId obligatori`,
        code: 'INVALID_ITEM_CONTACT_ID',
      };
    }

    if (typeof item.amountCents !== 'number' || item.amountCents <= 0) {
      return {
        valid: false,
        error: `items[${i}].amountCents ha de ser > 0`,
        code: 'INVALID_ITEM_AMOUNT',
      };
    }

    if (typeof item.sourceRowIndex !== 'number') {
      return {
        valid: false,
        error: `items[${i}].sourceRowIndex obligatori`,
        code: 'MISSING_SOURCE_ROW_INDEX',
      };
    }
  }

  // Validar pendingItems si existeix
  const pendingItems = req.pendingItems as RepairRemittancePendingItem[] | undefined;
  if (pendingItems && Array.isArray(pendingItems)) {
    for (let i = 0; i < pendingItems.length; i++) {
      const pending = pendingItems[i] as unknown as Record<string, unknown>;

      if (typeof pending.amountCents !== 'number' || pending.amountCents <= 0) {
        return {
          valid: false,
          error: `pendingItems[${i}].amountCents ha de ser > 0`,
          code: 'INVALID_PENDING_AMOUNT',
        };
      }

      if (typeof pending.sourceRowIndex !== 'number') {
        return {
          valid: false,
          error: `pendingItems[${i}].sourceRowIndex obligatori`,
          code: 'MISSING_PENDING_SOURCE_ROW_INDEX',
        };
      }
    }
  }

  return {
    valid: true,
    data: {
      orgId: req.orgId as string,
      parentTxId: req.parentTxId as string,
      items: req.items as RepairRemittanceItem[],
      pendingItems: pendingItems,
    },
  };
}

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<RepairRemittanceResponse>> {
  let lockState: LockState | null = null;
  const createdChildIds: string[] = [];

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Validar request body
    // ─────────────────────────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, idempotent: false, error: 'JSON invàlid', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, idempotent: false, error: validation.error, code: validation.code },
        { status: 400 }
      );
    }

    const { data } = validation;
    const { orgId, parentTxId, items, pendingItems } = data;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Verificar autenticació i permisos admin
    // ─────────────────────────────────────────────────────────────────────────
    const authResult = await verifyAdminMembership(request, orgId);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          idempotent: false,
          error: authResult.error,
          code: authResult.code,
        },
        { status: authResult.status }
      );
    }

    const { uid, db } = authResult as AdminAuthResult;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Carregar transacció pare
    // ─────────────────────────────────────────────────────────────────────────
    const parentRef = db.doc(`organizations/${orgId}/transactions/${parentTxId}`);
    const parentSnap = await parentRef.get();

    if (!parentSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          idempotent: false,
          error: 'Transacció pare no trobada',
          code: 'PARENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const parentData = parentSnap.data();
    if (!parentData) {
      return NextResponse.json(
        { success: false, idempotent: false, error: 'Dades del pare buides', code: 'PARENT_EMPTY' },
        { status: 500 }
      );
    }

    // Verificar que és un ingrés (amount > 0)
    if (typeof parentData.amount !== 'number' || parentData.amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          idempotent: false,
          error: 'La transacció pare ha de ser un ingrés (amount > 0)',
          code: 'PARENT_NOT_INCOME',
        },
        { status: 400 }
      );
    }

    const parentAmountCents = Math.round(parentData.amount * 100);

    // Obtenir o crear remittanceId
    let remittanceId: string = parentData.remittanceId as string | '';
    const isLegacy = !remittanceId;

    if (isLegacy) {
      // Crear nou remittanceId per remesa legacy
      remittanceId = db.collection(`organizations/${orgId}/remittances`).doc().id;
      console.log(`[remittances/in/repair] Legacy mode: created new remittanceId=${remittanceId}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Computar inputHash (SHA-256 server-side)
    // ─────────────────────────────────────────────────────────────────────────
    const hashableItems: HashableItem[] = items.map((item) => ({
      contactId: item.contactId,
      amountCents: item.amountCents,
      iban: item.iban,
      taxId: item.taxId,
      sourceRowIndex: item.sourceRowIndex,
    }));

    const inputHash = computeInputHashServer(parentTxId, hashableItems);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Comprovar idempotència + coherència
    // ─────────────────────────────────────────────────────────────────────────
    const remittanceRef = db.doc(`organizations/${orgId}/remittances/${remittanceId}`);
    const remittanceSnap = await remittanceRef.get();

    if (remittanceSnap.exists) {
      const remittanceData = remittanceSnap.data();

      // Si mateix hash i no undone, comprovar coherència
      if (
        remittanceData?.inputHash === inputHash &&
        remittanceData?.status !== 'undone' &&
        remittanceData?.status !== 'repairing'
      ) {
        // Verificar coherència: count filles actives == transactionIds.length
        const transactionIdsFromDoc = (remittanceData.transactionIds as string[]) || [];
        const activeChildIds = await getActiveChildTransactionIds(
          db,
          orgId,
          parentTxId,
          remittanceId,
          transactionIdsFromDoc
        );

        // Si coherent → idempotent
        if (activeChildIds.length === transactionIdsFromDoc.length) {
          console.log(
            `[remittances/in/repair] Idempotent: same hash and coherent (remittanceId: ${remittanceId})`
          );
          return NextResponse.json({
            success: true,
            idempotent: true,
            remittanceId,
            archivedCount: 0,
            createdCount: transactionIdsFromDoc.length,
            pendingCount: remittanceData.pendingCount ?? 0,
          });
        }

        // Si no coherent → continuar amb repair
        console.log(
          `[remittances/in/repair] Inconsistent: hash matches but ` +
            `active=${activeChildIds.length} != doc=${transactionIdsFromDoc.length}. Proceeding with repair.`
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Pre-validar R-SUM-1 (BLOQUEJANT)
    // ─────────────────────────────────────────────────────────────────────────
    const itemsSumCents = sumCents(items);
    const pendingSumCents = pendingItems ? sumCents(pendingItems) : 0;
    const totalSumCents = itemsSumCents + pendingSumCents;

    try {
      // Remeses IN: tolerància 0 (quadrament exacte)
      assertSumInvariantExact(parentAmountCents, totalSumCents);
    } catch (error) {
      if (error instanceof RemittanceInvariantError) {
        console.error(`[remittances/in/repair] R-SUM-1 failed:`, error.details);
        return NextResponse.json(
          {
            success: false,
            idempotent: false,
            error: error.message,
            code: error.code,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Adquirir lock (TTL 5min + heartbeat)
    // ─────────────────────────────────────────────────────────────────────────
    const lockResult = await acquireLockWithHeartbeat(db, orgId, parentTxId, uid, 'remittance_repair');

    if (isLockError(lockResult)) {
      return NextResponse.json(
        {
          success: false,
          idempotent: false,
          error: lockResult.error,
          code: lockResult.code,
        },
        { status: 409 }
      );
    }

    lockState = lockResult;

    // ─────────────────────────────────────────────────────────────────────────
    // 8. PURGA: Soft-delete filles existents
    // ─────────────────────────────────────────────────────────────────────────
    const now = new Date().toISOString();

    // Obtenir filles a purgar
    const transactionIdsFromDoc = remittanceSnap.exists
      ? ((remittanceSnap.data()?.transactionIds as string[]) || [])
      : null;

    const childIdsToArchive = await getActiveChildTransactionIds(
      db,
      orgId,
      parentTxId,
      remittanceId,
      transactionIdsFromDoc
    );

    // Soft-delete de filles
    const archivedCount = await softArchiveTransactionsByIds(
      db,
      orgId,
      childIdsToArchive,
      uid,
      'repair_purge',
      'repair_remittance_in'
    );

    // Eliminar pendents (hard-delete OK)
    if (remittanceSnap.exists) {
      await deletePendingItems(db, orgId, remittanceId);
    }

    // Marcar remesa com a 'repairing'
    if (remittanceSnap.exists) {
      await remittanceRef.update({
        status: 'repairing',
        repairingAt: now,
        repairingByUid: uid,
      });
    }

    // Reset camps del pare (per evitar UI confusa durant repair)
    const parentResetFields: Record<string, ReturnType<typeof FieldValue.delete>> = {};
    for (const field of PARENT_REMITTANCE_FIELDS) {
      parentResetFields[field] = FieldValue.delete();
    }
    await parentRef.update(parentResetFields);

    // ─────────────────────────────────────────────────────────────────────────
    // 9. REPROCESS: Crear filles noves
    // ─────────────────────────────────────────────────────────────────────────
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const chunk = items.slice(i, i + BATCH_SIZE);
      const batch: WriteBatch = db.batch();

      for (const item of chunk) {
        const childRef = db.collection(`organizations/${orgId}/transactions`).doc();
        const childId = childRef.id;
        createdChildIds.push(childId);

        const childDoc = {
          // Identificació
          id: childId,

          // Dades de la transacció
          date: parentData.date,
          description: parentData.description,
          amount: toEuros(item.amountCents),
          category: parentData.category || null,
          document: null,

          // Contacte
          contactId: item.contactId,
          contactType: 'donor' as const,

          // Remesa
          isRemittanceItem: true,
          parentTransactionId: parentTxId,
          remittanceId,
          source: 'remittance' as const,

          // Multicompte
          bankAccountId: parentData.bankAccountId || null,

          // Metadata
          createdAt: now,
          createdByUid: uid,

          // Soft-delete (null = activa)
          archivedAt: null,
        };

        batch.set(childRef, childDoc);
      }

      await batch.commit();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Crear/escriure pendingItems a subcol·lecció
    // ─────────────────────────────────────────────────────────────────────────
    if (pendingItems && pendingItems.length > 0) {
      for (let i = 0; i < pendingItems.length; i += BATCH_SIZE) {
        const chunk = pendingItems.slice(i, i + BATCH_SIZE);
        const batch = db.batch();

        for (const pending of chunk) {
          const pendingRef = db.collection(`organizations/${orgId}/remittances/${remittanceId}/pending`).doc();
          batch.set(pendingRef, {
            id: pendingRef.id,
            nameRaw: pending.nameRaw,
            taxId: pending.taxId,
            iban: pending.iban,
            amountCents: pending.amountCents,
            reason: pending.reason,
            sourceRowIndex: pending.sourceRowIndex,
            ambiguousDonorIds: pending.ambiguousDonorIds || [],
            createdAt: now,
          });
        }

        await batch.commit();
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Actualitzar/crear document de remesa
    // ─────────────────────────────────────────────────────────────────────────
    const pendingCount = pendingItems?.length ?? 0;
    const status = pendingCount === 0 ? 'complete' : 'partial';

    const remittanceDoc = {
      id: remittanceId,
      direction: 'in',
      type: 'donations',

      // Parent
      parentTransactionId: parentTxId,

      // Children
      transactionIds: createdChildIds,

      // Comptadors
      itemCount: items.length + pendingCount,
      resolvedCount: items.length,
      pendingCount: pendingCount,

      // Imports en cèntims
      expectedTotalCents: totalSumCents,
      resolvedTotalCents: itemsSumCents,
      pendingTotalCents: pendingSumCents,

      // Hash i estat
      inputHash,
      status,

      // Audit
      createdAt: remittanceSnap.exists ? (remittanceSnap.data()?.createdAt ?? now) : now,
      createdBy: remittanceSnap.exists ? (remittanceSnap.data()?.createdBy ?? uid) : uid,
      repairedAt: now,
      repairedByUid: uid,
      bankAccountId: parentData.bankAccountId || null,
    };

    await remittanceRef.set(remittanceDoc);

    // ─────────────────────────────────────────────────────────────────────────
    // 12. Actualitzar transacció pare
    // ─────────────────────────────────────────────────────────────────────────
    await parentRef.update({
      isRemittance: true,
      remittanceId,
      remittanceType: 'donations',
      remittanceDirection: 'IN',
      remittanceStatus: status,
      remittanceItemCount: items.length + pendingCount,
      remittanceResolvedCount: items.length,
      remittancePendingCount: pendingCount,
      remittanceExpectedTotalCents: totalSumCents,
      remittanceResolvedTotalCents: itemsSumCents,
      remittancePendingTotalCents: pendingSumCents,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 13. Post-validar R-COUNT-1 (BLOQUEJANT amb rollback si falla)
    // ─────────────────────────────────────────────────────────────────────────
    try {
      assertCountInvariant(createdChildIds, items.length);
    } catch (error) {
      // ROLLBACK: soft-delete de les filles creades
      console.error('[remittances/in/repair] R-COUNT-1 failed, rolling back...');
      await softArchiveTransactionsByIds(
        db,
        orgId,
        createdChildIds,
        uid,
        'rollback_invariant_failure',
        'process_rollback'
      );

      // Marcar remesa com a failed
      await remittanceRef.update({
        status: 'failed',
        failedAt: now,
        failedReason: 'R-COUNT-1 invariant failure',
      });

      // Reset pare
      await parentRef.update(parentResetFields);

      if (error instanceof RemittanceInvariantError) {
        return NextResponse.json(
          {
            success: false,
            idempotent: false,
            error: error.message,
            code: error.code,
          },
          { status: 500 }
        );
      }
      throw error;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 14. Tot OK
    // ─────────────────────────────────────────────────────────────────────────
    console.log(
      `[remittances/in/repair] Success: remittanceId=${remittanceId}, ` +
        `archived=${archivedCount}, created=${items.length}, pending=${pendingCount}`
    );

    return NextResponse.json({
      success: true,
      idempotent: false,
      remittanceId,
      archivedCount,
      createdCount: items.length,
      pendingCount,
    });
  } catch (error) {
    console.error('[remittances/in/repair] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        idempotent: false,
        error: 'Error intern del servidor',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  } finally {
    // Sempre alliberar el lock
    if (lockState) {
      await releaseLock(lockState);
    }
  }
}
