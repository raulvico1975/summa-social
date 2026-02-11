/**
 * Helper per obtenir el sufix curt de periodicitat (€/mes, €/trimestre, etc.)
 */
export function getPeriodicitySuffix(
  periodicityQuota: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'manual' | null | undefined,
  t: { donors: { periodicitySuffix: { monthly: string; quarterly: string; semiannual: string; annual: string; default: string } } }
): string {
  const s = t.donors.periodicitySuffix;
  switch (periodicityQuota) {
    case 'monthly':    return s.monthly;
    case 'quarterly':  return s.quarterly;
    case 'semiannual': return s.semiannual;
    case 'annual':     return s.annual;
    default:           return s.default;
  }
}
