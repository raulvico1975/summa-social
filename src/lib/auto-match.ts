// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-MATCH - Sistema d'assignació automàtica de contactes
// ═══════════════════════════════════════════════════════════════════════════════
// Matching local sense IA: cerca el nom del contacte a la descripció bancària
// ═══════════════════════════════════════════════════════════════════════════════

import type { AnyContact, Category } from './data';

/**
 * Normalitza un text per a comparació (minúscules, sense accents, sense caràcters especials)
 */
export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina accents
    .replace(/[^a-z0-9\s]/g, ' ')    // Substitueix caràcters especials per espais
    .replace(/\s+/g, ' ')            // Normalitza espais múltiples
    .trim();
}

/**
 * Extreu els tokens significatius d'un nom (ignorant paraules curtes com "de", "la", "sl", etc.)
 */
export function extractNameTokens(name: string): string[] {
  const normalized = normalizeForMatching(name);
  const stopWords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'i', 'y', 'a', 'en', 'amb', 'per', 'sl', 'sa', 'slu', 'sll', 'sc', 'cb', 'coop']);

  return normalized
    .split(' ')
    .filter(token => token.length >= 2 && !stopWords.has(token));
}

/**
 * Calcula quants tokens del nom apareixen a la descripció
 */
function countMatchingTokens(nameTokens: string[], descriptionNormalized: string): number {
  return nameTokens.filter(token => descriptionNormalized.includes(token)).length;
}

/**
 * Resultat del matching
 */
export interface MatchResult {
  contactId: string;
  contactType: 'donor' | 'supplier' | 'employee';
  contactName: string;
  confidence: number;      // 0-1, percentatge de tokens que coincideixen
  matchedTokens: string[]; // Tokens que han coincidit
}

/**
 * Intenta trobar un contacte que coincideixi amb la descripció bancària
 *
 * Estratègia:
 * 1. Normalitza la descripció
 * 2. Per cada contacte, extreu els tokens significatius del nom
 * 3. Compta quants tokens apareixen a la descripció
 * 4. Retorna el contacte amb més coincidències (si supera el llindar mínim)
 *
 * @param description Descripció bancària del moviment
 * @param contacts Llista de contactes disponibles
 * @param minTokensRequired Mínim de tokens que han de coincidir (default: 2, o 1 si el nom té un sol token)
 * @returns MatchResult o null si no hi ha coincidència
 */
export function findMatchingContact(
  description: string,
  contacts: AnyContact[],
  minTokensRequired: number = 2
): MatchResult | null {
  if (!description || !contacts || contacts.length === 0) {
    return null;
  }

  const descNormalized = normalizeForMatching(description);

  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const contact of contacts) {
    if (!contact.name) continue;

    const nameTokens = extractNameTokens(contact.name);
    if (nameTokens.length === 0) continue;

    // Per noms d'un sol token (ex: "Amazon"), baixem el llindar
    const effectiveMinTokens = Math.min(minTokensRequired, nameTokens.length);

    const matchedTokens = nameTokens.filter(token => descNormalized.includes(token));
    const matchCount = matchedTokens.length;

    // Si no arriba al mínim, saltar
    if (matchCount < effectiveMinTokens) continue;

    // Calcular confiança: % de tokens que coincideixen
    const confidence = matchCount / nameTokens.length;

    // Prioritzar per: més tokens coincidits, després per major confiança
    const score = matchCount * 100 + confidence * 10;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        contactId: contact.id,
        contactType: contact.type as 'donor' | 'supplier' | 'employee',
        contactName: contact.name,
        confidence,
        matchedTokens,
      };
    }
  }

  return bestMatch;
}

/**
 * Processa múltiples transaccions i retorna les que han tingut match
 */
export function batchFindMatchingContacts(
  transactions: Array<{ description: string; [key: string]: any }>,
  contacts: AnyContact[]
): Map<number, MatchResult> {
  const results = new Map<number, MatchResult>();

  transactions.forEach((tx, index) => {
    const match = findMatchingContact(tx.description, contacts);
    if (match) {
      results.set(index, match);
    }
  });

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORCED CATEGORY BY DESCRIPTION
// ═══════════════════════════════════════════════════════════════════════════════
// Detecta ingressos especials (loteria, voluntariat) per la descripció bancària
// i retorna la categoria forçada corresponent
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Keywords per detectar ingressos de loteria
 * Match si la descripció conté alguna d'aquestes paraules
 */
const LOTTERY_KEYWORDS = [
  'loteria',
  'papeleta',
  'papeletas',
  'rifa',
  'sorteo',
  'sorteig',
];

/**
 * Keywords per detectar ingressos de voluntariat
 */
const VOLUNTEER_KEYWORDS = [
  'voluntario',
  'voluntarios',
  'voluntari',
  'voluntaris',
  'voluntariat',
  'voluntariado',
  'volunfair',
];

/**
 * Noms de categoria normalitzats que matchegen amb loteria
 */
const LOTTERY_CATEGORY_NAMES = ['loteria'];

/**
 * Noms de categoria normalitzats que matchegen amb voluntariat
 */
const VOLUNTEER_CATEGORY_NAMES = [
  'voluntarios',
  'voluntaris',
  'voluntariat',
  'voluntariado',
];

/**
 * Detecta si una descripció bancària correspon a un ingrés especial
 * (loteria o voluntariat) i retorna el categoryId corresponent.
 *
 * Ordre de prioritat:
 * 1. Si la descripció conté keywords de loteria → cerca categoria "loteria"
 * 2. Si la descripció conté keywords de voluntariat → cerca categoria "voluntarios/voluntaris/..."
 *
 * @param description Descripció bancària del moviment
 * @param categories Llista de categories disponibles
 * @returns categoryId si hi ha match, null altrament
 */
export function getForcedIncomeCategoryIdByBankDescription(
  description: string,
  categories: Category[]
): string | null {
  if (!description || !categories || categories.length === 0) {
    return null;
  }

  const descNormalized = normalizeForMatching(description);

  // 1. Comprovar si és loteria
  const isLottery = LOTTERY_KEYWORDS.some(kw => descNormalized.includes(kw));
  if (isLottery) {
    const lotteryCategory = categories.find(cat => {
      const catNameNormalized = normalizeForMatching(cat.name);
      return LOTTERY_CATEGORY_NAMES.some(name => catNameNormalized.includes(name));
    });
    if (lotteryCategory) {
      return lotteryCategory.id;
    }
  }

  // 2. Comprovar si és voluntariat
  const isVolunteer = VOLUNTEER_KEYWORDS.some(kw => descNormalized.includes(kw));
  if (isVolunteer) {
    const volunteerCategory = categories.find(cat => {
      const catNameNormalized = normalizeForMatching(cat.name);
      return VOLUNTEER_CATEGORY_NAMES.some(name => catNameNormalized.includes(name));
    });
    if (volunteerCategory) {
      return volunteerCategory.id;
    }
  }

  return null;
}
