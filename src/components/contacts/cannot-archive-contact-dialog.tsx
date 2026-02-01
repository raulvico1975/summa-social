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
  activeCount: number;
  archivedCount: number;
}

export function CannotArchiveContactDialog({
  open,
  onOpenChange,
  contactName,
  activeCount,
}: CannotArchiveContactDialogProps) {
  const { t } = useTranslations();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t.contacts?.cannotDeleteTitle ?? 'No es pot eliminar'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t.contacts?.cannotDeleteMessage?.(contactName, activeCount)
              ?? `El contacte "${contactName}" té ${activeCount} moviments associats.`}
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
