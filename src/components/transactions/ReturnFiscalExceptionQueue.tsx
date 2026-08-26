'use client';

import * as React from 'react';
import type { User } from 'firebase/auth';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import type { OrganizationRole } from '@/lib/data';
import type { ReturnFiscalException, Transaction } from '@/lib/data';
import {
  checkFiscalReturnReadiness,
  isCompleteReturnFiscalException,
} from '@/lib/fiscal/return-fiscal-readiness';
import { formatCurrencyEU } from '@/lib/normalize';
import { useTranslations } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReturnFiscalExceptionQueueProps {
  transactions: Transaction[];
  organizationId: string | null;
  user: User | null;
  userRole: OrganizationRole | null;
  isSuperAdmin: boolean;
}

type Operation = 'create' | 'revoke';

function isRemittanceParent(transaction: Transaction): boolean {
  if (transaction.isRemittanceItem === true) return false;
  return (transaction.isRemittance === true
    || (transaction.isSplit === true && !transaction.parentTransactionId))
    || (transaction.remittanceType === 'returns' && !transaction.parentTransactionId);
}

function isActiveReturn(transaction: Transaction): boolean {
  return !transaction.archivedAt
    && transaction.transactionType === 'return'
    && Number.isFinite(transaction.amount)
    && transaction.amount < 0
    && !isRemittanceParent(transaction);
}

export function getReturnFiscalExceptionQueueItems(
  transactions: Transaction[],
  organizationId: string
): Transaction[] {
  const transactionsByYear = new Map<number, Transaction[]>();
  for (const transaction of transactions) {
    const year = Number(transaction.date.slice(0, 4));
    if (!Number.isInteger(year)) continue;
    const yearTransactions = transactionsByYear.get(year) ?? [];
    yearTransactions.push(transaction);
    transactionsByYear.set(year, yearTransactions);
  }

  const unresolvedIds = new Set<string>();
  for (const [year, yearTransactions] of transactionsByYear) {
    const result = checkFiscalReturnReadiness({
      organizationId,
      year,
      transactions: yearTransactions,
    });
    result.unresolvedReturns.forEach((item) => unresolvedIds.add(item.id));
  }

  return transactions
    .filter(isActiveReturn)
    .filter((transaction) => (
      unresolvedIds.has(transaction.id)
      || isCompleteReturnFiscalException(transaction.returnFiscalException)
    ))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function ReturnFiscalExceptionQueue({
  transactions,
  organizationId,
  user,
  userRole,
  isSuperAdmin,
}: ReturnFiscalExceptionQueueProps) {
  const { tr } = useTranslations();
  const { toast } = useToast();
  const [localExceptions, setLocalExceptions] = React.useState<Record<string, ReturnFiscalException | null>>({});
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);
  const [reason, setReason] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const canManage = isSuperAdmin || userRole === 'admin';
  const returns = React.useMemo(
    () => getReturnFiscalExceptionQueueItems(transactions, organizationId ?? ''),
    [organizationId, transactions]
  );

  const getException = React.useCallback((transaction: Transaction) => {
    if (Object.prototype.hasOwnProperty.call(localExceptions, transaction.id)) {
      return localExceptions[transaction.id];
    }
    return isCompleteReturnFiscalException(transaction.returnFiscalException)
      ? transaction.returnFiscalException
      : null;
  }, [localExceptions]);

  const submit = React.useCallback(async (
    transaction: Transaction,
    operation: Operation,
    operationReason?: string,
  ) => {
    if (!organizationId || !user || !canManage) return;
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/fiscal/returns/exception', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          organizationId,
          transactionId: transaction.id,
          operation,
          ...(operation === 'create' ? { reason: operationReason?.trim() ?? '' } : {}),
        }),
      });
      const payload = await response.json().catch(() => ({})) as {
        returnFiscalException?: ReturnFiscalException | null;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || tr('fiscalReturns.exception.saveError', 'No s’ha pogut actualitzar l’excepció fiscal.'));
      }
      setLocalExceptions((current) => ({
        ...current,
        [transaction.id]: payload.returnFiscalException ?? null,
      }));
      toast({
        title: operation === 'create'
          ? tr('fiscalReturns.exception.saved', 'Excepció fiscal desada')
          : tr('fiscalReturns.exception.revoked', 'Excepció fiscal revocada'),
      });
      setSelectedTransaction(null);
      setReason('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: tr('common.error', 'Error'),
        description: error instanceof Error
          ? error.message
          : tr('fiscalReturns.exception.saveError', 'No s’ha pogut actualitzar l’excepció fiscal.'),
      });
    } finally {
      setIsSaving(false);
    }
  }, [canManage, organizationId, toast, tr, user]);

  if (returns.length === 0) return null;

  return (
    <section className="mb-4 rounded-lg border border-amber-300/70 bg-amber-50/70 p-4 dark:border-amber-700/70 dark:bg-amber-950/20" aria-label={tr('fiscalReturns.title', 'Devolucions fiscals pendents')}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-amber-950 dark:text-amber-100">
            {tr('fiscalReturns.title', 'Revisió de devolucions fiscals')}
          </h2>
          <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
            {tr('fiscalReturns.description', 'Abans de generar el Model 182 o certificats, cada devolució activa ha de tenir un vincle verificat o una excepció històrica aprovada.')}
          </p>
          <p className="mt-1 text-xs text-amber-900/70 dark:text-amber-200/70">
            {tr('fiscalReturns.assignmentNotEnough', 'Assignar només el donant no valida el vincle amb la donació original.')}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2" aria-live="polite">
        {returns.map((transaction) => {
          const exception = getException(transaction);
          return (
            <li key={transaction.id} className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-background/80 px-3 py-2 text-sm dark:border-amber-800">
              {exception ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
              )}
              <span className="font-medium">{transaction.date.slice(0, 10)}</span>
              <span>{formatCurrencyEU(Math.abs(transaction.amount))}</span>
              <span className="text-muted-foreground">{transaction.id}</span>
              <span className="ml-auto text-xs font-medium">
                {exception
                  ? tr('fiscalReturns.exception.active', 'Excepció aprovada')
                  : tr('fiscalReturns.exception.required', 'Revisió necessària')}
              </span>
              {canManage && exception && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => void submit(transaction, 'revoke')}
                >
                  {tr('fiscalReturns.exception.revoke', 'Revocar')}
                </Button>
              )}
              {canManage && !exception && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => {
                    setSelectedTransaction(transaction);
                    setReason('');
                  }}
                >
                  {tr('fiscalReturns.exception.approve', 'Aprovar excepció')}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog
        open={selectedTransaction !== null}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            setSelectedTransaction(null);
            setReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('fiscalReturns.exception.dialogTitle', 'Aprovar excepció fiscal')}</DialogTitle>
            <DialogDescription>
              {tr('fiscalReturns.exception.dialogDescription', 'Descriu la justificació històrica. El servidor registrarà l’hora i l’usuari aprovador.')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={tr('fiscalReturns.exception.reasonPlaceholder', 'Motiu documentat')}
            minLength={3}
            disabled={isSaving}
          />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setSelectedTransaction(null)}>
              {tr('common.cancel', 'Cancel·lar')}
            </Button>
            <Button
              type="button"
              disabled={isSaving || reason.trim().length < 3 || !selectedTransaction}
              onClick={() => selectedTransaction && void submit(selectedTransaction, 'create', reason)}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {tr('fiscalReturns.exception.save', 'Desar aprovació')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
