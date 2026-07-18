import crypto from 'node:crypto';

export const QA_SCHEMA_VERSION = 1;
export const QA_MARKER_PREFIX = 'QAUSR-';
export const QA_TIME_ZONE = 'Europe/Madrid';
export const FINAL_STATUSES = Object.freeze([
  'PASS',
  'FAIL_FUNCTIONAL',
  'FAIL_CLEANUP',
  'BLOCKED_LOGIN',
  'BLOCKED_ENV',
]);

export const ORGS = Object.freeze({
  baruma: Object.freeze({
    id: 'PrNPBg7YFnk16f9gXdXw',
    slug: 'baruma',
    name: 'Associacio Baruma',
    live: true,
    projectModule: true,
  }),
  flores: Object.freeze({
    id: 'SkQjWvCRDJhSf1OeJAw9',
    slug: 'fundacion-flores-de-kiskeya',
    name: 'Fundacion Flores de Kiskeya',
    live: true,
    projectModule: false,
  }),
  pbi: Object.freeze({
    id: 'VazGdqn2zlAUFfEepWzM',
    slug: 'pbi',
    name: 'Brigadas Internacionales de Paz',
    live: true,
    projectModule: false,
  }),
  qa: Object.freeze({
    id: 'qa-ong-summa',
    slug: 'qa-ong-summa',
    name: '[QA] ONG Summa Social',
    live: false,
    projectModule: true,
  }),
});

export const LIVE_ORGS = Object.freeze([ORGS.baruma, ORGS.flores, ORGS.pbi]);
export const QA_ORG = ORGS.qa;
export const ALLOWED_ORG_IDS = Object.freeze(Object.values(ORGS).map((org) => org.id));

export const REQUIRED_CHECKS = Object.freeze({
  quick: Object.freeze([
    'preflight.revision',
    'preflight.account',
    'preflight.permissions',
    'live.baruma.navigation',
    'live.baruma.contacts',
    'live.baruma.category',
    'live.baruma.invitation',
    'live.flores.navigation',
    'live.flores.contacts',
    'live.pbi.navigation',
    'live.pbi.contacts',
    'permissions.negative',
  ]),
  standard: Object.freeze([
    'preflight.revision',
    'preflight.account',
    'preflight.permissions',
    'live.baruma.navigation',
    'live.baruma.contacts',
    'live.baruma.category',
    'live.baruma.invitation',
    'live.flores.navigation',
    'live.flores.contacts',
    'live.pbi.navigation',
    'live.pbi.contacts',
    'permissions.negative',
    'qa.contacts',
    'qa.bankAccount',
    'qa.bankImport',
    'qa.bankDedupe',
    'qa.transactionClassification',
    'qa.transactionDocuments',
    'qa.pendingDocuments',
    'qa.projectCrud',
    'qa.projectFx',
    'qa.offBankAssignment',
    'qa.bankAssignment',
    'qa.projectDeleteGuard',
    'qa.exports',
    'qa.persistence',
  ]),
});

const REDACTED = '[REDACTED]';
const SECRET_KEY_PATTERN = /(password|secret|token|authorization|credential|private.?key|api.?key)/i;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;

export function normalizeProfile(profile) {
  if (profile === 'quick' || profile === 'standard') return profile;
  throw new Error(`Perfil QA invalid: ${profile}`);
}

export function normalizeRunId(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!/^QAUSR-[0-9]{8}-[0-9]{6}-[A-F0-9]{6}$/.test(normalized)) {
    throw new Error(`runId invalid: ${value}`);
  }
  return normalized;
}

function dateTimeParts(now, timeZone = QA_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function createRunId(
  now = new Date(),
  randomBytes = crypto.randomBytes(3),
  timeZone = QA_TIME_ZONE
) {
  const parts = dateTimeParts(now, timeZone);
  const date = `${parts.year}${parts.month}${parts.day}`;
  const time = `${parts.hour}${parts.minute}${parts.second}`;
  const suffix = Buffer.from(randomBytes).toString('hex').toUpperCase();
  return `QAUSR-${date}-${time}-${suffix}`;
}

export function chunkItems(items, maxSize = 50) {
  if (!Number.isInteger(maxSize) || maxSize < 1 || maxSize > 50) {
    throw new Error('La mida de batch ha de ser entre 1 i 50');
  }
  const chunks = [];
  for (let index = 0; index < items.length; index += maxSize) {
    chunks.push(items.slice(index, index + maxSize));
  }
  return chunks;
}

export function omitUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(omitUndefined).filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .map(([key, nested]) => [key, omitUndefined(nested)])
    );
  }
  return value;
}

export function redactSecrets(value, key = '') {
  if (SECRET_KEY_PATTERN.test(key)) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        redactSecrets(nestedValue, nestedKey),
      ])
    );
  }
  if (typeof value === 'string') {
    return value.replace(BEARER_PATTERN, `Bearer ${REDACTED}`);
  }
  return value;
}

export async function validateFirebasePasswordCredential({
  apiKey,
  email,
  password,
  fetchImpl = globalThis.fetch,
}) {
  if (!apiKey) return { ok: false, code: 'QA_FIREBASE_WEB_API_KEY_MISSING' };
  if (!email || !password) return { ok: false, code: 'QA_CREDENTIAL_MISSING' };
  if (typeof fetchImpl !== 'function') return { ok: false, code: 'QA_CREDENTIAL_CHECK_UNAVAILABLE' };

  try {
    const response = await fetchImpl(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    if (response.ok) return { ok: true, code: 'QA_CREDENTIAL_VALID' };

    const payload = await response.json().catch(() => ({}));
    const upstreamCode = String(payload?.error?.message ?? 'UNKNOWN').split(' : ')[0];
    const knownCodes = new Set(['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD', 'EMAIL_NOT_FOUND', 'USER_DISABLED']);
    return {
      ok: false,
      code: knownCodes.has(upstreamCode)
        ? `QA_CREDENTIAL_${upstreamCode}`
        : 'QA_CREDENTIAL_REJECTED',
    };
  } catch {
    return { ok: false, code: 'QA_CREDENTIAL_CHECK_NETWORK_ERROR' };
  }
}

export function normalizePermissionProfile(member) {
  const capabilities = Object.entries(member?.capabilities ?? {})
    .filter(([, enabled]) => enabled === true)
    .map(([permission]) => permission)
    .sort();
  const deny = [...new Set(member?.userOverrides?.deny ?? [])].sort();
  const grants = [...new Set(member?.userGrants ?? [])].sort();
  return {
    role: member?.role ?? null,
    capabilities,
    deny,
    grants,
  };
}

export function samePermissionProfile(left, right) {
  return JSON.stringify(normalizePermissionProfile(left))
    === JSON.stringify(normalizePermissionProfile(right));
}

export function contactNameVariants(name) {
  const raw = String(name ?? '');
  const normalizedByContactForm = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return [...new Set([raw, normalizedByContactForm])];
}

export function buildScenario(runIdInput, now = new Date()) {
  const runId = normalizeRunId(runIdInput);
  const marker = runId;
  const compact = runId.toLowerCase();
  const parts = dateTimeParts(now);
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const contactFixtures = Object.fromEntries(
    LIVE_ORGS.map((org) => [org.slug, {
      supplier: `${marker}-PROVEIDOR-${org.slug}`,
      employee: `${marker}-TREBALLADOR-${org.slug}`,
      donor: `${marker}-DONANT-${org.slug}`,
    }])
  );

  contactFixtures[QA_ORG.slug] = {
    supplier: `${marker}-PROVEIDOR-QA`,
    employee: `${marker}-TREBALLADOR-QA`,
    donor: `${marker}-DONANT-QA`,
  };

  return {
    marker,
    date,
    contacts: contactFixtures,
    category: `${marker}-CATEGORIA`,
    invitationEmail: `qa+${compact}@summa-social.test`,
    bankAccountName: `${marker}-COMPTE-QA-NO-OPERATIU`,
    bankName: 'Banc QA no operatiu',
    bankFileName: `qa-bank-${runId}.csv`,
    bankTransactions: [
      { description: `${marker} PAGAMENT PROVEIDOR`, amount: -300 },
      { description: `${marker} DONACIO`, amount: 100 },
      { description: `${marker} TRANSFERENCIA DOP`, amount: -1000 },
    ],
    pendingDocumentFileName: `qa-pending-${runId}.pdf`,
    transactionDocumentFileNames: [
      `qa-movement-${runId}-a.pdf`,
      `qa-movement-${runId}-b.pdf`,
    ],
    projectName: `${marker}-PROJECTE`,
    projectCode: `${marker}-PRJ`,
    budgetLines: [
      { code: `${marker}-BL1`, name: `${marker}-PERSONAL`, amount: 600 },
      { code: `${marker}-BL2`, name: `${marker}-ACTIVITATS`, amount: 400 },
    ],
    offBankConcept: `${marker}-DESPESA-DOP`,
    expected: {
      projectBudgetEUR: 1000,
      eurSent: 1000,
      localCurrency: 'DOP',
      localReceived: 65000,
      fxRateEurPerLocal: 1000 / 65000,
      offBankOriginalAmount: 13000,
      offBankHalfEUR: 100,
      offBankFullEUR: 200,
      bankHalfEUR: 150,
      bankFullEUR: 300,
      executedEUR: 500,
    },
  };
}

export function createEmptyManifest({ runId, profile, baseUrl, revision, startedAt, scenario }) {
  return {
    schemaVersion: QA_SCHEMA_VERSION,
    runId: normalizeRunId(runId),
    profile: normalizeProfile(profile),
    baseUrl,
    revision,
    startedAt,
    scenario,
    resources: {
      firestore: [],
      storage: [],
      auth: [],
    },
    cleanup: {
      attemptedAt: null,
      completedAt: null,
      status: 'NOT_RUN',
      remaining: {
        firestore: [],
        storage: [],
        auth: [],
      },
    },
  };
}

export function addUniqueResource(manifest, type, resource) {
  if (!['firestore', 'storage', 'auth'].includes(type)) {
    throw new Error(`Tipus de recurs invalid: ${type}`);
  }
  const list = manifest.resources[type];
  const identity = type === 'auth'
    ? `${resource.uid ?? ''}|${resource.email ?? ''}`
    : resource.path;
  const exists = list.some((item) => {
    const itemIdentity = type === 'auth'
      ? `${item.uid ?? ''}|${item.email ?? ''}`
      : item.path;
    return itemIdentity === identity;
  });
  if (!exists) list.push(resource);
}

export function validateCleanupResource(manifest, type, resource) {
  const runId = normalizeRunId(manifest.runId);
  if (type === 'storage') {
    const storagePath = String(resource.path ?? '');
    const isQaOrgPath = storagePath.startsWith(`organizations/${QA_ORG.id}/`);
    if (!isQaOrgPath || !storagePath.includes(runId)) {
      throw new Error(`Ruta Storage fora del perimetre QA: ${storagePath}`);
    }
    return true;
  }

  if (type === 'auth') {
    const email = String(resource.email ?? '').toLowerCase();
    if (!email.startsWith('qa+qausr-') || !email.endsWith('@summa-social.test')) {
      throw new Error(`Usuari Auth fora del perimetre QA: ${email}`);
    }
    return true;
  }

  if (type !== 'firestore') throw new Error(`Tipus de recurs invalid: ${type}`);
  const firestorePath = String(resource.path ?? '');
  const parts = firestorePath.split('/').filter(Boolean);
  if (parts[0] === 'invitations' && parts.length === 2 && resource.temporary === true) return true;
  if (parts[0] === 'users' && parts.length === 2 && resource.temporary === true) return true;
  if (parts[0] !== 'organizations' || parts.length < 4) {
    throw new Error(`Ruta Firestore fora del perimetre QA: ${firestorePath}`);
  }

  const orgId = parts[1];
  if (!ALLOWED_ORG_IDS.includes(orgId)) {
    throw new Error(`Organitzacio fora del perimetre QA: ${orgId}`);
  }

  const collection = parts[2];
  const liveSafe = collection === 'contacts' || collection === 'categories' || collection === 'members';
  if (orgId !== QA_ORG.id && !liveSafe) {
    throw new Error(`Recurs profund prohibit en organitzacio real: ${firestorePath}`);
  }
  if (collection === 'members' && resource.temporary !== true) {
    throw new Error(`Membre permanent protegit: ${firestorePath}`);
  }

  const idOrPathContainsMarker = parts.some((part) => part.includes(runId));
  if (!idOrPathContainsMarker && resource.discoveredByExactFixture !== true && resource.temporary !== true) {
    throw new Error(`Recurs sense marcador QA verificat: ${firestorePath}`);
  }
  return true;
}

export function recordCheck(result, check) {
  const id = String(check.id ?? '').trim();
  if (!id) throw new Error('El check necessita id');
  const status = String(check.status ?? '').toUpperCase();
  if (!['PASS', 'FAIL', 'BLOCKED'].includes(status)) {
    throw new Error(`Estat de check invalid: ${check.status}`);
  }
  const normalized = {
    id,
    status,
    at: check.at ?? new Date().toISOString(),
    durationMs: Number.isFinite(check.durationMs) ? check.durationMs : null,
    evidence: redactSecrets(check.evidence ?? null),
    error: redactSecrets(check.error ?? null),
  };
  const index = result.checks.findIndex((item) => item.id === id);
  if (index === -1) result.checks.push(normalized);
  else result.checks[index] = normalized;
  return normalized;
}

export function computeFinalStatus({ profile, checks, cleanup, blocker }) {
  normalizeProfile(profile);
  if (cleanup?.status !== 'PASS') return 'FAIL_CLEANUP';
  if (blocker === 'login') return 'BLOCKED_LOGIN';
  if (blocker === 'environment') return 'BLOCKED_ENV';

  const byId = new Map((checks ?? []).map((check) => [check.id, check]));
  const missing = REQUIRED_CHECKS[profile].filter((id) => !byId.has(id));
  const failed = [...byId.values()].filter((check) => check.status !== 'PASS');
  if (missing.length > 0 || failed.length > 0) return 'FAIL_FUNCTIONAL';
  return 'PASS';
}

export function createInitialResult({ runId, profile, baseUrl, revision, startedAt, preflight }) {
  return {
    schemaVersion: QA_SCHEMA_VERSION,
    runId: normalizeRunId(runId),
    profile: normalizeProfile(profile),
    status: 'RUNNING',
    startedAt,
    finishedAt: null,
    baseUrl,
    revision,
    preflight: redactSecrets(preflight),
    checks: [],
    cleanup: {
      status: 'NOT_RUN',
      remaining: { firestore: [], storage: [], auth: [] },
    },
  };
}

export function buildReportMarkdown(result) {
  const required = REQUIRED_CHECKS[result.profile] ?? [];
  const byId = new Map(result.checks.map((check) => [check.id, check]));
  const lines = [
    `# QA d'usuari ${result.runId}`,
    '',
    `- Perfil: ${result.profile}`,
    `- Resultat: ${result.status}`,
    `- Revisio: ${result.revision ?? 'desconeguda'}`,
    `- Inici: ${result.startedAt}`,
    `- Final: ${result.finishedAt ?? 'en curs'}`,
    `- Neteja: ${result.cleanup?.status ?? 'NOT_RUN'}`,
    '',
    '## Comprovacions',
    '',
    '| Comprovacio | Estat | Evidencia |',
    '|---|---|---|',
  ];

  for (const id of required) {
    const check = byId.get(id);
    const evidence = check?.evidence == null
      ? ''
      : JSON.stringify(redactSecrets(check.evidence)).replaceAll('|', '\\|');
    lines.push(`| ${id} | ${check?.status ?? 'MISSING'} | ${evidence} |`);
  }

  const extraChecks = result.checks.filter((check) => !required.includes(check.id));
  for (const check of extraChecks) {
    const evidence = check.evidence == null
      ? ''
      : JSON.stringify(redactSecrets(check.evidence)).replaceAll('|', '\\|');
    lines.push(`| ${check.id} | ${check.status} | ${evidence} |`);
  }

  lines.push('', '## Neteja', '');
  lines.push(`- Firestore restant: ${result.cleanup?.remaining?.firestore?.length ?? 0}`);
  lines.push(`- Storage restant: ${result.cleanup?.remaining?.storage?.length ?? 0}`);
  lines.push(`- Auth restant: ${result.cleanup?.remaining?.auth?.length ?? 0}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}
