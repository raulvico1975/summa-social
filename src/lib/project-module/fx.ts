/**
 * Calcula l'import en EUR d'una despesa off-bank amb moneda local.
 * Retorna negatiu (convenció despesa) o null si no hi ha TC vàlid.
 *
 * IMPORTANT:
 * - Aquesta és la ÚNICA funció autoritzada per convertir a EUR.
 * - No assumir mai la direcció del TC fora d'aquí.
 */
export function computeFxAmountEUR(
  originalAmount: number,
  localPct: number,
  tc: number | null
): number | null {
  if (tc === null || tc <= 0) return null;
  return -Math.abs(originalAmount * (localPct / 100) * tc);
}
