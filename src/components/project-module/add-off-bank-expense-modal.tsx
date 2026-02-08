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
import { computeFxAmountEUR } from '@/lib/project-module/fx';
import { normalizeAssignments } from '@/lib/project-module/normalize-assignments';
import { useSaveOffBankExpense, useUpdateOffBankExpense, useSaveExpenseLink } from '@/hooks/use-project-module';
import type { ExpenseAssignment, OffBankAttachment } from '@/lib/project-module-types';
import { useToast } from '@/hooks/use-toast';
import { trackUX } from '@/lib/ux/trackUX';
import { ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExpenseAttachmentsDropzone } from './expense-attachments-dropzone';
import { buildDocumentFilename } from '@/lib/build-document-filename';
import { useTranslations } from '@/i18n';

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
  const { tr } = useTranslations();

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
      newErrors.date = tr('projectModule.offBank.invalidDate', 'Data invàlida');
    }

    // Validació FX si s'usa moneda estrangera
    if (useForeignCurrency) {
      if (!currency.trim()) {
        newErrors.currency = tr('projectModule.offBank.selectCurrency', 'Selecciona una moneda');
      }
      const origAmount = parseFloat(amountOriginal.replace(',', '.'));
      if (isNaN(origAmount) || origAmount <= 0) {
        newErrors.amountOriginal = tr('projectModule.amountPositive', 'Import ha de ser positiu');
      }
      // EUR manual: només validar si l'usuari l'ha activat i ha escrit quelcom
      if (eurManualEnabled && amountEUR.trim()) {
        const eurVal = parseFloat(amountEUR.replace(',', '.'));
        if (isNaN(eurVal) || eurVal <= 0) {
          newErrors.amountEUR = tr('projectModule.amountPositive', 'Import ha de ser positiu');
        }
      }
    } else {
      // Import EUR obligatori si NO és moneda local
      const amount = parseFloat(amountEUR.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        newErrors.amountEUR = tr('projectModule.amountPositive', 'Import ha de ser positiu');
      }
    }

    // Concepte
    if (concept.trim().length === 0) {
      newErrors.concept = tr('projectModule.offBank.conceptRequired', 'El concepte és obligatori');
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

        // Recàlcul d'assignacions si l'import ha canviat (R5)
        if (existingAssignments && existingAssignments.length === 1) {
          const assignment = existingAssignments[0];

          if (useForeignCurrency) {
            // FX: recalcular amb funció pura compartida
            const newOriginalAmountStr = amountOriginal.replace(',', '.');
            const newOriginalAmount = parseFloat(newOriginalAmountStr);
            if (!isNaN(newOriginalAmount) && newOriginalAmount > 0) {
              const oldOriginalStr = initialValues?.amountOriginal ?? '0';
              const oldOriginalAmount = parseFloat(oldOriginalStr.replace(',', '.'));
              const amountChanged = isNaN(oldOriginalAmount) || Math.abs(newOriginalAmount - oldOriginalAmount) > 0.001;

              if (amountChanged) {
                // TC forçat a la despesa > TC del projecte > null
                const expenseTcStr = initialValues?.fxRateOverride;
                const expenseTc = expenseTcStr ? parseFloat(expenseTcStr) : NaN;
                const tc = (!isNaN(expenseTc) && expenseTc > 0) ? expenseTc : projectFxRate;

                const newAmountEUR = computeFxAmountEUR(
                  newOriginalAmount,
                  assignment.localPct ?? 100,
                  tc ?? null
                );

                if (newAmountEUR !== null) {
                  await saveExpenseLink(`off_${expenseId}`, [{
                    ...assignment,
                    amountEUR: newAmountEUR,
                  }], null);
                }
                // Si tc null → no tocar amountEUR
              }
            }
            // Si amountOriginal invàlid → no tocar res
          } else {
            // EUR directe: recàlcul simple
            const newAmountEUR = parseFloat(amountEUR.replace(',', '.'));
            if (!isNaN(newAmountEUR) && newAmountEUR > 0) {
              const oldAmountEUR = initialValues ? parseFloat(initialValues.amountEUR.replace(',', '.')) : 0;
              const amountChanged = isNaN(oldAmountEUR) || Math.abs(newAmountEUR - oldAmountEUR) > 0.001;

              if (amountChanged) {
                await saveExpenseLink(`off_${expenseId}`, [{
                  ...assignment,
                  amountEUR: -newAmountEUR,
                }], null);
              }
            }
          }
        } else if (existingAssignments && existingAssignments.length > 1) {
          // ===== B2: multi-assignació =====

          // 1) Detectar canvi d'import
          // FX: comparem import original
          // EUR: comparem import EUR
          if (useForeignCurrency) {
            const newOriginalStr = amountOriginal.replace(',', '.');
            const newOriginalAmount = parseFloat(newOriginalStr);
            const oldOriginalStr = initialValues?.amountOriginal ?? '0';
            const oldOriginalAmount = parseFloat(oldOriginalStr.replace(',', '.'));

            if (isNaN(newOriginalAmount) || newOriginalAmount <= 0) return;
            const amountChanged =
              isNaN(oldOriginalAmount) ||
              Math.abs(newOriginalAmount - oldOriginalAmount) > 0.001;
            if (!amountChanged) return;

            // 2) Resoldre TC (forçat > projecte)
            const expenseTcStr = initialValues?.fxRateOverride;
            const expenseTc = expenseTcStr ? parseFloat(expenseTcStr) : NaN;
            const tc = (!isNaN(expenseTc) && expenseTc > 0) ? expenseTc : projectFxRate;

            // Guardrail: si no hi ha TC resolt, no tocar res
            if (!tc || tc <= 0) return;

            // 3) Recalcular només assignacions amb amountEUR !== null
            const updated = existingAssignments.map(a => {
              if (a.amountEUR === null) return a; // preservar pendents
              const pct = a.localPct ?? 0;
              const eur = computeFxAmountEUR(newOriginalAmount, pct, tc);
              // eur no pot ser NaN; si fos null, ja hauríem retornat abans
              return { ...a, amountEUR: eur };
            });

            // 4) Normalitzar i desar (preserva parcialitats)
            const totalAmountEURAbs = updated.reduce(
              (s, a) => s + Math.abs(a.amountEUR ?? 0),
              0
            );
            const normalized = normalizeAssignments(
              updated,
              { isFx: true, totalAmountEURAbs },
              'preservePartial'
            );

            await saveExpenseLink(`off_${expenseId}`, normalized.assignments, null);
          } else {
            // ===== EUR (no FX) =====
            const newAmountEUR = parseFloat(amountEUR.replace(',', '.'));
            const oldAmountEUR = initialValues
              ? parseFloat(initialValues.amountEUR.replace(',', '.'))
              : 0;

            if (isNaN(newAmountEUR) || newAmountEUR <= 0) return;
            const amountChanged =
              isNaN(oldAmountEUR) || Math.abs(newAmountEUR - oldAmountEUR) > 0.001;
            if (!amountChanged) return;

            // Guardrail: totes les assignacions han de tenir amountEUR vàlid
            if (existingAssignments.some(a => a.amountEUR === null)) return;

            const weights = existingAssignments.map(a => Math.abs(a.amountEUR ?? 0));
            const totalWeight = weights.reduce((s, v) => s + v, 0);
            if (totalWeight <= 0) return;

            // Repartiment proporcional
            let acc = 0;
            const updated = existingAssignments.map((a, idx) => {
              const share = (weights[idx] / totalWeight) * newAmountEUR;
              const rounded = Math.round(share * 100) / 100;
              acc += rounded;
              return { ...a, amountEUR: -Math.abs(rounded) };
            });

            // Ajust de cèntims a l'última assignació
            const delta = Math.round((newAmountEUR - acc) * 100) / 100;
            if (delta !== 0 && updated.length > 0) {
              const last = updated[updated.length - 1];
              last.amountEUR = -Math.abs(
                Math.round((Math.abs(last.amountEUR) + delta) * 100) / 100
              );
            }

            const totalAmountEURAbs = updated.reduce(
              (s, a) => s + Math.abs(a.amountEUR ?? 0),
              0
            );
            const normalized = normalizeAssignments(
              updated,
              { isFx: false, totalAmountEURAbs },
              'preservePartial'
            );

            await saveExpenseLink(`off_${expenseId}`, normalized.assignments, null);
          }
        }

        trackUX('expenses.offBank.edit.save', { expenseId });

        toast({
          title: tr('projectModule.offBank.expenseUpdated', 'Despesa actualitzada'),
          description: tr('projectModule.offBank.expenseUpdatedDesc', "La despesa de terreny s'ha actualitzat correctament."),
        });
      } else {
        // Mode creació
        const newId = await save(formData);

        trackUX('expenses.offBank.create', { expenseId: newId });

        toast({
          title: tr('projectModule.offBank.expenseAdded', 'Despesa afegida'),
          description: tr('projectModule.offBank.expenseAddedDesc', "La despesa de terreny s'ha creat correctament."),
        });
      }

      resetForm();
      onOpenChange(false);
      onSuccess();

    } catch (err) {
      toast({
        variant: 'destructive',
        title: tr('projectModule.offBank.errorTitle', 'Error'),
        description: err instanceof Error ? err.message : (isEditMode ? tr('projectModule.offBank.errorUpdating', 'Error actualitzant despesa') : tr('projectModule.offBank.errorCreating', 'Error creant despesa')),
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? tr('projectModule.offBank.editTitle', 'Editar despesa de terreny') : tr('projectModule.offBank.addTitle', 'Afegir despesa de terreny')}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? tr('projectModule.offBank.editDescription', 'Modifica les dades de la despesa')
              : tr('projectModule.offBank.addDescription', 'Registra una despesa fora del circuit bancari')}
          </DialogDescription>
          <p className="text-xs text-muted-foreground mt-1">
            {tr('projectModule.offBank.justificationHint', 'Aquesta despesa es justificarà per projecte. No cal categoritzar-la ni convertir-la a EUR aquí.')}
          </p>
        </DialogHeader>

        <form id="offbank-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto space-y-4 px-1">
          {/* Avís si hi ha múltiples imputacions */}
          {isEditMode && existingAssignments && existingAssignments.length > 1 && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                {tr('projectModule.offBank.multiAssignmentWarning', "Aquesta despesa està imputada a diversos projectes. Si canvies l'import, els imports imputats es recalcularan automàticament segons els percentatges definits.")}
              </AlertDescription>
            </Alert>
          )}

          {/* Data + Import EUR (quan no és FX) — 2 columnes en desktop */}
          <div className={`grid gap-3 ${!useForeignCurrency ? 'grid-cols-1 sm:grid-cols-2' : ''}`}>
            <div className="space-y-2">
              <Label htmlFor="date">{tr('projectModule.offBank.dateLabel', 'Data *')}</Label>
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

            {/* Import EUR directe (inline quan no FX) */}
            {!useForeignCurrency && (
              <div className="space-y-2">
                <Label htmlFor="amountEUR">{tr('projectModule.eurAmount', 'Import (EUR) *')}</Label>
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
          </div>

          {/* Toggle moneda local */}
          <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Label htmlFor="useForeignCurrency" className="text-sm font-normal cursor-pointer">
                {tr('projectModule.localCurrencyExpense', 'Despesa en moneda local')}
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
                  <Label htmlFor="currency" className="text-xs">{tr('projectModule.offBank.currencyLabel', 'Moneda *')}</Label>
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
                    <option value="">{tr('projectModule.offBank.selectPlaceholder', 'Selecciona...')}</option>
                    <option value="XOF">{tr('projectModule.offBank.currencyXOF', 'XOF - Franc CFA')}</option>
                    <option value="USD">{tr('projectModule.offBank.currencyUSD', 'USD - Dòlar US')}</option>
                    <option value="GBP">{tr('projectModule.offBank.currencyGBP', 'GBP - Lliura esterlina')}</option>
                  </select>
                  {errors.currency && (
                    <p className="text-sm text-destructive">{errors.currency}</p>
                  )}
                </div>
                {/* Import */}
                <div className="space-y-1">
                  <Label htmlFor="amountOriginal" className="text-xs">{tr('projectModule.offBank.amountLabel', 'Import *')}</Label>
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
                {tr('projectModule.offBank.fxAutoHint', "El tipus de canvi s'aplicarà automàticament quan imputis la despesa a un projecte.")}
              </p>
            </div>
          )}

          {/* EUR manual col·lapsat (només visible quan moneda local ON) */}
          {useForeignCurrency && (
            <Collapsible open={eurManualEnabled} onOpenChange={setEurManualEnabled}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" type="button" className="w-full justify-between px-3 py-2 h-auto">
                  <span className="text-sm text-muted-foreground">{tr('projectModule.offBank.eurManualToggle', 'Introduir EUR manualment (cas especial)')}</span>
                  {eurManualEnabled ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-1">
                <div className="space-y-1 px-3">
                  <Label htmlFor="amountEUR" className="text-xs">{tr('projectModule.offBank.eurAmountLabel', 'Import en EUR')}</Label>
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
                    {tr('projectModule.offBank.eurAutoHint', "Si ho deixes buit, l'EUR es calcularà en imputar la despesa a un projecte.")}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Concepte - full width */}
          <div className="space-y-2">
            <Label htmlFor="concept">{tr('projectModule.offBank.conceptLabel', 'Concepte *')}</Label>
            <Input
              id="concept"
              type="text"
              placeholder={tr('projectModule.offBank.conceptPlaceholder', 'Descripció de la despesa')}
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
            <Label htmlFor="counterpartyName">{tr('projectModule.offBank.counterpartyLabel', 'Origen / Destinatari')}</Label>
            <Input
              id="counterpartyName"
              type="text"
              placeholder={tr('projectModule.offBank.counterpartyPlaceholder', 'Nom del proveïdor o persona')}
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
            />
          </div>

          {/* Comprovants (Attachments) */}
          <div className="space-y-2">
            <Label>{tr('projectModule.offBank.attachmentsLabel', 'Comprovants')}</Label>
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
                <span className="text-sm font-medium">{tr('projectModule.justificationData', 'Dades de justificació')}</span>
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
                  <Label htmlFor="invoiceNumber" className="text-xs">{tr('projectModule.invoiceNumber', 'Núm. factura')}</Label>
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
                  <Label htmlFor="issuerTaxId" className="text-xs">{tr('projectModule.issuerTaxId', 'NIF emissor')}</Label>
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
                  <Label htmlFor="invoiceDate" className="text-xs">{tr('projectModule.invoiceDate', 'Data factura')}</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="paymentDate" className="text-xs">{tr('projectModule.paymentDate', 'Data pagament')}</Label>
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

        </form>

        <DialogFooter className="pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            {tr('projectModule.offBank.cancel', 'Cancel·lar')}
          </Button>
          <Button type="submit" form="offbank-form" disabled={isProcessing}>
            {isProcessing
              ? tr('projectModule.offBank.saving', 'Guardant...')
              : isEditMode
                ? tr('projectModule.offBank.saveChanges', 'Desar canvis')
                : tr('projectModule.offBank.addExpense', 'Afegir despesa')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Alias per compatibilitat amb codi existent
export const AddOffBankExpenseModal = OffBankExpenseModal;
