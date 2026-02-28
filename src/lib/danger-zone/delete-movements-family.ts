export interface RemittanceDeleteScope {
  id: string;
  pendingIds: string[];
}

export interface DeleteMovementsFamilyInput {
  orgId: string;
  transactionIds: string[];
  remittances: RemittanceDeleteScope[];
  importRunIds: string[];
  importJobIds: string[];
}

export interface DeleteMovementsFamilyPlan {
  transactionPaths: string[];
  remittancePendingPaths: string[];
  remittancePaths: string[];
  importRunPaths: string[];
  importJobPaths: string[];
  totalDeletes: number;
}

export interface DeleteBatchExecutor {
  deleteBatch(paths: string[]): Promise<void>;
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export function isBankImportRunDoc(data: Record<string, unknown> | null | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data.type === 'bankTransactions') return true;
  if (typeof data.bankAccountId === 'string' && data.bankAccountId.trim()) return true;
  return false;
}

export function isBankImportJobDoc(data: Record<string, unknown> | null | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data.type === 'bankTransactions') return true;
  if (typeof data.inputHash === 'string' && data.inputHash.trim()) return true;
  return false;
}

export function buildDeleteMovementsFamilyPlan(
  input: DeleteMovementsFamilyInput
): DeleteMovementsFamilyPlan {
  const orgPath = `organizations/${input.orgId}`;

  const transactionPaths = uniqueNonEmpty(input.transactionIds).map(
    (id) => `${orgPath}/transactions/${id}`
  );

  const remittancePaths = uniqueNonEmpty(input.remittances.map((item) => item.id)).map(
    (id) => `${orgPath}/remittances/${id}`
  );

  const remittancePendingPaths = uniqueNonEmpty(
    input.remittances.flatMap((item) => {
      const remittanceId = item.id?.trim();
      if (!remittanceId) return [];
      return uniqueNonEmpty(item.pendingIds || []).map(
        (pendingId) => `${orgPath}/remittances/${remittanceId}/pending/${pendingId}`
      );
    })
  );

  const importRunPaths = uniqueNonEmpty(input.importRunIds).map(
    (id) => `${orgPath}/importRuns/${id}`
  );
  const importJobPaths = uniqueNonEmpty(input.importJobIds).map(
    (id) => `${orgPath}/importJobs/${id}`
  );

  return {
    transactionPaths,
    remittancePendingPaths,
    remittancePaths,
    importRunPaths,
    importJobPaths,
    totalDeletes:
      transactionPaths.length +
      remittancePendingPaths.length +
      remittancePaths.length +
      importRunPaths.length +
      importJobPaths.length,
  };
}

export function chunkPaths(paths: string[], chunkSize: number): string[][] {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error('chunkSize must be a positive integer');
  }

  const result: string[][] = [];
  for (let i = 0; i < paths.length; i += chunkSize) {
    result.push(paths.slice(i, i + chunkSize));
  }
  return result;
}

export async function executeDeleteMovementsFamilyPlan(
  plan: DeleteMovementsFamilyPlan,
  executor: DeleteBatchExecutor,
  chunkSize: number
): Promise<void> {
  const groups = [
    plan.transactionPaths,
    plan.remittancePendingPaths,
    plan.remittancePaths,
    plan.importRunPaths,
    plan.importJobPaths,
  ];

  for (const group of groups) {
    const chunks = chunkPaths(group, chunkSize);
    for (const chunk of chunks) {
      await executor.deleteBatch(chunk);
    }
  }
}
