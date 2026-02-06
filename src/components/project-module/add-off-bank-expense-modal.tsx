// src/components/project-module/add-off-bank-expense-modal.tsx
// Modal per afegir o editar despeses de terreny (off-bank)

'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSaveOffBankExpense, useUpdateOffBankExpense, useSaveExpenseLink } from '@/hooks/use-project-module';
import type { ExpenseAssignment, OffBankAttachment } from '@/lib/project-module-types';
import { useToast } from '@/hooks/use-toast';
import { trackUX } from '@/lib/ux/trackUX';
import { ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExpenseAttachmentsDropzone } from './expense-attachments-dropzone';
import { buildDocumentFilename } from '@/lib/build-document-filename';

interface OffBankExpenseInitialValues {
  date: string;
  amountEUR: string;
  concept: string;
  counterpartyName: string;
  categoryName: string;
  // Nous camps FX
  currency?: string;
  amountOriginal?: string;
  fxRateOverride?: string;
  useFxOverride?: boolean;
  // Camps justificació
  invoiceNumber?: string;
  issuerTaxId?: string;
  invoiceDate?: string;
  paymentDate?: string;
  // Attachments
  attachments?: OffBankAttachment[];
  // Revisió
  needsReview?: boolean;
}

interface OffBankExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  expenseId?: string;
  initialValues?: OffBankExpenseInitialValues;
  // FX del projecte (opcional)
  projectFxRate?: number | null;
  projectFxCurrency?: string | null;
  // Imputacions existents (per mode edit)
  existingAssignments?: ExpenseAssignment[];
  // Per upload d'attachments
  organizationId: string;
  // Mode ràpid (terreny): marca needsReview automàticament
  quickMode?: boolean;
}

export function OffBankExpenseModal({
  open,
  onOpenChange,
  onSuccess,
  mode = 'create',
  expenseId,
  initialValues,
  projectFxRate,
  projectFxCurrency,
  existingAssignments,
  organizationId,
  quickMode = false,
}: OffBankExpenseModalProps) {
  const { save, isSaving } = useSaveOffBankExpense();
  const { update, isUpdating } = useUpdateOffBankExpense();
  const { save: saveExpenseLink } = useSaveExpenseLink();
  const { toast } = useToast();

  const isEditMode = mode === 'edit';
  const isProcessing = isSaving || isUpdating;

  // Camps bàsics
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [amountEUR, setAmountEUR] = useState('');
  const [concept, setConcept] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [categoryName, setCategoryName] = useState('');

  // Camps FX (moneda local) — per defecte ON en despeses de terreny
  const [useForeignCurrency, setUseForeignCurrency] = useState(true);
  const [currency, setCurrency] = useState('');
  const [amountOriginal, setAmountOriginal] = useState('');
  const [fxRateOverride, setFxRateOverride] = useState('');

  // EUR manual (cas especial, col·lapsat per defecte)
  const [eurManualEnabled, setEurManualEnabled] = useState(false);

  // Camps justificació (collapsible)
  const [justificationOpen, setJustificationOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issuerTaxId, setIssuerTaxId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  // Attachments (nou)
  const [attachments, setAttachments] = useState<OffBankAttachment[]>([]);

  // Revisió (nou)
  const [needsReview, setNeedsReview] = useState(quickMode);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generador de noms de fitxer per attachments
  const handleBuildFileName = useCallback((originalName: string) => {
    return buildDocumentFilename({
      dateISO: date,
      concept: concept,
      originalName,
    });
  }, [date, concept]);

  // Nota: El TC s'aplica al imputar la despesa a un projecte, no aquí.

  // Carregar valors inicials quan s'obre en mode edit
  useEffect(() => {
    if (open && isEditMode && initialValues) {
      setDate(initialValues.date);
      setAmountEUR(initialValues.amountEUR);
      setConcept(initialValues.concept);
      setCounterpartyName(initialValues.counterpartyName);
      setCategoryName(initialValues.categoryName);
      // FX
      if (initialValues.currency && initialValues.currency !== 'EUR') {
        setUseForeignCurrency(true);
        setCurrency(initialValues.currency);
        setAmountOriginal(initialValues.amountOriginal ?? '');
        setFxRateOverride(initialValues.fxRateOverride ?? '');
        // Si té amountEUR amb moneda local, vol dir que hi havia EUR manual
        setEurManualEnabled(!!initialValues.amountEUR && parseFloat(initialValues.amountEUR) > 0);
      } else if (initialValues.amountEUR && parseFloat(initialValues.amountEUR) > 0) {
        // Despesa EUR real: mostrar camp EUR directe
        setUseForeignCurrency(false);
        setCurrency('');
        setAmountOriginal('');
        setFxRateOverride('');
        setEurManualEnabled(false);
      } else {
        // Sense moneda ni EUR (ex: quick-expense incompleta): default moneda local ON
        setUseForeignCurrency(true);
        setCurrency(projectFxCurrency ?? '');
        setAmountOriginal('');
        setFxRateOverride('');
        setEurManualEnabled(false);
      }
      // Justificació
      setInvoiceNumber(initialValues.invoiceNumber ?? '');
      setIssuerTaxId(initialValues.issuerTaxId ?? '');
      // invoiceDate per defecte = date de la despesa
      setInvoiceDate(initialValues.invoiceDate ?? initialValues.date);
      setPaymentDate(initialValues.paymentDate ?? '');
      // Obrir secció justificació si hi ha dades
      if (initialValues.invoiceNumber || initialValues.issuerTaxId || initialValues.invoiceDate) {
        setJustificationOpen(true);
      }
      // Attachments
      setAttachments(initialValues.attachments ?? []);
      // Revisió
      setNeedsReview(initialValues.needsReview ?? false);
      setErrors({});
    }
  }, [open, isEditMode, initialValues]);

  // Inicialitzar moneda del projecte quan s'obre el modal
  useEffect(() => {
    if (open && !isEditMode && projectFxCurrency) {
      setCurrency(projectFxCurrency);
    }
  }, [open, isEditMode, projectFxCurrency]);

  // Categoria: no s'usa en despeses off-bank (la classificació real és la partida del projecte)

  const resetForm = () => {
    const today = new Date();
    setDate(today.toISOString().split('T')[0]);
    setAmountEUR('');
    setConcept('');
    setCounterpartyName('');
    // FX — per defecte ON
    setUseForeignCurrency(true);
    setCurrency(projectFxCurrency ?? '');
    setAmountOriginal('');
    setFxRateOverride('');
    // EUR manual
    setEurManualEnabled(false);
    // Justificació
    setJustificationOpen(false);
    setInvoiceNumber('');
    setIssuerTaxId('');
    setInvoiceDate('');
    setPaymentDate('');
    // Attachments
    setAttachments([]);
    // Revisió
    setNeedsReview(quickMode);
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      newErrors.date = 'Data invàlida';
    }

    // Validació FX si s'usa moneda estrangera
    if (useForeignCurrency) {
      if (!currency.trim()) {
        newErrors.currency = 'Selecciona una moneda';
      }
      const origAmount = parseFloat(amountOriginal.replace(',', '.'));
      if (isNaN(origAmount) || origAmount <= 0) {
        newErrors.amountOriginal = 'Import ha de ser positiu';
      }
      // EUR manual: només validar si l'usuari l'ha activat i ha escrit quelcom
      if (eurManualEnabled && amountEUR.trim()) {
        const eurVal = parseFloat(amountEUR.replace(',', '.'));
        if (isNaN(eurVal) || eurVal <= 0) {
          newErrors.amountEUR = 'Import ha de ser positiu';
        }
      }
    } else {
      // Import EUR obligatori si NO és moneda local
      const amount = parseFloat(amountEUR.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        newErrors.amountEUR = 'Import ha de ser positiu';
      }
    }

    // Concepte
    if (concept.trim().length === 0) {
      newErrors.concept = 'El concepte és obligatori';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const shouldNeedReview = needsReview;

    // Determinar amountEUR
    // - Si moneda local + EUR manual amb valor → valor introduït
    // - Si moneda local sense EUR manual → null (es calcularà al imputar)
    // - Si EUR directe → valor introduït
    let finalAmountEUR: string | null = null;
    if (useForeignCurrency) {
      if (eurManualEnabled && amountEUR.trim()) {
        finalAmountEUR = amountEUR.replace(',', '.');
      }
      // Altrament queda null
    } else {
      finalAmountEUR = amountEUR.replace(',', '.');
    }

    // Preparar dades
    const formData = {
      date,
      amountEUR: finalAmountEUR,
      concept,
      counterpartyName,
      categoryName: categoryName || '',
      // Moneda local (nous camps)
      originalCurrency: useForeignCurrency ? currency.trim().toUpperCase() : null,
      originalAmount: useForeignCurrency ? amountOriginal.replace(',', '.') : null,
      fxRate: null, // El TC s'aplica en imputar, no al crear
      // Justificació
      invoiceNumber: invoiceNumber.trim() || undefined,
      issuerTaxId: issuerTaxId.trim() || undefined,
      invoiceDate: invoiceDate || undefined,
      paymentDate: paymentDate || undefined,
      // Attachments
      attachments: attachments.length > 0 ? attachments : undefined,
      // Revisió: marcar si toca
      needsReview: shouldNeedReview || undefined,
    };

    try {
      if (isEditMode && expenseId) {
        // Mode edició
        await update(expenseId, formData);

        // Si l'import ha canviat i hi ha una única imputació al 100%, actualitzar-la
        const newAmountEUR = parseFloat(amountEUR.replace(',', '.'));
        const oldAmountEUR = initialValues ? parseFloat(initialValues.amountEUR.replace(',', '.')) : 0;
        const amountChanged = Math.abs(newAmountEUR - oldAmountEUR) > 0.001;

        if (amountChanged && existingAssignments && existingAssignments.length === 1) {
          // Única imputació - actualitzar automàticament al nou import
          const assignment = existingAssignments[0];
          const updatedAssignment: ExpenseAssignment = {
            ...assignment,
            amountEUR: -newAmountEUR, // negatiu per convenci
          };
          await saveExpenseLink(`off_${expenseId}`, [updatedAssignment], null);
        }

        trackUX('expenses.offBank.edit.save', { expenseId });

        toast({
          title: 'Despesa actualitzada',
          description: 'La despesa de terreny s\'ha actualitzat correctament.',
        });
      } else {
        // Mode creació
        const newId = await save(formData);

        trackUX('expenses.offBank.create', { expenseId: newId });

        toast({
          title: 'Despesa afegida',
          description: 'La despesa de terreny s\'ha creat correctament.',
        });
      }

      resetForm();
      onOpenChange(false);
      onSuccess();

    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : (isEditMode ? 'Error actualitzant despesa' : 'Error creant despesa'),
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar despesa de terreny' : 'Afegir despesa de terreny'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifica les dades de la despesa'
              : 'Registra una despesa fora del circuit bancari'}
          </DialogDescription>
          <p className="text-xs text-muted-foreground mt-1">
            Aquesta despesa es justificarà per projecte. No cal categoritzar-la ni convertir-la a EUR aquí.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avís si hi ha múltiples imputacions */}
          {isEditMode && existingAssignments && existingAssignments.length > 1 && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                Aquesta despesa està imputada a diversos projectes. Si canvies l&apos;import, els imports imputats es recalcularan automàticament segons els percentatges definits.
              </AlertDescription>
            </Alert>
          )}

          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={errors.date ? 'border-destructive' : ''}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date}</p>
            )}
          </div>

          {/* Toggle moneda local */}
          <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Label htmlFor="useForeignCurrency" className="text-sm font-normal cursor-pointer">
                Despesa en moneda local
              </Label>
              {useForeignCurrency && currency && (
                <span className="text-xs text-muted-foreground">
                  ({currency})
                </span>
              )}
            </div>
            <Switch
              id="useForeignCurrency"
              checked={useForeignCurrency}
              onCheckedChange={(checked) => {
                setUseForeignCurrency(checked);
                if (!checked) {
                  setCurrency('');
                  setAmountOriginal('');
                  setFxRateOverride('');
                  setEurManualEnabled(false);
                }
              }}
            />
          </div>

          {/* Bloc moneda local (visible quan toggle ON) */}
          {useForeignCurrency && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                {/* Moneda */}
                <div className="space-y-1">
                  <Label htmlFor="currency" className="text-xs">Moneda *</Label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCurrency(val);
                      if (val === 'EUR') {
                        setUseForeignCurrency(false);
                        setAmountOriginal('');
                        setFxRateOverride('');
                      }
                    }}
                    className={`flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm font-mono ${errors.currency ? 'border-destructive' : 'border-input'}`}
                  >
                    <option value="">Selecciona...</option>
                    <option value="XOF">XOF - Franc CFA</option>
                    <option value="USD">USD - Dòlar US</option>
                    <option value="GBP">GBP - Lliura esterlina</option>
                  </select>
                  {errors.currency && (
                    <p className="text-sm text-destructive">{errors.currency}</p>
                  )}
                </div>
                {/* Import */}
                <div className="space-y-1">
                  <Label htmlFor="amountOriginal" className="text-xs">Import *</Label>
                  <Input
                    id="amountOriginal"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amountOriginal}
                    onChange={(e) => setAmountOriginal(e.target.value)}
                    className={errors.amountOriginal ? 'border-destructive h-9' : 'h-9'}
                  />
                  {errors.amountOriginal && (
                    <p className="text-sm text-destructive">{errors.amountOriginal}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3 w-3 shrink-0" />
                El tipus de canvi s&apos;aplicarà automàticament quan imputis la despesa a un projecte.
              </p>
            </div>
          )}

          {/* Import EUR: directe si NO moneda local, col·lapsat si SÍ moneda local */}
          {useForeignCurrency ? (
            <Collapsible open={eurManualEnabled} onOpenChange={setEurManualEnabled}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" type="button" className="w-full justify-between px-3 py-2 h-auto">
                  <span className="text-sm text-muted-foreground">Introduir EUR manualment (cas especial)</span>
                  {eurManualEnabled ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-1">
                <div className="space-y-1 px-3">
                  <Label htmlFor="amountEUR" className="text-xs">Import en EUR</Label>
                  <Input
                    id="amountEUR"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amountEUR}
                    onChange={(e) => setAmountEUR(e.target.value)}
                    className={errors.amountEUR ? 'border-destructive h-9' : 'h-9'}
                  />
                  {errors.amountEUR && (
                    <p className="text-sm text-destructive">{errors.amountEUR}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Si ho deixes buit, l&apos;EUR es calcularà en imputar la despesa a un projecte.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="amountEUR">Import (EUR) *</Label>
              <Input
                id="amountEUR"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amountEUR}
                onChange={(e) => setAmountEUR(e.target.value)}
                className={errors.amountEUR ? 'border-destructive' : ''}
              />
              {errors.amountEUR && (
                <p className="text-sm text-destructive">{errors.amountEUR}</p>
              )}
            </div>
          )}

          {/* Concepte - full width */}
          <div className="space-y-2">
            <Label htmlFor="concept">Concepte *</Label>
            <Input
              id="concept"
              type="text"
              placeholder="Descripció de la despesa"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className={errors.concept ? 'border-destructive' : ''}
            />
            {errors.concept && (
              <p className="text-sm text-destructive">{errors.concept}</p>
            )}
          </div>

          {/* Origen/Destinatari */}
          <div className="space-y-2">
            <Label htmlFor="counterpartyName">Origen / Destinatari</Label>
            <Input
              id="counterpartyName"
              type="text"
              placeholder="Nom del proveïdor o persona"
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
            />
          </div>

          {/* Comprovants (Attachments) */}
          <div className="space-y-2">
            <Label>Comprovants</Label>
            <ExpenseAttachmentsDropzone
              organizationId={organizationId}
              expenseId={isEditMode ? expenseId ?? null : null}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              disabled={isProcessing}
              buildFileName={handleBuildFileName}
            />
          </div>

          {/* Secció Justificació (collapsible) */}
          <Collapsible open={justificationOpen} onOpenChange={(open) => {
            setJustificationOpen(open);
            // Pre-omplir data factura amb data despesa si no té valor
            if (open && !invoiceDate && date) {
              setInvoiceDate(date);
            }
          }}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" type="button" className="w-full justify-between px-3 py-2 h-auto">
                <span className="text-sm font-medium">Dades de justificació</span>
                {justificationOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="invoiceNumber" className="text-xs">Núm. factura</Label>
                  <Input
                    id="invoiceNumber"
                    type="text"
                    placeholder="F-2024-001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="issuerTaxId" className="text-xs">NIF emissor</Label>
                  <Input
                    id="issuerTaxId"
                    type="text"
                    placeholder="B12345678"
                    value={issuerTaxId}
                    onChange={(e) => setIssuerTaxId(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="invoiceDate" className="text-xs">Data factura</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="paymentDate" className="text-xs">Data pagament</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel·lar
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing
                ? 'Guardant...'
                : isEditMode
                  ? 'Desar canvis'
                  : 'Afegir despesa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Alias per compatibilitat amb codi existent
export const AddOffBankExpenseModal = OffBankExpenseModal;
