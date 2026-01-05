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

  // Estat per esborrar última remesa
  const [remittanceInfo, setRemittanceInfo] = React.useState<RemittanceInfo | null>(null);
  const [fallbackCount, setFallbackCount] = React.useState<number | null>(null); // Per fallback sense isRemittance
  const [isSearchingRemittances, setIsSearchingRemittances] = React.useState(false);
  const [isDeletingRemittances, setIsDeletingRemittances] = React.useState(false);
  const [remittanceConfirmText, setRemittanceConfirmText] = React.useState('');
  const [showRemittanceDialog, setShowRemittanceDialog] = React.useState(false);

  const expectedConfirmText = t.dangerZone.confirmWord;

  // Buscar última remesa processada
  const handleSearchLastRemittance = async () => {
    if (!organizationId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha trobat l\'organització',
      });
      return;
    }

    setIsSearchingRemittances(true);
    setRemittanceInfo(null);
    setFallbackCount(null);

    try {
      const transactionsRef = collection(firestore, `organizations/${organizationId}/transactions`);

      // 1. Buscar transaccions amb isRemittance === true
      const remittanceQuery = query(transactionsRef, where('isRemittance', '==', true));
      const remittanceSnapshot = await getDocs(remittanceQuery);

      if (!remittanceSnapshot.empty) {
        // Ordenar per data/createdAt DESC i agafar la més recent
        // IMPORTANT: ...d.data() primer, després id: d.id per sobreescriure qualsevol camp 'id' del document
        const remittances = remittanceSnapshot.docs.map(d => ({
          ...d.data(),
          id: d.id,
        }));

        // Ordenar per createdAt o date DESC
        remittances.sort((a: any, b: any) => {
          const dateA = a.createdAt || a.date || '';
          const dateB = b.createdAt || b.date || '';
          return dateB.localeCompare(dateA);
        });

        const lastRemittance = remittances[0] as any;

        // Buscar transaccions filles
        const childQuery = query(transactionsRef, where('parentTransactionId', '==', lastRemittance.id));
        const childSnapshot = await getDocs(childQuery);

        setRemittanceInfo({
          id: lastRemittance.id,
          date: lastRemittance.date,
          description: lastRemittance.description,
          amount: lastRemittance.amount,
          itemCount: lastRemittance.remittanceItemCount || 0,
          childCount: childSnapshot.size,
        });
        setShowRemittanceDialog(true);
      } else {
        // 2. Fallback: buscar per descripció
        const allTransactions = await getDocs(transactionsRef);

        const fallbackTransactions = allTransactions.docs.filter(d => {
          const data = d.data();
          return REMITTANCE_PATTERNS.some(pattern =>
            data.description?.includes(pattern)
          );
        });

        if (fallbackTransactions.length > 0) {
          setFallbackCount(fallbackTransactions.length);
          setShowRemittanceDialog(true);
        } else {
          toast({
            title: t.dangerZone.noRemittanceFound,
            description: t.dangerZone.noRemittanceFoundDescription,
          });
        }
      }
    } catch (error: any) {
      console.error('[DangerZone] Error searching remittances:', error);
      toast({
        variant: 'destructive',
        title: t.dangerZone.searchError,
        description: error?.message || String(error),
      });
    } finally {
      setIsSearchingRemittances(false);
    }
  };

  // Esborrar última remesa i les seves transaccions filles
  const handleDeleteRemittance = async () => {
    if (!organizationId || remittanceConfirmText !== expectedConfirmText) {
      return;
    }

    // Validar que tenim dades per esborrar
    if (!remittanceInfo && !fallbackCount) {
      toast({
        variant: 'destructive',
        title: t.dangerZone.noRemittanceFound,
        description: t.dangerZone.noRemittanceFoundDescription,
      });
      setShowRemittanceDialog(false);
      return;
    }

    setIsDeletingRemittances(true);
    try {
      const transactionsRef = collection(firestore, `organizations/${organizationId}/transactions`);
      let deletedCount = 0;

      if (remittanceInfo && remittanceInfo.id) {
        // Validar que l'ID no és buit
        if (!remittanceInfo.id.trim()) {
          toast({
            variant: 'destructive',
            title: t.dangerZone.deleteError,
            description: 'ID de remesa invàlid',
          });
          return;
        }

        // Cas 1: Esborrar remesa amb isRemittance i les seves filles
        const childQuery = query(transactionsRef, where('parentTransactionId', '==', remittanceInfo.id));
        const childSnapshot = await getDocs(childQuery);

        const batch = writeBatch(firestore);

        // Esborrar transaccions filles
        childSnapshot.docs.forEach(childDoc => {
          batch.delete(childDoc.ref);
          deletedCount++;
        });

        // Restaurar la remesa original (treure flags de remesa)
        const remittanceDocRef = doc(transactionsRef, remittanceInfo.id);
        batch.update(remittanceDocRef, {
          isRemittance: false,
          remittanceItemCount: null,
          category: null,
          contactId: null,
          contactType: null,
        });

        await batch.commit();

        toast({
          title: t.dangerZone.deleteSuccess,
          description: t.dangerZone.remittanceDeletedDescription(deletedCount),
        });
      } else if (fallbackCount && fallbackCount > 0) {
        // Cas 2: Fallback - esborrar transaccions per descripció
        const allTransactions = await getDocs(transactionsRef);
        const fallbackDocs = allTransactions.docs.filter(d => {
          const data = d.data();
          return REMITTANCE_PATTERNS.some(pattern =>
            data.description?.includes(pattern)
          );
        });

        // Esborrar en batches de 500
        const batchSize = 500;
        const batches = Math.ceil(fallbackDocs.length / batchSize);

        for (let i = 0; i < batches; i++) {
          const batch = writeBatch(firestore);
          const start = i * batchSize;
          const end = Math.min(start + batchSize, fallbackDocs.length);

          for (let j = start; j < end; j++) {
            batch.delete(fallbackDocs[j].ref);
            deletedCount++;
          }

          await batch.commit();
        }

        toast({
          title: t.dangerZone.deleteSuccess,
          description: t.dangerZone.deleteSuccessDescription(deletedCount, t.dangerZone.testRemittanceTransactions),
        });
      }

      setShowRemittanceDialog(false);
      setRemittanceConfirmText('');
      setRemittanceInfo(null);
      setFallbackCount(null);
    } catch (error: any) {
      console.error('[DangerZone] Error deleting remittance:', error);
      toast({
        variant: 'destructive',
        title: t.dangerZone.deleteError,
        description: error?.message || t.dangerZone.deleteErrorDescription,
      });
    } finally {
      setIsDeletingRemittances(false);
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

          {/* Secció temporal: Esborrar última remesa */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              {t.dangerZone.remittanceSection}
            </p>
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 p-4 border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:border-orange-900 dark:hover:border-orange-700 dark:hover:bg-orange-950"
              onClick={handleSearchLastRemittance}
              disabled={isSearchingRemittances}
            >
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                {isSearchingRemittances ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitMerge className="h-4 w-4" />
                )}
                <span className="font-medium">{t.dangerZone.deleteLastRemittance}</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                {t.dangerZone.deleteLastRemittanceDescription}
              </span>
            </Button>
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

      {/* Dialog per esborrar última remesa */}
      <AlertDialog open={showRemittanceDialog} onOpenChange={(open) => {
        if (!open) {
          setShowRemittanceDialog(false);
          setRemittanceConfirmText('');
          setRemittanceInfo(null);
          setFallbackCount(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              {remittanceInfo ? t.dangerZone.remittanceFoundTitle : t.dangerZone.fallbackRemittanceTitle}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {remittanceInfo ? (
                  <>
                    <p>{t.dangerZone.remittanceFoundDescription}</p>
                    {/* Info de la remesa */}
                    <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t.dangerZone.remittanceDate}:</span>
                        <span>{remittanceInfo.date}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="font-medium">{t.dangerZone.remittanceDescription}:</span>
                        <span className="truncate max-w-[200px]" title={remittanceInfo.description}>
                          {remittanceInfo.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t.dangerZone.remittanceAmount}:</span>
                        <span className="text-green-600 font-medium">{formatCurrencyEU(remittanceInfo.amount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t.dangerZone.remittanceQuotes}:</span>
                        <span>{remittanceInfo.itemCount} ({t.dangerZone.childTransactions}: {remittanceInfo.childCount})</span>
                      </div>
                    </div>
                    <p className="text-sm">
                      {t.dangerZone.remittanceDeleteInfo(remittanceInfo.childCount)}
                    </p>
                  </>
                ) : fallbackCount ? (
                  <p>{t.dangerZone.fallbackRemittanceDescription(fallbackCount)}</p>
                ) : null}
                <p className="font-semibold text-orange-600">
                  {t.dangerZone.confirmWarning}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="remittance-confirm-text">
              {t.dangerZone.confirmLabel} <span className="font-mono font-bold">{expectedConfirmText}</span>
            </Label>
            <Input
              id="remittance-confirm-text"
              value={remittanceConfirmText}
              onChange={(e) => setRemittanceConfirmText(e.target.value)}
              placeholder={expectedConfirmText}
              className="font-mono"
              autoComplete="off"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingRemittances}>
              {t.dangerZone.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRemittance}
              disabled={remittanceConfirmText !== expectedConfirmText || isDeletingRemittances}
              className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
            >
              {isDeletingRemittances ? (
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
