export interface ProductUpdateEditorialPayload {
  title: string;
  description: string;
  contentLong: string;
  web?: {
    excerpt?: string | null;
    content?: string | null;
  } | null;
  locales?: {
    es?: {
      title?: string | null;
      description?: string | null;
      contentLong?: string | null;
      web?: {
        title?: string | null;
        excerpt?: string | null;
        content?: string | null;
      } | null;
    } | null;
  } | null;
}

const GENERIC_PHRASES = [
  'gestio administrativa mes agil',
  'gestio mes agil',
  'gestio mes agil precisa i segura',
  'precisa i segura',
  'mes precisa i segura',
  'millora l experiencia',
  'garantia institucional',
  'identifica millor les necessitats',
  'identifica millor les teves necessitats',
  'optimitzacio del proces',
  'mes robustesa',
  'millores internes',
  'funcionament general',
  'operativa mes fluida',
  'reduir friccions',
  'millores setmanals a summa social',
];

// Public weekly updates must read as useful operational notes, not as generic release copy.
const REQUIRED_WEEKLY_SECTIONS = [
  'que canvia',
  'on ho notaras',
  'que has de fer',
  'limit',
];

const FUNCTIONAL_AREA_TERMS = [
  'banc',
  'moviment',
  'conciliacio',
  'remesa',
  'sepa',
  'donant',
  'soci',
  'certificat',
  'model 182',
  'model 347',
  'document',
  'justificant',
  'factura',
  'projecte',
  'subvencio',
  'justificacio',
  'permis',
  'rol',
  'arxiva',
  'revisio',
  'stripe',
  'pagament',
  'devolucio',
  'dashboard',
  'informe',
  'exportacio',
];

const VISIBLE_CHANGE_TERMS = [
  'ara',
  'pots',
  'trobaras',
  'veuras',
  'mostra',
  'apareix',
  'descarregar',
  'export',
  'revis',
  'arxiva',
  'tanca',
  'elimina',
  'exigeix',
  'limita',
  'permet',
  'respon',
  'enten',
];

const USER_ACTION_TERMS = [
  'no cal',
  'continua',
  'consulta',
  'revisa',
  'llegeix',
  'prova',
  'demana',
  'fes',
  'tanca',
  'reserva',
  'descarrega',
];

const LIMIT_TERMS = [
  'no modifica',
  'no canvia',
  'no cobreix',
  'no inclou',
  'nomes',
  'queda fora',
  'encara',
  'limit',
  'limita',
  'sense',
];

const CATALAN_LEAKS_IN_SPANISH = [
  'exigeix',
  'permis',
  'arxivar',
  'projectes',
  'llista',
  'detall',
  'que canvia',
  'que has de fer',
  'on ho notaras',
];

function normalizeForPolicy(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeSectionTitle(value: string): string {
  return normalizeForPolicy(value).replace(/:$/, '').trim();
}

function extractSections(contentLong: string): Map<string, string> {
  const sections = new Map<string, string>();
  let currentSection: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentSection) return;
    sections.set(currentSection, buffer.join('\n').trim());
    buffer = [];
  };

  for (const line of contentLong.split('\n')) {
    const normalizedLine = normalizeSectionTitle(line);
    if (REQUIRED_WEEKLY_SECTIONS.includes(normalizedLine)) {
      flush();
      currentSection = normalizedLine;
      continue;
    }

    if (currentSection) {
      buffer.push(line);
    }
  }

  flush();
  return sections;
}

function hasAnyTerm(normalizedText: string, terms: string[]): boolean {
  return terms.some((term) => normalizedText.includes(term));
}

function hasSubstantialSection(sectionText: string): boolean {
  const normalized = normalizeForPolicy(sectionText);
  if (!normalized) return false;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length < 5) return false;

  return !GENERIC_PHRASES.some((phrase) => normalized === phrase || normalized.includes(phrase));
}

function collectText(payload: ProductUpdateEditorialPayload): string {
  return [
    payload.title,
    payload.description,
    payload.contentLong,
    payload.web?.excerpt,
    payload.web?.content,
  ]
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .join('\n');
}

function collectSpanishText(payload: ProductUpdateEditorialPayload): string {
  return [
    payload.locales?.es?.title,
    payload.locales?.es?.description,
    payload.locales?.es?.contentLong,
    payload.locales?.es?.web?.title,
    payload.locales?.es?.web?.excerpt,
    payload.locales?.es?.web?.content,
  ]
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .join('\n');
}

function containsCatalanLeak(normalizedSpanishText: string, leak: string): boolean {
  const escaped = leak.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = leak.includes(' ')
    ? new RegExp(`(^|\\s)${escaped}(\\s|$)`)
    : new RegExp(`\\b${escaped}\\b`);
  return pattern.test(normalizedSpanishText);
}

export function validateWeeklyProductUpdateEditorial(
  payload: ProductUpdateEditorialPayload
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const normalizedText = normalizeForPolicy(collectText(payload));
  const normalizedSpanishText = normalizeForPolicy(collectSpanishText(payload));
  const normalizedTitle = normalizeForPolicy(payload.title);

  if (normalizedTitle === 'millores setmanals a summa social') {
    errors.push('weekly title must name the affected area and visible change');
  }

  for (const phrase of GENERIC_PHRASES) {
    if (normalizedText.includes(phrase)) {
      errors.push(`generic editorial phrase is not allowed: ${phrase}`);
    }
  }

  const sections = extractSections(payload.contentLong);
  for (const section of REQUIRED_WEEKLY_SECTIONS) {
    const sectionText = sections.get(section);
    if (!sectionText) {
      errors.push(`contentLong must include section "${section}:"`);
      continue;
    }

    if (!hasSubstantialSection(sectionText)) {
      errors.push(`contentLong section "${section}:" must include concrete non-generic content`);
    }
  }

  if (!hasAnyTerm(normalizedText, FUNCTIONAL_AREA_TERMS)) {
    errors.push('weekly update must mention a concrete functional or economic area');
  }

  const changeSection = normalizeForPolicy(sections.get('que canvia') ?? '');
  if (!hasAnyTerm(changeSection, VISIBLE_CHANGE_TERMS)) {
    errors.push('section "que canvia:" must describe a visible user-facing change');
  }

  const actionSection = normalizeForPolicy(sections.get('que has de fer') ?? '');
  if (!hasAnyTerm(actionSection, USER_ACTION_TERMS)) {
    errors.push('section "que has de fer:" must state a concrete user action or that no action is needed');
  }

  const limitSection = normalizeForPolicy(sections.get('limit') ?? '');
  if (!hasAnyTerm(limitSection, LIMIT_TERMS)) {
    errors.push('section "limit:" must state what is not covered or what has not changed');
  }

  if (normalizedSpanishText.length > 0) {
    for (const leak of CATALAN_LEAKS_IN_SPANISH) {
      if (containsCatalanLeak(normalizedSpanishText, leak)) {
        errors.push(`invalid_spanish_translation: ${leak}`);
      }
    }
  }

  const bulletCount = payload.contentLong
    .split('\n')
    .filter((line) => line.trim().startsWith('- ')).length;
  if (bulletCount < 4) {
    errors.push('contentLong must include concrete bullet points for change, location, action and limit');
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}
