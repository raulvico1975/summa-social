'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Heart, Building2 } from 'lucide-react';
import { useTranslations } from '@/i18n';
import type { Transaction, Donor, Supplier, Project, AnyContact } from '@/lib/data';

interface EditFormData {
  description: string;
  amount: string;
  note: string;
  contactId: string | null;
  projectId: string | null;
}

interface EditTransactionDialogProps {
  open: boolean;
  transaction: Transaction | null;
  donors: Donor[];
  suppliers: Supplier[];
  projects: Project[] | null;
  availableContacts: AnyContact[] | null;
  onSave: (data: EditFormData) => void;
  onClose: () => void;
}

export const EditTransactionDialog = React.memo(function EditTransactionDialog({
  open,
  transaction,
  donors,
  suppliers,
  projects,
  availableContacts,
  onSave,
  onClose,
}: EditTransactionDialogProps) {
  const { t } = useTranslations();

  // Local state for form - only synced when dialog opens
  const [formData, setFormData] = React.useState<EditFormData>({
    description: '',
    amount: '',
    note: '',
    contactId: null,
    projectId: null,
  });

  // Sync local state when transaction changes (dialog opens)
  React.useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description,
        amount: String(transaction.amount),
        note: transaction.note || '',
        contactId: transaction.contactId || null,
        projectId: transaction.projectId || null,
      });
    }
  }, [transaction]);

  const handleSave = React.useCallback(() => {
    onSave(formData);
  }, [onSave, formData]);

  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.movements.table.editTransaction}</DialogTitle>
          <DialogDescription>
            {t.movements.table.editTransactionDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              {t.movements.table.bankConcept}
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="note" className="text-right">
              {t.movements.table.noteLabel}
            </Label>
            <Input
              id="note"
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              className="col-span-3"
              placeholder={t.movements.table.descriptionPlaceholder}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              {t.movements.table.amount}
            </Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contact" className="text-right">
              {t.movements.table.contact}
            </Label>
            <Select
              value={formData.contactId || 'null'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, contactId: value === 'null' ? null : value }))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t.movements.table.selectContact} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">{t.common.none}</SelectItem>
                {donors.length > 0 && (
                  <>
                    <SelectItem value="__donors_label__" disabled className="text-xs text-muted-foreground">
                      {t.movements.table.donorsSection}
                    </SelectItem>
                    {donors.map(donor => (
                      <SelectItem key={donor.id} value={donor.id}>
                        <span className="flex items-center gap-2">
                          <Heart className="h-3 w-3 text-red-500" />
                          {donor.name}
                        </span>
                      </SelectItem>
                    ))}
                  </>
                )}
                {suppliers.length > 0 && (
                  <>
                    <SelectItem value="__suppliers_label__" disabled className="text-xs text-muted-foreground">
                      {t.movements.table.suppliersSection}
                    </SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-blue-500" />
                          {supplier.name}
                        </span>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project" className="text-right">
              {t.movements.table.project}
            </Label>
            <Select
              value={formData.projectId || 'null'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value === 'null' ? null : value }))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t.projects.selectFunder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">{t.common.none}</SelectItem>
                {projects?.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t.common.cancel}</Button>
          </DialogClose>
          <Button onClick={handleSave}>{t.movements.table.saveChanges}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
