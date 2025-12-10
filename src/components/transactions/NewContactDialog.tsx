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
import { Heart, Building2 } from 'lucide-react';
import { useTranslations } from '@/i18n';

interface NewContactFormData {
  name: string;
  taxId: string;
  zipCode: string;
  city: string;
}

interface NewContactDialogProps {
  open: boolean;
  contactType: 'donor' | 'supplier';
  onSave: (data: NewContactFormData) => void;
  onClose: () => void;
}

export const NewContactDialog = React.memo(function NewContactDialog({
  open,
  contactType,
  onSave,
  onClose,
}: NewContactDialogProps) {
  const { t } = useTranslations();

  // Local state for form
  const [formData, setFormData] = React.useState<NewContactFormData>({
    name: '',
    taxId: '',
    zipCode: '',
    city: '',
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData({ name: '', taxId: '', zipCode: '', city: '' });
    }
  }, [open]);

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {contactType === 'donor' ? (
              <>
                <Heart className="h-5 w-5 text-red-500" />
                {t.movements.table.newDonor}
              </>
            ) : (
              <>
                <Building2 className="h-5 w-5 text-blue-500" />
                {t.movements.table.newSupplier}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {contactType === 'donor'
              ? t.movements.table.addNewDonorDescription
              : t.movements.table.addNewSupplierDescription
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-contact-name">
              {t.movements.table.nameRequired}
            </Label>
            <Input
              id="new-contact-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={contactType === 'donor' ? t.donors.namePlaceholder : t.suppliers.namePlaceholder}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-contact-taxId">
              {t.donors.taxId} <span className="text-muted-foreground text-xs">({t.common.optional})</span>
            </Label>
            <Input
              id="new-contact-taxId"
              value={formData.taxId}
              onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
              placeholder="12345678A"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-contact-zipCode">
                {t.donors.zipCode} <span className="text-muted-foreground text-xs">({t.common.optional})</span>
              </Label>
              <Input
                id="new-contact-zipCode"
                value={formData.zipCode}
                onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                placeholder="08001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-contact-city">
                {t.donors.city} <span className="text-muted-foreground text-xs">({t.common.optional})</span>
              </Label>
              <Input
                id="new-contact-city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Barcelona"
              />
            </div>
          </div>
          {contactType === 'donor' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                {t.donors.incompleteDataWarningDescription}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t.common.cancel}</Button>
          </DialogClose>
          <Button onClick={handleSave}>
            {contactType === 'donor' ? t.movements.table.createDonor : t.movements.table.createSupplier}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
