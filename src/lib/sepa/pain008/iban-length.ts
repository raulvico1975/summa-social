/**
 * Validació de longitud d'IBAN per país (ISO 13616)
 * Detecta IBANs incomplets abans d'incloure'ls a una remesa SEPA
 */

/** Longituds oficials IBAN per codi de país (SEPA) */
export const IBAN_LENGTHS_BY_COUNTRY: Record<string, number> = {
  ES: 24,
  FR: 27,
  DE: 22,
  IT: 27,
  PT: 25,
  BE: 16,
  NL: 18,
  AT: 20,
  IE: 22,
  LU: 20,
  GB: 22,
};

/**
 * Comprova si un IBAN té la longitud correcta pel seu país.
 * Retorna null si és correcte o si el país no és al mapa (no bloqueja).
 */
export function getIbanLengthIssue(
  iban?: string | null,
): { country: string; length: number; expected: number } | null {
  if (!iban) return null;
  const n = iban.replace(/\s+/g, '').toUpperCase();
  if (n.length < 2) return null;

  const country = n.slice(0, 2);
  const expected = IBAN_LENGTHS_BY_COUNTRY[country];
  if (!expected) return null;

  if (n.length !== expected) {
    return { country, length: n.length, expected };
  }
  return null;
}
