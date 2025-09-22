
'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/components/transactions-table";
import { Download } from "lucide-react";
import { transactions as initialTransactions, categories as initialCategories, contacts as initialContacts } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionImporter } from '@/components/transaction-importer';
import type { Transaction, Category, Contact } from '@/lib/data';

type ImportMode = 'append' | 'replace';
const TRANSACTIONS_STORAGE_KEY = 'summa-social-transactions';
const CATEGORIES_STORAGE_KEY = 'summa-social-categories';
const CONTACTS_STORAGE_KEY = 'summa-social-contacts';

export default function MovementsPage() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState<Category[]>(initialCategories);
  const [contacts, setContacts] = React.useState<Contact[]>(initialContacts);
  const [isDataLoaded, setIsDataLoaded] = React.useState(false);


  React.useEffect(() => {
    try {
      const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      setTransactions(storedTransactions ? JSON.parse(storedTransactions) : initialTransactions);

      const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
      }
      const storedContacts = localStorage.getItem(CONTACTS_STORAGE_KEY);
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }
    } catch (error) {
       console.error("Failed to parse data from localStorage", error);
       // Fallback to initial data if localStorage is corrupt
       setTransactions(initialTransactions);
       setCategories(initialCategories);
       setContacts(initialContacts);
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


  const handleTransactionsImported = (newTransactions: Transaction[], mode: ImportMode) => {
    if (mode === 'replace') {
        updateTransactions(newTransactions);
    } else {
        updateTransactions([...transactions, ...newTransactions]);
    }
  };

  return (
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
                availableContacts={contacts}
              />
           )}
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
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
            availableContacts={contacts}
          />
        </CardContent>
      </Card>
    </div>
  );
}
