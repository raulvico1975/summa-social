export interface ContactArchiveCounts {
  activeCount: number;
  archivedCount: number;
}

export function getLinkedTransactionCount(counts: ContactArchiveCounts): number {
  return counts.activeCount + counts.archivedCount;
}

export function canArchiveContact(
  counts: ContactArchiveCounts,
  { blockIfAnyTransaction = false }: { blockIfAnyTransaction?: boolean } = {}
): boolean {
  if (blockIfAnyTransaction) {
    return getLinkedTransactionCount(counts) === 0;
  }

  return counts.activeCount === 0;
}
