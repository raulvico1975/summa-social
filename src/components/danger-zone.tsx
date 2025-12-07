'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { AlertTriangle, Trash2, Users, Truck, Briefcase, ArrowRightLeft, Loader2 } from 'lucide-react';

type DeleteType = 'donors' | 'suppliers' | 'employees' | 'transactions' | null;

export function DangerZone() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { organizationId, organization } = useCurrentOrganization();

  const [deleteType, setDeleteType] = React.useState<DeleteType>(null);
  const [confirmText, setConfirmText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);

  const expectedConfirmText = t.dangerZone.confirmWord;

  const handleDelete = async () => {
    if (!organizationId || !deleteType || confirmText !== expectedConfirmText) return;

    setIsDeleting(true);

    try {
      let collectionPath: string;
      let queryConstraint: ReturnType<typeof where> | null = null;
      let deletedCount = 0;

      if (deleteType === 'transactions') {
        collectionPath = `organizations/${organizationId}/transactions`;
      } else {
        collectionPath = `organizations/${organizationId}/contacts`;
        const typeMap = {
          donors: 'donor',
          suppliers: 'supplier',
          employees: 'employee',
        };
        queryConstraint = where('type', '==', typeMap[deleteType]);
      }

      const collectionRef = collection(firestore, collectionPath);
      const q = queryConstraint ? query(collectionRef, queryConstraint) : collectionRef;
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast({
          title: t.dangerZone.noDataToDelete,
          description: t.dangerZone.noDataToDeleteDescription,
        });
        setDeleteType(null);
        setConfirmText('');
        setIsDeleting(false);
        return;
      }

      // Esborrar en batches de 500 (límit de Firestore)
      const batchSize = 500;
      const docs = snapshot.docs;
      const batches = Math.ceil(docs.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const batch = writeBatch(firestore);
        const start = i * batchSize;
        const end = Math.min(start + batchSize, docs.length);

        for (let j = start; j < end; j++) {
          batch.delete(docs[j].ref);
          deletedCount++;
        }

        await batch.commit();
      }

      toast({
        title: t.dangerZone.deleteSuccess,
        description: t.dangerZone.deleteSuccessDescription(deletedCount, t.dangerZone.types[deleteType]),
      });

      setDeleteType(null);
      setConfirmText('');
    } catch (error) {
      console.error('Error deleting data:', error);
      toast({
        variant: 'destructive',
        title: t.dangerZone.deleteError,
        description: t.dangerZone.deleteErrorDescription,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteOptions = [
    {
      type: 'donors' as const,
      icon: Users,
      label: t.dangerZone.deleteDonors,
      description: t.dangerZone.deleteDonorsDescription,
    },
    {
      type: 'suppliers' as const,
      icon: Truck,
      label: t.dangerZone.deleteSuppliers,
      description: t.dangerZone.deleteSuppliersDescription,
    },
    {
      type: 'employees' as const,
      icon: Briefcase,
      label: t.dangerZone.deleteEmployees,
      description: t.dangerZone.deleteEmployeesDescription,
    },
    {
      type: 'transactions' as const,
      icon: ArrowRightLeft,
      label: t.dangerZone.deleteTransactions,
      description: t.dangerZone.deleteTransactionsDescription,
    },
  ];

  return (
    <>
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            {t.dangerZone.title}
          </CardTitle>
          <CardDescription className="text-red-600/80 dark:text-red-400/80">
            {t.dangerZone.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {deleteOptions.map((option) => (
              <Button
                key={option.type}
                variant="outline"
                className="h-auto flex-col items-start gap-1 p-4 border-red-200 hover:border-red-400 hover:bg-red-50 dark:border-red-900 dark:hover:border-red-700 dark:hover:bg-red-950"
                onClick={() => setDeleteType(option.type)}
              >
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <option.icon className="h-4 w-4" />
                  <span className="font-medium">{option.label}</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {option.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteType !== null} onOpenChange={(open) => !open && setDeleteType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {t.dangerZone.confirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {t.dangerZone.confirmDescription(
                  deleteType ? t.dangerZone.types[deleteType] : '',
                  organization?.name || ''
                )}
              </p>
              <p className="font-semibold text-red-600">
                {t.dangerZone.confirmWarning}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="confirm-text">
              {t.dangerZone.confirmLabel} <span className="font-mono font-bold">{expectedConfirmText}</span>
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedConfirmText}
              className="font-mono"
              autoComplete="off"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t.dangerZone.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={confirmText !== expectedConfirmText || isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.dangerZone.deleting}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t.dangerZone.deleteButton}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
