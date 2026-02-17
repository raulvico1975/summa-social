export const SPLIT_AMOUNT_TOLERANCE_CENTS = 2;

export function calculateSplitAmountDeltaCents(
  parentAmountCents: number,
  lineAmountCents: number[]
): number {
  const linesSum = lineAmountCents.reduce((sum, amountCents) => sum + amountCents, 0);
  return linesSum - parentAmountCents;
}

export function isSplitAmountBalanced(
  parentAmountCents: number,
  lineAmountCents: number[],
  toleranceCents: number = SPLIT_AMOUNT_TOLERANCE_CENTS
): boolean {
  const deltaCents = calculateSplitAmountDeltaCents(parentAmountCents, lineAmountCents);
  return Math.abs(deltaCents) <= toleranceCents;
}
