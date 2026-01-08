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
import { collection, getDocs, writeBatch, query, where, doc } from 'firebase/firestore';
import { AlertTriangle, Trash2, Users, Truck, Briefcase, ArrowRightLeft, Loader2, GitMerge, Calendar, FileText, Coins, Hash, Tags } from 'lucide-react';
import { formatCurrencyEU } from '@/lib/normalize';

type DeleteType = 'donors' | 'suppliers' | 'employees' | 'transactions' | 'categories' | null;

// Patró per detectar transaccions de remesa (fallback)
const REMITTANCE_PATTERNS = [
  'Donació soci/a:',
  'Donación socio/a:',
];

// Tipus per la info de remesa trobada
type RemittanceInfo = {
  id: string;
  date: string;
  description: string;
  amount: number;
  itemCount: number;
  childCount: number; // Transaccions filles reals trobades
};

export function DangerZone() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { organizationId, organization } = useCurrentOrganization();

  const [deleteType, setDeleteType] = React.useState<DeleteType>(null);
  const [confirmText, setConfirmText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Estat per esborrar remeses separades (quotes vs devolucions)
  const [isDeletingIncomeRemittances, setIsDeletingIncomeRemittances] = React.useState(false);
  const [isDeletingReturnsRemittances, setIsDeletingReturnsRemittances] = React.useState(false);
  const [showIncomeRemittanceDialog, setShowIncomeRemittanceDialog] = React.useState(false);
  const [showReturnsRemittanceDialog, setShowReturnsRemittanceDialog] = React.useState(false);
  const [incomeRemittanceConfirmText, setIncomeRemittanceConfirmText] = React.useState('');
  const [returnsRemittanceConfirmText, setReturnsRemittanceConfirmText] = React.useState('');

  const expectedConfirmText = t.dangerZone.confirmWord;
  const expectedIncomeConfirmText = t.dangerZone.deleteIncomeRemittancesConfirmWord ?? 'ESBORRAR QUOTES';
  const expectedReturnsConfirmText = t.dangerZone.deleteReturnsRemittancesConfirmWord ?? 'ESBORRAR DEVOLUCIONS';

  // Esborrar remeses de quotes de socis (IN, amount > 0)
  const handleDeleteIncomeRemittances = async () => {
    if (!organizationId || incomeRemittanceConfirmText !== expectedIncomeConfirmText) {
      return;
    }

    setIsDeletingIncomeRemittances(true);
    try {
      const transactionsRef = collection(firestore, `organizations/${organizationId}/transactions`);

      // Buscar remeses IN (isRemittance === true i amount > 0)
      const remittanceQuery = query(
        transactionsRef,
        where('isRemittance', '==', true)
      );
      const remittanceSnapshot = await getDocs(remittanceQuery);

      // Filtrar només les d'ingrés (amount > 0 i NO són returns)
      const incomeRemittances = remittanceSnapshot.docs.filter(d => {
        const data = d.data();
        return data.amount > 0 && data.remittanceType !== 'returns';
      });

      if (incomeRemittances.length === 0) {
        toast({
          title: t.dangerZone.noIncomeRemittancesFound ?? "No s'han trobat remeses de quotes",
          description: t.dangerZone.noDataToDeleteDescription,
        });
        setShowIncomeRemittanceDialog(false);
        setIncomeRemittanceConfirmText('');
        return;
      }

      let deletedRemittanceCount = 0;
      let deletedChildCount = 0;

      // Esborrar cada remesa i les seves filles
      for (const remittanceDoc of incomeRemittances) {
        const remittanceId = remittanceDoc.id;

        // Buscar i esborrar transaccions filles
        const childQuery = query(transactionsRef, where('parentTransactionId', '==', remittanceId));
        const childSnapshot = await getDocs(childQuery);

        const batch = writeBatch(firestore);

        // Esborrar filles
        childSnapshot.docs.forEach(childDoc => {
          batch.delete(childDoc.ref);
          deletedChildCount++;
        });

        // Esborrar pare
        batch.delete(remittanceDoc.ref);
        deletedRemittanceCount++;

        await batch.commit();
      }

      toast({
        title: t.dangerZone.deleteSuccess,
        description: t.dangerZone.incomeRemittancesDeleted?.(deletedRemittanceCount) ??
          `S'han esborrat ${deletedRemittanceCount} remeses de quotes i ${deletedChildCount} transaccions associades.`,
      });

      setShowIncomeRemittanceDialog(false);
      setIncomeRemittanceConfirmText('');
    } catch (error: any) {
      console.error('[DangerZone] Error deleting income remittances:', error);
      toast({
        variant: 'destructive',
        title: t.dangerZone.deleteError,
        description: error?.message || t.dangerZone.deleteErrorDescription,
      });
    } finally {
      setIsDeletingIncomeRemittances(false);
    }
  };

  // Esborrar remeses de devolucions (remittanceType === 'returns')
  const handleDeleteReturnsRemittances = async () => {
    if (!organizationId || returnsRemittanceConfirmText !== expectedReturnsConfirmText) {
      return;
    }

    setIsDeletingReturnsRemittances(true);
    try {
      const transactionsRef = collection(firestore, `organizations/${organizationId}/transactions`);

      // Buscar remeses de devolucions
      const remittanceQuery = query(
        transactionsRef,
        where('isRemittance', '==', true),
        where('remittanceType', '==', 'returns')
      );
      const remittanceSnapshot = await getDocs(remittanceQuery);

      if (remittanceSnapshot.empty) {
        toast({
          title: t.dangerZone.noReturnsRemittancesFound ?? "No s'han trobat remeses de devolucions",
          description: t.dangerZone.noDataToDeleteDescription,
        });
        setShowReturnsRemittanceDialog(false);
        setReturnsRemittanceConfirmText('');
        return;
      }

      let deletedRemittanceCount = 0;
      let deletedChildCount = 0;

      // Esborrar cada remesa i les seves filles
      for (const remittanceDoc of remittanceSnapshot.docs) {
        const remittanceId = remittanceDoc.id;

        // Buscar i esborrar transaccions filles
        const childQuery = query(transactionsRef, where('parentTransactionId', '==', remittanceId));
        const childSnapshot = await getDocs(childQuery);

        const batch = writeBatch(firestore);

        // Esborrar filles
        childSnapshot.docs.forEach(childDoc => {
          batch.delete(childDoc.ref);
          deletedChildCount++;
        });

        // Esborrar pare
        batch.delete(remittanceDoc.ref);
        deletedRemittanceCount++;

        await batch.commit();
      }

      toast({
        title: t.dangerZone.deleteSuccess,
        description: t.dangerZone.returnsRemittancesDeleted?.(deletedRemittanceCount) ??
          `S'han esborrat ${deletedRemittanceCount} remeses de devolucions i ${deletedChildCount} transaccions associades.`,
      });

      setShowReturnsRemittanceDialog(false);
      setReturnsRemittanceConfirmText('');
    } catch (error: any) {
      console.error('[DangerZone] Error deleting returns remittances:', error);
      toast({
        variant: 'destructive',
        title: t.dangerZone.deleteError,
        description: error?.message || t.dangerZone.deleteErrorDescription,
      });
    } finally {
      setIsDeletingReturnsRemittances(false);
    }
  };

  const handleDelete = async () => {
    if (!organizationId || !deleteType || confirmText !== expectedConfirmText) return;

    setIsDeleting(true);

    try {
      let collectionPath: string;
      let queryConstraint: ReturnType<typeof where> | null = null;
      let deletedCount = 0;

      if (deleteType === 'transactions') {
        collectionPath = `organizations/${organizationId}/transactions`;
      } else if (deleteType === 'categories') {
        collectionPath = `organizations/${organizationId}/categories`;
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
    {
      type: 'categories' as const,
      icon: Tags,
      label: 'Esborrar totes les categories',
      description: 'Elimina totes les categories. Els moviments quedaran sense categoria.',
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

          {/* Secció: Esborrar remeses */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              {t.dangerZone.remittanceSection}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Botó 1: Esborrar remeses de quotes de socis */}
              <Button
                variant="outline"
                className="h-auto flex-col items-start gap-1 p-4 border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:border-orange-900 dark:hover:border-orange-700 dark:hover:bg-orange-950"
                onClick={() => setShowIncomeRemittanceDialog(true)}
              >
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <GitMerge className="h-4 w-4" />
                  <span className="font-medium">{t.dangerZone.deleteIncomeRemittances ?? 'Esborrar remeses de quotes de socis'}</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {t.dangerZone.deleteIncomeRemittancesDescription ?? "Elimina totes les remeses d'ingressos generades a partir de quotes de socis."}
                </span>
              </Button>

              {/* Botó 2: Esborrar devolucions conjuntes */}
              <Button
                variant="outline"
                className="h-auto flex-col items-start gap-1 p-4 border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:border-orange-900 dark:hover:border-orange-700 dark:hover:bg-orange-950"
                onClick={() => setShowReturnsRemittanceDialog(true)}
              >
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <GitMerge className="h-4 w-4" />
                  <span className="font-medium">{t.dangerZone.deleteReturnsRemittances ?? 'Esborrar devolucions conjuntes'}</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {t.dangerZone.deleteReturnsRemittancesDescription ?? 'Elimina totes les remeses de devolucions bancàries agrupades.'}
                </span>
              </Button>
            </div>
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

      {/* Dialog per esborrar remeses de quotes de socis */}
      <AlertDialog open={showIncomeRemittanceDialog} onOpenChange={(open) => {
        if (!open) {
          setShowIncomeRemittanceDialog(false);
          setIncomeRemittanceConfirmText('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              {t.dangerZone.deleteIncomeRemittances ?? 'Esborrar remeses de quotes de socis'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t.dangerZone.deleteIncomeRemittancesDescription ?? "Elimina totes les remeses d'ingressos generades a partir de quotes de socis (remeses IN). S'esborraran el moviment pare i totes les quotes associades."}</p>
                <p className="font-semibold text-orange-600">
                  {t.dangerZone.confirmWarning}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="income-remittance-confirm-text">
              {t.dangerZone.confirmLabel} <span className="font-mono font-bold">{expectedIncomeConfirmText}</span>
            </Label>
            <Input
              id="income-remittance-confirm-text"
              value={incomeRemittanceConfirmText}
              onChange={(e) => setIncomeRemittanceConfirmText(e.target.value)}
              placeholder={expectedIncomeConfirmText}
              className="font-mono"
              autoComplete="off"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingIncomeRemittances}>
              {t.dangerZone.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIncomeRemittances}
              disabled={incomeRemittanceConfirmText !== expectedIncomeConfirmText || isDeletingIncomeRemittances}
              className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
            >
              {isDeletingIncomeRemittances ? (
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

      {/* Dialog per esborrar devolucions conjuntes */}
      <AlertDialog open={showReturnsRemittanceDialog} onOpenChange={(open) => {
        if (!open) {
          setShowReturnsRemittanceDialog(false);
          setReturnsRemittanceConfirmText('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              {t.dangerZone.deleteReturnsRemittances ?? 'Esborrar devolucions conjuntes'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t.dangerZone.deleteReturnsRemittancesDescription ?? 'Elimina totes les remeses de devolucions bancàries agrupades. Això desfà devolucions processades a partir de fitxers del banc.'}</p>
                <p className="font-semibold text-orange-600">
                  {t.dangerZone.confirmWarning}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="returns-remittance-confirm-text">
              {t.dangerZone.confirmLabel} <span className="font-mono font-bold">{expectedReturnsConfirmText}</span>
            </Label>
            <Input
              id="returns-remittance-confirm-text"
              value={returnsRemittanceConfirmText}
              onChange={(e) => setReturnsRemittanceConfirmText(e.target.value)}
              placeholder={expectedReturnsConfirmText}
              className="font-mono"
              autoComplete="off"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingReturnsRemittances}>
              {t.dangerZone.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReturnsRemittances}
              disabled={returnsRemittanceConfirmText !== expectedReturnsConfirmText || isDeletingReturnsRemittances}
              className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
            >
              {isDeletingReturnsRemittances ? (
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
