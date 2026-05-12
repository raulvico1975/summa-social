export interface ProductUpdateEditorialPayload {
  title: string;
  description: string;
  contentLong: string;
  web?: {
    excerpt?: string | null;
    content?: string | null;
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
  'Que canvia:',
  'On ho notaràs:',
  'Que has de fer:',
  'Límit:',
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

export function validateWeeklyProductUpdateEditorial(
  payload: ProductUpdateEditorialPayload
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const normalizedText = normalizeForPolicy(collectText(payload));
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

  const bulletCount = payload.contentLong
    .split('\n')
    .filter((line) => line.trim().startsWith('- ')).length;
  if (bulletCount < 4) {
    errors.push('contentLong must include concrete bullet points for change, location, action and limit');
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}
