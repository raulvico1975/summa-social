// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-MATCH - Sistema d'assignació automàtica de contactes
// ═══════════════════════════════════════════════════════════════════════════════
// Matching local sense IA: cerca el nom del contacte a la descripció bancària
// ═══════════════════════════════════════════════════════════════════════════════

import type { AnyContact } from './data';

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
