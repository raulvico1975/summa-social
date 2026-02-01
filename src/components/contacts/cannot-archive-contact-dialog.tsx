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
  archivedCount,
}: CannotArchiveContactDialogProps) {
  const { t } = useTranslations();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t.contacts?.cannotArchiveTitle ?? 'No es pot arxivar'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t.contacts?.cannotArchiveIntro?.(contactName)
                ?? `El contacte "${contactName}" té moviments associats:`}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>{t.contacts?.activeMovementsLabel ?? 'Moviments actius'}:</strong> {activeCount}
                {activeCount > 0 && (
                  <span className="text-destructive ml-1">
                    ({t.contacts?.blocksArchive ?? "bloqueja l'arxivat"})
                  </span>
                )}
              </li>
              {archivedCount > 0 && (
                <li>
                  <strong>{t.contacts?.archivedMovementsLabel ?? 'Moviments arxivats (històric)'}:</strong> {archivedCount}
                </li>
              )}
            </ul>
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
