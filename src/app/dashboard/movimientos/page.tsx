
'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/components/transactions-table";
import { Download } from "lucide-react";
import { transactions as initialTransactions, categories as initialCategories, contacts as initialContacts } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionImporter } from '@/components/transaction-importer';
import type { Transaction, Category, Contact } from '@/lib/data';

const CATEGORIES_STORAGE_KEY = 'summa-social-categories';
const CONTACTS_STORAGE_KEY = 'summa-social-contacts';

export default function MovementsPage() {
  const [transactions, setTransactions] = React.useState<Transaction[]>(initialTransactions);
  const [categories, setCategories] = React.useState<Category[]>(initialCategories);
  const [contacts, setContacts] = React.useState<Contact[]>(initialContacts);

  React.useEffect(() => {
    try {
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
    }
  }, []);

  const handleTransactionsImported = (newTransactions: Transaction[]) => {
    setTransactions(prevTransactions => [...newTransactions, ...prevTransactions]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">Movimientos</h1>
          <p className="text-muted-foreground">Gestiona todas tus transacciones bancarias.</p>
        </div>
        <div className="flex gap-2">
          <TransactionImporter onTransactionsImported={handleTransactionsImported} />
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
            setTransactions={setTransactions} 
            availableCategories={categories} 
            availableContacts={contacts}
          />
        </CardContent>
      </Card>
    </div>
  );
}
