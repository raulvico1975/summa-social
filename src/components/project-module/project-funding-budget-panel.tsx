'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from '@/i18n';
import {
  formatEuropeanAmountInput,
  formatEuropeanCurrency,
  getFundingBudgetStatus,
  parseEuropeanAmountInput,
  sumFundingBudgetAllocations,
} from '@/lib/project-module-funding';
import type {
  BudgetLine,
  ProjectFundingBudgetAllocation,
  ProjectFundingSource,
} from '@/lib/project-module-types';

function formatAmount(amount: number): string {
  return formatEuropeanCurrency(amount);
}

export function ProjectFundingBudgetPanel({
  budgetLines,
  fundingSources,
  budgetAllocations,
  canEdit,
  onAddBudgetLine,
  onSaveAllocation,
}: {
  budgetLines: BudgetLine[];
  fundingSources: ProjectFundingSource[];
  budgetAllocations: ProjectFundingBudgetAllocation[];
  canEdit: boolean;
  onAddBudgetLine?: () => void;
  onSaveAllocation: (budgetLineId: string, fundingSourceId: string, amountEUR: string) => Promise<void>;
}) {
  const { tr } = useTranslations();
  const activeSources = fundingSources
    .filter((source) => source.archivedAt === null)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  if (activeSources.length === 0 || budgetLines.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{tr('projectModule.multiFunding.budgetTitle')}</CardTitle>
          <CardDescription>{tr('projectModule.multiFunding.budgetDescription')}</CardDescription>
        </div>
        {canEdit && onAddBudgetLine && (
          <Button variant="outline" size="sm" onClick={onAddBudgetLine}>
            <Plus className="mr-2 h-4 w-4" />
            {tr('projectModule.addBudgetLine')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">{tr('projectModule.lineName')}</TableHead>
              <TableHead className="text-right">{tr('projectModule.budgeted')}</TableHead>
              {activeSources.map((source) => (
                <TableHead key={source.id} className="min-w-[140px] text-right">{source.name}</TableHead>
              ))}
              <TableHead className="text-right">{tr('projectModule.multiFunding.difference')}</TableHead>
              <TableHead>{tr('projectModule.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgetLines.map((line) => {
              const assigned = sumFundingBudgetAllocations(budgetAllocations, { budgetLineId: line.id });
              const difference = line.budgetedAmountEUR - assigned;
              const status = getFundingBudgetStatus(line.budgetedAmountEUR, assigned);

              return (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.code ? `${line.code} - ${line.name}` : line.name}</TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(line.budgetedAmountEUR)}</TableCell>
                  {activeSources.map((source) => {
                    const value = sumFundingBudgetAllocations(budgetAllocations, {
                      budgetLineId: line.id,
                      fundingSourceId: source.id,
                    });
                    return (
                      <TableCell key={source.id}>
                        <Input
                          className="h-8 text-right font-mono"
                          inputMode="decimal"
                          disabled={!canEdit}
                          defaultValue={value ? formatEuropeanAmountInput(value) : ''}
                          onBlur={(event) => {
                            if (!canEdit) return;
                            const rawValue = event.currentTarget.value;
                            try {
                              const parsed = parseEuropeanAmountInput(rawValue, { required: true });
                              event.currentTarget.value = formatEuropeanAmountInput(parsed);
                            } catch {
                              // El hook de guardat manté el missatge d'error de domini.
                            }
                            void onSaveAllocation(line.id, source.id, event.target.value);
                          }}
                        />
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-mono">{formatAmount(difference)}</TableCell>
                  <TableCell>
                    {status === 'balanced' ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {tr('projectModule.multiFunding.statusBalanced')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {tr(`projectModule.multiFunding.status.${status}`)}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
