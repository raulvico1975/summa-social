import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminDb,
  validateUserMembership,
  verifyIdToken,
  type AuthResult,
  type MembershipValidation,
} from '@/lib/api/admin-sdk';
import { requirePermission } from '@/lib/api/require-permission';
import { getUnifiedFiscalDonationsWithAdmin } from '@/lib/fiscal/getUnifiedFiscalDonations';
import { buildCertificateDonorSummaries } from '@/lib/fiscal/certificate-summaries';
import type { Donor } from '@/lib/data';

interface CertificateSummaryResponse {
  success: boolean;
  code?: string;
  error?: string;
  year?: string;
  donorSummaries?: ReturnType<typeof buildCertificateDonorSummaries>;
  totalReturns?: number;
}

interface CertificateSummaryDeps {
  verifyIdTokenFn: typeof verifyIdToken;
  getAdminDbFn: typeof getAdminDb;
  validateUserMembershipFn: typeof validateUserMembership;
  getUnifiedFiscalDonationsWithAdminFn: typeof getUnifiedFiscalDonationsWithAdmin;
}

function parseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseYear(value: unknown): string | null {
  const year = parseString(value);
  if (!/^\d{4}$/.test(year)) return null;
  const numeric = Number.parseInt(year, 10);
  if (numeric < 2000 || numeric > 2100) return null;
  return year;
}

const defaultDeps: CertificateSummaryDeps = {
  verifyIdTokenFn: verifyIdToken,
  getAdminDbFn: getAdminDb,
  validateUserMembershipFn: validateUserMembership,
  getUnifiedFiscalDonationsWithAdminFn: getUnifiedFiscalDonationsWithAdmin,
};

type DbLike = ReturnType<typeof getAdminDb>;
type DocSnapshotLike = {
  id: string;
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
};
type QuerySnapshotLike = {
  docs: Array<{
    id: string;
    data: () => Record<string, unknown>;
  }>;
};

export async function handleCertificateSummaryPost(
  request: NextRequest,
  deps: CertificateSummaryDeps = defaultDeps
) {
  const auth: AuthResult | null = await deps.verifyIdTokenFn(request);
  if (!auth) {
    return NextResponse.json<CertificateSummaryResponse>(
      { success: false, code: 'UNAUTHORIZED', error: 'No autenticat' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<CertificateSummaryResponse>(
      { success: false, code: 'INVALID_BODY', error: 'Body invàlid' },
      { status: 400 }
    );
  }

  const source = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const organizationId = parseString(source.organizationId);
  const year = parseYear(source.year);
  const donorId = parseString(source.donorId);

  if (!organizationId || !year) {
    return NextResponse.json<CertificateSummaryResponse>(
      { success: false, code: 'INVALID_REQUEST', error: 'organizationId i year són obligatoris' },
      { status: 400 }
    );
  }

  const db = deps.getAdminDbFn();
  const membership: MembershipValidation = await deps.validateUserMembershipFn(db, auth.uid, organizationId);
  const accessError = requirePermission(membership, {
    code: 'FISCAL_CERTIFICATS_GENERAR_REQUIRED',
    check: (permissions) => permissions['fiscal.certificats.generar'],
  });
  if (accessError) {
    return accessError;
  }

  // This endpoint intentionally does not require moviments.read.
  // It authorizes certificate generation and returns only sanitized,
  // certificate-scoped fiscal data. Do not add ledger fields here.
  const contactsRef = (db as DbLike).collection(`organizations/${organizationId}/contacts`);
  const donorsPromise = donorId
    ? (db as DbLike).doc(`organizations/${organizationId}/contacts/${donorId}`).get()
    : contactsRef.where('type', '==', 'donor').get();

  const [donorsResult, fiscalTransactions] = await Promise.all([
    donorsPromise,
    deps.getUnifiedFiscalDonationsWithAdminFn({
      db,
      organizationId,
      filters: {
        dateFrom: `${year}-01-01`,
        dateTo: `${year}-12-31`,
        ...(donorId ? { contactId: donorId } : {}),
      },
    }),
  ]);

  let donors: Donor[];
  if (donorId) {
    const donorSnap = donorsResult as DocSnapshotLike;
    donors = donorSnap.exists && donorSnap.data()?.type === 'donor'
      ? [{
        id: donorSnap.id,
        ...(donorSnap.data() as Omit<Donor, 'id'>),
      } as Donor]
      : [];
  } else {
    const donorsSnapshot = donorsResult as QuerySnapshotLike;
    donors = donorsSnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Donor, 'id'>),
    } as Donor));
  }

  const donorSummaries = buildCertificateDonorSummaries({
    donors,
    fiscalTransactions,
  });

  return NextResponse.json<CertificateSummaryResponse>({
    success: true,
    year,
    donorSummaries,
    totalReturns: donorSummaries.reduce((sum, summary) => sum + summary.returnCount, 0),
  });
}
