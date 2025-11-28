
'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/components/transactions-table";
import { Download, Trash2 } from "lucide-react";
import { transactions as initialTransactions, categories as initialCategories, emissors as initialEmissors, projects as initialProjects } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionImporter } from '@/components/transaction-importer';
import type { Transaction, Category, Emisor, Project } from '@/lib/data';
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


type ImportMode = 'append' | 'replace';
const TRANSACTIONS_STORAGE_KEY = 'summa-social-transactions';
const CATEGORIES_STORAGE_KEY = 'summa-social-categories';
const EMISORS_STORAGE_KEY = 'summa-social-emissors';
const PROJECTS_STORAGE_KEY = 'summa-social-projects';

export default function MovementsPage() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState<Category[]>(initialCategories);
  const [emissors, setEmissors] = React.useState<Emisor[]>(initialEmissors);
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);

  const [isDataLoaded, setIsDataLoaded] = React.useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const { toast } = useToast();


  React.useEffect(() => {
    try {
      const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      setTransactions(storedTransactions ? JSON.parse(storedTransactions) : initialTransactions);

      const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (storedCategories) setCategories(JSON.parse(storedCategories));
      
      const storedEmissors = localStorage.getItem(EMISORS_STORAGE_KEY);
      if (storedEmissors) setEmissors(JSON.parse(storedEmissors));
      
      const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (storedProjects) setProjects(JSON.parse(storedProjects));

    } catch (error) {
       console.error("Failed to parse data from localStorage", error);
       // Fallback to initial data if localStorage is corrupt
       setTransactions(initialTransactions);
       setCategories(initialCategories);
       setEmissors(initialEmissors);
       setProjects(initialProjects);
    } finally {
      setIsDataLoaded(true);
    }
  }, []);

  const updateTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    try {
        localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(newTransactions));
    } catch (error) {
        console.error("Failed to save transactions to localStorage", error);
    }
  };
  
  const updateEmissors = (newEmissors: Emisor[]) => {
    setEmissors(newEmissors);
    try {
        localStorage.setItem(EMISORS_STORAGE_KEY, JSON.stringify(newEmissors));
    } catch (error) {
        console.error("Failed to save emissors to localStorage", error);
    }
  };


  const handleTransactionsImported = (newTransactions: Transaction[], mode: ImportMode) => {
    if (mode === 'replace') {
        updateTransactions(newTransactions);
    } else {
        updateTransactions([...transactions, ...newTransactions]);
    }
  };

  const handleDeleteAll = () => {
    updateTransactions([]);
    toast({
        title: 'Transacciones eliminadas',
        description: 'Se han eliminado todas las transacciones.',
    });
    setIsDeleteAlertOpen(false);
  };

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
                existingTransactions={transactions}
                onTransactionsImported={handleTransactionsImported} 
                availableEmissors={emissors}
              />
           )}
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
           <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)}>
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
          <TransactionsTable 
            transactions={transactions} 
            setTransactions={updateTransactions} 
            availableCategories={categories} 
            availableEmissors={emissors}
            setAvailableEmissors={updateEmissors}
            availableProjects={projects}
          />
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
