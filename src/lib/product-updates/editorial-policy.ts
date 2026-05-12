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
      title?: string;
      description?: string;
      contentLong?: string;
      web?: {
        title?: string;
        excerpt?: string | null;
        content?: string | null;
      } | null;
    } | null;
  } | null;
}

const GENERIC_PHRASES = [
  'gestio mes agil',
  'gestio mes agil precisa i segura',
  'mes precisa i segura',
  'millora l experiencia',
  'garantia institucional',
  'identifica millor les necessitats',
  'optimitzacio del proces',
  'mes robustesa',
  'millores internes',
  'funcionament general',
  'operativa mes fluida',
  'reduir friccions',
];

const REQUIRED_WEEKLY_SECTIONS = [
  'Què canvia:',
  'On ho notaràs:',
  'Què has de fer:',
  'Límit:',
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

  for (const section of REQUIRED_WEEKLY_SECTIONS) {
    if (!payload.contentLong.includes(section)) {
      errors.push(`contentLong must include section "${section}"`);
    }
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
