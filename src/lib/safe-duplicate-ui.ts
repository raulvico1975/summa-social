import type { DedupeReason } from './transaction-dedupe';

export interface SafeDuplicateUi {
  mainKey: string;
  mainFallback: string;
  detailKey: string | null;
  detailFallback: string | null;
  labelKey: string;
  labelFallback: string;
  showExistingId: boolean;
}

/**
 * UI mapping per explicar "duplicat segur" en llenguatge no tècnic.
 * Guardrail: per motiu desconegut no exposem detalls interns ni ID.
 */
export function getSafeDuplicateUi(reason: DedupeReason | null): SafeDuplicateUi {
  switch (reason) {
    case 'INTRA_FILE':
      return {
        mainKey: 'movements.import.safeDuplicates.reason.intraFile.main',
        mainFallback: 'Aquesta línia està repetida dins del fitxer.',
        detailKey: 'movements.import.safeDuplicates.reason.intraFile.detail',
        detailFallback: "Apareix duplicada dins del fitxer que has pujat.",
        labelKey: 'movements.import.safeDuplicates.reason.intraFile.label',
        labelFallback: 'Línia repetida al fitxer',
        showExistingId: false,
      };
    case 'BANK_REF':
      return {
        mainKey: 'movements.import.safeDuplicates.reason.bankRef.main',
        mainFallback: 'Aquest moviment ja existeix al sistema.',
        detailKey: 'movements.import.safeDuplicates.reason.bankRef.detail',
        detailFallback: 'Coincideix amb un moviment que té la mateixa referència del banc.',
        labelKey: 'movements.import.safeDuplicates.reason.bankRef.label',
        labelFallback: 'Referència bancària',
        showExistingId: true,
      };
    case 'BALANCE_AMOUNT_DATE':
      return {
        mainKey: 'movements.import.safeDuplicates.reason.balanceAmountDate.main',
        mainFallback: 'Aquest moviment ja existeix al sistema.',
        detailKey: 'movements.import.safeDuplicates.reason.balanceAmountDate.detail',
        detailFallback: 'Coincideix amb un moviment amb la mateixa data, el mateix import i el mateix saldo final.',
        labelKey: 'movements.import.safeDuplicates.reason.balanceAmountDate.label',
        labelFallback: 'Coincidència completa',
        showExistingId: true,
      };
    default:
      return {
        mainKey: 'movements.import.safeDuplicates.reason.unknown.main',
        mainFallback: 'Aquest moviment ja existeix al sistema.',
        detailKey: null,
        detailFallback: null,
        labelKey: 'movements.import.safeDuplicates.reason.unknown.label',
        labelFallback: 'Altres',
        showExistingId: false,
      };
  }
}
