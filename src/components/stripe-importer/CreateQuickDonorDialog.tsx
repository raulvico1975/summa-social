'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useTranslations } from '@/i18n';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface QuickDonorFormData {
  name: string;
  email: string;
  taxId: string;
  zipCode: string;
}

interface CreateQuickDonorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: QuickDonorFormData) => Promise<string | null>; // Returns donor ID or null
  initialData?: Partial<QuickDonorFormData>;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function CreateQuickDonorDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
}: CreateQuickDonorDialogProps) {
  const { t } = useTranslations();
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState<QuickDonorFormData>({
    name: '',
    email: '',
    taxId: '',
    zipCode: '',
  });

  // Initialize form data when dialog opens or initialData changes
  React.useEffect(() => {
    if (open && initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        taxId: initialData.taxId || '',
        zipCode: initialData.zipCode || '',
      });
    } else if (open) {
      // Reset to empty when opening without initial data
      setFormData({
        name: '',
        email: '',
        taxId: '',
        zipCode: '',
      });
    }
    setError(null);
  }, [open, initialData]);

  const handleChange = (field: keyof QuickDonorFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSave = async () => {
    // Validate name is required
    if (!formData.name.trim()) {
      setError(t.importers.stripeImporter.createQuickDonor.fields.nameRequired);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const donorId = await onSave(formData);

      if (donorId) {
        // Success - close dialog
        onOpenChange(false);

        // Reset form
        setFormData({
          name: '',
          email: '',
          taxId: '',
          zipCode: '',
        });
      } else {
        setError('Error al crear el donant. Torna-ho a intentar.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconegut';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasIncompleteData = !formData.taxId.trim() || !formData.zipCode.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.importers.stripeImporter.createQuickDonor.title}</DialogTitle>
          <DialogDescription>
            {t.importers.stripeImporter.createQuickDonor.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="donor-name">
              {t.importers.stripeImporter.createQuickDonor.fields.name}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="donor-name"
              placeholder={t.importers.stripeImporter.createQuickDonor.fields.namePlaceholder}
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Email field (read-only if provided from CSV) */}
          <div className="space-y-2">
            <Label htmlFor="donor-email">
              {t.importers.stripeImporter.createQuickDonor.fields.email}
            </Label>
            <Input
              id="donor-email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={isSaving || !!initialData?.email}
              placeholder={initialData?.email ? '' : 'exemple@email.com'}
            />
            {initialData?.email && (
              <p className="text-xs text-muted-foreground">
                {t.importers.stripeImporter.createQuickDonor.fields.emailFromCsv}
              </p>
            )}
          </div>

          {/* Tax ID field */}
          <div className="space-y-2">
            <Label htmlFor="donor-taxId">
              {t.importers.stripeImporter.createQuickDonor.fields.taxId}
            </Label>
            <Input
              id="donor-taxId"
              placeholder={t.importers.stripeImporter.createQuickDonor.fields.taxIdPlaceholder}
              value={formData.taxId}
              onChange={(e) => handleChange('taxId', e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Zip code field */}
          <div className="space-y-2">
            <Label htmlFor="donor-zipCode">
              {t.importers.stripeImporter.createQuickDonor.fields.zipCode}
            </Label>
            <Input
              id="donor-zipCode"
              placeholder={t.importers.stripeImporter.createQuickDonor.fields.zipCodePlaceholder}
              value={formData.zipCode}
              onChange={(e) => handleChange('zipCode', e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Warning for incomplete data */}
          {hasIncompleteData && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">
                  {t.importers.stripeImporter.createQuickDonor.warnings.incompleteData}
                </div>
                <div className="text-sm mt-1">
                  {t.importers.stripeImporter.createQuickDonor.warnings.incompleteDataDescription}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t.importers.stripeImporter.createQuickDonor.actions.cancel}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving
              ? t.importers.stripeImporter.createQuickDonor.actions.creating
              : t.importers.stripeImporter.createQuickDonor.actions.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
