/**
 * POST /api/remittances/in/sanitize
 *
 * Saneja una remesa IN amb dades legacy corruptes.
 *
 * NO recrea quotes. Només actualitza metadades i estat perquè
 * el sistema deixi de "mentir" sobre el nombre de filles.
 *
 * Accions possibles:
 * - NOOP: no cal fer res (ja consistent o no aplica)
 * - REBUILT_DOC: reconstruït doc remesa amb filles actives reals
 * - MARKED_UNDONE_LEGACY: marcat com undone_legacy (0 filles actives)
 *
 * @see /docs/plans/generic-bouncing-pumpkin.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
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
import { PARENT_REMITTANCE_FIELDS } from '../../../../../lib/fiscal/remittances/constants';
import { safeSet, safeUpdate, SafeWriteValidationError } from '../../../../../lib/safe-write';

// =============================================================================
// TIPUS
// =============================================================================

interface SanitizeRemittanceRequest {
  orgId: string;
  parentTxId: string;
}

type SanitizeAction = 'NOOP' | 'REBUILT_DOC' | 'MARKED_UNDONE_LEGACY';

interface SanitizeRemittanceResponse {
  success: boolean;
  action: SanitizeAction;
  remittanceId?: string;
  activeCount?: number;
  expectedCount?: number;
  childrenSumCents?: number;
  error?: string;
  code?: string;
}

// =============================================================================
// VALIDACIÓ
// =============================================================================

function validateRequest(body: unknown): {
  valid: true;
  data: SanitizeRemittanceRequest;
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

  return {
    valid: true,
    data: {
      orgId: req.orgId as string,
      parentTxId: req.parentTxId as string,
    },
  };
}

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<SanitizeRemittanceResponse>> {
  let lockState: LockState | null = null;

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Validar request body
    // ─────────────────────────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, action: 'NOOP', error: 'JSON invàlid', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, action: 'NOOP', error: validation.error, code: validation.code },
        { status: 400 }
      );
    }

    const { data } = validation;
    const { orgId, parentTxId } = data;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Verificar autenticació i permisos admin
    // ─────────────────────────────────────────────────────────────────────────
    const authResult = await verifyAdminMembership(request, orgId);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          action: 'NOOP',
          error: authResult.error,
          code: authResult.code,
        },
        { status: authResult.status }
      );
    }

    const { uid, db } = authResult as AdminAuthResult;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Adquirir lock (TTL 5min + heartbeat)
    // ─────────────────────────────────────────────────────────────────────────
    const lockResult = await acquireLockWithHeartbeat(db, orgId, parentTxId, uid, 'remittance_sanitize');

    if (isLockError(lockResult)) {
      return NextResponse.json(
        {
          success: false,
          action: 'NOOP',
          error: lockResult.error,
          code: lockResult.code,
        },
        { status: 409 }
      );
    }

    lockState = lockResult;

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Carregar transacció pare
    // ─────────────────────────────────────────────────────────────────────────
    const parentRef = db.doc(`organizations/${orgId}/transactions/${parentTxId}`);
    const parentSnap = await parentRef.get();

    if (!parentSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          action: 'NOOP',
          error: 'Transacció pare no trobada',
          code: 'PARENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const parentData = parentSnap.data();
    const remittanceId = parentData?.remittanceId as string | undefined;

    // Si no hi ha remittanceId, no podem sanejar
    if (!remittanceId) {
      console.log(`[remittances/in/sanitize] NOOP: pare sense remittanceId (parentTxId: ${parentTxId})`);
      return NextResponse.json({
        success: false,
        action: 'NOOP',
        code: 'NO_REM_ID',
        error: 'La transacció no té remittanceId associat',
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Query filles actives REALS (filtre tolerant per legacy)
    // ─────────────────────────────────────────────────────────────────────────
    // Query només per parentTransactionId i filtrar archivedAt en memòria
    // per evitar problemes amb índexs i valors legacy (null/undefined/"")
    const txCollection = db.collection(`organizations/${orgId}/transactions`);
    const childrenByParentQuery = await txCollection
      .where('parentTransactionId', '==', parentTxId)
      .get();

    // Filtrar en memòria: activa si !archivedAt (tolerant a null/undefined/"")
    const activeChildren = childrenByParentQuery.docs.filter(doc => {
      const data = doc.data();
      return !data.archivedAt;
    });

    const activeCount = activeChildren.length;

    // Sumar imports en cèntims (el camp és `amount` en euros)
    let childrenSumCents = 0;
    for (const childDoc of activeChildren) {
      const childData = childDoc.data();
      const amount = childData.amount;
      if (typeof amount === 'number') {
        childrenSumCents += Math.round(Math.abs(amount) * 100);
      } else {
        console.warn(`[remittances/in/sanitize] Filla ${childDoc.id} sense amount vàlid, ignorada`);
      }
    }

    const activeIds = activeChildren.map(doc => doc.id);

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Carregar doc remesa (pot no existir)
    // ─────────────────────────────────────────────────────────────────────────
    const remittanceRef = db.doc(`organizations/${orgId}/remittances/${remittanceId}`);
    const remittanceSnap = await remittanceRef.get();

    // Obtenir expectedCount del doc remesa o del pare
    let expectedCount = 0;
    let pendingCount = 0;
    if (remittanceSnap.exists) {
      const remittanceData = remittanceSnap.data();
      expectedCount = remittanceData?.transactionIds?.length ?? 0;
      pendingCount = remittanceData?.pendingCount ?? 0;
    } else {
      expectedCount = parentData?.remittanceItemCount ?? 0;
    }

    const now = new Date().toISOString();
    const writeContextBase = {
      updatedBy: uid,
      source: 'user' as const,
      updatedAtFactory: () => FieldValue.serverTimestamp(),
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Decidir acció
    // ─────────────────────────────────────────────────────────────────────────

    if (activeCount > 0) {
      // ═══════════════════════════════════════════════════════════════════════
      // CAS A: REBUILT_DOC — reconstruir document remesa amb filles actives reals
      // ═══════════════════════════════════════════════════════════════════════

      // Determinar status: complete si no hi ha pendents, sinó partial
      const newStatus = pendingCount === 0 ? 'complete' : 'partial';
      const newItemCount = activeCount + pendingCount;

      // Actualitzar document remesa
      await safeSet({
        data: {
          transactionIds: activeIds,
          itemCount: newItemCount,
          resolvedCount: activeCount,
          pendingCount: pendingCount,
          resolvedTotalCents: childrenSumCents,
          status: newStatus,
          sanitizedAt: now,
          sanitizedByUid: uid,
          sanitizedReason: 'DOC_TXIDS_OUT_OF_SYNC',
        },
        context: writeContextBase,
        write: async (payload) => {
          await remittanceRef.set(payload, { merge: true });
        },
      });

      // Actualitzar comptadors del pare
      await safeUpdate({
        data: {
          remittanceItemCount: newItemCount,
          remittanceResolvedCount: activeCount,
          remittancePendingCount: pendingCount,
          remittanceResolvedTotalCents: childrenSumCents,
          remittanceStatus: newStatus,
        },
        context: writeContextBase,
        write: async (payload) => {
          await parentRef.update(payload);
        },
      });

      // Log estructurat
      console.log(JSON.stringify({
        event: 'REMITTANCE_SANITIZE',
        action: 'REBUILT_DOC',
        orgId,
        parentTxId,
        remittanceId,
        activeCount,
        expectedCount,
        childrenSumCents,
        pendingCount,
        uid,
        timestamp: now,
      }));

      return NextResponse.json({
        success: true,
        action: 'REBUILT_DOC',
        remittanceId,
        activeCount,
        expectedCount,
        childrenSumCents,
      });

    } else {
      // ═══════════════════════════════════════════════════════════════════════
      // CAS B: MARKED_UNDONE_LEGACY — cap filla activa, marcar com undone_legacy
      // ═══════════════════════════════════════════════════════════════════════

      // Marcar doc remesa com undone_legacy
      await safeSet({
        data: {
          status: 'undone_legacy',
          sanitizedAt: now,
          sanitizedByUid: uid,
          sanitizedReason: 'NO_ACTIVE_CHILDREN',
        },
        context: writeContextBase,
        write: async (payload) => {
          await remittanceRef.set(payload, { merge: true });
        },
      });

      // Reset camps remesa del pare (com a undo)
      const parentResetFields: Record<string, ReturnType<typeof FieldValue.delete>> = {};
      for (const field of PARENT_REMITTANCE_FIELDS) {
        parentResetFields[field] = FieldValue.delete();
      }
      await safeUpdate({
        data: parentResetFields,
        context: writeContextBase,
        write: async (payload) => {
          await parentRef.update(payload);
        },
      });

      // Log estructurat
      console.log(JSON.stringify({
        event: 'REMITTANCE_SANITIZE',
        action: 'MARKED_UNDONE_LEGACY',
        orgId,
        parentTxId,
        remittanceId,
        activeCount: 0,
        expectedCount,
        uid,
        timestamp: now,
      }));

      return NextResponse.json({
        success: true,
        action: 'MARKED_UNDONE_LEGACY',
        remittanceId,
        activeCount: 0,
        expectedCount,
      });
    }

  } catch (error) {
    if (error instanceof SafeWriteValidationError) {
      return NextResponse.json(
        {
          success: false,
          action: 'NOOP',
          error: error.message,
          code: error.code,
        },
        { status: 400 }
      );
    }

    console.error('[remittances/in/sanitize] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        action: 'NOOP',
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
