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
import { suggestCategory } from '@/lib/expense-category-suggestions';
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

  // Camps FX (moneda local)
  const [useForeignCurrency, setUseForeignCurrency] = useState(false);
  const [currency, setCurrency] = useState('');
  const [amountOriginal, setAmountOriginal] = useState('');
  const [fxRateOverride, setFxRateOverride] = useState('');

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

  // Control categoria: per defecte readonly, només editable si l'usuari ho demana
  const [allowManualCategory, setAllowManualCategory] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generador de noms de fitxer per attachments
  const handleBuildFileName = useCallback((originalName: string) => {
    return buildDocumentFilename({
      dateISO: date,
      concept: concept,
      originalName,
    });
  }, [date, concept]);

  // Calcular import EUR automàticament quan s'usa moneda estrangera
  // Fórmula: amountEUR = originalAmount * fxRate (on fxRate és "1 moneda → EUR")
  const calculateEurAmount = useCallback(() => {
    if (!useForeignCurrency || !amountOriginal || !fxRateOverride) return '';
    const originalAmount = parseFloat(amountOriginal.replace(',', '.'));
    const fxRate = parseFloat(fxRateOverride.replace(',', '.'));
    if (isNaN(originalAmount) || isNaN(fxRate) || fxRate <= 0) return '';
    const eurAmount = originalAmount * fxRate;
    return eurAmount.toFixed(2);
  }, [useForeignCurrency, amountOriginal, fxRateOverride]);

  // Actualitzar amountEUR quan canvia l'import original o el FX
  useEffect(() => {
    if (useForeignCurrency) {
      const calculated = calculateEurAmount();
      if (calculated) {
        setAmountEUR(calculated);
      }
    }
  }, [useForeignCurrency, calculateEurAmount]);

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
      } else {
        setUseForeignCurrency(false);
        setCurrency('');
        setAmountOriginal('');
        setFxRateOverride('');
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

  // Suggerir categoria automàticament quan canvia el concepte
  // Si no troba suggeriment, posa "Revisar" i marca needsReview
  useEffect(() => {
    if (!isEditMode && concept.length >= 3 && !allowManualCategory) {
      const suggested = suggestCategory(concept, counterpartyName);
      if (suggested) {
        setCategoryName(suggested);
      } else if (!categoryName || categoryName === 'Revisar') {
        // No s'ha trobat suggeriment: marcar per revisió
        setCategoryName('Revisar');
        setNeedsReview(true);
      }
    }
  }, [concept, counterpartyName, isEditMode, allowManualCategory, categoryName]);

  const resetForm = () => {
    const today = new Date();
    setDate(today.toISOString().split('T')[0]);
    setAmountEUR('');
    setConcept('');
    setCounterpartyName('');
    setCategoryName('');
    // FX
    setUseForeignCurrency(false);
    setCurrency(projectFxCurrency ?? '');
    setAmountOriginal('');
    setFxRateOverride('');
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
    // Categoria manual
    setAllowManualCategory(false);
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
      // fxRate és OPCIONAL - no validar si està buit
      if (fxRateOverride.trim()) {
        const fxRate = parseFloat(fxRateOverride.replace(',', '.'));
        if (isNaN(fxRate) || fxRate <= 0) {
          newErrors.fxRate = 'Tipus de canvi ha de ser positiu';
        }
      }
    } else {
      // Import EUR obligatori només si NO és moneda local
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

    // Determinar si cal marcar per revisió:
    // - Si categoria és "Revisar"
    // - Si l'usuari ha canviat la categoria manualment
    // - Si ja estava marcat needsReview
    const shouldNeedReview = needsReview || categoryName === 'Revisar' || allowManualCategory;

    // Determinar amountEUR
    // - Si moneda local sense fxRate → null
    // - Si moneda local amb fxRate → calculat
    // - Si EUR → valor introduït
    let finalAmountEUR: string | null = null;
    if (useForeignCurrency) {
      if (fxRateOverride.trim()) {
        finalAmountEUR = calculateEurAmount() || null;
      }
      // Si no hi ha fxRate, queda null
    } else {
      finalAmountEUR = amountEUR.replace(',', '.');
    }

    // Preparar dades
    const formData = {
      date,
      amountEUR: finalAmountEUR,
      concept,
      counterpartyName,
      categoryName: categoryName || 'Revisar', // Fallback a "Revisar" si està buit
      // Moneda local (nous camps)
      originalCurrency: useForeignCurrency ? currency.trim().toUpperCase() : null,
      originalAmount: useForeignCurrency ? amountOriginal.replace(',', '.') : null,
      fxRate: useForeignCurrency && fxRateOverride.trim() ? fxRateOverride.replace(',', '.') : null,
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
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avís si hi ha múltiples imputacions */}
          {isEditMode && existingAssignments && existingAssignments.length > 1 && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                Aquesta despesa té {existingAssignments.length} imputacions a projectes.
                Si canvies l&apos;import, hauràs d&apos;ajustar les imputacions manualment.
              </AlertDescription>
            </Alert>
          )}

          {/* Grid 2 columnes per camps bàsics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Import EUR */}
            <div className="space-y-2">
              <Label htmlFor="amountEUR">Import (EUR) *</Label>
              <Input
                id="amountEUR"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amountEUR}
                onChange={(e) => setAmountEUR(e.target.value)}
                disabled={useForeignCurrency}
                className={`${errors.amountEUR ? 'border-destructive' : ''} ${useForeignCurrency ? 'bg-muted' : ''}`}
              />
              {errors.amountEUR && (
                <p className="text-sm text-destructive">{errors.amountEUR}</p>
              )}
            </div>
          </div>

          {/* Toggle moneda estrangera - sempre disponible */}
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
                // Si desactiva, netejar camps FX
                if (!checked) {
                  setCurrency('');
                  setAmountOriginal('');
                  setFxRateOverride('');
                }
              }}
            />
          </div>

          {/* Camps FX si s'usa moneda estrangera */}
          {useForeignCurrency && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              {/* Fila 1: Moneda (select) */}
              <div className="space-y-1">
                <Label htmlFor="currency" className="text-xs">Moneda *</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrency(val);
                    // Si trien EUR, desactivar toggle automàticament
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

              {/* Fila 2: Import local + Tipus de canvi */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="amountOriginal" className="text-xs">Import (moneda local) *</Label>
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
                <div className="space-y-1">
                  <Label htmlFor="fxRate" className="text-xs">Tipus de canvi (1 {currency || 'moneda'} → EUR)</Label>
                  <Input
                    id="fxRate"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,001525"
                    value={fxRateOverride}
                    onChange={(e) => setFxRateOverride(e.target.value)}
                    className={errors.fxRate ? 'border-destructive h-9 font-mono' : 'h-9 font-mono'}
                  />
                  {errors.fxRate && (
                    <p className="text-sm text-destructive">{errors.fxRate}</p>
                  )}
                </div>
              </div>

              {/* Preview: Import EUR calculat o pendent */}
              <div className="flex items-center gap-2 pt-2 border-t text-sm">
                <Info className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Import (EUR):</span>
                {calculateEurAmount() ? (
                  <span className="font-medium">{calculateEurAmount()} €</span>
                ) : (
                  <span className="text-amber-600 italic">Pendent de conversió</span>
                )}
              </div>
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

          {/* Grid 2 columnes per contrapart i categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Categoria - readonly per defecte */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="categoryName">Categoria</Label>
                {!allowManualCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setAllowManualCategory(true);
                      setNeedsReview(true); // Marcar per revisió si es canvia manualment
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Canviar
                  </button>
                )}
              </div>
              {allowManualCategory ? (
                <Input
                  id="categoryName"
                  type="text"
                  placeholder="p.ex. Transport, Material, etc."
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  autoFocus
                />
              ) : (
                <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 text-sm">
                  {categoryName || <span className="text-muted-foreground">Pendent de suggeriment...</span>}
                </div>
              )}
            </div>
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
