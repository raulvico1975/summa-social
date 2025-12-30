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
      // Crear nou incident
      const incident: Omit<SystemIncident, 'id'> = {
        signature,
        type,
        severity,
        message: message.slice(0, 500),
        route: route?.slice(0, 200),
        topStack: extractTopStackLine(stack),
        orgId,
        orgSlug,
        count: 1,
        firstSeenAt: now,
        lastSeenAt: now,
        status: 'OPEN',
        lastSeenMeta: meta,
      };
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
