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
import { Upload, AlertTriangle, FileText, Loader2, CheckCircle2, UserPlus } from 'lucide-react';

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
  onImportDone,
}: StripeImporterProps) {
  // Hooks de Firebase i organització
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();

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
        setErrorMessage(
          'ERR_NO_VALID_ROWS: El CSV no conté donacions vàlides (succeeded i no reemborsades).'
        );
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
          `ERR_NO_MATCH: No s'ha trobat cap payout que coincideixi amb l'import ${formatCurrencyEU(bankTransaction.amount)}`
        );
      }
      // Si matches.length > 1, l'usuari haurà de seleccionar manualment (UI ja ho gestiona)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconegut';
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
        throw new Error(
          `ERR_NO_BANKFEES_CATEGORY: No s'ha trobat la categoria de despeses bancàries (${BANK_FEES_KEY}) a aquesta organització.`
        );
      }

      // 2. Validar límits
      const stripeIds = selectedGroup.rows.map(r => r.id);

      // 2a. Massa files per un sol batch (Firestore limit ~500 ops/batch, deixem marge)
      if (stripeIds.length + 1 > 450) {
        throw new Error(
          `ERR_TOO_MANY_ROWS: El payout té ${stripeIds.length} donacions. Màxim permès: 449.`
        );
      }

      // 2b. Cap fila vàlida
      if (stripeIds.length === 0) {
        throw new Error(
          "ERR_NO_VALID_ROWS: No hi ha cap donació vàlida per importar."
        );
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
        throw new Error(
          `ERR_ALREADY_IMPORTED: Ja s'han importat ${existingIds.length} d'aquestes donacions (IDs: ${existingIds.slice(0, 3).join(', ')}${existingIds.length > 3 ? '...' : ''}).`
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
      toast({
        title: 'Import completat',
        description: `S'han creat ${selectedGroup.rows.length} donacions i 1 transacció de comissions.`,
      });

      onOpenChange(false);
      onImportDone?.();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconegut';
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler per assignació manual
  const handleManualAssign = (rowId: string, currentEmail: string) => {
    const input = prompt(
      `Assignar donant manualment per: ${currentEmail}\n\nFormat: contactId|contactName\nExemple: abc123|Joan Garcia`
    );

    if (!input) return;

    const parts = input.split('|');
    if (parts.length !== 2) {
      alert('Format incorrecte. Usa: contactId|contactName');
      return;
    }

    const [contactId, contactName] = parts;
    if (!contactId.trim() || !contactName.trim()) {
      alert('El contactId i contactName no poden estar buits.');
      return;
    }

    setDonorMatches(prev => ({
      ...prev,
      [rowId]: {
        contactId: contactId.trim(),
        contactName: contactName.trim(),
        defaultCategoryId: null,
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
            Dividir remesa Stripe
          </DialogTitle>
        </DialogHeader>

        {/* Info del moviment bancari */}
        <div className="rounded-lg bg-muted p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Import al banc:</span>
            <span className="text-lg font-semibold">{formatCurrencyEU(bankTransaction.amount)}</span>
          </div>
          {bankTransaction.date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data:</span>
              <span>{bankTransaction.date}</span>
            </div>
          )}
          {bankTransaction.description && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Descripció:</span>
              <span className="truncate max-w-[300px]">{bankTransaction.description}</span>
            </div>
          )}
        </div>

        {/* Upload CSV */}
        <div className="space-y-2">
          <Label htmlFor="stripe-csv">Fitxer CSV de Stripe</Label>
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
            Exporta des de Stripe: Pagos → Exportar → Columnes predeterminades (CSV)
          </p>
        </div>

        {/* Error */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error al processar el fitxer</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Selector de grup (si múltiples matches) */}
        {matchingGroups.length > 1 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Múltiples payouts coincideixen</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                S'han trobat {matchingGroups.length} payouts que coincideixen amb l'import del banc.
                Selecciona el correcte:
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
                      {group.rows.length} donacions · Brut: {formatCurrencyEU(group.gross)}
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
                <span className="font-medium">Donacions:</span>
                <span className="text-lg font-semibold">{displayRows.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payout:</span>
                <span className="font-mono text-xs">{selectedGroup.transferId}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Brut total:</span>
                <span>{formatCurrencyEU(totalGross)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Comissions:</span>
                <span className="text-red-600">-{formatCurrencyEU(totalFees)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium">Net:</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{formatCurrencyEU(totalNet)}</span>
                  {amountMatches ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      quadra
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      no quadra
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Warning de reemborsaments */}
            {refundedWarning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Donacions reemborsades excloses</AlertTitle>
                <AlertDescription>
                  S'han exclòs {refundedWarning.count} donacions reemborsades.
                  Import exclòs: {formatCurrencyEU(refundedWarning.amount)}
                </AlertDescription>
              </Alert>
            )}

            {/* Indicadors de matching */}
            <div className="flex items-center gap-4 text-sm">
              {isMatchingDonors ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cercant donants...
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Matched: {matchedCount} / {displayRows.length}
                  </span>
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      Pendents: {pendingCount}
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
                    <TableHead>Email</TableHead>
                    <TableHead>Donant</TableHead>
                    <TableHead>Estat</TableHead>
                    <TableHead className="text-right">Brut</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead></TableHead>
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
                          {hasMatch ? (
                            <span className="text-sm">{match.contactName}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isMatchingDonors ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : hasMatch ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle2 className="h-3 w-3" />
                              Match
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-orange-600 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Pendent
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrencyEU(row.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.createdDate}
                        </TableCell>
                        <TableCell>
                          {!hasMatch && !isMatchingDonors && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManualAssign(row.id, row.customerEmail || '')}
                              className="h-7 px-2"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Assignar
                            </Button>
                          )}
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
              Selecciona un fitxer CSV exportat de Stripe per veure les donacions
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Tancar
          </Button>
          <Button
            disabled={!canContinue || isSaving}
            onClick={handleImport}
            title={
              !selectedGroup
                ? 'Cal seleccionar un payout'
                : !amountMatches
                  ? 'L\'import no quadra amb el banc'
                  : !allMatched
                    ? `Encara hi ha ${pendingCount} donacions pendents d'assignar`
                    : 'Importar donacions a Firestore'
            }
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Important...
              </>
            ) : (
              'Importar donacions'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
