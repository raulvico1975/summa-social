'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Building2, CalendarDays, CreditCard, ShieldCheck } from 'lucide-react';
import { useTranslations } from '@/i18n';
import type { BankAccount } from '@/lib/data';

export interface ConfigData {
  bankAccountId: string;
  collectionDate: string;
}

interface StepConfigProps {
  bankAccounts: BankAccount[];
  configData: ConfigData;
  onChange: (data: ConfigData) => void;
  isLoading: boolean;
}

export function StepConfig({ bankAccounts, configData, onChange, isLoading }: StepConfigProps) {
  const { t, tr } = useTranslations();

  // Filter active accounts
  const activeAccounts = React.useMemo(
    () => bankAccounts.filter(a => a.isActive !== false),
    [bankAccounts]
  );

  // Auto-select if only one account
  React.useEffect(() => {
    if (activeAccounts.length === 1 && !configData.bankAccountId) {
      onChange({ ...configData, bankAccountId: activeAccounts[0].id });
    }
  }, [activeAccounts, configData, onChange]);

  // Auto-set default collection date (today + 5 business days)
  React.useEffect(() => {
    if (!configData.collectionDate) {
      const today = new Date();
      // Add 5 days (simple approach, ignores weekends)
      today.setDate(today.getDate() + 5);
      const dateStr = today.toISOString().split('T')[0];
      onChange({ ...configData, collectionDate: dateStr });
    }
  }, [configData, onChange]);

  const selectedAccount = activeAccounts.find(a => a.id === configData.bankAccountId);
  const hasCreditorId = !!selectedAccount?.creditorId;

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <h3 className="text-base font-semibold sm:text-lg">{t.sepaCollection.config.title}</h3>

      <div className="grid items-stretch gap-3 lg:gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.8fr)] 2xl:grid-cols-[minmax(0,1.7fr)_minmax(400px,0.78fr)]">
        <section className="flex h-full flex-col space-y-4 rounded-2xl border bg-card p-3.5 shadow-sm sm:p-4 lg:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">
                {t.sepaCollection.config.bankAccount}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t.sepaCollection.config.bankAccountHint}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankAccount">{t.sepaCollection.config.bankAccount}</Label>
            <Select
              value={configData.bankAccountId}
              onValueChange={(value) => onChange({ ...configData, bankAccountId: value })}
            >
              <SelectTrigger id="bankAccount" className="h-11">
                <SelectValue placeholder={t.sepaCollection.config.bankAccountHint} />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{account.name}</span>
                      {account.isDefault && (
                        <span className="text-xs text-muted-foreground">{tr('sepaPain008.config.defaultAccount', '(defecte)')}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAccount && !hasCreditorId && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t.sepaCollection.config.noCreditorId}
                <br />
                <span className="text-xs">{t.sepaCollection.config.configureCreditorId}</span>
              </AlertDescription>
            </Alert>
          )}

          {selectedAccount && hasCreditorId && (
            <div className="rounded-2xl border bg-muted/40 p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">{selectedAccount.name}</span>
                {selectedAccount.isDefault && (
                  <span className="rounded-full border bg-background px-1.5 py-0 text-[11px] leading-5 text-muted-foreground">
                    {tr('sepaPain008.config.defaultAccount', '(defecte)')}
                  </span>
                )}
              </div>

              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border bg-background/80 p-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>{t.sepaCollection.config.creditorIdLabel}</span>
                  </div>
                  <p className="mt-1.5 break-all font-mono text-sm font-medium leading-tight text-foreground">
                    {selectedAccount.creditorId}
                  </p>
                </div>

                {selectedAccount.iban && (
                  <div className="rounded-xl border bg-background/80 p-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{t.sepaCollection.config.ibanLabel}</span>
                    </div>
                    <p className="mt-1.5 break-all font-mono text-sm font-medium leading-tight text-foreground">
                      {selectedAccount.iban}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-3 lg:h-full">
          <section className="flex h-full flex-col space-y-4 rounded-2xl border bg-card p-3.5 shadow-sm sm:p-4 lg:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarDays className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">
                  {t.sepaCollection.config.collectionDate}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t.sepaCollection.config.collectionDateHint}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collectionDate">{t.sepaCollection.config.collectionDate}</Label>
              <Input
                id="collectionDate"
                type="date"
                className="h-11"
                value={configData.collectionDate}
                onChange={(e) => onChange({ ...configData, collectionDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="rounded-2xl border bg-muted/40 p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.sepaCollection.config.scheme}</p>
                    <p className="text-sm text-muted-foreground">{t.sepaCollection.config.schemeCore}</p>
                  </div>
                  <div className="inline-flex rounded-full border bg-background px-3 py-1 text-sm font-semibold text-foreground">
                    CORE
                  </div>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
