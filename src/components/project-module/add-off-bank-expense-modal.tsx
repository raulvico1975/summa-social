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
import { useSaveOffBankExpense, useUpdateOffBankExpense } from '@/hooks/use-project-module';
import { useToast } from '@/hooks/use-toast';
import { trackUX } from '@/lib/ux/trackUX';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

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
}: OffBankExpenseModalProps) {
  const { save, isSaving } = useSaveOffBankExpense();
  const { update, isUpdating } = useUpdateOffBankExpense();
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

  // Camps FX
  const [useForeignCurrency, setUseForeignCurrency] = useState(false);
  const [currency, setCurrency] = useState('');
  const [amountOriginal, setAmountOriginal] = useState('');
  const [useFxOverride, setUseFxOverride] = useState(false);
  const [fxRateOverride, setFxRateOverride] = useState('');

  // Camps justificació (collapsible)
  const [justificationOpen, setJustificationOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issuerTaxId, setIssuerTaxId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Determinar el tipus de canvi efectiu
  const effectiveFxRate = useFxOverride && fxRateOverride
    ? parseFloat(fxRateOverride.replace(',', '.'))
    : projectFxRate ?? null;

  // Calcular import EUR automàticament quan s'usa moneda estrangera
  const calculateEurAmount = useCallback(() => {
    if (!useForeignCurrency || !amountOriginal) return '';
    const originalAmount = parseFloat(amountOriginal.replace(',', '.'));
    if (isNaN(originalAmount) || !effectiveFxRate || effectiveFxRate <= 0) return '';
    const eurAmount = originalAmount / effectiveFxRate;
    return eurAmount.toFixed(2);
  }, [useForeignCurrency, amountOriginal, effectiveFxRate]);

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
        setUseFxOverride(initialValues.useFxOverride ?? false);
        setFxRateOverride(initialValues.fxRateOverride ?? '');
      } else {
        setUseForeignCurrency(false);
        setCurrency('');
        setAmountOriginal('');
        setUseFxOverride(false);
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
      setErrors({});
    }
  }, [open, isEditMode, initialValues]);

  // Inicialitzar moneda del projecte quan s'obre el modal
  useEffect(() => {
    if (open && !isEditMode && projectFxCurrency) {
      setCurrency(projectFxCurrency);
    }
  }, [open, isEditMode, projectFxCurrency]);

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
    setUseFxOverride(false);
    setFxRateOverride('');
    // Justificació
    setJustificationOpen(false);
    setInvoiceNumber('');
    setIssuerTaxId('');
    setInvoiceDate('');
    setPaymentDate('');
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
        newErrors.currency = 'Indica la moneda (ex: XOF)';
      }
      const origAmount = parseFloat(amountOriginal.replace(',', '.'));
      if (isNaN(origAmount) || origAmount <= 0) {
        newErrors.amountOriginal = 'Import original ha de ser positiu';
      }
      if (!effectiveFxRate || effectiveFxRate <= 0) {
        newErrors.fxRate = 'Cal un tipus de canvi vàlid';
      }
    }

    // Import EUR (calculat o manual)
    const amount = parseFloat(amountEUR.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      newErrors.amountEUR = 'Import ha de ser positiu';
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

    // Preparar dades
    const formData = {
      date,
      amountEUR: amountEUR.replace(',', '.'),
      concept,
      counterpartyName,
      categoryName,
      // FX (només si s'usa moneda estrangera)
      currency: useForeignCurrency ? currency.trim().toUpperCase() : undefined,
      amountOriginal: useForeignCurrency ? amountOriginal.replace(',', '.') : undefined,
      fxRateOverride: useForeignCurrency && useFxOverride ? fxRateOverride.replace(',', '.') : undefined,
      useFxOverride: useForeignCurrency ? useFxOverride : undefined,
      // Justificació
      invoiceNumber: invoiceNumber.trim() || undefined,
      issuerTaxId: issuerTaxId.trim() || undefined,
      invoiceDate: invoiceDate || undefined,
      paymentDate: paymentDate || undefined,
    };

    try {
      if (isEditMode && expenseId) {
        // Mode edició
        await update(expenseId, formData);

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
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
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

          {/* Toggle moneda estrangera */}
          {(projectFxRate || isEditMode) && (
            <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label htmlFor="useForeignCurrency" className="text-sm font-normal cursor-pointer">
                  Despesa en moneda local
                </Label>
                {projectFxCurrency && (
                  <span className="text-xs text-muted-foreground">
                    ({projectFxCurrency})
                  </span>
                )}
              </div>
              <Switch
                id="useForeignCurrency"
                checked={useForeignCurrency}
                onCheckedChange={setUseForeignCurrency}
              />
            </div>
          )}

          {/* Camps FX si s'usa moneda estrangera */}
          {useForeignCurrency && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="amountOriginal" className="text-xs">Import original *</Label>
                  <Input
                    id="amountOriginal"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amountOriginal}
                    onChange={(e) => setAmountOriginal(e.target.value)}
                    className={errors.amountOriginal ? 'border-destructive h-9' : 'h-9'}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="currency" className="text-xs">Moneda *</Label>
                  <Input
                    id="currency"
                    type="text"
                    placeholder="XOF"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    maxLength={3}
                    className={errors.currency ? 'border-destructive h-9 font-mono' : 'h-9 font-mono'}
                  />
                </div>
              </div>
              {(errors.amountOriginal || errors.currency) && (
                <p className="text-sm text-destructive">{errors.amountOriginal || errors.currency}</p>
              )}

              {/* Override FX */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    id="useFxOverride"
                    checked={useFxOverride}
                    onCheckedChange={setUseFxOverride}
                  />
                  <Label htmlFor="useFxOverride" className="text-xs font-normal cursor-pointer">
                    Usar tipus de canvi diferent
                  </Label>
                </div>
                {useFxOverride ? (
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={projectFxRate?.toString() ?? '0'}
                    value={fxRateOverride}
                    onChange={(e) => setFxRateOverride(e.target.value)}
                    className={errors.fxRate ? 'border-destructive h-8 w-24 text-sm font-mono' : 'h-8 w-24 text-sm font-mono'}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground font-mono">
                    {projectFxRate ?? 'No configurat'}
                  </span>
                )}
              </div>
              {errors.fxRate && (
                <p className="text-sm text-destructive">{errors.fxRate}</p>
              )}

              {/* Preview conversió */}
              {amountOriginal && effectiveFxRate && effectiveFxRate > 0 && (
                <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>
                    {parseFloat(amountOriginal.replace(',', '.')).toLocaleString('ca-ES')} {currency} ÷ {effectiveFxRate} = {calculateEurAmount()} EUR
                  </span>
                </div>
              )}
            </div>
          )}

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

          {/* Concepte */}
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

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="categoryName">Categoria</Label>
            <Input
              id="categoryName"
              type="text"
              placeholder="p.ex. Transport, Material, etc."
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
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
