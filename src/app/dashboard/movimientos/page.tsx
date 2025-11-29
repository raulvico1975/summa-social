
'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/components/transactions-table";
import { Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionImporter } from '@/components/transaction-importer';
import type { Transaction } from '@/lib/data';
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
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, writeBatch } from 'firebase/firestore';

export default function MovementsPage() {
  const { firestore, user } = useFirebase();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const { toast } = useToast();

  const transactionsQuery = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'transactions') : null,
    [firestore, user]
  );
  const { data: transactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const handleDeleteAll = async () => {
    if (!transactionsQuery || !transactions) return;
    const batch = writeBatch(firestore);
    transactions.forEach(tx => {
      batch.delete(transactionsQuery.doc(tx.id));
    });
    try {
      await batch.commit();
      toast({
          title: 'Transacciones eliminadas',
          description: 'Se han eliminado todas las transacciones.',
      });
    } catch (error) {
      console.error('Error deleting all transactions: ', error);
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: 'No se pudieron eliminar todas las transacciones.',
      })
    }
    setIsDeleteAlertOpen(false);
  };

  const isDataLoaded = !isLoadingTransactions;

  return (
    <>
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">Movimientos</h1>
          <p className="text-muted-foreground">Gestiona todas tus transacciones bancarias.</p>
        </div>
        <div className="flex gap-2">
           {isDataLoaded && (
             <TransactionImporter 
                existingTransactions={transactions || []}
              />
           )}
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
           <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)} disabled={(transactions?.length || 0) === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar todo
            </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsTable />
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminarán permanentemente
                    todas las transacciones.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll}>
                    Sí, eliminar todo
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
