import { NextRequest, NextResponse } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import {
  BATCH_SIZE,
  getAdminDb,
  validateUserMembership,
  verifyIdToken,
} from '@/lib/api/admin-sdk';
import { requireOperationalAccess } from '@/lib/api/require-operational-access';
import type { SepaCollectionRunRecord, SepaCollectionRunRecordIncludedItem } from '@/lib/data';
import { normalizeSepaCollectionRunStatus } from '@/lib/sepa/pain008/run-history';
import {
  belongsToVoidedCollectionRun,
  decideDonorVoidRollback,
  findPreviousActiveSepaRunForContact,
  hasLaterActiveSepaRunForContact,
  type VoidRunCandidate,
  type VoidRunContactState,
} from '@/lib/sepa/pain008/void-run';

interface VoidSepaCollectionRunRequest {
  orgId?: unknown;
  reason?: unknown;
}

interface VoidSepaCollectionRunResponse {
  success: boolean;
  runId?: string;
  restoredCount?: number;
  skippedCount?: number;
  includedCount?: number;
  error?: string;
  code?: string;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asIncludedItems(value: unknown): SepaCollectionRunRecordIncludedItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SepaCollectionRunRecordIncludedItem => {
    if (!item || typeof item !== 'object') return false;
    return typeof (item as { contactId?: unknown }).contactId === 'string';
  });
}

async function resolveLegacySepaPain008CollectionRunId(input: {
  db: Firestore;
  orgId: string;
  sepaPain008LastRunId: string | null | undefined;
}): Promise<string | null> {
  const lastRunId = cleanString(input.sepaPain008LastRunId);
  if (!lastRunId) return null;

  const snap = await input.db
    .doc(`organizations/${input.orgId}/sepaPain008Runs/${lastRunId}`)
    .get();
  if (!snap.exists) return null;

  const data = snap.data() as { collectionRunId?: unknown } | undefined;
  return cleanString(data?.collectionRunId);
}

async function belongsToVoidedCollectionRunFromFirestore(input: {
  db: Firestore;
  orgId: string;
  contact: VoidRunContactState;
  collectionRun: { id: string; collectionDate?: string | null };
  includedContactIds: Set<string>;
}): Promise<boolean> {
  if (!input.includedContactIds.has(input.contact.id)) return false;

  let legacyCollectionRunId: string | null = null;
  if (
    input.contact.sepaPain008LastRunId &&
    input.contact.sepaPain008LastRunId !== input.collectionRun.id
  ) {
    legacyCollectionRunId = await resolveLegacySepaPain008CollectionRunId({
      db: input.db,
      orgId: input.orgId,
      sepaPain008LastRunId: input.contact.sepaPain008LastRunId,
    });
  }

  return belongsToVoidedCollectionRun({
    contact: input.contact,
    collectionRun: input.collectionRun,
    includedContactIds: input.includedContactIds,
    legacyCollectionRunId,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<NextResponse<VoidSepaCollectionRunResponse>> {
  const authResult = await verifyIdToken(request);
  if (!authResult) {
    return NextResponse.json(
      { success: false, error: 'No autenticat', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { runId } = await params;
  if (!runId) {
    return NextResponse.json(
      { success: false, error: 'Run invàlid', code: 'INVALID_PAYLOAD' },
      { status: 400 }
    );
  }

  let body: VoidSepaCollectionRunRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invàlid', code: 'INVALID_PAYLOAD' },
      { status: 400 }
    );
  }

  const orgId = cleanString(body.orgId);
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'orgId és obligatori', code: 'INVALID_PAYLOAD' },
      { status: 400 }
    );
  }

  const reason = cleanString(body.reason);
  const db = getAdminDb();

  try {
    const membership = await validateUserMembership(db, authResult.uid, orgId);
    const accessError = requireOperationalAccess(membership);
    if (accessError) return accessError;

    const runRef = db.doc(`organizations/${orgId}/sepaCollectionRuns/${runId}`);
    const runSnap = await runRef.get();
    if (!runSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Remesa no trobada', code: 'RUN_NOT_FOUND' },
        { status: 404 }
      );
    }

    const runData = runSnap.data() as Partial<SepaCollectionRunRecord>;
    const status = normalizeSepaCollectionRunStatus(runData.status);
    if (status === 'voided') {
      return NextResponse.json(
        { success: false, error: 'Remesa ja anul·lada', code: 'RUN_ALREADY_VOIDED' },
        { status: 409 }
      );
    }

    const included = asIncludedItems(runData.included);
    const includedContactIds = new Set(included.map((item) => item.contactId));
    const allRunsSnap = await db.collection(`organizations/${orgId}/sepaCollectionRuns`).get();
    const allRuns: VoidRunCandidate[] = allRunsSnap.docs.map((doc) => {
      const data = doc.data() as Partial<SepaCollectionRunRecord>;
      return {
        id: doc.id,
        status: data.status ?? null,
        collectionDate: data.collectionDate ?? null,
        exportedAt: data.exportedAt ?? null,
        createdAt: data.createdAt ?? null,
        included: data.included ?? null,
      };
    });

    const contactRefs = included.map((item) =>
      db.doc(`organizations/${orgId}/contacts/${item.contactId}`)
    );
    const contactSnaps = contactRefs.length > 0 ? await db.getAll(...contactRefs) : [];
    const contactsById = new Map<string, VoidRunContactState>();
    contactSnaps.forEach((snap, index) => {
      if (!snap.exists) return;
      const data = snap.data() as Partial<VoidRunContactState>;
      contactsById.set(included[index].contactId, {
        id: included[index].contactId,
        sepaPain008LastRunAt: data.sepaPain008LastRunAt ?? null,
        sepaPain008LastRunId: data.sepaPain008LastRunId ?? null,
      });
    });

    const contactUpdates: Array<{
      contactId: string;
      sepaPain008LastRunAt: string | null;
      sepaPain008LastRunId: string | null;
    }> = [];
    let skippedCount = 0;

    for (const item of included) {
      const contact = contactsById.get(item.contactId);
      if (!contact) {
        skippedCount += 1;
        continue;
      }

      const previousRun = findPreviousActiveSepaRunForContact(
        allRuns,
        item.contactId,
        runId,
        runData.collectionDate
      );
      const hasLaterActiveRun = hasLaterActiveSepaRunForContact(
        allRuns,
        contact,
        runId,
        runData.collectionDate
      );
      const belongsToCurrentRun = await belongsToVoidedCollectionRunFromFirestore({
        db,
        orgId,
        contact,
        collectionRun: { id: runId, collectionDate: runData.collectionDate },
        includedContactIds,
      });
      const decision = decideDonorVoidRollback({
        runId,
        runCollectionDate: runData.collectionDate,
        includedItem: item,
        contact,
        previousRun,
        hasLaterActiveRun,
        belongsToVoidedCollectionRun: belongsToCurrentRun,
      });

      if (decision.action === 'skip') {
        skippedCount += 1;
        continue;
      }

      contactUpdates.push({
        contactId: item.contactId,
        sepaPain008LastRunAt: decision.sepaPain008LastRunAt,
        sepaPain008LastRunId: decision.sepaPain008LastRunId,
      });
    }

    const now = new Date().toISOString();
    for (let i = 0; i < contactUpdates.length; i += BATCH_SIZE) {
      const chunk = contactUpdates.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      for (const update of chunk) {
        batch.update(db.doc(`organizations/${orgId}/contacts/${update.contactId}`), {
          sepaPain008LastRunAt: update.sepaPain008LastRunAt,
          sepaPain008LastRunId: update.sepaPain008LastRunId,
        });
      }
      await batch.commit();
    }

    const finalBatch = db.batch();
    finalBatch.update(runRef, {
      status: 'voided',
      voidedAt: now,
      voidedByUid: authResult.uid,
      voidReason: reason,
      voidRollback: {
        restoredCount: contactUpdates.length,
        skippedCount,
        includedCount: included.length,
        completedAt: now,
      },
    });
    await finalBatch.commit();

    return NextResponse.json({
      success: true,
      runId,
      restoredCount: contactUpdates.length,
      skippedCount,
      includedCount: included.length,
    });
  } catch (error) {
    console.error('[sepa-collection-runs/void] Error anul·lant remesa', error);
    return NextResponse.json(
      { success: false, error: 'Error intern', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
