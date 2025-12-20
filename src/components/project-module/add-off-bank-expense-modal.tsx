// src/components/project-module/add-off-bank-expense-modal.tsx
// Modal per afegir despeses de terreny (off-bank)

'use client';

import * as React from 'react';
import { useState } from 'react';
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
import { useSaveOffBankExpense } from '@/hooks/use-project-module';
import { useToast } from '@/hooks/use-toast';

interface AddOffBankExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddOffBankExpenseModal({
  open,
  onOpenChange,
  onSuccess,
}: AddOffBankExpenseModalProps) {
  const { save, isSaving } = useSaveOffBankExpense();
  const { toast } = useToast();

  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [amountEUR, setAmountEUR] = useState('');
  const [concept, setConcept] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [categoryName, setCategoryName] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      await save({
        date,
        amountEUR: amountEUR.replace(',', '.'),
        concept,
        counterpartyName,
        categoryName,
      });

      toast({
        title: 'Despesa afegida',
        description: 'La despesa de terreny s\'ha creat correctament.',
      });

      resetForm();
      onOpenChange(false);
      onSuccess();

    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error creant despesa',
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
          <DialogTitle>Afegir despesa de terreny</DialogTitle>
          <DialogDescription>
            Registra una despesa fora del circuit bancari
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
              disabled={isSaving}
            >
              Cancel·lar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardant...' : 'Afegir despesa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
