'use client';

import * as React from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { Transaction } from '@/lib/data';
import {
  type UndoOperationType,
  getUndoConfirmationText,
  getUndoDialogTitle,
  getUndoDialogDescription,
} from '@/lib/fiscal/undoProcessing';
import { useTranslations } from '@/i18n';

// =============================================================================
// TIPUS
// =============================================================================

interface UndoProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  operationType: UndoOperationType | null;
  childCount: number;
  isProcessing: boolean;
  onConfirm: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function UndoProcessingDialog({
  open,
  onOpenChange,
  transaction,
  operationType,
  childCount,
  isProcessing,
  onConfirm,
}: UndoProcessingDialogProps) {
  const { t } = useTranslations();
  const [confirmationText, setConfirmationText] = React.useState('');

  // Reset input quan es tanca o obre
  React.useEffect(() => {
    if (open) {
      setConfirmationText('');
    }
  }, [open]);

  if (!operationType) return null;

  const requiredText = getUndoConfirmationText(operationType);
  const isConfirmEnabled = confirmationText.toUpperCase() === requiredText && !isProcessing;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            {getUndoDialogTitle(operationType)}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{getUndoDialogDescription(operationType, childCount)}</p>
            <p className="text-sm text-muted-foreground">
              Aquesta acció <strong>NO</strong> es pot desfer.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-undo" className="text-sm">
            Per confirmar, escriu <code className="bg-muted px-1 py-0.5 rounded text-orange-600 font-mono">{requiredText}</code>
          </Label>
          <Input
            id="confirm-undo"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder={requiredText}
            disabled={isProcessing}
            autoComplete="off"
            className="font-mono"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
            className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.common.undoing}
              </>
            ) : (
              t.common.undoProcessing
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
