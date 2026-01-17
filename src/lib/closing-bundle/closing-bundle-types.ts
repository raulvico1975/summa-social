/**
 * Tipus per al Paquet de Tancament (client-side)
 */

export interface ClosingBundleRequest {
  orgId: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
}

export interface ClosingBundleError {
  code: 'UNAUTHENTICATED' | 'UNAUTHORIZED' | 'INVALID_REQUEST' | 'LIMIT_EXCEEDED' | 'NO_TRANSACTIONS' | 'INTERNAL_ERROR';
  message: string;
}

export type PeriodOption = 'current_year' | 'previous_year' | 'custom';

export function getCurrentYearRange(): { dateFrom: string; dateTo: string } {
  const year = new Date().getFullYear();
  return {
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
  };
}

export function getPreviousYearRange(): { dateFrom: string; dateTo: string } {
  const year = new Date().getFullYear() - 1;
  return {
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
  };
}
