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
import { type Contact } from '@/components/contact-combobox';
import { CreateQuickDonorDialog, type QuickDonorFormData } from './CreateQuickDonorDialog';
import { useTranslations } from '@/i18n';
import { addDocumentNonBlocking } from '@/firebase';
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

  // Estat per diàleg de creació de donant
  const [isCreateDonorOpen, setIsCreateDonorOpen] = React.useState(false);
  const [createDonorInitialData, setCreateDonorInitialData] = React.useState<{
    email?: string;
    rowId?: string;
  } | null>(null);

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
      setIsCreateDonorOpen(false);
      setCreateDonorInitialData(null);
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
    console.group('[STRIPE IMPORT] 🚀 handleImport STARTED');
    console.log('Timestamp:', new Date().toISOString());
    console.log('selectedGroup:', selectedGroup);
    console.log('organizationId:', organizationId);
    console.log('firestore:', !!firestore);
    console.log('bankTransaction:', bankTransaction);
    console.log('donorMatches:', donorMatches);
    console.log('categories:', categories?.map(c => ({ id: c.id, name: c.name, type: c.type })));
    console.groupEnd();

    if (!selectedGroup || !organizationId || !firestore) {
      console.error('[STRIPE IMPORT] ❌ Early return: missing dependencies', {
        selectedGroup: !!selectedGroup,
        organizationId: !!organizationId,
        firestore: !!firestore,
      });
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Obtenir categoria bankFees
      const bankFeesCategory = categories?.find(c => c.name === BANK_FEES_KEY && c.type === 'expense');
      console.log('[STRIPE IMPORT] bankFeesCategory:', bankFeesCategory);
      if (!bankFeesCategory) {
        throw new Error(t.importers.stripeImporter.errors.noBankFeesCategory);
      }

      // 2. Validar límits
      const stripeIds = selectedGroup.rows.map(r => r.id);
      console.log('[STRIPE IMPORT] Total rows:', selectedGroup.rows.length);
      console.log('[STRIPE IMPORT] Stripe IDs:', stripeIds);

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

      // 3. Preparar batch d'escriptura atòmica
      const batch = writeBatch(firestore);
      let docsCreated = 0;

      console.log('[STRIPE IMPORT] 📝 Construint batch...');
      console.log('[STRIPE IMPORT] transactionsRef path:', transactionsRef.path);
      console.log('[STRIPE IMPORT] selectedGroup.rows.length:', selectedGroup.rows.length);
      console.log('[STRIPE IMPORT] donorMatches keys:', Object.keys(donorMatches));

      // 3a. Crear N transaccions d'ingrés (donacions)
      for (const row of selectedGroup.rows) {
        const match = donorMatches[row.id];
        const newTxRef = doc(transactionsRef);

        console.log(`[STRIPE IMPORT] 📦 Processing donation ${docsCreated + 1}/${selectedGroup.rows.length}`, {
          rowId: row.id,
          customerEmail: row.customerEmail,
          amount: row.amount,
          matchFound: !!match,
          contactId: match?.contactId || null,
          contactName: match?.contactName || null,
        });

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

        console.log(`[STRIPE IMPORT] 📝 Transaction data:`, {
          newTxRefId: newTxRef.id,
          contactId: txData.contactId,
          contactType: txData.contactType,
          category: txData.category,
          amount: txData.amount,
          stripePaymentId: txData.stripePaymentId,
          parentTransactionId: txData.parentTransactionId,
        });

        batch.set(newTxRef, txData);
        docsCreated++;
      }

      console.log('[STRIPE IMPORT] ✅ All donations added to batch. Total donations:', docsCreated);

      // 3b. Crear 1 transacció de despesa (comissions agregades)
      if (selectedGroup.fees > 0) {
        console.log('[STRIPE IMPORT] 💰 Adding fee transaction...');
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

        console.log('[STRIPE IMPORT] 📝 Fee transaction data:', {
          newTxRefId: feeTxRef.id,
          amount: feeTxData.amount,
          date: feeTxData.date,
          category: feeTxData.category,
          parentTransactionId: feeTxData.parentTransactionId,
        });

        batch.set(feeTxRef, feeTxData);
        docsCreated++;
        console.log('[STRIPE IMPORT] ✅ Fee transaction added to batch');
      } else {
        console.log('[STRIPE IMPORT] ⚠️ No fees to process (fees = 0)');
      }

      // 3c. Eliminar el moviment bancari original
      const originalTxRef = doc(transactionsRef, bankTransaction.id);
      console.log('[STRIPE IMPORT] 🗑️ Deleting original bank transaction:', {
        id: bankTransaction.id,
        path: originalTxRef.path,
      });
      batch.delete(originalTxRef);

      console.log('[STRIPE IMPORT] 💾 Total operations in batch:', docsCreated + 1, `(${docsCreated} creates + 1 delete)`);
      console.log('[STRIPE IMPORT] 🔄 Committing batch...');

      // 4. Commit atòmic
      await batch.commit();

      console.log('[STRIPE IMPORT] ✅ Batch committed successfully!');

      // 5. Verificació post-commit (temporal per debug)
      console.log('[STRIPE IMPORT] 🔍 Verificant escriptura a Firestore...');
      console.log('[STRIPE IMPORT] Query filter: parentTransactionId ==', bankTransaction.id);
      try {
        const verifyQuery = query(
          transactionsRef,
          where('parentTransactionId', '==', bankTransaction.id)
        );
        const verifySnapshot = await getDocs(verifyQuery);
        console.log('[STRIPE IMPORT] ✅ Transaccions trobades post-commit:', verifySnapshot.size);

        if (verifySnapshot.size === 0) {
          console.error('[STRIPE IMPORT] ⚠️ WARNING: No transactions found! Expected:', docsCreated);
        } else {
          console.log('[STRIPE IMPORT] Expected:', docsCreated, 'Found:', verifySnapshot.size);
        }

        console.log('[STRIPE IMPORT] Transaccions detalls:', verifySnapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            amount: data.amount,
            contactId: data.contactId,
            category: data.category,
            stripePaymentId: data.stripePaymentId,
            parentTransactionId: data.parentTransactionId,
          };
        }));

        // Check if original transaction still exists (should be deleted)
        const originalCheck = await getDocs(query(
          transactionsRef,
          where('__name__', '==', bankTransaction.id)
        ));
        console.log('[STRIPE IMPORT] Original transaction still exists?', originalCheck.size > 0);
      } catch (verifyErr) {
        console.error('[STRIPE IMPORT] ❌ Error verificant:', verifyErr);
      }

      // 6. Èxit
      console.log('[STRIPE IMPORT] 🎉 Import completat, tancant modals...');

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

      console.log('[STRIPE IMPORT] 📢 Showing toast notification');
      console.log('[STRIPE IMPORT] 🔄 Calling onImportDone callback...');
      console.log('[STRIPE IMPORT] onImportDone is defined?', !!onImportDone);

      onOpenChange(false);

      if (onImportDone) {
        console.log('[STRIPE IMPORT] 🚀 Executing onImportDone()...');
        onImportDone();
        console.log('[STRIPE IMPORT] ✅ onImportDone() executed');
      } else {
        console.warn('[STRIPE IMPORT] ⚠️ onImportDone callback is undefined - UI may not refresh!');
      }

    } catch (err) {
      console.error('[STRIPE IMPORT] ❌ Error durant import:', err);
      console.error('[STRIPE IMPORT] Error stack:', err instanceof Error ? err.stack : 'No stack');
      const message = err instanceof Error ? err.message : t.importers.stripeImporter.errors.processingFile;
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Auto-match all rows with the same email to the given donor
   * Si email és null, només assigna el contactId a la fila rowId
   */
  const applyDonorMatchForEmail = React.useCallback(
    (rowId: string, contactId: string, contactName: string, email: string | null) => {
      if (!selectedGroup) return;

      setDonorMatches((prev) => {
        const updated = { ...prev };

        // Sempre assigna la fila especificada
        updated[rowId] = {
          contactId,
          contactName,
          defaultCategoryId: null,
        };

        // Si hi ha email, auto-matcheja totes les altres files amb el mateix email
        if (email) {
          const emailLower = email.toLowerCase().trim();

          for (const row of selectedGroup.rows) {
            // Skip la fila ja assignada
            if (row.id === rowId) continue;

            // Skip files que ja tenen un match manual diferent (no override)
            if (prev[row.id] && prev[row.id]?.contactId !== contactId) {
              continue;
            }

            // Auto-match si el email coincideix
            if (row.customerEmail?.toLowerCase().trim() === emailLower) {
              updated[row.id] = {
                contactId,
                contactName,
                defaultCategoryId: null,
              };
            }
          }
        }

        return updated;
      });
    },
    [selectedGroup]
  );

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

    // Trobar el row per obtenir el email
    const row = selectedGroup?.rows.find(r => r.id === rowId);
    const email = row?.customerEmail || null;

    // Aplicar auto-match per email
    applyDonorMatchForEmail(rowId, donor.id, donor.name, email);
  };

  // Handler per obrir el diàleg de creació de donant
  const handleOpenCreateDonor = (rowId: string, email?: string) => {
    setCreateDonorInitialData({ rowId, email });
    setIsCreateDonorOpen(true);
  };

  // Handler per crear un nou donant ràpid
  const handleCreateQuickDonor = React.useCallback(
    async (formData: QuickDonorFormData): Promise<string | null> => {
      if (!organizationId || !firestore) return null;

      const contactsCollection = collection(firestore, 'organizations', organizationId, 'contacts');

      const now = new Date().toISOString();
      const newDonorData = {
        type: 'donor',
        name: formData.name.trim(),
        taxId: formData.taxId.trim() || null,
        zipCode: formData.zipCode.trim() || null,
        email: formData.email.trim() || null,
        donorType: 'individual',
        membershipType: 'one-time',
        createdAt: now,
      };

      try {
        const docRef = await addDocumentNonBlocking(contactsCollection, newDonorData);

        if (docRef && createDonorInitialData?.rowId) {
          // Auto-assign the newly created donor to the row + auto-match by email
          const email = formData.email.trim() || null;
          applyDonorMatchForEmail(
            createDonorInitialData.rowId,
            docRef.id,
            formData.name.trim(),
            email
          );

          // Show success toast
          toast({
            title: t.importers.stripeImporter.createQuickDonor.success.title,
            description: t.importers.stripeImporter.createQuickDonor.success.description(
              formData.name.trim()
            ),
          });

          // Show warning if taxId or zipCode is missing
          if (!formData.taxId.trim() || !formData.zipCode.trim()) {
            setTimeout(() => {
              toast({
                title: t.importers.stripeImporter.createQuickDonor.warnings.incompleteData,
                description:
                  t.importers.stripeImporter.createQuickDonor.warnings.incompleteFiscalData,
                duration: 5000,
              });
            }, 500);
          }

          return docRef.id;
        }

        return null;
      } catch (err) {
        console.error('Error creating donor:', err);
        const message = err instanceof Error ? err.message : 'Error desconegut';
        toast({
          variant: 'destructive',
          title: t.common.error,
          description: message,
        });
        return null;
      }
    },
    [organizationId, firestore, createDonorInitialData, toast, t, applyDonorMatchForEmail]
  );

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
                          <div className="flex items-center gap-2">
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              value={hasMatch ? match.contactId : ''}
                              onChange={(e) => handleManualAssign(row.id, e.target.value || null)}
                              disabled={isMatchingDonors}
                            >
                              <option value="">{t.importers.stripeImporter.donorSelector.placeholder}</option>
                              {[...donors]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((donor) => (
                                  <option key={donor.id} value={donor.id}>
                                    {donor.email ? `${donor.name} — ${donor.email}` : donor.name}
                                  </option>
                                ))}
                            </select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCreateDonor(row.id, row.customerEmail)}
                              disabled={isMatchingDonors}
                              className="shrink-0"
                            >
                              {t.importers.stripeImporter.donorSelector.createNewButton}
                            </Button>
                          </div>
                          {!hasMatch && !isMatchingDonors && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t.importers.stripeImporter.donorSelector.noMatchForEmail}
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
            onClick={() => {
              console.group('[STRIPE IMPORT] 📤 BUTTON CLICKED');
              console.log('canContinue:', canContinue);
              console.log('isSaving:', isSaving);
              console.log('selectedGroup:', selectedGroup);
              console.log('displayRows.length:', displayRows.length);
              console.log('matchedCount:', matchedCount);
              console.log('pendingCount:', pendingCount);
              console.log('allMatched:', allMatched);
              console.log('amountMatches:', amountMatches);
              console.log('bankTransaction:', {
                id: bankTransaction.id,
                amount: bankTransaction.amount,
                date: bankTransaction.date,
              });
              console.log('donorMatches keys:', Object.keys(donorMatches).length);
              console.log('donorMatches sample:', Object.entries(donorMatches).slice(0, 3));
              console.groupEnd();
              setShowConfirmation(true);
            }}
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
            <AlertDialogCancel
              disabled={isSaving}
              onClick={() => {
                console.log('[STRIPE IMPORT] ❌ User cancelled confirmation dialog');
              }}
            >
              {t.importers.stripeImporter.confirmation.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                console.log('[STRIPE IMPORT] ✅ User clicked CONFIRM in dialog');
                console.log('[STRIPE IMPORT] About to call handleImport()...');
                handleImport();
              }}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.importers.stripeImporter.confirmation.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Quick Donor Dialog */}
      <CreateQuickDonorDialog
        open={isCreateDonorOpen}
        onOpenChange={setIsCreateDonorOpen}
        onSave={handleCreateQuickDonor}
        initialData={{
          email: createDonorInitialData?.email,
        }}
      />
    </Dialog>
  );
}
