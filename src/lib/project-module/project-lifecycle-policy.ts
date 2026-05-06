export interface ProjectDeleteUsage {
  assignmentCount: number;
  budgetLineCount: number;
  fxTransferCount: number;
  transactionCount: number;
}

export interface ProjectDeletePolicy {
  canDelete: boolean;
  blockers: Array<'assignments' | 'budgetLines' | 'fxTransfers' | 'transactions'>;
}

export function resolveProjectDeletePolicy(usage: ProjectDeleteUsage): ProjectDeletePolicy {
  const blockers: ProjectDeletePolicy['blockers'] = [];

  if (usage.assignmentCount > 0) blockers.push('assignments');
  if (usage.budgetLineCount > 0) blockers.push('budgetLines');
  if (usage.fxTransferCount > 0) blockers.push('fxTransfers');
  if (usage.transactionCount > 0) blockers.push('transactions');

  return {
    canDelete: blockers.length === 0,
    blockers,
  };
}
