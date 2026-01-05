// src/lib/system-incidents.ts
// Sistema de sentinelles i alertes robustes per detectar incidències reals

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

export type IncidentType =
  | 'CLIENT_CRASH'
  | 'PERMISSIONS'
  | 'IMPORT_FAILURE'
  | 'EXPORT_FAILURE'
  | 'INVARIANT_BROKEN';

export type IncidentSeverity = 'CRITICAL' | 'WARNING';

export type IncidentStatus = 'OPEN' | 'ACK' | 'RESOLVED';

export type IncidentImpact = 'blocker' | 'functional' | 'cosmetic';

export interface IncidentResolution {
  resolvedAt: string; // ISO timestamp
  resolvedByUid: string;
  fixCommit: string | null;
  fixNote: string | null;
  noCommit: boolean;
}

export interface SystemIncident {
  id: string;
  signature: string; // hash estable: type+route+topStackLine+code
  type: IncidentType;
  severity: IncidentSeverity;
  orgId?: string;
  orgSlug?: string;
  route?: string; // pathname
  message: string;
  topStack?: string; // primera línia útil del stack
  count: number; // comptador total d'ocurrències
  firstSeenAt: Timestamp;
  lastSeenAt: Timestamp;
  status: IncidentStatus;
  lastSeenMeta?: Record<string, unknown>; // error code, function name, etc.
  alertSentAt?: Timestamp; // quan s'ha enviat email d'alerta (usat per Cloud Function)
  // Nous camps per gestió millorada
  impact?: IncidentImpact; // blocker | functional | cosmetic
  resolution?: IncidentResolution; // dades de resolució
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXTOS D'AJUDA (no tècnics)
// ═══════════════════════════════════════════════════════════════════════════

export interface IncidentHelp {
  whatItMeans: string;
  whyCritical: string;
  nextSteps: string;
}

export const INCIDENT_HELP: Record<IncidentType, IncidentHelp> = {
  CLIENT_CRASH: {
    whatItMeans: 'Una pantalla peta per un error de codi. L\'usuari veu una pantalla en blanc o un missatge d\'error.',
    whyCritical: 'L\'usuari no pot continuar treballant. Si es repeteix, afecta la confiança en el sistema.',
    nextSteps:
      '1. Obre la ruta afectada en una finestra privada per reproduir.\n2. Copia el missatge d\'error complet i passa\'l a Claude Code per corregir.',
  },
  PERMISSIONS: {
    whatItMeans: 'Un usuari ha intentat accedir a dades sense permisos. Pot ser un error de configuració o una regressió.',
    whyCritical: 'L\'usuari no pot veure o modificar dades crítiques. Pot bloquejar operativa diària.',
    nextSteps:
      '1. Verifica el rol de l\'usuari a l\'organització (admin/user/viewer).\n2. Si ha passat just després d\'un deploy, revisa firestore.rules amb Claude.',
  },
  IMPORT_FAILURE: {
    whatItMeans: 'Una importació de dades (banc, CSV, Stripe) ha fallat. Les dades no s\'han carregat.',
    whyCritical: 'L\'usuari no pot treballar amb les dades noves. Pot retardar conciliació o informes.',
    nextSteps:
      '1. Demana a l\'usuari el fitxer original per revisar el format.\n2. Si el format és correcte, passa l\'error a Claude Code.',
  },
  EXPORT_FAILURE: {
    whatItMeans: 'Una exportació (Excel, PDF, SEPA) ha fallat. L\'usuari no ha rebut el fitxer.',
    whyCritical: 'L\'usuari no pot generar documents per a gestories, finançadors o Hisenda.',
    nextSteps:
      '1. Intenta reproduir l\'exportació manualment.\n2. Si falla, copia l\'error i passa\'l a Claude Code.',
  },
  INVARIANT_BROKEN: {
    whatItMeans: 'Una regla de negoci s\'ha violat (ex: remesa amb deltaCents≠0, isValid=false).',
    whyCritical: 'Les dades poden estar desquadrades. No s\'hauria de continuar operant sense revisar.',
    nextSteps:
      '1. NO modifiquis res. Identifica la transacció o remesa afectada.\n2. Consulta el manual (DEV-SOLO-MANUAL.md) o passa el cas a Claude.',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// FILTRES ANTI-SOROLL
// ═══════════════════════════════════════════════════════════════════════════

const IGNORED_ERRORS = [
  'ERR_BLOCKED_BY_CLIENT', // extensions de navegador, adblockers
  'ResizeObserver loop', // error benigne de layout
  'ChunkLoadError', // errors de xarxa, usuari amb mala connexió
  'Loading chunk', // idem
  'Network request failed', // errors de xarxa temporals
  'Failed to fetch', // errors de xarxa temporals
  'Load failed', // Safari network errors
  'Script error.', // cross-origin errors sense info útil
  'AbortError', // requests cancel·lats intencionalment
];

export function shouldIgnoreError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return IGNORED_ERRORS.some((ignored) =>
    lowerMessage.includes(ignored.toLowerCase())
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SIGNATURA (deduplicació)
// ═══════════════════════════════════════════════════════════════════════════

function extractTopStackLine(stack: string | undefined): string {
  if (!stack) return '';
  const lines = stack.split('\n').filter((l) => l.trim().startsWith('at '));
  // Eliminar línies de node_modules i framework
  const appLine = lines.find(
    (l) => !l.includes('node_modules') && !l.includes('webpack')
  );
  if (appLine) {
    // Netejar la línia: deixar només el path relatiu i línia
    const match = appLine.match(/at\s+(?:\w+\s+)?\(?(.+?)(?::\d+:\d+)?\)?$/);
    return match?.[1]?.split('/').slice(-2).join('/') || appLine.slice(0, 80);
  }
  return lines[0]?.slice(0, 80) || '';
}

export function computeSignature(
  type: IncidentType,
  route: string | undefined,
  message: string,
  stack?: string,
  code?: string
): string {
  const topStack = extractTopStackLine(stack);
  // Netejar el missatge de números dinàmics (IDs, timestamps)
  const cleanMessage = message
    .replace(/[0-9a-f]{20,}/gi, 'ID') // IDs llargs
    .replace(/\d{10,}/g, 'TS') // timestamps
    .slice(0, 100);
  const raw = `${type}|${route || ''}|${cleanMessage}|${topStack}|${code || ''}`;
  // Hash simple (no cryptogràfic, només per agrupar)
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `${type.slice(0, 3)}_${Math.abs(hash).toString(36)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT INCIDENT (amb deduplicació)
// ═══════════════════════════════════════════════════════════════════════════

export interface ReportIncidentParams {
  firestore: Firestore;
  type: IncidentType;
  message: string;
  route?: string;
  stack?: string;
  orgId?: string;
  orgSlug?: string;
  code?: string;
  meta?: Record<string, unknown>;
}

export async function reportSystemIncident(
  params: ReportIncidentParams
): Promise<void> {
  const { firestore, type, message, route, stack, orgId, orgSlug, code, meta } =
    params;

  // Filtrar soroll
  if (shouldIgnoreError(message)) {
    console.debug('[SystemIncidents] Ignored:', message.slice(0, 60));
    return;
  }

  const signature = computeSignature(type, route, message, stack, code);

  // Determinar severitat
  const severity: IncidentSeverity =
    type === 'CLIENT_CRASH' || type === 'PERMISSIONS' || type === 'INVARIANT_BROKEN'
      ? 'CRITICAL'
      : 'WARNING';

  const now = Timestamp.now();
  const docRef = doc(firestore, 'systemIncidents', signature);

  try {
    const existing = await getDoc(docRef);

    if (existing.exists()) {
      // Incrementar comptador i actualitzar lastSeen
      const data = existing.data();
      await updateDoc(docRef, {
        count: (data.count || 1) + 1,
        lastSeenAt: now,
        status: data.status === 'RESOLVED' ? 'OPEN' : data.status, // Reobrir si estava RESOLVED
        lastSeenMeta: meta || null,
      });
      console.info(
        `[SystemIncidents] Updated incident ${signature} (count: ${(data.count || 1) + 1})`
      );
    } else {
      // Crear nou incident (filtrant undefined per evitar errors Firestore)
      const incident: Record<string, unknown> = {
        signature,
        type,
        severity,
        message: message.slice(0, 500),
        count: 1,
        firstSeenAt: now,
        lastSeenAt: now,
        status: 'OPEN',
      };
      // Afegir camps opcionals només si tenen valor
      if (route) incident.route = route.slice(0, 200);
      const topStack = extractTopStackLine(stack);
      if (topStack) incident.topStack = topStack;
      if (orgId) incident.orgId = orgId;
      if (orgSlug) incident.orgSlug = orgSlug;
      if (meta) incident.lastSeenMeta = meta;

      await setDoc(docRef, incident);
      console.info(`[SystemIncidents] Created incident ${signature}: ${message.slice(0, 60)}`);
    }
  } catch (err) {
    // Best-effort: no volem que el sistema de monitorització causi més errors
    console.error('[SystemIncidents] Failed to report incident:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OBTENIR INCIDENTS
// ═══════════════════════════════════════════════════════════════════════════

export async function getOpenIncidents(
  firestore: Firestore
): Promise<SystemIncident[]> {
  const q = query(
    collection(firestore, 'systemIncidents'),
    where('status', 'in', ['OPEN', 'ACK']),
    orderBy('lastSeenAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as SystemIncident);
}

export async function getOpenIncidentsByType(
  firestore: Firestore,
  type: IncidentType
): Promise<SystemIncident[]> {
  const q = query(
    collection(firestore, 'systemIncidents'),
    where('type', '==', type),
    where('status', '==', 'OPEN'),
    orderBy('lastSeenAt', 'desc'),
    limit(20)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as SystemIncident);
}

export async function countOpenIncidentsByType(
  firestore: Firestore
): Promise<Record<IncidentType, number>> {
  const incidents = await getOpenIncidents(firestore);
  const counts: Record<IncidentType, number> = {
    CLIENT_CRASH: 0,
    PERMISSIONS: 0,
    IMPORT_FAILURE: 0,
    EXPORT_FAILURE: 0,
    INVARIANT_BROKEN: 0,
  };
  for (const inc of incidents) {
    if (inc.status === 'OPEN') {
      counts[inc.type] = (counts[inc.type] || 0) + 1;
    }
  }
  return counts;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCIONS (ACK, RESOLVED)
// ═══════════════════════════════════════════════════════════════════════════

export async function acknowledgeIncident(
  firestore: Firestore,
  incidentId: string
): Promise<void> {
  await updateDoc(doc(firestore, 'systemIncidents', incidentId), {
    status: 'ACK',
  });
}

export async function resolveIncident(
  firestore: Firestore,
  incidentId: string
): Promise<void> {
  await updateDoc(doc(firestore, 'systemIncidents', incidentId), {
    status: 'RESOLVED',
  });
}

export async function reopenIncident(
  firestore: Firestore,
  incidentId: string
): Promise<void> {
  await updateDoc(doc(firestore, 'systemIncidents', incidentId), {
    status: 'OPEN',
  });
}

/**
 * Resol un incident amb dades completes de resolució.
 * Requereix indicar commit o marcar "no hi ha commit".
 */
export async function resolveIncidentWithDetails(
  firestore: Firestore,
  incidentId: string,
  resolution: IncidentResolution,
  impact?: IncidentImpact
): Promise<void> {
  if (impact) {
    await updateDoc(doc(firestore, 'systemIncidents', incidentId), {
      status: 'RESOLVED',
      resolution,
      impact,
    });
  } else {
    await updateDoc(doc(firestore, 'systemIncidents', incidentId), {
      status: 'RESOLVED',
      resolution,
    });
  }
}

/**
 * Actualitza l'impacte d'un incident sense canviar l'estat.
 */
export async function updateIncidentImpact(
  firestore: Firestore,
  incidentId: string,
  impact: IncidentImpact
): Promise<void> {
  await updateDoc(doc(firestore, 'systemIncidents', incidentId), {
    impact,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// RUTES CORE (errors aquí són crítics des del primer cop)
// ═══════════════════════════════════════════════════════════════════════════

const CORE_ROUTES = [
  '/movimientos',
  '/moviments',
  '/importar',
  '/import',
  '/fiscalitat',
  '/fiscalidad',
  '/project-module',
  '/projectes',
  '/proyectos',
  '/pendents',       // Documents pendents
  '/liquidacions',   // Liquidacions / expense reports
  '/liquidaciones',
];

export function isCoreRoute(route: string | undefined): boolean {
  if (!route) return false;
  const lowerRoute = route.toLowerCase();
  return CORE_ROUTES.some((core) => lowerRoute.includes(core));
}

// ═══════════════════════════════════════════════════════════════════════════
// INCIDENT FIX PACK (prompt de reparació per Claude Code)
// ═══════════════════════════════════════════════════════════════════════════

export interface IncidentFixPack {
  title: string;
  summary: string;
  promptText: string;
}

export interface AppMeta {
  version?: string;
  env?: 'prod' | 'dev';
  projectId?: string;
  commit?: string;
}

const TYPE_LABELS: Record<IncidentType, string> = {
  CLIENT_CRASH: 'Error de codi (crash)',
  PERMISSIONS: 'Error de permisos',
  IMPORT_FAILURE: "Error d'importació",
  EXPORT_FAILURE: "Error d'exportació",
  INVARIANT_BROKEN: 'Invariant violada',
};

export function buildIncidentFixPack(
  incident: SystemIncident,
  appMeta: AppMeta = {}
): IncidentFixPack {
  const typeLabel = TYPE_LABELS[incident.type] || incident.type;
  const routeShort = incident.route?.split('/').slice(-2).join('/') || 'desconeguda';

  // Title: una línia humana
  const title = `${typeLabel} a ${routeShort} – ${incident.message.slice(0, 50)}${incident.message.length > 50 ? '...' : ''}`;

  // Summary: 3 línies
  const help = INCIDENT_HELP[incident.type];
  const summary = [
    `Què passa: ${help.whatItMeans}`,
    `Impacte: ${help.whyCritical}`,
    `Primer pas: ${help.nextSteps.split('\n')[0]}`,
  ].join('\n');

  // PromptText: text complet per Claude Code
  const promptText = `## Incident Fix Pack – Summa Social

### 1. Context de projecte
Ets Claude Code dins el repo Summa Social (Next.js 14 + Firebase).
Abans de tocar res, llegeix:
- docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md
- docs/DEV-SOLO-MANUAL.md

**Regles obligatòries:**
- No afegeixis dependències noves
- No refactoritzis codi no afectat
- Canvi mínim viable

### 2. Detalls de l'incident

| Camp | Valor |
|------|-------|
| **Tipus** | ${incident.type} |
| **Severitat** | ${incident.severity} |
| **Ruta** | ${incident.route || 'N/A'} |
| **Organització** | ${incident.orgSlug || incident.orgId || 'N/A'} |
| **Repeticions** | ${incident.count} |
| **Última vegada** | ${incident.lastSeenAt?.toDate?.()?.toISOString?.() || 'N/A'} |
| **Signatura** | ${incident.signature} |

**Missatge d'error:**
\`\`\`
${incident.message}
\`\`\`

**Top stack:**
\`\`\`
${incident.topStack || 'No disponible'}
\`\`\`

${appMeta.version ? `**Versió app:** ${appMeta.version}` : ''}
${appMeta.env ? `**Entorn:** ${appMeta.env}` : ''}
${appMeta.commit ? `**Commit:** ${appMeta.commit}` : ''}

### 3. Objectiu
- Arreglar l'error perquè la ruta torni a carregar sense regressions.
- Afegir test manual de regressió (passos reproducció → resultat esperat).

### 4. Procediment obligatori
1. Localitza el fitxer origen del stack (${incident.topStack?.split('/').slice(-1)[0] || 'desconegut'})
2. Proposa canvi mínim amb paths exactes
3. Indica QA: com verificar que funciona
${incident.type === 'PERMISSIONS' ? '4. Si és PERMISSIONS: indica quina rule i quin path està denegant.' : ''}

### 5. Informació addicional
${help.nextSteps}
`;

  return { title, summary, promptText };
}

// ═══════════════════════════════════════════════════════════════════════════
// DETERMINAR SI CAL ENVIAR ALERTA
// ═══════════════════════════════════════════════════════════════════════════

export interface AlertDecision {
  shouldAlert: boolean;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DETECCIÓ D'ERRORS DE STORAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detecta si un error és de tipus storage/unauthorized.
 * Suporta tant FirebaseError amb code com missatges de text.
 */
export function isStorageUnauthorizedError(error: unknown): boolean {
  if (!error) return false;

  // Check FirebaseError code
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'storage/unauthorized') return true;
    if (err.message?.includes('storage/unauthorized')) return true;
    if (err.message?.includes('User does not have permission')) return true;
  }

  // Check string message
  if (typeof error === 'string') {
    if (error.includes('storage/unauthorized')) return true;
    if (error.includes('User does not have permission')) return true;
  }

  return false;
}

/**
 * Reporta un error de storage/unauthorized com a incident CRITICAL.
 * Sanititza el path per no incloure tokens ni dades sensibles.
 */
export async function reportStorageUnauthorized(
  firestore: Firestore,
  params: {
    storagePath: string;
    feature: 'pendingDocuments' | 'expenseReportsPdf' | 'attachments' | 'other';
    route?: string;
    orgId?: string;
    orgSlug?: string;
    originalError?: unknown;
  }
): Promise<void> {
  // Sanititzar path: només el bucket path, sense URL signada ni tokens
  const sanitizedPath = params.storagePath
    .replace(/\?.*$/, '')          // Treure query params
    .replace(/^https?:\/\/[^/]+/, '') // Treure domini si és URL
    .replace(/[0-9a-f]{40,}/gi, '[TOKEN]'); // Ofuscar tokens llargs

  const message = `Storage permission denied: ${params.feature} at ${sanitizedPath}`;

  await reportSystemIncident({
    firestore,
    type: 'PERMISSIONS',
    message,
    route: params.route,
    orgId: params.orgId,
    orgSlug: params.orgSlug,
    code: 'storage/unauthorized',
    meta: {
      feature: params.feature,
      storagePath: sanitizedPath,
      errorCode: 'storage/unauthorized',
    },
  });
}

export function shouldSendAlert(incident: SystemIncident): AlertDecision {
  // Condició 1: ha de ser CRITICAL
  if (incident.severity !== 'CRITICAL') {
    return { shouldAlert: false, reason: 'No és CRITICAL' };
  }

  // Condició 2: ha de ser OPEN (no ACK ni RESOLVED)
  if (incident.status !== 'OPEN') {
    return { shouldAlert: false, reason: `Status és ${incident.status}, no OPEN` };
  }

  // Condició 3: count >= 2 O primer error en ruta core
  const isCore = isCoreRoute(incident.route);
  if (incident.count < 2 && !isCore) {
    return { shouldAlert: false, reason: 'count < 2 i no és ruta core' };
  }

  // Tot OK
  return {
    shouldAlert: true,
    reason: isCore ? 'Ruta core afectada' : `Repetit ${incident.count} vegades`,
  };
}
