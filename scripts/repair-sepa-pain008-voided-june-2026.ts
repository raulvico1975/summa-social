/**
 * Reparacio puntual per al rollback legacy de la remesa pain.008 de juny 2026.
 *
 * Per defecte nomes calcula el pla (dry-run) i no escriu res.
 *
 * Dry-run:
 *   node --import tsx scripts/repair-sepa-pain008-voided-june-2026.ts --dry-run
 *
 * Aplicacio real, nomes amb autoritzacio explicita:
 *   node --import tsx scripts/repair-sepa-pain008-voided-june-2026.ts --apply --confirm "AUTORITZO REPARAR ELS 209 CONTACTES DE LA REMESA JUNY"
 */

import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import {
  findPreviousActiveSepaRunForContact,
  hasLaterActiveSepaRunForContact,
  type PreviousSepaRun,
  type VoidRunCandidate,
  type VoidRunContactState,
} from '../src/lib/sepa/pain008/void-run';

const ORG_ID = 'PrNPBg7YFnk16f9gXdXw';
const COLLECTION_RUN_ID = 'iiTYIZ3k805LDUrzZkX2';
const COLLECTION_DATE = '2026-06-01';
const LEGACY_PAIN008_RUN_ID = 'xoSygk0yNgLQFxVxTGox';
const CONFIRMATION = 'AUTORITZO REPARAR ELS 209 CONTACTES DE LA REMESA JUNY';
const BATCH_SIZE = 50;

interface IncludedItem {
  contactId: string;
}

interface RepairPlanItem {
  contactId: string;
  action: 'set-null' | 'restore-previous' | 'skip';
  previousRun: PreviousSepaRun | null;
  skipReason: string | null;
}

function getArgValue(name: string): string | null {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1] ?? null;
  return null;
}

function asIncludedItems(value: unknown): IncludedItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is IncludedItem => {
    if (!item || typeof item !== 'object') return false;
    return typeof (item as { contactId?: unknown }).contactId === 'string';
  });
}

function initDb(): Firestore {
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  return getFirestore();
}

async function loadAllCollectionRuns(db: Firestore): Promise<VoidRunCandidate[]> {
  const snap = await db.collection(`organizations/${ORG_ID}/sepaCollectionRuns`).get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      status: typeof data.status === 'string' ? data.status : null,
      collectionDate: typeof data.collectionDate === 'string' ? data.collectionDate : null,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : null,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : null,
      included: asIncludedItems(data.included).map((item) => ({
        contactId: item.contactId,
        amountCents: 0,
        umr: '',
        sequenceType: 'RCUR' as const,
      })),
    };
  });
}

async function buildRepairPlan(db: Firestore): Promise<RepairPlanItem[]> {
  const runRef = db.doc(`organizations/${ORG_ID}/sepaCollectionRuns/${COLLECTION_RUN_ID}`);
  const runSnap = await runRef.get();
  if (!runSnap.exists) {
    throw new Error('COLLECTION_RUN_NOT_FOUND');
  }

  const runData = runSnap.data();
  const included = asIncludedItems(runData?.included);
  const legacySnap = await db
    .doc(`organizations/${ORG_ID}/sepaPain008Runs/${LEGACY_PAIN008_RUN_ID}`)
    .get();
  const legacyData = legacySnap.exists ? legacySnap.data() : null;
  if (legacyData?.collectionRunId !== COLLECTION_RUN_ID) {
    throw new Error('LEGACY_RUN_DOES_NOT_POINT_TO_COLLECTION_RUN');
  }

  const allRuns = await loadAllCollectionRuns(db);
  const plan: RepairPlanItem[] = [];

  for (let i = 0; i < included.length; i += BATCH_SIZE) {
    const chunk = included.slice(i, i + BATCH_SIZE);
    const refs = chunk.map((item) => db.doc(`organizations/${ORG_ID}/contacts/${item.contactId}`));
    const snaps = await db.getAll(...refs);

    snaps.forEach((snap, index) => {
      const contactId = chunk[index].contactId;
      if (!snap.exists) {
        plan.push({ contactId, action: 'skip', previousRun: null, skipReason: 'contact-not-found' });
        return;
      }

      const data = snap.data() as Partial<VoidRunContactState>;
      const contact: VoidRunContactState = {
        id: contactId,
        sepaPain008LastRunAt: data.sepaPain008LastRunAt ?? null,
        sepaPain008LastRunId: data.sepaPain008LastRunId ?? null,
      };

      if (
        contact.sepaPain008LastRunAt !== COLLECTION_DATE ||
        contact.sepaPain008LastRunId !== LEGACY_PAIN008_RUN_ID
      ) {
        plan.push({ contactId, action: 'skip', previousRun: null, skipReason: 'current-fields-do-not-match' });
        return;
      }

      const hasLaterActiveRun = hasLaterActiveSepaRunForContact(
        allRuns,
        contact,
        COLLECTION_RUN_ID,
        COLLECTION_DATE
      );
      if (hasLaterActiveRun) {
        plan.push({ contactId, action: 'skip', previousRun: null, skipReason: 'later-active-run' });
        return;
      }

      const previousRun = findPreviousActiveSepaRunForContact(
        allRuns,
        contactId,
        COLLECTION_RUN_ID,
        COLLECTION_DATE
      );
      plan.push({
        contactId,
        action: previousRun ? 'restore-previous' : 'set-null',
        previousRun,
        skipReason: null,
      });
    });
  }

  return plan;
}

async function applyRepairPlan(db: Firestore, plan: RepairPlanItem[]): Promise<number> {
  const actionable = plan.filter((item) => item.action !== 'skip');
  let applied = 0;

  for (let i = 0; i < actionable.length; i += BATCH_SIZE) {
    const chunk = actionable.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const item of chunk) {
      batch.update(db.doc(`organizations/${ORG_ID}/contacts/${item.contactId}`), {
        sepaPain008LastRunAt: item.previousRun?.collectionDate ?? null,
        sepaPain008LastRunId: item.previousRun?.id ?? null,
      });
    }
    await batch.commit();
    applied += chunk.length;
  }

  return applied;
}

async function main() {
  const isApply = process.argv.includes('--apply');
  const confirmation = getArgValue('--confirm');
  if (isApply && confirmation !== CONFIRMATION) {
    throw new Error('CONFIRMATION_REQUIRED');
  }

  const db = initDb();
  const plan = await buildRepairPlan(db);
  const wouldSetNull = plan.filter((item) => item.action === 'set-null').length;
  const wouldRestorePrevious = plan.filter((item) => item.action === 'restore-previous').length;
  const wouldSkip = plan.filter((item) => item.action === 'skip').length;
  const summary = {
    mode: isApply ? 'apply' : 'dry-run',
    collectionRunId: COLLECTION_RUN_ID,
    legacyPain008RunId: LEGACY_PAIN008_RUN_ID,
    includedCount: plan.length,
    wouldRestore: wouldSetNull + wouldRestorePrevious,
    wouldSetNull,
    wouldRestorePrevious,
    wouldSkip,
    applied: 0,
  };

  if (isApply) {
    summary.applied = await applyRepairPlan(db, plan);
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
  }, null, 2));
  process.exit(1);
});
