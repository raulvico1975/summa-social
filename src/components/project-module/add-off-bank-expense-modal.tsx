// src/components/project-module/add-off-bank-expense-modal.tsx
// Modal per afegir o editar despeses de terreny (off-bank)

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSaveOffBankExpense, useUpdateOffBankExpense } from '@/hooks/use-project-module';
import { useToast } from '@/hooks/use-toast';
import { trackUX } from '@/lib/ux/trackUX';

interface OffBankExpenseInitialValues {
  date: string;
  amountEUR: string;
  concept: string;
  counterpartyName: string;
  categoryName: string;
}

interface OffBankExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  expenseId?: string;
  initialValues?: OffBankExpenseInitialValues;
}

export function OffBankExpenseModal({
  open,
  onOpenChange,
  onSuccess,
  mode = 'create',
  expenseId,
  initialValues,
}: OffBankExpenseModalProps) {
  const { save, isSaving } = useSaveOffBankExpense();
  const { update, isUpdating } = useUpdateOffBankExpense();
  const { toast } = useToast();

  const isEditMode = mode === 'edit';
  const isProcessing = isSaving || isUpdating;

  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [amountEUR, setAmountEUR] = useState('');
  const [concept, setConcept] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [categoryName, setCategoryName] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar valors inicials quan s'obre en mode edit
  useEffect(() => {
    if (open && isEditMode && initialValues) {
      setDate(initialValues.date);
      setAmountEUR(initialValues.amountEUR);
      setConcept(initialValues.concept);
      setCounterpartyName(initialValues.counterpartyName);
      setCategoryName(initialValues.categoryName);
      setErrors({});
    }
  }, [open, isEditMode, initialValues]);

  const resetForm = () => {
    const today = new Date();
    setDate(today.toISOString().split('T')[0]);
    setAmountEUR('');
    setConcept('');
    setCounterpartyName('');
    setCategoryName('');
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      newErrors.date = 'Data invàlida';
    }

    // Import
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

    try {
      if (isEditMode && expenseId) {
        // Mode edició
        await update(expenseId, {
          date,
          amountEUR: amountEUR.replace(',', '.'),
          concept,
          counterpartyName,
          categoryName,
        });

        trackUX('expenses.offBank.edit.save', { expenseId });

        toast({
          title: 'Despesa actualitzada',
          description: 'La despesa de terreny s\'ha actualitzat correctament.',
        });
      } else {
        // Mode creació
        const newId = await save({
          date,
          amountEUR: amountEUR.replace(',', '.'),
          concept,
          counterpartyName,
          categoryName,
        });

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
      <DialogContent className="sm:max-w-md">
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

          {/* Import */}
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
