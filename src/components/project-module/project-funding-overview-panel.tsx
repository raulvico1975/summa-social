'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from '@/i18n';
import {
  formatEuropeanCurrency,
  sumFundingBudgetAllocations,
  sumFundingExpenseAllocations,
} from '@/lib/project-module-funding';
import type {
  BudgetLine,
  ProjectFundingBudgetAllocation,
  ProjectFundingExpenseAllocation,
  ProjectFundingSource,
} from '@/lib/project-module-types';

function formatAmount(amount: number | null | undefined): string {
  return formatEuropeanCurrency(amount);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function ProjectFundingOverviewPanel({
  projectBudgetEUR,
  budgetLines,
  fundingSources,
  budgetAllocations,
  expenseAllocations,
  executionByLine,
  totalProjectExecution,
  pendingFxCount,
}: {
  projectBudgetEUR: number | null;
  budgetLines: BudgetLine[];
  fundingSources: ProjectFundingSource[];
  budgetAllocations: ProjectFundingBudgetAllocation[];
  expenseAllocations: ProjectFundingExpenseAllocation[];
  executionByLine: Map<string, number>;
  totalProjectExecution: number;
  pendingFxCount: number;
}) {
  const { t, tr } = useTranslations();
  const [expandedSourceId, setExpandedSourceId] = React.useState<string | null>(null);
  const activeSources = React.useMemo(
    () => fundingSources
      .filter((source) => source.archivedAt === null)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [fundingSources]
  );

  const budgetFromLines = React.useMemo(
    () => budgetLines.reduce((sum, line) => sum + line.budgetedAmountEUR, 0),
    [budgetLines]
  );
  const referenceBudget = projectBudgetEUR ?? budgetFromLines;
  const pendingExecution = referenceBudget !== null ? referenceBudget - totalProjectExecution : null;
  const receivedTotal = activeSources.reduce((sum, source) => sum + (source.receivedAmountEUR ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tr('projectModule.multiFunding.trackingApproved')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatAmount(referenceBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tr('projectModule.executed')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatAmount(totalProjectExecution)}</p>
            {pendingFxCount > 0 && (
              <p className="mt-1 text-xs text-amber-600">
                {pendingFxCount === 1
                  ? t.projectModule.fxPendingCountSingular
                  : t.projectModule.fxPendingCountPlural.replace('{{count}}', String(pendingFxCount))}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tr('projectModule.pending')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${pendingExecution !== null && pendingExecution < 0 ? 'text-red-600' : ''}`}>
              {pendingExecution === null ? '-' : formatAmount(Math.abs(pendingExecution))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tr('projectModule.multiFunding.receivedAmount')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatAmount(receivedTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr('projectModule.multiFunding.trackingByBudgetLine')}</CardTitle>
          <CardDescription>{tr('projectModule.multiFunding.trackingByBudgetLineDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {budgetLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr('projectModule.budget.noBudgetLinesHint')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr('projectModule.lineName')}</TableHead>
                  <TableHead className="text-right">{tr('projectModule.budgeted')}</TableHead>
                  <TableHead className="text-right">{tr('projectModule.executed')}</TableHead>
                  <TableHead className="text-right">{tr('projectModule.pending')}</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetLines.map((line) => {
                  const executed = executionByLine.get(line.id) ?? 0;
                  const pending = line.budgetedAmountEUR - executed;
                  const percent = line.budgetedAmountEUR > 0 ? (executed / line.budgetedAmountEUR) * 100 : 0;

                  return (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.code ? `${line.code} - ${line.name}` : line.name}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(line.budgetedAmountEUR)}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(executed)}</TableCell>
                      <TableCell className={`text-right font-mono ${pending < 0 ? 'text-red-600' : ''}`}>
                        {formatAmount(Math.abs(pending))}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatPercent(percent)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr('projectModule.multiFunding.trackingBySource')}</CardTitle>
          <CardDescription>{tr('projectModule.multiFunding.trackingBySourceDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {activeSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr('projectModule.multiFunding.noSources')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr('projectModule.multiFunding.sourceName')}</TableHead>
                  <TableHead className="text-right">{tr('projectModule.multiFunding.approvedAmount')}</TableHead>
                  <TableHead className="text-right">{tr('projectModule.executed')}</TableHead>
                  <TableHead className="text-right">{tr('projectModule.pending')}</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSources.map((source) => {
                  const approved = source.approvedAmountEUR ?? 0;
                  const executed = sumFundingExpenseAllocations(expenseAllocations, { fundingSourceId: source.id });
                  const pending = approved - executed;
                  const percent = approved > 0 ? (executed / approved) * 100 : 0;
                  const isExpanded = expandedSourceId === source.id;

                  return (
                    <React.Fragment key={source.id}>
                      <TableRow>
                        <TableCell className="font-medium">
                          <Button
                            variant="ghost"
                            className="-ml-2 h-auto justify-start gap-2 px-2 py-1 font-medium"
                            onClick={() => setExpandedSourceId((current) => current === source.id ? null : source.id)}
                            aria-expanded={isExpanded}
                          >
                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            <span>{source.name}</span>
                          </Button>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(source.approvedAmountEUR)}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(executed)}</TableCell>
                        <TableCell className={`text-right font-mono ${pending < 0 ? 'text-red-600' : ''}`}>
                          {formatAmount(Math.abs(pending))}
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatPercent(percent)}</TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/20 p-0">
                            <div className="px-4 py-3">
                              <div className="mb-2 text-xs font-medium text-muted-foreground">
                                {tr('projectModule.multiFunding.sourceBudgetLineDetail')}
                              </div>
                              <div className="overflow-x-auto rounded-md border bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>{tr('projectModule.lineName')}</TableHead>
                                      <TableHead className="text-right">{tr('projectModule.multiFunding.approvedAmount')}</TableHead>
                                      <TableHead className="text-right">{tr('projectModule.executed')}</TableHead>
                                      <TableHead className="text-right">{tr('projectModule.pending')}</TableHead>
                                      <TableHead className="text-right">%</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {budgetLines.map((line) => {
                                      const lineApproved = sumFundingBudgetAllocations(budgetAllocations, {
                                        budgetLineId: line.id,
                                        fundingSourceId: source.id,
                                      });
                                      const lineExecuted = sumFundingExpenseAllocations(expenseAllocations, {
                                        budgetLineId: line.id,
                                        fundingSourceId: source.id,
                                      });
                                      const linePending = lineApproved - lineExecuted;
                                      const linePercent = lineApproved > 0 ? (lineExecuted / lineApproved) * 100 : 0;

                                      return (
                                        <TableRow key={line.id}>
                                          <TableCell className="font-medium">{line.code ? `${line.code} - ${line.name}` : line.name}</TableCell>
                                          <TableCell className="text-right font-mono">{formatAmount(lineApproved)}</TableCell>
                                          <TableCell className="text-right font-mono">{formatAmount(lineExecuted)}</TableCell>
                                          <TableCell className={`text-right font-mono ${linePending < 0 ? 'text-red-600' : ''}`}>
                                            {formatAmount(Math.abs(linePending))}
                                          </TableCell>
                                          <TableCell className="text-right font-mono">{formatPercent(linePercent)}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr('projectModule.multiFunding.treasuryBySource')}</CardTitle>
          <CardDescription>{tr('projectModule.multiFunding.treasuryBySourceDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {activeSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr('projectModule.multiFunding.noSources')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr('projectModule.multiFunding.sourceName')}</TableHead>
                  <TableHead className="text-right">{tr('projectModule.multiFunding.approvedAmount')}</TableHead>
                  <TableHead className="text-right">{tr('projectModule.multiFunding.receivedAmount')}</TableHead>
                  <TableHead className="text-right">{tr('projectModule.multiFunding.pendingToReceive')}</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSources.map((source) => {
                  const approved = source.approvedAmountEUR ?? 0;
                  const received = source.receivedAmountEUR ?? 0;
                  const pending = approved - received;
                  const percent = approved > 0 ? (received / approved) * 100 : 0;

                  return (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(source.approvedAmountEUR)}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(source.receivedAmountEUR)}</TableCell>
                      <TableCell className={`text-right font-mono ${pending < 0 ? 'text-red-600' : ''}`}>
                        {formatAmount(Math.abs(pending))}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatPercent(percent)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
