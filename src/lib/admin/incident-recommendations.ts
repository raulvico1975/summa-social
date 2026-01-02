// src/lib/admin/incident-recommendations.ts
// Classificador simple d'incidents (sense IA) per determinar impacte i acció recomanada

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

export type IncidentImpact = 'blocker' | 'functional' | 'cosmetic';

export type RecommendedAction = 'permissions' | 'storage' | 'reload' | 'claude';

export interface IncidentResolution {
  resolvedAt: string; // ISO timestamp
  resolvedByUid: string;
  fixCommit: string | null;
  fixNote: string | null;
  noCommit: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXTOS PER A LA UI (català, simples)
// ═══════════════════════════════════════════════════════════════════════════

export const IMPACT_LABELS: Record<IncidentImpact, { label: string; short: string; description: string; color: string }> = {
  blocker: {
    label: "Bloqueja l'accés",
    short: 'Bloqueja',
    description: "L'usuari no pot entrar o treballar",
    color: 'text-red-700 bg-red-50',
  },
  functional: {
    label: 'Afecta una funció',
    short: 'Funcional',
    description: 'Una funcionalitat no va bé',
    color: 'text-orange-700 bg-orange-50',
  },
  cosmetic: {
    label: 'Cosmètic / soroll',
    short: 'Cosmètic',
    description: 'Error menor o fals positiu',
    color: 'text-gray-600 bg-gray-50',
  },
};

export const ACTION_LABELS: Record<RecommendedAction, { label: string; buttonText: string; instruction: string }> = {
  permissions: {
    label: 'Problema de permisos',
    buttonText: 'Revisar permisos',
    instruction: 'Comprova els rols dels usuaris i les regles de Firestore.',
  },
  storage: {
    label: 'Problema de Storage',
    buttonText: 'Revisar Storage',
    instruction: "Comprova que els fitxers i'ls permisos de Storage siguin correctes.",
  },
  reload: {
    label: 'Error de càrrega',
    buttonText: 'Recarregar en incògnit',
    instruction: 'Obre una finestra privada del navegador, recarrega la pàgina i comprova si persisteix.',
  },
  claude: {
    label: 'Cal revisar el codi',
    buttonText: 'Copiar prompt per Claude Code',
    instruction: "Copia el prompt i enganxa'l a Claude Code per obtenir ajuda tècnica.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CLASSIFICADOR
// ═══════════════════════════════════════════════════════════════════════════

interface IncidentForClassification {
  message?: string;
  topStack?: string;
  route?: string;
  type?: string;
  lastSeenMeta?: Record<string, unknown>;
}

/**
 * Determina l'acció recomanada basant-se en el text de l'error.
 * Sense IA, només patrons simples.
 */
export function getRecommendedAction(incident: IncidentForClassification): RecommendedAction {
  const text = [
    incident.message || '',
    incident.topStack || '',
    String(incident.lastSeenMeta?.code || ''),
  ].join(' ').toLowerCase();

  // Permisos
  if (
    text.includes('permission-denied') ||
    text.includes('permission denied') ||
    text.includes('missing or insufficient permissions') ||
    text.includes('firestore: permission')
  ) {
    return 'permissions';
  }

  // Storage
  if (
    text.includes('storage/unauthorized') ||
    text.includes('storage/object-not-found') ||
    text.includes('firebase storage')
  ) {
    return 'storage';
  }

  // Errors de càrrega (xarxa, chunks)
  if (
    text.includes('chunkloaderror') ||
    text.includes('loading chunk') ||
    text.includes('module not found') ||
    text.includes('dynamic import') ||
    text.includes('failed to fetch') ||
    text.includes('network error')
  ) {
    return 'reload';
  }

  // Per defecte: cal revisar amb Claude
  return 'claude';
}

/**
 * Determina l'impacte per defecte basant-se en el tipus i contingut de l'error.
 */
export function getDefaultImpact(incident: IncidentForClassification): IncidentImpact {
  const text = [
    incident.message || '',
    incident.route || '',
    String(incident.lastSeenMeta?.code || ''),
  ].join(' ').toLowerCase();

  // Blocker: errors greus que impedeixen treballar
  if (
    // Permission denied a rutes admin o dashboard principal
    (text.includes('permission') && (text.includes('/admin') || text.includes('/dashboard'))) ||
    // Application error (pantalla blanca)
    text.includes('application error') ||
    // Errors de permisos crítics
    (incident.type === 'PERMISSIONS' && text.includes('/admin'))
  ) {
    return 'blocker';
  }

  // Functional: errors que afecten funcionalitats específiques
  if (
    text.includes('storage/unauthorized') ||
    text.includes('upload') ||
    text.includes('export') ||
    text.includes('import') ||
    incident.type === 'IMPORT_FAILURE' ||
    incident.type === 'EXPORT_FAILURE'
  ) {
    return 'functional';
  }

  // Cosmetic: errors menors
  if (
    text.includes('404') ||
    text.includes('i18n') ||
    text.includes('chunk') ||
    text.includes('network')
  ) {
    return 'cosmetic';
  }

  // Default: functional
  return 'functional';
}

/**
 * Valida la resolució d'un incident.
 * Retorna un error si la resolució no és vàlida.
 */
export function validateResolution(
  fixCommit: string | null,
  noCommit: boolean
): { valid: boolean; error?: string } {
  if (noCommit) {
    // Si marca "no hi ha commit", no cal res més
    return { valid: true };
  }

  if (!fixCommit || fixCommit.trim().length === 0) {
    return {
      valid: false,
      error: 'Has d\'indicar el commit que ho resol o marcar "No hi ha commit".',
    };
  }

  return { valid: true };
}

/**
 * Genera un objecte Resolution complet per guardar a Firestore.
 */
export function buildResolution(
  uid: string,
  fixCommit: string | null,
  fixNote: string | null,
  noCommit: boolean
): IncidentResolution {
  return {
    resolvedAt: new Date().toISOString(),
    resolvedByUid: uid,
    fixCommit: noCommit ? null : (fixCommit?.trim() || null),
    fixNote: fixNote?.trim() || null,
    noCommit,
  };
}
