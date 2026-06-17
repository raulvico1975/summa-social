'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle, Circle, Split } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from '@/i18n';
import {
  formatEuropeanCurrency,
  getProjectBudgetLineForExpense,
  getProjectImputedAmountForExpense,
  getFundingExpenseStatus,
  sumFundingExpenseAllocations,
} from '@/lib/project-module-funding';
import type {
  BudgetLine,
  ProjectFundingExpenseAllocation,
  ProjectFundingExpenseAllocationFormLine,
  ProjectFundingSource,
  UnifiedExpenseWithLink,
} from '@/lib/project-module-types';
import { ProjectFundingExpenseDialog } from './project-funding-expense-dialog';

function formatAmount(amount: number): string {
  return formatEuropeanCurrency(amount);
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function imputedAmount(expense: UnifiedExpenseWithLink, projectId: string): number {
  return expense.link ? getProjectImputedAmountForExpense(expense.link, projectId) : 0;
}

function budgetLineLabel(expense: UnifiedExpenseWithLink, budgetLines: BudgetLine[], projectId: string): string {
  const id = expense.link ? getProjectBudgetLineForExpense(expense.link, projectId) : null;
  const line = budgetLines.find((item) => item.id === id);
  if (!line) return '-';
  return line.code ? `${line.code} - ${line.name}` : line.name;
}

export function ProjectFundingExpenseDistribution({
  projectId,
  expenses,
  fundingSources,
  budgetLines,
  expenseAllocations,
  isSaving,
  onSaveExpenseAllocations,
}: {
  projectId: string;
  expenses: UnifiedExpenseWithLink[];
  fundingSources: ProjectFundingSource[];
  budgetLines: BudgetLine[];
  expenseAllocations: ProjectFundingExpenseAllocation[];
  isSaving: boolean;
  onSaveExpenseAllocations: (expense: UnifiedExpenseWithLink, lines: ProjectFundingExpenseAllocationFormLine[]) => Promise<void>;
}) {
  const { tr } = useTranslations();
  const [dialogExpense, setDialogExpense] = React.useState<UnifiedExpenseWithLink | null>(null);
  const activeSources = fundingSources
    .filter((source) => source.archivedAt === null)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{tr('projectModule.multiFunding.expensesTitle')}</CardTitle>
          <CardDescription>{tr('projectModule.multiFunding.expensesDescription')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr('projectModule.multiFunding.noExpenses')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr('projectModule.expensesPage.tableDate')}</TableHead>
                <TableHead>{tr('projectModule.expensesPage.tableDescription')}</TableHead>
                <TableHead>{tr('projectModule.expensesPage.tableCounterparty')}</TableHead>
                <TableHead>{tr('projectModule.lineName')}</TableHead>
                <TableHead className="text-right">{tr('projectModule.multiFunding.imputedAmount')}</TableHead>
                <TableHead className="text-right">{tr('projectModule.multiFunding.distributedAmount')}</TableHead>
                <TableHead>{tr('projectModule.status')}</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => {
                const imputed = imputedAmount(expense, projectId);
                const distributed = sumFundingExpenseAllocations(expenseAllocations, { expenseLinkId: expense.expense.txId });
                const status = getFundingExpenseStatus({ imputedAmountEUR: imputed, distributedAmountEUR: distributed });

                return (
                  <TableRow key={expense.expense.txId}>
                    <TableCell>{formatDate(expense.expense.date)}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{expense.expense.description ?? '-'}</TableCell>
                    <TableCell>{expense.expense.counterpartyName ?? '-'}</TableCell>
                    <TableCell>{budgetLineLabel(expense, budgetLines, projectId)}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(imputed)}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(distributed)}</TableCell>
                    <TableCell><StatusBadge status={status} label={tr(`projectModule.multiFunding.status.${status}`)} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setDialogExpense(expense)} disabled={activeSources.length === 0}>
                        <Split className="mr-2 h-4 w-4" />
                        {tr('projectModule.multiFunding.distribute')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <ProjectFundingExpenseDialog
        open={dialogExpense !== null}
        onOpenChange={(open) => {
          if (!open) setDialogExpense(null);
        }}
        expense={dialogExpense}
        projectId={projectId}
        fundingSources={activeSources}
        budgetLines={budgetLines}
        allocations={expenseAllocations}
        isSaving={isSaving}
        onSave={async (lines) => {
          if (!dialogExpense) return;
          await onSaveExpenseAllocations(dialogExpense, lines);
          setDialogExpense(null);
        }}
      />
    </Card>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  if (status === 'balanced') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (status === 'undistributed') {
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
        <Circle className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
      <AlertTriangle className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}
