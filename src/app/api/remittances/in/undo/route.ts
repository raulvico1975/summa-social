/**
 * POST /api/remittances/in/undo
 *
 * Desfà el processament d'una remesa IN de forma atòmica i idempotent.
 *
 * Característiques:
 * - NOMÉS soft-delete de filles (archivedAt, mai hard-delete)
 * - Idempotent: si ja està desfet, retorna success + idempotent=true
 * - Locks amb TTL 5min i heartbeat
 * - Suport per remeses legacy (sense doc remittances/)
 *
 * @see /docs/plans/noble-zooming-quilt.md per documentació completa
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
import { BATCH_SIZE, PARENT_REMITTANCE_FIELDS } from '../../../../../lib/fiscal/remittances/constants';

// =============================================================================
// TIPUS
// =============================================================================

interface UndoRemittanceRequest {
  orgId: string;
  parentTxId: string;
}

interface UndoRemittanceResponse {
  success: boolean;
  idempotent: boolean;
  remittanceId?: string;
  archivedCount?: number;
  pendingDeletedCount?: number;
  error?: string;
  code?: string;
}

// =============================================================================
// VALIDACIÓ
// =============================================================================

function validateRequest(body: unknown): {
  valid: true;
  data: UndoRemittanceRequest;
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

export async function POST(request: NextRequest): Promise<NextResponse<UndoRemittanceResponse>> {
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
    const { orgId, parentTxId } = data;

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

    // Si el pare no té remesa associada → ja està desfet (idempotent)
    if (!parentData?.isRemittance || !parentData?.remittanceId) {
      console.log(`[remittances/in/undo] Idempotent: pare sense remesa (parentTxId: ${parentTxId})`);
      return NextResponse.json({
        success: true,
        idempotent: true,
        archivedCount: 0,
        pendingDeletedCount: 0,
      });
    }

    const remittanceId = parentData.remittanceId as string;

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Carregar document de remesa
    // ─────────────────────────────────────────────────────────────────────────
    const remittanceRef = db.doc(`organizations/${orgId}/remittances/${remittanceId}`);
    const remittanceSnap = await remittanceRef.get();

    let transactionIds: string[] = [];

    if (remittanceSnap.exists) {
      const remittanceData = remittanceSnap.data();

      // Si la remesa ja està desfeta → idempotent
      if (remittanceData?.status === 'undone') {
        console.log(`[remittances/in/undo] Idempotent: remesa ja desfeta (remittanceId: ${remittanceId})`);
        return NextResponse.json({
          success: true,
          idempotent: true,
          remittanceId,
          archivedCount: 0,
          pendingDeletedCount: 0,
        });
      }

      transactionIds = (remittanceData?.transactionIds as string[]) || [];
    } else {
      // Fallback per remeses legacy: query per filles actives
      console.log(`[remittances/in/undo] Legacy mode: buscant filles per parentTransactionId`);

      const childrenQuery = db
        .collection(`organizations/${orgId}/transactions`)
        .where('parentTransactionId', '==', parentTxId)
        .where('archivedAt', '==', null);

      const childrenSnap = await childrenQuery.get();
      transactionIds = childrenSnap.docs.map((doc) => doc.id);

      // Si no hi ha filles actives → ja està desfet (idempotent)
      if (transactionIds.length === 0) {
        console.log(`[remittances/in/undo] Idempotent: cap filla activa (parentTxId: ${parentTxId})`);
        return NextResponse.json({
          success: true,
          idempotent: true,
          remittanceId,
          archivedCount: 0,
          pendingDeletedCount: 0,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Adquirir lock (TTL 5min + heartbeat)
    // ─────────────────────────────────────────────────────────────────────────
    const lockResult = await acquireLockWithHeartbeat(db, orgId, parentTxId, uid, 'remittance_undo');

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
    // 6. Soft-delete de TOTES les filles actives
    // ─────────────────────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    let archivedCount = 0;

    for (let i = 0; i < transactionIds.length; i += BATCH_SIZE) {
      const chunk = transactionIds.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const txId of chunk) {
        const childRef = db.doc(`organizations/${orgId}/transactions/${txId}`);
        batch.update(childRef, {
          archivedAt: now,
          archivedByUid: uid,
          archivedReason: 'undo_remittance',
          archivedFromAction: 'undo_remittance_in',
        });
        archivedCount++;
      }

      await batch.commit();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Eliminar pendents (hard-delete OK, no són fiscals)
    // ─────────────────────────────────────────────────────────────────────────
    let pendingDeletedCount = 0;

    if (remittanceSnap.exists) {
      const pendingRef = db.collection(`organizations/${orgId}/remittances/${remittanceId}/pending`);
      const pendingSnap = await pendingRef.get();

      if (!pendingSnap.empty) {
        for (let i = 0; i < pendingSnap.docs.length; i += BATCH_SIZE) {
          const chunk = pendingSnap.docs.slice(i, i + BATCH_SIZE);
          const batch = db.batch();

          for (const doc of chunk) {
            batch.delete(doc.ref);
            pendingDeletedCount++;
          }

          await batch.commit();
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Marcar remesa com a 'undone'
    // ─────────────────────────────────────────────────────────────────────────
    if (remittanceSnap.exists) {
      await remittanceRef.update({
        status: 'undone',
        undoneAt: now,
        undoneByUid: uid,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Reset camps de remesa del pare
    // ─────────────────────────────────────────────────────────────────────────
    const parentResetFields: Record<string, ReturnType<typeof FieldValue.delete>> = {};
    for (const field of PARENT_REMITTANCE_FIELDS) {
      parentResetFields[field] = FieldValue.delete();
    }

    await parentRef.update(parentResetFields);

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Tot OK
    // ─────────────────────────────────────────────────────────────────────────
    console.log(
      `[remittances/in/undo] Success: remittanceId=${remittanceId}, ` +
        `archived=${archivedCount}, pendingDeleted=${pendingDeletedCount}`
    );

    return NextResponse.json({
      success: true,
      idempotent: false,
      remittanceId,
      archivedCount,
      pendingDeletedCount,
    });
  } catch (error) {
    console.error('[remittances/in/undo] Unexpected error:', error);
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
