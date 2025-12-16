'use client';

import * as React from 'react';
import {
  parseStripeCsv,
  groupStripeRowsByTransfer,
  findAllMatchingPayoutGroups,
  type StripeRow,
  type Warning,
  type StripePayoutGroup,
} from './useStripeImporter';
import { formatCurrencyEU } from '@/lib/normalize';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { collection, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import type { Transaction, Category } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, AlertTriangle, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { DonorSelector, type Contact } from '@/components/contact-combobox';
import { useTranslations } from '@/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Clau interna de la categoria de despeses bancàries.
 * NOTE: Category.name emmagatzema la clau interna (nameKey), no el label visible.
 * Les categories per defecte es creen amb { name: nameKey, type } a default-data.ts.
 */
const BANK_FEES_KEY = 'bankFees';

// ════════════════════════════════════════════════════════════════════════════
// TIPUS
// ════════════════════════════════════════════════════════════════════════════

interface BankTransaction {
  id: string;
  amount: number;
  date?: string;
  description?: string;
}

interface DonorLookupResult {
  id: string;
  name: string;
  defaultCategoryId?: string | null;
}

interface StripeImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankTransaction: BankTransaction;
  lookupDonorByEmail: (email: string) => Promise<DonorLookupResult | null>;
  donors: Contact[];
  onImportDone?: () => void;
}

type DonorMatch = {
  contactId: string;
  contactName: string;
  defaultCategoryId?: string | null;
} | null;

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function StripeImporter({
  open,
  onOpenChange,
  bankTransaction,
  lookupDonorByEmail,
  donors,
  onImportDone,
}: StripeImporterProps) {
  // Hooks de Firebase i organització
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();

  // Categories de l'organització (per obtenir bankFees)
  const categoriesCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const { data: categories } = useCollection<Category>(categoriesCollection);

  // Estats
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [parsedRows, setParsedRows] = React.useState<StripeRow[]>([]);
  const [warnings, setWarnings] = React.useState<Warning[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [matchingGroups, setMatchingGroups] = React.useState<StripePayoutGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = React.useState<StripePayoutGroup | null>(null);

  // Estat de matching de donants
  const [donorMatches, setDonorMatches] = React.useState<Record<string, DonorMatch>>({});
  const [isMatchingDonors, setIsMatchingDonors] = React.useState(false);

  // Estat per modal de confirmació
  const [showConfirmation, setShowConfirmation] = React.useState(false);

  // Reset quan es tanca el modal
  React.useEffect(() => {
    if (!open) {
      setParsedRows([]);
      setWarnings([]);
      setErrorMessage(null);
      setMatchingGroups([]);
      setSelectedGroup(null);
      setDonorMatches({});
      setIsMatchingDonors(false);
      setIsSaving(false);
      setShowConfirmation(false);
    }
  }, [open]);

  // Matching automàtic de donants quan canvia selectedGroup
  React.useEffect(() => {
    if (!selectedGroup) {
      setDonorMatches({});
      return;
    }

    let cancelled = false;

    // Reinicialitzar el mapping per al nou grup (tots a null)
    // Això evita matches "fantasma" d'un grup anterior
    setDonorMatches(() => {
      const init: Record<string, DonorMatch> = {};
      selectedGroup.rows.forEach(r => { init[r.id] = null; });
      return init;
    });

    const matchDonors = async () => {
      setIsMatchingDonors(true);
      try {
        const autoMatches: Record<string, DonorMatch> = {};

        for (const row of selectedGroup.rows) {
          // Check cancel·lació abans de cada lookup
          if (cancelled) return;

          if (!row.customerEmail || row.customerEmail.trim() === '') {
            autoMatches[row.id] = null;
            continue;
          }

          try {
            const donor = await lookupDonorByEmail(row.customerEmail.toLowerCase());
            if (cancelled) return;

            if (donor) {
              autoMatches[row.id] = {
                contactId: donor.id,
                contactName: donor.name,
                defaultCategoryId: donor.defaultCategoryId,
              };
            } else {
              autoMatches[row.id] = null;
            }
          } catch {
            if (cancelled) return;
            autoMatches[row.id] = null;
          }
        }

        if (cancelled) return;

        // Merge: automàtic només omple buits, manual guanya
        setDonorMatches(prev => {
          const next = { ...prev };
          for (const [stripeId, match] of Object.entries(autoMatches)) {
            // Només set si no existeix o és null (no trepitjar manuals)
            if (next[stripeId] == null) {
              next[stripeId] = match;
            }
          }
          return next;
        });
      } finally {
        if (!cancelled) {
          setIsMatchingDonors(false);
        }
      }
    };

    matchDonors();

    return () => {
      cancelled = true;
    };
  }, [selectedGroup, lookupDonorByEmail]);

  // Handler per llegir el fitxer CSV
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);
    setParsedRows([]);
    setWarnings([]);
    setMatchingGroups([]);
    setSelectedGroup(null);
    setDonorMatches({});

    try {
      const text = await file.text();
      const result = parseStripeCsv(text);
      setParsedRows(result.rows);
      setWarnings(result.warnings);

      // Validar que hi ha files vàlides
      if (result.rows.length === 0) {
        setErrorMessage(t.importers.stripeImporter.errors.noValidRows);
        return;
      }

      // Agrupar per Transfer i buscar matches
      const groups = groupStripeRowsByTransfer(result.rows);
      const matches = findAllMatchingPayoutGroups(groups, bankTransaction.amount);
      setMatchingGroups(matches);

      // Si hi ha un únic match, seleccionar-lo automàticament
      if (matches.length === 1) {
        setSelectedGroup(matches[0]);
      } else if (matches.length === 0) {
        // Cap match: mostrar error
        setErrorMessage(
          t.importers.stripeImporter.errors.noMatch(formatCurrencyEU(bankTransaction.amount))
        );
      }
      // Si matches.length > 1, l'usuari haurà de seleccionar manualment (UI ja ho gestiona)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.importers.stripeImporter.errors.processingFile;
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAS 5: ESCRIPTURA FIRESTORE
  // ══════════════════════════════════════════════════════════════════════════

  const handleImport = async () => {
    if (!selectedGroup || !organizationId || !firestore) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Obtenir categoria bankFees
      const bankFeesCategory = categories?.find(c => c.name === BANK_FEES_KEY && c.type === 'expense');
      if (!bankFeesCategory) {
        throw new Error(t.importers.stripeImporter.errors.noBankFeesCategory);
      }

      // 2. Validar límits
      const stripeIds = selectedGroup.rows.map(r => r.id);

      // 2a. Massa files per un sol batch (Firestore limit ~500 ops/batch, deixem marge)
      if (stripeIds.length + 1 > 450) {
        throw new Error(t.importers.stripeImporter.errors.tooManyRows(stripeIds.length));
      }

      // 2b. Cap fila vàlida
      if (stripeIds.length === 0) {
        throw new Error(t.importers.stripeImporter.errors.noValidRows);
      }

      // 3. Validar idempotència: comprovar si ja existeixen transaccions amb aquests stripePaymentId
      const transactionsRef = collection(firestore, 'organizations', organizationId, 'transactions');

      // Firestore 'in' té límit de 30, fer en batches si cal
      const existingIds: string[] = [];
      const batchSize = 30;
      for (let i = 0; i < stripeIds.length; i += batchSize) {
        const batch = stripeIds.slice(i, i + batchSize);
        const q = query(transactionsRef, where('stripePaymentId', 'in', batch));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          const data = doc.data() as Transaction;
          if (data.stripePaymentId) {
            existingIds.push(data.stripePaymentId);
          }
        });
      }

      if (existingIds.length > 0) {
        const idsPreview = existingIds.slice(0, 3).join(', ') + (existingIds.length > 3 ? '...' : '');
        throw new Error(
          t.importers.stripeImporter.errors.alreadyImported(existingIds.length, idsPreview)
        );
      }

      // 3. Preparar batch d'escriptura
      const batch = writeBatch(firestore);

      // 3a. Crear N transaccions d'ingrés (donacions)
      for (const row of selectedGroup.rows) {
        const match = donorMatches[row.id];
        const newTxRef = doc(transactionsRef);

        const txData: Omit<Transaction, 'id'> = {
          date: row.createdDate,
          description: row.description || `Donació Stripe - ${row.customerEmail}`,
          amount: row.amount,
          category: match?.defaultCategoryId || 'donations',
          document: null,
          contactId: match?.contactId || null,
          contactType: match ? 'donor' : undefined,
          source: 'stripe',
          parentTransactionId: bankTransaction.id,
          stripePaymentId: row.id,
        };

        batch.set(newTxRef, txData);
      }

      // 3b. Crear 1 transacció de despesa (comissions agregades)
      if (selectedGroup.fees > 0) {
        const feeTxRef = doc(transactionsRef);
        const feeDate = bankTransaction.date || new Date().toISOString().split('T')[0];

        const feeTxData: Omit<Transaction, 'id'> = {
          date: feeDate,
          description: `Comissions Stripe - ${selectedGroup.rows.length} donacions`,
          amount: -selectedGroup.fees,
          category: bankFeesCategory.id,
          document: null,
          contactId: null,
          source: 'stripe',
          parentTransactionId: bankTransaction.id,
        };

        batch.set(feeTxRef, feeTxData);
      }

      // 4. Commit atòmic
      await batch.commit();

      // 5. Èxit
      // Tancar modal de confirmació
      setShowConfirmation(false);

      // Toast d'èxit actualitzat
      toast({
        title: t.importers.stripeImporter.success.title,
        description: `${t.importers.stripeImporter.success.description(
          selectedGroup.rows.length,
          selectedGroup.fees > 0 ? 1 : 0
        )} ${t.importers.stripeImporter.success.reviewHint}`,
      });

      onOpenChange(false);
      onImportDone?.();

    } catch (err) {
      const message = err instanceof Error ? err.message : t.importers.stripeImporter.errors.processingFile;
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler per assignació manual de donant
  const handleManualAssign = (rowId: string, contactId: string | null) => {
    if (!contactId) {
      // Desvincular
      setDonorMatches(prev => ({
        ...prev,
        [rowId]: null,
      }));
      return;
    }

    const donor = donors.find(d => d.id === contactId);
    if (!donor) return;

    setDonorMatches(prev => ({
      ...prev,
      [rowId]: {
        contactId: donor.id,
        contactName: donor.name,
        defaultCategoryId: null, // Nota: Contact no té defaultCategoryId
      },
    }));
  };

  // Trobar warning de refunded
  const refundedWarning = warnings.find(w => w.code === 'WARN_REFUNDED');

  // Calcular totals del grup seleccionat (o de totes les files si no n'hi ha)
  const displayRows = selectedGroup ? selectedGroup.rows : parsedRows;
  const totalGross = selectedGroup ? selectedGroup.gross : parsedRows.reduce((sum, row) => sum + row.amount, 0);
  const totalFees = selectedGroup ? selectedGroup.fees : parsedRows.reduce((sum, row) => sum + row.fee, 0);
  const totalNet = selectedGroup ? selectedGroup.net : totalGross - totalFees;

  // Comprovar si l'import quadra amb el banc
  const amountMatches = Math.abs(totalNet - bankTransaction.amount) <= 0.02;

  // Calcular estadístiques de matching
  const matchedCount = displayRows.filter(row => donorMatches[row.id] !== null && donorMatches[row.id] !== undefined).length;
  const pendingCount = displayRows.length - matchedCount;
  const allMatched = pendingCount === 0 && !isMatchingDonors;

  // Botó Continuar només s'habilita si quadra i totes les files tenen match
  const canContinue = amountMatches && allMatched && selectedGroup !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t.importers.stripeImporter.title}
          </DialogTitle>
        </DialogHeader>

        {/* Info del moviment bancari */}
        <div className="rounded-lg bg-muted p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t.importers.stripeImporter.bankInfo.amount}</span>
            <span className="text-lg font-semibold">{formatCurrencyEU(bankTransaction.amount)}</span>
          </div>
          {bankTransaction.date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.importers.stripeImporter.bankInfo.date}</span>
              <span>{bankTransaction.date}</span>
            </div>
          )}
          {bankTransaction.description && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.importers.stripeImporter.bankInfo.description}</span>
              <span className="truncate max-w-[300px]">{bankTransaction.description}</span>
            </div>
          )}
        </div>

        {/* Upload CSV */}
        <div className="space-y-2">
          <Label htmlFor="stripe-csv">{t.importers.stripeImporter.csvUpload.label}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="stripe-csv"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isLoading}
              className="cursor-pointer"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {t.importers.stripeImporter.csvUpload.helpText}
          </p>
        </div>

        {/* Error */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t.importers.stripeImporter.errors.processingFile}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Selector de grup (si múltiples matches) */}
        {matchingGroups.length > 1 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t.importers.stripeImporter.multiplePayouts.title}</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                {t.importers.stripeImporter.multiplePayouts.description(matchingGroups.length)}
              </p>
              <div className="space-y-2">
                {matchingGroups.map((group) => (
                  <button
                    key={group.transferId}
                    onClick={() => setSelectedGroup(group)}
                    className={`w-full text-left p-2 rounded border transition-colors ${
                      selectedGroup?.transferId === group.transferId
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">{group.transferId}</span>
                      <span className="font-semibold">{formatCurrencyEU(group.net)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {group.rows.length} {t.importers.stripeImporter.multiplePayouts.donationsLabel} · {t.importers.stripeImporter.multiplePayouts.grossLabel} {formatCurrencyEU(group.gross)}
                    </div>
                  </button>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Resultat del parsing */}
        {selectedGroup && (
          <div className="space-y-4">
            {/* Resum */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.importers.stripeImporter.summary.donations}</span>
                <span className="text-lg font-semibold">{displayRows.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.importers.stripeImporter.summary.payout}</span>
                <span className="font-mono text-xs">{selectedGroup.transferId}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.importers.stripeImporter.summary.grossTotal}</span>
                <span>{formatCurrencyEU(totalGross)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.importers.stripeImporter.summary.fees}</span>
                <span className="text-red-600">-{formatCurrencyEU(totalFees)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium">{t.importers.stripeImporter.summary.net}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{formatCurrencyEU(totalNet)}</span>
                  {amountMatches ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      {t.importers.stripeImporter.summary.matches}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      {t.importers.stripeImporter.summary.doesNotMatch}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Warning de reemborsaments */}
            {refundedWarning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t.importers.stripeImporter.warnings.refundedExcluded}</AlertTitle>
                <AlertDescription>
                  {t.importers.stripeImporter.warnings.refundedDescription(
                    refundedWarning.count,
                    formatCurrencyEU(refundedWarning.amount)
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Indicadors de matching */}
            <div className="flex items-center gap-4 text-sm">
              {isMatchingDonors ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.importers.stripeImporter.matching.searching}
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {t.importers.stripeImporter.matching.matched(matchedCount, displayRows.length)}
                  </span>
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      {t.importers.stripeImporter.matching.pending(pendingCount)}
                    </span>
                  )}
                  {allMatched && (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      {t.importers.stripeImporter.matching.allReady}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Taula de donacions */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.importers.stripeImporter.table.email}</TableHead>
                    <TableHead>{t.importers.stripeImporter.table.donor}</TableHead>
                    <TableHead>{t.importers.stripeImporter.table.status}</TableHead>
                    <TableHead className="text-right">{t.importers.stripeImporter.table.gross}</TableHead>
                    <TableHead>{t.importers.stripeImporter.table.date}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map((row, idx) => {
                    const match = donorMatches[row.id];
                    const hasMatch = match !== null && match !== undefined;

                    return (
                      <TableRow key={row.id || idx}>
                        <TableCell className="font-mono text-xs">
                          {row.customerEmail || '-'}
                        </TableCell>
                        <TableCell>
                          <DonorSelector
                            donors={donors}
                            value={hasMatch ? match.contactId : null}
                            onSelect={(contactId) => handleManualAssign(row.id, contactId)}
                            placeholder={t.importers.stripeImporter.table.donor}
                          />
                          {!hasMatch && !isMatchingDonors && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t.importers.stripeImporter.matching.assignDonor}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {isMatchingDonors ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : hasMatch ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle2 className="h-3 w-3" />
                              {t.importers.stripeImporter.table.matchStatus}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-orange-600 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              {t.importers.stripeImporter.table.pendingStatus}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrencyEU(row.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.createdDate}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Estat inicial (sense fitxer carregat) */}
        {!errorMessage && parsedRows.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t.importers.stripeImporter.emptyState}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t.importers.stripeImporter.actions.close}
          </Button>
          <Button
            disabled={!canContinue || isSaving}
            onClick={() => setShowConfirmation(true)}
            title={
              !selectedGroup
                ? t.importers.stripeImporter.actions.selectPayout
                : !amountMatches
                  ? t.importers.stripeImporter.actions.amountMismatch
                  : !allMatched
                    ? t.importers.stripeImporter.actions.pendingAssignments(pendingCount)
                    : t.importers.stripeImporter.actions.import
            }
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.importers.stripeImporter.actions.importing}
              </>
            ) : (
              t.importers.stripeImporter.actions.import
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.importers.stripeImporter.confirmation.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.importers.stripeImporter.confirmation.description(selectedGroup?.rows.length || 0)}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Resum compacte */}
          {selectedGroup && (
            <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
              <p className="font-medium">{t.importers.stripeImporter.confirmation.summaryLabel}</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>{t.importers.stripeImporter.summary.donations}</span>
                  <span className="font-mono">{selectedGroup.rows.length}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t.importers.stripeImporter.summary.net}</span>
                  <span className="font-mono">{formatCurrencyEU(selectedGroup.net)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t.importers.stripeImporter.summary.fees}</span>
                  <span className="font-mono text-red-600">-{formatCurrencyEU(selectedGroup.fees)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span>{t.importers.stripeImporter.summary.payout}</span>
                  <span className="font-mono">{selectedGroup.transferId}</span>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>
              {t.importers.stripeImporter.confirmation.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImport}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.importers.stripeImporter.confirmation.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
