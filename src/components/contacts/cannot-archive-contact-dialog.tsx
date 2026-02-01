'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';

interface CannotArchiveContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  transactionCount: number;
}

export function CannotArchiveContactDialog({
  open,
  onOpenChange,
  contactName,
  transactionCount,
}: CannotArchiveContactDialogProps) {
  const { t } = useTranslations();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t.contacts?.cannotArchiveTitle ?? 'No es pot arxivar'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t.contacts?.cannotArchiveWithTransactions?.(contactName, transactionCount)
              ?? `El contacte "${contactName}" té ${transactionCount} moviments associats. No es pot arxivar.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {t.common?.close ?? 'Tancar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
