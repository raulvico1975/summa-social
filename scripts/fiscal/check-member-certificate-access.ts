import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';
import { handleCertificateSummaryPost } from '@/app/api/fiscal/certificates/summary/handler';
import { getUnifiedFiscalDonationsWithAdmin } from '@/lib/fiscal/getUnifiedFiscalDonations';
import { resolveEffectivePermissions } from '@/lib/permissions';
import type { MembershipValidation } from '@/lib/api/admin-sdk';

interface CliOptions {
  orgId?: string;
  orgSlug?: string;
  uid?: string;
  email?: string;
  donorId?: string;
  year: string;
  json: boolean;
}

interface MemberMatch {
  orgId: string;
  uid: string;
  path: string;
  data: Record<string, unknown>;
}

const FORBIDDEN_RESPONSE_KEYS = new Set([
  'description',
  'note',
  'notes',
  'category',
  'document',
  'bankAccountId',
  'iban',
  'sepaMandate',
  'transactionRealId',
]);

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    year: String(new Date().getFullYear() - 1),
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (!next || next.startsWith('--')) {
      throw new Error(`Falta valor per ${arg}`);
    }
    if (arg === '--orgId') options.orgId = next;
    else if (arg === '--orgSlug') options.orgSlug = next;
    else if (arg === '--uid') options.uid = next;
    else if (arg === '--email') options.email = next.toLowerCase();
    else if (arg === '--donorId') options.donorId = next;
    else if (arg === '--year') options.year = next;
    else throw new Error(`Argument desconegut: ${arg}`);
    index += 1;
  }

  if (!/^\d{4}$/.test(options.year)) {
    throw new Error('--year ha de tenir format YYYY');
  }
  if (!options.uid && !options.email) {
    throw new Error('Cal indicar --uid o --email');
  }
  if (!options.orgId && !options.orgSlug) {
    throw new Error('Cal indicar --orgId o --orgSlug');
  }

  return options;
}

function initDb(): Firestore {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'summa-social';
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${projectId}.firebasestorage.app`;

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
  }

  return getFirestore();
}

async function resolveOrgId(db: Firestore, options: CliOptions): Promise<string> {
  if (options.orgId) return options.orgId;
  const slugSnap = await db.doc(`slugs/${options.orgSlug}`).get();
  const orgId = slugSnap.data()?.orgId;
  if (!slugSnap.exists || typeof orgId !== 'string' || !orgId) {
    throw new Error(`No s'ha trobat orgSlug ${options.orgSlug}`);
  }
  return orgId;
}

async function findMember(db: Firestore, orgId: string, options: CliOptions): Promise<MemberMatch> {
  if (options.uid) {
    const snap = await db.doc(`organizations/${orgId}/members/${options.uid}`).get();
    if (!snap.exists) {
      throw new Error(`No s'ha trobat el membre ${options.uid} a ${orgId}`);
    }
    return {
      orgId,
      uid: options.uid,
      path: snap.ref.path,
      data: snap.data() ?? {},
    };
  }

  const snap = await db
    .collection(`organizations/${orgId}/members`)
    .where('email', '==', options.email)
    .limit(2)
    .get();

  if (snap.empty) {
    throw new Error(`No s'ha trobat cap membre amb email ${options.email} a ${orgId}`);
  }
  if (snap.size > 1) {
    throw new Error(`Hi ha mes d'un membre amb email ${options.email} a ${orgId}`);
  }

  const doc = snap.docs[0];
  return {
    orgId,
    uid: doc.id,
    path: doc.ref.path,
    data: doc.data(),
  };
}

function toMembership(member: MemberMatch): MembershipValidation {
  const role = typeof member.data.role === 'string' ? member.data.role : null;
  const userOverrides =
    member.data.userOverrides && typeof member.data.userOverrides === 'object'
      ? member.data.userOverrides as { deny?: string[] }
      : null;
  const userGrants = Array.isArray(member.data.userGrants)
    ? member.data.userGrants.filter((value): value is string => typeof value === 'string')
    : null;

  return {
    valid: true,
    role: role === 'admin' || role === 'user' || role === 'viewer' ? role : null,
    userOverrides,
    userGrants,
  };
}

function collectForbiddenKeys(value: unknown, path = '$', found = new Set<string>()): Set<string> {
  if (!value || typeof value !== 'object') return found;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectForbiddenKeys(entry, `${path}[${index}]`, found));
    return found;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RESPONSE_KEYS.has(key)) {
      found.add(`${path}.${key}`);
    }
    collectForbiddenKeys(child, `${path}.${key}`, found);
  }
  return found;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const db = initDb();
  const orgId = await resolveOrgId(db, options);
  const member = await findMember(db, orgId, options);
  const membership = toMembership(member);
  const permissions = resolveEffectivePermissions({
    role: membership.role,
    userOverrides: membership.userOverrides,
    userGrants: membership.userGrants,
  });

  const request = new NextRequest('http://localhost/api/fiscal/certificates/summary', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer simulated-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      organizationId: orgId,
      year: options.year,
      ...(options.donorId ? { donorId: options.donorId } : {}),
    }),
  });

  const response = await handleCertificateSummaryPost(request, {
    verifyIdTokenFn: async () => ({
      uid: member.uid,
      email: typeof member.data.email === 'string' ? member.data.email : undefined,
    }),
    getAdminDbFn: () => db,
    validateUserMembershipFn: async () => membership,
    getUnifiedFiscalDonationsWithAdminFn: getUnifiedFiscalDonationsWithAdmin,
  });

  const payload = await response.json();
  const forbiddenKeys = Array.from(collectForbiddenKeys(payload)).sort();
  const report = {
    member: {
      path: member.path,
      uid: member.uid,
      email: member.data.email ?? null,
      displayName: member.data.displayName ?? null,
      role: membership.role,
      userOverrides: membership.userOverrides,
      userGrants: membership.userGrants,
      storedCapabilities: member.data.capabilities ?? null,
    },
    effective: {
      canGenerateCertificates: permissions['fiscal.certificats.generar'],
      canReadMovements: permissions['moviments.read'],
      canAccessMovements: permissions['sections.moviments'] && permissions['moviments.read'],
      canAccessDonors: permissions['sections.donants'],
      canAccessReports: permissions['sections.informes'],
      canSendCertificates: permissions['fiscal.certificats.generar'],
    },
    certificateSummary: {
      status: response.status,
      success: payload.success === true,
      code: payload.code ?? null,
      year: options.year,
      donorId: options.donorId ?? null,
      donorSummaries: Array.isArray(payload.donorSummaries) ? payload.donorSummaries.length : null,
      totalReturns: payload.totalReturns ?? null,
      forbiddenKeys,
    },
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Membre: ${report.member.displayName || report.member.email || report.member.uid}`);
    console.log(`Path: ${report.member.path}`);
    console.log(`Permisos efectius: certificats=${report.effective.canGenerateCertificates ? 'SI' : 'NO'}, moviments.read=${report.effective.canReadMovements ? 'SI' : 'NO'}, donants=${report.effective.canAccessDonors ? 'SI' : 'NO'}, informes=${report.effective.canAccessReports ? 'SI' : 'NO'}`);
    console.log(`API certificats: HTTP ${report.certificateSummary.status}, success=${report.certificateSummary.success ? 'SI' : 'NO'}, donants=${report.certificateSummary.donorSummaries ?? 'n/a'}, retorns=${report.certificateSummary.totalReturns ?? 'n/a'}`);
    console.log(`Camps prohibits al payload: ${forbiddenKeys.length === 0 ? 'CAP' : forbiddenKeys.join(', ')}`);
  }

  if (response.status !== 200 || payload.success !== true || forbiddenKeys.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
