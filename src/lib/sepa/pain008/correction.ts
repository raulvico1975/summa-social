export function buildSepaCollectionCorrectionFields(sourceRunId: string | null | undefined): {
  correctedFromRunId: string | null;
} {
  return {
    correctedFromRunId: sourceRunId ?? null,
  };
}
