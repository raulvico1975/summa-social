/**
 * Constants compartides per operacions de remeses
 */

/** Grandària dels batches per evitar límits de Firestore */
export const BATCH_SIZE = 50;

/** Camps de remesa a esborrar del pare durant undo */
export const PARENT_REMITTANCE_FIELDS = [
  'isRemittance',
  'remittanceId',
  'remittanceType',
  'remittanceDirection',
  'remittanceStatus',
  'remittanceItemCount',
  'remittanceResolvedCount',
  'remittancePendingCount',
  'remittanceExpectedTotalCents',
  'remittanceResolvedTotalCents',
  'remittancePendingTotalCents',
] as const;
