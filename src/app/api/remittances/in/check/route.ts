/**
 * GET /api/remittances/in/check
 *
 * Verifica la consistència d'una remesa IN.
 *
 * Query params:
 * - orgId: ID de l'organització
 * - parentTxId: ID de la transacció pare
 *
 * Retorna:
 * - consistent: boolean
 * - issues: array de problemes detectats
 * - details: informació per debugging
 *
 * @see /docs/plans/noble-zooming-quilt.md per documentació completa
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminMembership,
  type AdminAuthResult,
} from '../../../../../lib/fiscal/remittances/admin-auth';

// =============================================================================
// TIPUS
// =============================================================================

type RemittanceIssue =
  | 'NO_REM_ID'
  | 'NO_REM_DOC'
  | 'COUNT_MISMATCH'
  | 'SUM_MISMATCH'
  | 'HAS_ACTIVE_CHILDREN_BUT_PARENT_NOT_REM'
  | 'PARENT_IS_REM_BUT_NO_ACTIVE_CHILDREN'
  | 'DOC_TXIDS_OUT_OF_SYNC'; // transactionIds[] no coincideix amb filles actives reals

interface RemittanceCheckResponse {
  consistent: boolean;
  remittanceId?: string;
  issues: RemittanceIssue[];
  details?: {
    expectedCount?: number;
    activeCount?: number;
    parentAmountCents?: number;
    childrenSumCents?: number;
    deltaCents?: number;
  };
  error?: string;
  code?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Tolerància per R-SUM-1 (2 cèntims) */
const SUM_TOLERANCE_CENTS = 2;

// =============================================================================
// GET HANDLER
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<RemittanceCheckResponse>> {
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Obtenir query params
    // ─────────────────────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const parentTxId = searchParams.get('parentTxId');

    if (!orgId || !parentTxId) {
      return NextResponse.json(
        {
          consistent: false,
          issues: [],
          error: 'orgId i parentTxId són obligatoris',
          code: 'MISSING_PARAMS',
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Verificar autenticació i permisos admin
    // ─────────────────────────────────────────────────────────────────────────
    const authResult = await verifyAdminMembership(request, orgId);
    if (!authResult.success) {
      return NextResponse.json(
        {
          consistent: false,
          issues: [],
          error: authResult.error,
          code: authResult.code,
        },
        { status: authResult.status }
      );
    }

    const { db } = authResult as AdminAuthResult;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Carregar transacció pare
    // ─────────────────────────────────────────────────────────────────────────
    const parentRef = db.doc(`organizations/${orgId}/transactions/${parentTxId}`);
    const parentSnap = await parentRef.get();

    if (!parentSnap.exists) {
      return NextResponse.json(
        {
          consistent: false,
          issues: [],
          error: 'Transacció pare no trobada',
          code: 'PARENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const parentData = parentSnap.data();
    const parentAmountCents = Math.round(Math.abs(parentData?.amount ?? 0) * 100);
    const isRemittance = parentData?.isRemittance === true;
    const remittanceId = parentData?.remittanceId as string | undefined;
    const expectedCount = parentData?.remittanceItemCount as number | undefined;

    const issues: RemittanceIssue[] = [];
    const details: RemittanceCheckResponse['details'] = {
      parentAmountCents,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Comptar fills actius
    // ─────────────────────────────────────────────────────────────────────────
    const txCollection = db.collection(`organizations/${orgId}/transactions`);
    let activeChildren: FirebaseFirestore.QueryDocumentSnapshot[] = [];

    // Buscar per remittanceId si existeix
    if (remittanceId) {
      const byRemittanceId = await txCollection
        .where('remittanceId', '==', remittanceId)
        .where('archivedAt', '==', null)
        .get();
      activeChildren = byRemittanceId.docs;
    }

    // Fallback: buscar per parentTransactionId
    if (activeChildren.length === 0) {
      const byParentTxId = await txCollection
        .where('parentTransactionId', '==', parentTxId)
        .where('archivedAt', '==', null)
        .get();
      activeChildren = byParentTxId.docs;
    }

    const activeCount = activeChildren.length;
    details.activeCount = activeCount;

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Detectar issues
    // ─────────────────────────────────────────────────────────────────────────

    // Issue: Pare és remesa però no té fills actius
    if (isRemittance && activeCount === 0) {
      issues.push('PARENT_IS_REM_BUT_NO_ACTIVE_CHILDREN');
    }

    // Issue: Pare no és remesa però té fills actius
    if (!isRemittance && activeCount > 0) {
      issues.push('HAS_ACTIVE_CHILDREN_BUT_PARENT_NOT_REM');
    }

    // Issue: Pare és remesa però no té remittanceId
    if (isRemittance && !remittanceId) {
      issues.push('NO_REM_ID');
    }

    // Verificar document de remesa i sincronització de transactionIds
    if (remittanceId) {
      const remittanceRef = db.doc(`organizations/${orgId}/remittances/${remittanceId}`);
      const remittanceSnap = await remittanceRef.get();

      if (!remittanceSnap.exists) {
        issues.push('NO_REM_DOC');
      } else {
        // Issue: DOC_TXIDS_OUT_OF_SYNC - transactionIds[] no coincideix amb filles actives
        const remittanceData = remittanceSnap.data();
        const docTransactionIds = (remittanceData?.transactionIds as string[]) ?? [];
        const activeChildIds = activeChildren.map(doc => doc.id);

        // Comparar sets (no només length)
        const docSet = new Set(docTransactionIds);
        const activeSet = new Set(activeChildIds);
        const setsMatch =
          docSet.size === activeSet.size &&
          [...docSet].every(id => activeSet.has(id));

        if (!setsMatch) {
          issues.push('DOC_TXIDS_OUT_OF_SYNC');
        }
      }
    }

    // Issue: COUNT_MISMATCH
    if (expectedCount !== undefined && expectedCount !== activeCount) {
      issues.push('COUNT_MISMATCH');
      details.expectedCount = expectedCount;
    }

    // Issue: SUM_MISMATCH
    if (activeCount > 0) {
      let childrenSumCents = 0;
      for (const childDoc of activeChildren) {
        const childData = childDoc.data();
        childrenSumCents += Math.round(Math.abs(childData.amount ?? 0) * 100);
      }
      details.childrenSumCents = childrenSumCents;

      const deltaCents = Math.abs(parentAmountCents - childrenSumCents);
      details.deltaCents = deltaCents;

      if (deltaCents > SUM_TOLERANCE_CENTS) {
        issues.push('SUM_MISMATCH');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Retornar resultat
    // ─────────────────────────────────────────────────────────────────────────
    const consistent = issues.length === 0;

    return NextResponse.json({
      consistent,
      remittanceId,
      issues,
      details,
    });

  } catch (error) {
    console.error('[remittances/in/check] Unexpected error:', error);
    return NextResponse.json(
      {
        consistent: false,
        issues: [],
        error: 'Error intern del servidor',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
