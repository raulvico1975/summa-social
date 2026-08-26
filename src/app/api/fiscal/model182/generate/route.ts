/**
 * POST /api/fiscal/model182/generate
 *
 * Genera el fitxer Model 182 AEAT server-side amb guard de permís.
 * El servidor llegeix les dades de Firestore i recalcula (server recompute).
 * Retorna AEATExportResult com JSON — el client gestiona el dialog d'exclosos.
 *
 * Guard: verifyIdToken + capabilities['fiscal.model182.generar'] == true (o role admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyIdToken } from '@/lib/api/admin-sdk';
import { generateModel182AEATFile } from '@/lib/model182-aeat';
import { buildModel182Candidates } from '@/lib/model182-aggregation';
import { getUnifiedFiscalDonationsWithAdmin } from '@/lib/fiscal/getUnifiedFiscalDonations';
import {
  checkFiscalReturnReadiness,
  fiscalReturnReadinessError,
} from '@/lib/fiscal/return-fiscal-readiness';
import type { AnyContact, Organization, Transaction } from '@/lib/data';

export type Model182ReadinessTransactionsFn = (
  db: ReturnType<typeof getAdminDb>,
  organizationId: string
) => Promise<Transaction[]>;

export interface Model182Deps {
  verifyIdTokenFn: typeof verifyIdToken;
  getAdminDbFn: typeof getAdminDb;
  getUnifiedFiscalDonationsWithAdminFn: typeof getUnifiedFiscalDonationsWithAdmin;
  getTransactionsForReadinessFn: Model182ReadinessTransactionsFn;
  buildModel182CandidatesFn: typeof buildModel182Candidates;
  generateModel182AEATFileFn: typeof generateModel182AEATFile;
}

async function loadTransactionsForReadiness(
  db: ReturnType<typeof getAdminDb>,
  organizationId: string
): Promise<Transaction[]> {
  const snapshot = await db.collection(`organizations/${organizationId}/transactions`).get();
  return snapshot.docs.map((doc) => ({
    ...(doc.data() as Transaction),
    id: doc.id,
  }));
}

const defaultDeps: Model182Deps = {
  verifyIdTokenFn: verifyIdToken,
  getAdminDbFn: getAdminDb,
  getUnifiedFiscalDonationsWithAdminFn: getUnifiedFiscalDonationsWithAdmin,
  getTransactionsForReadinessFn: loadTransactionsForReadiness,
  buildModel182CandidatesFn: buildModel182Candidates,
  generateModel182AEATFileFn: generateModel182AEATFile,
};

export async function handleModel182Post(
  request: NextRequest,
  deps: Model182Deps = defaultDeps
) {
  const auth = await deps.verifyIdTokenFn(request);
  if (!auth) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: { orgId?: string; year?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { orgId, year } = body;
  if (!orgId || typeof orgId !== 'string') {
    return NextResponse.json({ error: 'MISSING_ORG_ID' }, { status: 400 });
  }
  if (!year || typeof year !== 'number' || !Number.isFinite(year)) {
    return NextResponse.json({ error: 'MISSING_YEAR' }, { status: 400 });
  }

  const db = deps.getAdminDbFn();

  // Guard de permís: llegeix member doc i comprova capabilities.
  const memberSnap = await db.doc(`organizations/${orgId}/members/${auth.uid}`).get();
  if (!memberSnap.exists) {
    return NextResponse.json({ error: 'NOT_MEMBER' }, { status: 403 });
  }
  const memberData = memberSnap.data()!;
  const isAdmin = memberData.role === 'admin';
  const hasPerm = isAdmin || (memberData.capabilities?.['fiscal.model182.generar'] === true);
  if (!hasPerm) {
    return NextResponse.json({ error: 'FORBIDDEN', code: 'MISSING_PERMISSION' }, { status: 403 });
  }

  // Llegir sempre l'estat fiscal cru per no perdre devolucions sense contacte.
  const [orgSnap, contactsSnap, activeTxs, readinessTransactions] = await Promise.all([
    db.doc(`organizations/${orgId}`).get(),
    db.collection(`organizations/${orgId}/contacts`).get(),
    deps.getUnifiedFiscalDonationsWithAdminFn({
      db,
      organizationId: orgId,
    }),
    deps.getTransactionsForReadinessFn(db, orgId),
  ]);

  if (!orgSnap.exists) {
    return NextResponse.json({ error: 'ORG_NOT_FOUND' }, { status: 404 });
  }

  const readiness = checkFiscalReturnReadiness({
    organizationId: orgId,
    year,
    transactions: readinessTransactions,
  });
  if (!readiness.ready) {
    return NextResponse.json(fiscalReturnReadinessError(readiness), { status: 409 });
  }

  const organization = { id: orgId, ...orgSnap.data() } as Organization;
  const contacts = contactsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as AnyContact[];
  const candidates = deps.buildModel182CandidatesFn(activeTxs, contacts, year);
  const result = deps.generateModel182AEATFileFn(organization, candidates, year);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  return handleModel182Post(request);
}
