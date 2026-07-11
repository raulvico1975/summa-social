#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import {
  ALLOWED_ORG_IDS,
  ORGS,
  QA_ORG,
  REQUIRED_CHECKS,
  addUniqueResource,
  buildReportMarkdown,
  buildScenario,
  chunkItems,
  computeFinalStatus,
  contactNameVariants,
  createEmptyManifest,
  createInitialResult,
  createRunId,
  normalizePermissionProfile,
  normalizeProfile,
  normalizeRunId,
  omitUndefined,
  recordCheck,
  redactSecrets,
  samePermissionProfile,
  validateCleanupResource,
} from './user-standard-core.mjs';

const PROJECT_ID = 'summa-social';
const STORAGE_BUCKET = 'summa-social.firebasestorage.app';
const DEFAULT_BASE_URL = 'https://summasocial.app';
const QA_EMAIL = 'raul@semillasl.com';
const QA_DISPLAY_NAME = 'Raul QA Summa';
const AINOA_EMAIL = 'ainotigm@gmail.com';
const KEYCHAIN_SERVICE = 'summa-social-user-qa';
const RUNS_ROOT = path.join(process.cwd(), 'tmp', 'qa-user');
const INTERNAL_ORG_IDS = ['copilot-validation-org', 'summa-public-blog'];

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const equalIndex = token.indexOf('=');
    if (equalIndex !== -1) {
      options[token.slice(2, equalIndex)] = token.slice(equalIndex + 1);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }
  return { positional, options };
}

function printUsage() {
  console.log(`Us:
  npm run qa:user -- setup [--apply --confirm-production ${QA_ORG.slug}] [--rotate]
  npm run qa:user -- begin [--profile quick|standard] [--run-id ID]
  npm run qa:user -- record --run-id ID --id CHECK --status PASS|FAIL|BLOCKED [--evidence-json JSON]
  npm run qa:user -- audit --run-id ID [--phase active|post-cleanup]
  npm run qa:user -- cleanup --run-id ID
  npm run qa:user -- finish --run-id ID
  npm run qa:user -- credential --copy [--ttl 60]
  npm run qa:user -- dry-run [--profile quick|standard] [--inject-failure CHECK]`);
}

function fail(message, exitCode = 1) {
  console.error(`[qa:user] ERROR: ${message}`);
  process.exitCode = exitCode;
}

function log(message) {
  console.log(`[qa:user] ${message}`);
}

async function readStaticSuperAdminEmails() {
  const sourcePath = path.join(process.cwd(), 'src', 'lib', 'admin', 'superadmin-allowlist.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const block = source.match(/const SUPERADMIN_EMAILS_BASE = \[([\s\S]*?)\] as const;/)?.[1];
  if (!block) throw new Error(`No s'ha pogut llegir la allowlist de ${sourcePath}`);
  return [...block.matchAll(/['"]([^'"]+@[^'"]+)['"]/g)]
    .map((match) => match[1].toLowerCase().trim());
}

function adminServices() {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
      storageBucket: STORAGE_BUCKET,
    });
  }
  return {
    db: getFirestore(),
    auth: getAuth(),
    bucket: getStorage().bucket(STORAGE_BUCKET),
  };
}

function keychainCommand(args, input) {
  return spawnSync('security', args, {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function readKeychainPassword() {
  const result = keychainCommand([
    'find-generic-password',
    '-a', QA_EMAIL,
    '-s', KEYCHAIN_SERVICE,
    '-w',
  ]);
  if (result.status !== 0) return null;
  const password = result.stdout.trim();
  return password || null;
}

function writeKeychainPassword(password) {
  const result = keychainCommand([
    'add-generic-password',
    '-U',
    '-a', QA_EMAIL,
    '-s', KEYCHAIN_SERVICE,
    '-w', password,
  ]);
  if (result.status !== 0) {
    throw new Error('No s\'ha pogut guardar la credencial al Mac Keychain');
  }
}

function generatePassword() {
  const body = crypto.randomBytes(24).toString('base64url');
  return `SsQA!${body}7a`;
}

async function findAuthUser(auth, email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') return null;
    throw error;
  }
}

async function findMemberByEmail(orgRef, email) {
  const snapshot = await orgRef.collection('members').where('email', '==', email).get();
  if (snapshot.empty) return null;
  if (snapshot.size > 1) {
    throw new Error(`Hi ha ${snapshot.size} membres amb email ${email}`);
  }
  return snapshot.docs[0];
}

function clonePermissionFields(memberData) {
  const payload = {
    role: memberData.role,
    capabilities: memberData.capabilities && typeof memberData.capabilities === 'object'
      ? memberData.capabilities
      : {},
  };
  if (memberData.userOverrides?.deny?.length) {
    payload.userOverrides = { deny: [...new Set(memberData.userOverrides.deny)].sort() };
  }
  if (memberData.userGrants?.length) {
    payload.userGrants = [...new Set(memberData.userGrants)].sort();
  }
  return payload;
}

async function inspectSetup({ includeKeychain = true } = {}) {
  const { db, auth } = adminServices();
  const staticSuperAdminEmails = await readStaticSuperAdminEmails();
  const authUser = await findAuthUser(auth, QA_EMAIL);
  const qaUid = authUser?.uid ?? null;
  const barumaRef = db.doc(`organizations/${ORGS.baruma.id}`);
  const ainoaMember = await findMemberByEmail(barumaRef, AINOA_EMAIL);

  const refs = [
    db.doc(`organizations/${QA_ORG.id}`),
    db.doc(`slugs/${QA_ORG.slug}`),
    ...(qaUid ? [
      db.doc(`users/${qaUid}`),
      db.doc(`systemSuperAdmins/${qaUid}`),
      ...ALLOWED_ORG_IDS.map((orgId) => db.doc(`organizations/${orgId}/members/${qaUid}`)),
      ...INTERNAL_ORG_IDS.map((orgId) => db.doc(`organizations/${orgId}/members/${qaUid}`)),
    ] : []),
  ];
  const snapshots = await db.getAll(...refs);
  const byPath = new Map(snapshots.map((snapshot) => [snapshot.ref.path, snapshot]));
  const issues = [];

  if (!authUser) issues.push({ type: 'login', code: 'QA_AUTH_USER_MISSING' });
  if (authUser?.disabled) issues.push({ type: 'login', code: 'QA_AUTH_USER_DISABLED' });
  if (authUser && !authUser.emailVerified) issues.push({ type: 'login', code: 'QA_EMAIL_NOT_VERIFIED' });
  if (includeKeychain && !readKeychainPassword()) issues.push({ type: 'login', code: 'QA_KEYCHAIN_MISSING' });
  const allowlistedSuperAdmin = staticSuperAdminEmails.includes(QA_EMAIL.toLowerCase());
  if (allowlistedSuperAdmin) issues.push({ type: 'environment', code: 'QA_EMAIL_IN_SUPERADMIN_ALLOWLIST' });

  const qaOrgSnap = byPath.get(`organizations/${QA_ORG.id}`);
  const qaOrg = qaOrgSnap?.exists ? qaOrgSnap.data() : null;
  if (!qaOrg) issues.push({ type: 'environment', code: 'QA_ORG_MISSING' });
  if (qaOrg && qaOrg.slug !== QA_ORG.slug) issues.push({ type: 'environment', code: 'QA_ORG_SLUG_MISMATCH' });
  if (qaOrg && qaOrg.features?.projectModule !== true) issues.push({ type: 'environment', code: 'QA_PROJECT_MODULE_DISABLED' });
  if (qaOrg && qaOrg.features?.pendingDocs !== true) issues.push({ type: 'environment', code: 'QA_PENDING_DOCS_DISABLED' });

  const slugSnap = byPath.get(`slugs/${QA_ORG.slug}`);
  if (!slugSnap?.exists || slugSnap.data()?.orgId !== QA_ORG.id) {
    issues.push({ type: 'environment', code: 'QA_SLUG_INDEX_INVALID' });
  }

  let profile = null;
  let superAdmin = false;
  const memberships = [];
  const internalMemberships = [];
  let ainoaPermissions = null;
  if (qaUid) {
    const profileSnap = byPath.get(`users/${qaUid}`);
    profile = profileSnap?.exists ? profileSnap.data() : null;
    if (!profile) issues.push({ type: 'environment', code: 'QA_PROFILE_MISSING' });
    const superAdminSnap = byPath.get(`systemSuperAdmins/${qaUid}`);
    superAdmin = Boolean(superAdminSnap?.exists);
    if (superAdmin) issues.push({ type: 'environment', code: 'QA_IS_SUPERADMIN' });

    for (const org of Object.values(ORGS)) {
      const memberSnap = byPath.get(`organizations/${org.id}/members/${qaUid}`);
      const memberData = memberSnap?.exists ? memberSnap.data() : null;
      memberships.push({
        orgId: org.id,
        slug: org.slug,
        exists: Boolean(memberData),
        permissions: memberData ? normalizePermissionProfile(memberData) : null,
      });
      if (!memberData) issues.push({ type: 'environment', code: `QA_MEMBERSHIP_MISSING:${org.slug}` });
      if (memberData?.role !== 'admin') issues.push({ type: 'environment', code: `QA_ROLE_NOT_ADMIN:${org.slug}` });
    }

    for (const orgId of INTERNAL_ORG_IDS) {
      const memberSnap = byPath.get(`organizations/${orgId}/members/${qaUid}`);
      if (memberSnap?.exists) {
        internalMemberships.push(orgId);
        issues.push({ type: 'environment', code: `QA_INTERNAL_MEMBERSHIP:${orgId}` });
      }
    }

    if (!ainoaMember) {
      issues.push({ type: 'environment', code: 'AINOA_MEMBERSHIP_MISSING' });
    } else {
      ainoaPermissions = normalizePermissionProfile(ainoaMember.data());
      const barumaMembership = memberships.find((item) => item.orgId === ORGS.baruma.id);
      const barumaSnap = byPath.get(`organizations/${ORGS.baruma.id}/members/${qaUid}`);
      if (!barumaMembership?.exists || !samePermissionProfile(barumaSnap?.data(), ainoaMember.data())) {
        issues.push({ type: 'environment', code: 'BARUMA_AINOA_PERMISSION_DRIFT' });
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    account: authUser ? {
      uid: authUser.uid,
      email: authUser.email,
      disabled: authUser.disabled,
      emailVerified: authUser.emailVerified,
      displayName: authUser.displayName ?? null,
      keychainPresent: includeKeychain ? Boolean(readKeychainPassword()) : null,
      superAdmin,
      allowlistedSuperAdmin,
    } : null,
    profile,
    qaOrg: qaOrg ? {
      id: QA_ORG.id,
      name: qaOrg.name ?? null,
      slug: qaOrg.slug ?? null,
      language: qaOrg.language ?? null,
      features: qaOrg.features ?? null,
    } : null,
    memberships,
    internalMemberships,
    ainoaPermissions,
  };
}

async function setup(options) {
  const apply = options.apply === true;
  const rotate = options.rotate === true;
  const before = await inspectSetup({ includeKeychain: true });
  const planned = {
    mode: apply ? 'APPLY' : 'DRY_RUN',
    account: QA_EMAIL,
    removeSuperAdmin: before.account?.superAdmin === true,
    verifyEmail: before.account?.emailVerified !== true,
    createOrRepairProfile: true,
    memberships: Object.values(ORGS).map((org) => ({ orgId: org.id, slug: org.slug, role: 'admin' })),
    createOrRepairQaOrg: QA_ORG,
    rotateCredential: rotate || !before.account?.keychainPresent,
  };

  if (!apply) {
    console.log(JSON.stringify(redactSecrets({ before, planned }), null, 2));
    log(`Dry-run complet. Per aplicar: npm run qa:user -- setup --apply --confirm-production ${QA_ORG.slug}`);
    return;
  }

  if (options['confirm-production'] !== QA_ORG.slug) {
    throw new Error(`Falta --confirm-production ${QA_ORG.slug}`);
  }

  const { db, auth } = adminServices();
  const now = new Date().toISOString();
  let authUser = await findAuthUser(auth, QA_EMAIL);
  let password = readKeychainPassword();
  const shouldRotate = rotate || !password;
  if (shouldRotate) password = generatePassword();

  if (!authUser) {
    authUser = await auth.createUser({
      email: QA_EMAIL,
      password,
      emailVerified: true,
      disabled: false,
      displayName: QA_DISPLAY_NAME,
    });
  } else {
    const patch = {
      emailVerified: true,
      disabled: false,
      displayName: QA_DISPLAY_NAME,
    };
    if (shouldRotate) patch.password = password;
    authUser = await auth.updateUser(authUser.uid, patch);
  }
  if (shouldRotate) writeKeychainPassword(password);
  password = null;

  const qaUid = authUser.uid;
  const barumaRef = db.doc(`organizations/${ORGS.baruma.id}`);
  const ainoaMember = await findMemberByEmail(barumaRef, AINOA_EMAIL);
  if (!ainoaMember || ainoaMember.data().role !== 'admin') {
    throw new Error('No es pot copiar el perfil Ainoa: membre admin no trobat a Baruma');
  }

  const [qaOrgSnap, slugSnap, profileSnap, ...memberSnaps] = await Promise.all([
    db.doc(`organizations/${QA_ORG.id}`).get(),
    db.doc(`slugs/${QA_ORG.slug}`).get(),
    db.doc(`users/${qaUid}`).get(),
    ...Object.values(ORGS).map((org) => db.doc(`organizations/${org.id}/members/${qaUid}`).get()),
  ]);
  if (slugSnap.exists && slugSnap.data()?.orgId !== QA_ORG.id) {
    throw new Error(`El slug ${QA_ORG.slug} ja pertany a una altra organitzacio`);
  }
  if (qaOrgSnap.exists && qaOrgSnap.data()?.slug !== QA_ORG.slug) {
    throw new Error(`El document ${QA_ORG.id} ja existeix amb un altre slug`);
  }

  const batch = db.batch();
  const qaOrgData = omitUndefined({
    id: QA_ORG.id,
    name: QA_ORG.name,
    slug: QA_ORG.slug,
    taxId: 'QA-NO-REAL',
    status: 'active',
    createdAt: qaOrgSnap.exists ? qaOrgSnap.data()?.createdAt ?? now : now,
    createdBy: qaOrgSnap.exists ? qaOrgSnap.data()?.createdBy ?? qaUid : qaUid,
    language: 'ca',
    features: {
      ...(qaOrgSnap.exists ? qaOrgSnap.data()?.features ?? {} : {}),
      projectModule: true,
      pendingDocs: true,
    },
    updatedAt: now,
  });
  batch.set(db.doc(`organizations/${QA_ORG.id}`), qaOrgData, { merge: true });
  batch.set(db.doc(`slugs/${QA_ORG.slug}`), {
    orgId: QA_ORG.id,
    orgName: QA_ORG.name,
    createdAt: slugSnap.exists ? slugSnap.data()?.createdAt ?? now : now,
  }, { merge: true });
  batch.delete(db.doc(`systemSuperAdmins/${qaUid}`));
  batch.set(db.doc(`users/${qaUid}`), omitUndefined({
    ...(profileSnap.exists ? profileSnap.data() : {}),
    organizationId: ORGS.baruma.id,
    organizations: Object.values(ORGS).map((org) => org.id),
    role: 'admin',
    displayName: QA_DISPLAY_NAME,
    email: QA_EMAIL,
  }), { merge: false });

  const ainoaPermissions = clonePermissionFields(ainoaMember.data());
  Object.values(ORGS).forEach((org, index) => {
    const previous = memberSnaps[index];
    const permissionFields = org.id === ORGS.baruma.id
      ? ainoaPermissions
      : { role: 'admin', capabilities: {} };
    batch.set(db.doc(`organizations/${org.id}/members/${qaUid}`), omitUndefined({
      userId: qaUid,
      email: QA_EMAIL,
      displayName: QA_DISPLAY_NAME,
      joinedAt: previous.exists ? previous.data()?.joinedAt ?? now : now,
      ...permissionFields,
    }), { merge: false });
  });

  await batch.commit();
  const after = await inspectSetup({ includeKeychain: true });
  if (!after.ok) {
    throw new Error(`Setup aplicat pero el preflight encara falla: ${after.issues.map((issue) => issue.code).join(', ')}`);
  }
  console.log(JSON.stringify(redactSecrets({ planned, after }), null, 2));
  log('Setup real complet i verificat. La credencial no s\'ha mostrat.');
}

async function fetchRevision(baseUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/version`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (typeof body.revision !== 'string' || !body.revision.trim()) {
      throw new Error('Resposta sense revision');
    }
    return body.revision.trim();
  } finally {
    clearTimeout(timer);
  }
}

function buildPdf(text) {
  const escaped = text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  const stream = `BT\n/F1 14 Tf\n72 720 Td\n(${escaped}) Tj\nET\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
  ];
  let pdf = '%PDF-1.4\n%QA\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'binary');
}

function csvEscape(value) {
  const raw = String(value);
  return /[;"\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

async function writeFixtures(runDir, scenario) {
  const fixturesDir = path.join(runDir, 'fixtures');
  await fs.mkdir(fixturesDir, { recursive: true });
  const header = ['Data operacio', 'Data valor', 'Concepte', 'Import', 'Saldo'];
  let balance = 2000;
  const rows = scenario.bankTransactions.map((transaction) => {
    balance += transaction.amount;
    return [scenario.date, scenario.date, transaction.description, transaction.amount, balance];
  });
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n') + '\n';
  await fs.writeFile(path.join(fixturesDir, scenario.bankFileName), csv, 'utf8');

  for (const fileName of scenario.transactionDocumentFileNames) {
    await fs.writeFile(path.join(fixturesDir, fileName), buildPdf(`${scenario.marker} moviment bancari`));
  }
  await fs.writeFile(
    path.join(fixturesDir, scenario.pendingDocumentFileName),
    buildPdf(`${scenario.marker} document pendent`)
  );
}

function buildRunInstructions(profile, scenario) {
  const lines = [
    `# Execucio ${scenario.marker}`,
    '',
    `Perfil: ${profile}`,
    '',
    '## Regles',
    '',
    '- Fer totes les accions visibles amb el Navegador.',
    '- No editar cap registre que no contingui el marcador del run.',
    '- Despres de cada desat, recarregar i tornar a cercar el registre.',
    '- Qualsevol HTTP 500, permission-denied o toast destructiu fa fallar el check.',
    '- Guardar captures nomes amb la cerca del marcador activa.',
    '',
    '## Fixtures',
    '',
    `- Categoria: ${scenario.category}`,
    `- Invitacio: ${scenario.invitationEmail}`,
    `- Compte bancari: ${scenario.bankAccountName}`,
    `- CSV: fixtures/${scenario.bankFileName}`,
    `- Documents moviment: ${scenario.transactionDocumentFileNames.map((name) => `fixtures/${name}`).join(', ')}`,
    `- Document pendent: fixtures/${scenario.pendingDocumentFileName}`,
    `- Projecte: ${scenario.projectName} (${scenario.projectCode})`,
    `- Despesa off-bank: ${scenario.offBankConcept}`,
    '',
    '## Contactes per organitzacio',
    '',
  ];
  for (const [slug, contacts] of Object.entries(scenario.contacts)) {
    lines.push(`- ${slug}: ${contacts.supplier}; ${contacts.employee}; ${contacts.donor}`);
  }
  lines.push(
    '',
    '## Valors esperats de projecte',
    '',
    `- Pressupost: ${scenario.expected.projectBudgetEUR} EUR`,
    `- Transferencia: ${scenario.expected.eurSent} EUR -> ${scenario.expected.localReceived} ${scenario.expected.localCurrency}`,
    `- Off-bank 50% / 100%: ${scenario.expected.offBankHalfEUR} / ${scenario.expected.offBankFullEUR} EUR`,
    `- Banc 50% / 100%: ${scenario.expected.bankHalfEUR} / ${scenario.expected.bankFullEUR} EUR`,
    `- Execucio final: ${scenario.expected.executedEUR} EUR`,
    '',
    '## Tancament obligatori',
    '',
    `1. npm run qa:user -- audit --run-id ${scenario.marker} --phase active`,
    `2. npm run qa:user -- cleanup --run-id ${scenario.marker}`,
    `3. npm run qa:user -- audit --run-id ${scenario.marker} --phase post-cleanup`,
    `4. npm run qa:user -- finish --run-id ${scenario.marker}`,
    ''
  );
  return `${lines.join('\n')}\n`;
}

function runDirFor(runId) {
  return path.join(RUNS_ROOT, normalizeRunId(runId));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(redactSecrets(omitUndefined(value)), null, 2)}\n`, 'utf8');
}

async function saveRun(runDir, manifest, result) {
  await writeJson(path.join(runDir, 'manifest.json'), manifest);
  await writeJson(path.join(runDir, 'result.json'), result);
  await fs.writeFile(path.join(runDir, 'report.md'), buildReportMarkdown(result), 'utf8');
}

async function loadRun(runId) {
  const runDir = runDirFor(runId);
  const [manifest, result] = await Promise.all([
    readJson(path.join(runDir, 'manifest.json')),
    readJson(path.join(runDir, 'result.json')),
  ]);
  return { runDir, manifest, result };
}

async function begin(options) {
  const profile = normalizeProfile(options.profile ?? 'standard');
  const runId = options['run-id'] ? normalizeRunId(options['run-id']) : createRunId();
  const baseUrl = String(options['base-url'] ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const runDir = runDirFor(runId);
  try {
    await fs.access(runDir);
    throw new Error(`El run ja existeix: ${runId}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await fs.mkdir(path.join(runDir, 'screenshots'), { recursive: true });
  await fs.mkdir(path.join(runDir, 'downloads'), { recursive: true });
  await fs.writeFile(path.join(runDir, 'browser.jsonl'), '', 'utf8');

  let revision = null;
  let revisionError = null;
  try {
    revision = await fetchRevision(baseUrl);
  } catch (error) {
    revisionError = error instanceof Error ? error.message : String(error);
  }
  const setupState = await inspectSetup({ includeKeychain: true });
  const blocker = setupState.issues.some((issue) => issue.type === 'login')
    ? 'login'
    : setupState.issues.length > 0 || revisionError
      ? 'environment'
      : null;
  const startedAt = new Date().toISOString();
  const scenario = buildScenario(runId, new Date(startedAt));
  const preflight = {
    blocker,
    revision: { ok: Boolean(revision), revision, error: revisionError },
    setup: setupState,
  };
  const manifest = createEmptyManifest({
    runId,
    profile,
    baseUrl,
    revision,
    startedAt,
    scenario,
  });
  const result = createInitialResult({ runId, profile, baseUrl, revision, startedAt, preflight });
  recordCheck(result, {
    id: 'preflight.revision',
    status: revision ? 'PASS' : 'BLOCKED',
    evidence: revision ? { revision } : null,
    error: revisionError,
  });
  const accountIssues = setupState.issues.filter((issue) => issue.type === 'login');
  recordCheck(result, {
    id: 'preflight.account',
    status: accountIssues.length === 0 ? 'PASS' : 'BLOCKED',
    evidence: setupState.account,
    error: accountIssues,
  });
  const permissionIssues = setupState.issues.filter((issue) => issue.type !== 'login');
  recordCheck(result, {
    id: 'preflight.permissions',
    status: permissionIssues.length === 0 ? 'PASS' : 'BLOCKED',
    evidence: {
      memberships: setupState.memberships,
      ainoaPermissions: setupState.ainoaPermissions,
      internalMemberships: setupState.internalMemberships,
    },
    error: permissionIssues,
  });
  if (blocker === 'login') result.status = 'BLOCKED_LOGIN';
  if (blocker === 'environment') result.status = 'BLOCKED_ENV';

  await writeFixtures(runDir, scenario);
  await fs.writeFile(path.join(runDir, 'instructions.md'), buildRunInstructions(profile, scenario), 'utf8');
  await saveRun(runDir, manifest, result);
  console.log(JSON.stringify(redactSecrets({
    runId,
    profile,
    status: result.status,
    revision,
    runDir,
    fixtures: path.join(runDir, 'fixtures'),
    issues: setupState.issues,
  }), null, 2));
  if (blocker) process.exitCode = 2;
}

async function appendBrowserEvent(runDir, event) {
  await fs.appendFile(
    path.join(runDir, 'browser.jsonl'),
    `${JSON.stringify(redactSecrets({ at: new Date().toISOString(), ...event }))}\n`,
    'utf8'
  );
}

async function record(options) {
  const runId = normalizeRunId(options['run-id']);
  const checkId = String(options.id ?? '').trim();
  const status = String(options.status ?? '').toUpperCase();
  let evidence = null;
  if (options['evidence-json']) evidence = JSON.parse(String(options['evidence-json']));
  const { runDir, manifest, result } = await loadRun(runId);
  const recorded = recordCheck(result, {
    id: checkId,
    status,
    evidence,
    error: options.error ? String(options.error) : null,
  });
  if (!['BLOCKED_LOGIN', 'BLOCKED_ENV'].includes(result.status)) result.status = 'RUNNING';
  await appendBrowserEvent(runDir, { type: 'check', ...recorded });
  await saveRun(runDir, manifest, result);
  console.log(JSON.stringify(recorded, null, 2));
}

function addFirestore(manifest, docRef, extra = {}) {
  addUniqueResource(manifest, 'firestore', {
    path: docRef.path,
    discoveredByExactFixture: true,
    ...extra,
  });
}

function addStorage(manifest, storagePath) {
  if (!storagePath || typeof storagePath !== 'string') return;
  addUniqueResource(manifest, 'storage', { path: storagePath });
}

async function discoverQuery(manifest, query, extra = {}) {
  const snapshot = await query.get();
  for (const docSnap of snapshot.docs) addFirestore(manifest, docSnap.ref, extra);
  return snapshot.docs;
}

async function discoverResources(manifest) {
  const { db, auth, bucket } = adminServices();
  const scenario = manifest.scenario;

  for (const org of Object.values(ORGS)) {
    const names = scenario.contacts[org.slug];
    if (names) {
      for (const name of Object.values(names)) {
        for (const variant of contactNameVariants(name)) {
          await discoverQuery(
            manifest,
            db.collection(`organizations/${org.id}/contacts`).where('name', '==', variant)
          );
        }
      }
    }
    if (org.id === ORGS.baruma.id || org.id === QA_ORG.id) {
      await discoverQuery(
        manifest,
        db.collection(`organizations/${org.id}/categories`).where('name', '==', scenario.category)
      );
    }
  }

  const invitationDocs = await discoverQuery(
    manifest,
    db.collection('invitations').where('email', '==', scenario.invitationEmail),
    { temporary: true }
  );
  for (const invitationDoc of invitationDocs) {
    const invitationData = invitationDoc.data();
    if (invitationData.userId) {
      const memberRef = db.doc(`organizations/${invitationData.organizationId}/members/${invitationData.userId}`);
      const memberSnap = await memberRef.get();
      if (memberSnap.exists) addFirestore(manifest, memberRef, { temporary: true });
      const userRef = db.doc(`users/${invitationData.userId}`);
      const userSnap = await userRef.get();
      if (userSnap.exists) addFirestore(manifest, userRef, { temporary: true });
    }
  }

  const tempUser = await findAuthUser(auth, scenario.invitationEmail);
  if (tempUser) {
    addUniqueResource(manifest, 'auth', {
      uid: tempUser.uid,
      email: scenario.invitationEmail,
      temporary: true,
    });
    const userRef = db.doc(`users/${tempUser.uid}`);
    if ((await userRef.get()).exists) addFirestore(manifest, userRef, { temporary: true });
    for (const orgId of ALLOWED_ORG_IDS) {
      const memberRef = db.doc(`organizations/${orgId}/members/${tempUser.uid}`);
      if ((await memberRef.get()).exists) addFirestore(manifest, memberRef, { temporary: true });
    }
  }

  const qaBase = `organizations/${QA_ORG.id}`;
  await discoverQuery(
    manifest,
    db.collection(`${qaBase}/bankAccounts`).where('name', '==', scenario.bankAccountName)
  );

  const transactionDocs = [];
  for (const transaction of scenario.bankTransactions) {
    const docs = await discoverQuery(
      manifest,
      db.collection(`${qaBase}/transactions`).where('description', '==', transaction.description)
    );
    transactionDocs.push(...docs);
  }
  for (const transactionDoc of transactionDocs) {
    const documents = await transactionDoc.ref.collection('documents').get();
    for (const documentDoc of documents.docs) {
      addFirestore(manifest, documentDoc.ref);
      addStorage(manifest, documentDoc.data()?.storagePath);
    }
  }

  const pendingSnapshot = await db.collection(`${qaBase}/pendingDocuments`).get();
  for (const pendingDoc of pendingSnapshot.docs) {
    if (pendingDoc.data()?.file?.filename !== scenario.pendingDocumentFileName) continue;
    addFirestore(manifest, pendingDoc.ref);
    addStorage(manifest, pendingDoc.data()?.file?.storagePath);
    addStorage(manifest, pendingDoc.data()?.file?.finalStoragePath);
  }

  const projects = await discoverQuery(
    manifest,
    db.collection(`${qaBase}/projectModule/_/projects`).where('code', '==', scenario.projectCode)
  );
  for (const projectDoc of projects) {
    for (const childCollection of ['budgetLines', 'fxTransfers']) {
      const children = await projectDoc.ref.collection(childCollection).get();
      for (const child of children.docs) addFirestore(manifest, child.ref);
    }
  }

  const offBankDocs = await discoverQuery(
    manifest,
    db.collection(`${qaBase}/projectModule/_/offBankExpenses`).where('concept', '==', scenario.offBankConcept)
  );
  for (const offBankDoc of offBankDocs) {
    const data = offBankDoc.data();
    for (const attachment of data.attachments ?? []) addStorage(manifest, attachment.storagePath);
    if (typeof data.documentStoragePath === 'string') addStorage(manifest, data.documentStoragePath);
    const linkRef = db.doc(`${qaBase}/projectModule/_/expenseLinks/off_${offBankDoc.id}`);
    if ((await linkRef.get()).exists) addFirestore(manifest, linkRef);
  }
  for (const transactionDoc of transactionDocs) {
    const linkRef = db.doc(`${qaBase}/projectModule/_/expenseLinks/${transactionDoc.id}`);
    if ((await linkRef.get()).exists) addFirestore(manifest, linkRef);
  }

  for (const collectionName of ['importRuns', 'importJobs']) {
    await discoverQuery(
      manifest,
      db.collection(`${qaBase}/${collectionName}`).where('fileName', '==', scenario.bankFileName)
    );
  }

  const [files] = await bucket.getFiles({ prefix: `${qaBase}/` });
  for (const file of files) {
    if (file.name.includes(manifest.runId)) addStorage(manifest, file.name);
  }
  return manifest;
}

async function resourcePresence(manifest) {
  const { db, auth, bucket } = adminServices();
  const remaining = { firestore: [], storage: [], auth: [] };
  for (const resource of manifest.resources.firestore) {
    if ((await db.doc(resource.path).get()).exists) remaining.firestore.push(resource.path);
  }
  for (const resource of manifest.resources.storage) {
    const [exists] = await bucket.file(resource.path).exists();
    if (exists) remaining.storage.push(resource.path);
  }
  for (const resource of manifest.resources.auth) {
    try {
      const user = await auth.getUser(resource.uid);
      if (user.email?.toLowerCase() === resource.email?.toLowerCase()) remaining.auth.push(resource.uid);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error;
    }
  }
  return remaining;
}

async function audit(options) {
  const runId = normalizeRunId(options['run-id']);
  const phase = String(options.phase ?? 'active');
  if (!['active', 'post-cleanup'].includes(phase)) throw new Error(`Fase d'auditoria invalida: ${phase}`);
  const { runDir, manifest, result } = await loadRun(runId);
  await discoverResources(manifest);
  const remaining = await resourcePresence(manifest);
  const auditResult = {
    at: new Date().toISOString(),
    phase,
    tracked: {
      firestore: manifest.resources.firestore.length,
      storage: manifest.resources.storage.length,
      auth: manifest.resources.auth.length,
    },
    remaining,
  };
  if (phase === 'post-cleanup') {
    const clean = Object.values(remaining).every((items) => items.length === 0);
    manifest.cleanup.status = clean ? 'PASS' : 'FAIL';
    manifest.cleanup.remaining = remaining;
    result.cleanup = { status: manifest.cleanup.status, remaining };
  }
  await writeJson(path.join(runDir, `audit-${phase}.json`), auditResult);
  await saveRun(runDir, manifest, result);
  console.log(JSON.stringify(auditResult, null, 2));
}

async function deleteTrackedResources(manifest) {
  const { db, auth, bucket } = adminServices();
  for (const resource of manifest.resources.storage) {
    validateCleanupResource(manifest, 'storage', resource);
    try {
      await bucket.file(resource.path).delete({ ignoreNotFound: true });
    } catch (error) {
      if (error?.code !== 404) throw error;
    }
  }

  const firestoreResources = [...manifest.resources.firestore]
    .sort((left, right) => right.path.split('/').length - left.path.split('/').length);
  for (const chunk of chunkItems(firestoreResources, 50)) {
    const batch = db.batch();
    for (const resource of chunk) {
      validateCleanupResource(manifest, 'firestore', resource);
      batch.delete(db.doc(resource.path));
    }
    await batch.commit();
  }

  for (const resource of manifest.resources.auth) {
    validateCleanupResource(manifest, 'auth', resource);
    if (!resource.uid) continue;
    try {
      const user = await auth.getUser(resource.uid);
      if (user.email?.toLowerCase() !== resource.email?.toLowerCase()) {
        throw new Error(`L'email Auth no coincideix per ${resource.uid}`);
      }
      await auth.deleteUser(resource.uid);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error;
    }
  }
}

async function cleanup(options) {
  const runId = normalizeRunId(options['run-id']);
  const { runDir, manifest, result } = await loadRun(runId);
  manifest.cleanup.attemptedAt = new Date().toISOString();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await discoverResources(manifest);
    await deleteTrackedResources(manifest);
    const remaining = await resourcePresence(manifest);
    if (Object.values(remaining).every((items) => items.length === 0)) break;
  }

  await discoverResources(manifest);
  const remaining = await resourcePresence(manifest);
  const clean = Object.values(remaining).every((items) => items.length === 0);
  manifest.cleanup.completedAt = new Date().toISOString();
  manifest.cleanup.status = clean ? 'PASS' : 'FAIL';
  manifest.cleanup.remaining = remaining;
  result.cleanup = { status: manifest.cleanup.status, remaining };
  await saveRun(runDir, manifest, result);
  console.log(JSON.stringify({ runId, cleanup: result.cleanup }, null, 2));
  if (!clean) process.exitCode = 3;
}

async function finish(options) {
  const runId = normalizeRunId(options['run-id']);
  const { runDir, manifest, result } = await loadRun(runId);
  result.finishedAt = new Date().toISOString();
  result.cleanup = {
    status: manifest.cleanup.status,
    remaining: manifest.cleanup.remaining,
  };
  result.status = computeFinalStatus({
    profile: result.profile,
    checks: result.checks,
    cleanup: result.cleanup,
    blocker: result.preflight?.blocker ?? null,
  });
  await saveRun(runDir, manifest, result);
  console.log(JSON.stringify({
    runId,
    status: result.status,
    cleanup: result.cleanup.status,
    report: path.join(runDir, 'report.md'),
  }, null, 2));
  if (result.status !== 'PASS') process.exitCode = 4;
}

async function credential(options) {
  if (options.copy !== true) throw new Error('Usa credential --copy');
  const password = readKeychainPassword();
  if (!password) throw new Error('No hi ha credencial QA al Mac Keychain');
  const copyResult = spawnSync('pbcopy', [], { input: password, encoding: 'utf8' });
  if (copyResult.status !== 0) throw new Error('No s\'ha pogut copiar la credencial');
  const ttl = Math.max(10, Math.min(300, Number.parseInt(String(options.ttl ?? '60'), 10) || 60));
  log(`Credencial copiada temporalment. S'esborrara en ${ttl} segons si no has canviat el porta-retalls.`);
  await new Promise((resolve) => setTimeout(resolve, ttl * 1000));
  const pasteResult = spawnSync('pbpaste', [], { encoding: 'utf8' });
  if (pasteResult.status === 0 && pasteResult.stdout === password) {
    spawnSync('pbcopy', [], { input: '', encoding: 'utf8' });
    log('Porta-retalls netejat.');
  } else {
    log('El porta-retalls havia canviat; no s\'ha modificat.');
  }
}

async function dryRun(options) {
  const profile = normalizeProfile(options.profile ?? 'standard');
  const runId = createRunId();
  const runDir = runDirFor(runId);
  await fs.mkdir(path.join(runDir, 'screenshots'), { recursive: true });
  await fs.mkdir(path.join(runDir, 'downloads'), { recursive: true });
  await fs.writeFile(path.join(runDir, 'browser.jsonl'), '', 'utf8');
  const startedAt = new Date().toISOString();
  const scenario = buildScenario(runId, new Date(startedAt));
  const manifest = createEmptyManifest({
    runId,
    profile,
    baseUrl: 'dry-run://local',
    revision: 'dry-run',
    startedAt,
    scenario,
  });
  manifest.cleanup.status = 'PASS';
  manifest.cleanup.attemptedAt = startedAt;
  manifest.cleanup.completedAt = new Date().toISOString();
  const result = createInitialResult({
    runId,
    profile,
    baseUrl: 'dry-run://local',
    revision: 'dry-run',
    startedAt,
    preflight: { blocker: null, dryRun: true },
  });
  const failure = options['inject-failure'] ? String(options['inject-failure']) : null;
  const required = REQUIRED_CHECKS[profile];
  for (const id of required) {
    recordCheck(result, {
      id,
      status: failure === id ? 'FAIL' : 'PASS',
      evidence: { dryRun: true },
      error: failure === id ? 'Injected failure' : null,
    });
  }
  result.cleanup = { status: 'PASS', remaining: { firestore: [], storage: [], auth: [] } };
  result.finishedAt = new Date().toISOString();
  result.status = computeFinalStatus({ profile, checks: result.checks, cleanup: result.cleanup, blocker: null });
  await writeFixtures(runDir, scenario);
  await fs.writeFile(path.join(runDir, 'instructions.md'), buildRunInstructions(profile, scenario), 'utf8');
  await saveRun(runDir, manifest, result);
  console.log(JSON.stringify({ runId, status: result.status, dryRun: true, runDir }, null, 2));
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];
  if (!command || command === 'help' || options.help === true) {
    printUsage();
    return;
  }
  switch (command) {
    case 'setup':
      await setup(options);
      break;
    case 'begin':
      await begin(options);
      break;
    case 'record':
      await record(options);
      break;
    case 'audit':
      await audit(options);
      break;
    case 'cleanup':
      await cleanup(options);
      break;
    case 'finish':
      await finish(options);
      break;
    case 'credential':
      await credential(options);
      break;
    case 'dry-run':
      await dryRun(options);
      break;
    default:
      printUsage();
      throw new Error(`Comanda desconeguda: ${command}`);
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
