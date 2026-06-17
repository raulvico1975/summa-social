'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/i18n';
import {
  formatEuropeanAmountInput,
  formatEuropeanCurrency,
  getFundingExpenseStatus,
  getProjectImputedAmountForExpense,
  parseEuropeanAmountInput,
} from '@/lib/project-module-funding';
import type {
  BudgetLine,
  ProjectFundingExpenseAllocation,
  ProjectFundingExpenseAllocationFormLine,
  ProjectFundingSource,
  UnifiedExpenseWithLink,
} from '@/lib/project-module-types';

function formatAmount(amount: number): string {
  return formatEuropeanCurrency(amount);
}

function getImputedAmount(expense: UnifiedExpenseWithLink, projectId: string): number {
  return expense.link ? getProjectImputedAmountForExpense(expense.link, projectId) : 0;
}

export function ProjectFundingExpenseDialog({
  open,
  onOpenChange,
  expense,
  projectId,
  fundingSources,
  budgetLines,
  allocations,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: UnifiedExpenseWithLink | null;
  projectId: string;
  fundingSources: ProjectFundingSource[];
  budgetLines: BudgetLine[];
  allocations: ProjectFundingExpenseAllocation[];
  isSaving: boolean;
  onSave: (lines: ProjectFundingExpenseAllocationFormLine[]) => Promise<void>;
}) {
  const { tr } = useTranslations();
  const activeSources = React.useMemo(
    () => fundingSources
      .filter((source) => source.archivedAt === null)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [fundingSources]
  );
  const [lines, setLines] = React.useState<ProjectFundingExpenseAllocationFormLine[]>([]);
  const imputedAmount = expense ? getImputedAmount(expense, projectId) : 0;
  const distributedAmount = lines.reduce((sum, line) => {
    let parsed = 0;
    try {
      parsed = parseEuropeanAmountInput(line.amountEUR, { required: true });
    } catch {
      parsed = 0;
    }
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);
  const status = getFundingExpenseStatus({ imputedAmountEUR: imputedAmount, distributedAmountEUR: distributedAmount });
  const pendingAmount = Math.max(0, imputedAmount - distributedAmount);

  React.useEffect(() => {
    if (!open || !expense) return;
    const existing = allocations
      .filter((allocation) => allocation.expenseLinkId === expense.expense.txId)
      .map((allocation) => ({
        id: allocation.id,
        fundingSourceId: allocation.fundingSourceId,
        amountEUR: formatEuropeanAmountInput(allocation.amountEUR),
        kind: allocation.kind,
        budgetLineId: allocation.budgetLineId ?? '',
        notes: allocation.notes ?? '',
      }));
    setLines(existing.length > 0 ? existing : [emptyLine(activeSources[0]?.id ?? '')]);
  }, [allocations, activeSources, expense, open]);

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[min(96vw,78rem)] flex-col overflow-hidden p-0 sm:w-[min(calc(100vw-3rem),78rem)]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{tr('projectModule.multiFunding.distributeExpense')}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-2 rounded-md bg-muted/40 p-3 text-sm md:grid-cols-3">
            <div>
              <span className="text-muted-foreground">{tr('projectModule.multiFunding.imputedAmount')}:</span>{' '}
              <span className="font-mono font-medium">{formatAmount(imputedAmount)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{tr('projectModule.multiFunding.distributedAmount')}:</span>{' '}
              <span className="font-mono font-medium">{formatAmount(distributedAmount)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{tr('projectModule.multiFunding.difference')}:</span>{' '}
              <span className="font-mono font-medium">{formatAmount(imputedAmount - distributedAmount)}</span>
            </div>
          </div>

          {status !== 'balanced' && (
            <Alert>
              <AlertDescription>{tr(`projectModule.multiFunding.statusHelp.${status}`)}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-[minmax(180px,1.3fr)_150px_120px_minmax(180px,1.2fr)_auto]">
                <div className="space-y-1">
                  <Label>{tr('projectModule.multiFunding.sourceName')}</Label>
                  <Select value={line.fundingSourceId} onValueChange={(value) => updateLine(index, { fundingSourceId: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{tr('projectModule.multiFunding.amount')}</Label>
                  <Input
                    inputMode="decimal"
                    value={line.amountEUR}
                    onChange={(event) => updateLine(index, { amountEUR: event.target.value })}
                    onBlur={(event) => {
                      try {
                        const parsed = parseEuropeanAmountInput(event.currentTarget.value, { required: true });
                        updateLine(index, { amountEUR: formatEuropeanAmountInput(parsed) });
                      } catch {
                        // El guardat mostrarà l'error de domini si cal.
                      }
                    }}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={line.kind === 'in_kind'}
                      onCheckedChange={(checked) => updateLine(index, { kind: checked === true ? 'in_kind' : 'cash' })}
                    />
                    {tr('projectModule.multiFunding.kindInKind')}
                  </label>
                </div>
                <div className="space-y-1">
                  <Label>{tr('projectModule.multiFunding.specificBudgetLine')}</Label>
                  <Select value={line.budgetLineId || '__inherit'} onValueChange={(value) => updateLine(index, { budgetLineId: value === '__inherit' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__inherit">{tr('projectModule.multiFunding.inheritBudgetLine')}</SelectItem>
                      {budgetLines.map((budgetLine) => (
                        <SelectItem key={budgetLine.id} value={budgetLine.id}>
                          {budgetLine.code ? `${budgetLine.code} - ${budgetLine.name}` : budgetLine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => updateLine(index, { amountEUR: formatEuropeanAmountInput(pendingAmount) })}>
                    {tr('projectModule.multiFunding.fillPending')}
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setLines((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="md:col-span-5">
                  <Textarea
                    rows={2}
                    placeholder={tr('projectModule.multiFunding.notes')}
                    value={line.notes}
                    onChange={(event) => updateLine(index, { notes: event.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={() => setLines((prev) => [...prev, emptyLine(activeSources[0]?.id ?? '')])}>
            <Plus className="mr-2 h-4 w-4" />
            {tr('projectModule.multiFunding.addLine')}
          </Button>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>{tr('common.cancel')}</Button>
          <Button onClick={() => onSave(lines)} disabled={isSaving || activeSources.length === 0}>{tr('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  function updateLine(index: number, patch: Partial<ProjectFundingExpenseAllocationFormLine>) {
    setLines((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }
}

function emptyLine(fundingSourceId: string): ProjectFundingExpenseAllocationFormLine {
  return {
    fundingSourceId,
    amountEUR: '',
    kind: 'cash',
    budgetLineId: '',
    notes: '',
  };
}
