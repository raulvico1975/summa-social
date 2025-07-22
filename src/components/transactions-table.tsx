'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  MoreHorizontal,
  FileCheck,
  FileWarning,
  Sparkles,
  Loader2,
  Paperclip,
  FileQuestion,
  ChevronDown,
} from 'lucide-react';
import type { Transaction, Category } from '@/lib/data';
import { categorizeTransaction } from '@/ai/flows/categorize-transactions';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES_STORAGE_KEY = 'summa-social-categories';


export function TransactionsTable({ 
  initialTransactions,
  availableCategories: initialAvailableCategories
}: { 
  initialTransactions: Transaction[],
  availableCategories: Category[]
}) {
  const [transactions, setTransactions] = React.useState<Transaction[]>(initialTransactions);
  const [availableCategories, setAvailableCategories] = React.useState<Category[]>(initialAvailableCategories);
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});
  const { toast } = useToast();

  React.useEffect(() => {
    try {
      const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (storedCategories) {
        setAvailableCategories(JSON.parse(storedCategories));
      }
    } catch (error) {
       console.error("Failed to parse categories from localStorage", error);
    }
  }, []);

  const handleCategorize = async (txId: string) => {
    const transaction = transactions.find((tx) => tx.id === txId);
    if (!transaction) return;

    setLoadingStates((prev) => ({ ...prev, [txId]: true }));
    try {
      const expenseCategories = availableCategories.filter(c => c.type === 'expense').map(c => c.name);
      const incomeCategories = availableCategories.filter(c => c.type === 'income').map(c => c.name);
      
      const result = await categorizeTransaction({
        description: transaction.description,
        amount: transaction.amount,
        expenseCategories,
        incomeCategories,
      });
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === txId ? { ...tx, category: result.category } : tx))
      );
      toast({
        title: 'Categorización Automática',
        description: `Transacción clasificada como "${result.category}" con una confianza del ${(result.confidence * 100).toFixed(0)}%.`,
      });
    } catch (error) {
      console.error('Error categorizing transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Error de IA',
        description: 'No se pudo categorizar la transacción.',
      });
    } finally {
      setLoadingStates((prev) => ({ ...prev, [txId]: false }));
    }
  };
  
  const handleAttachDocument = (txId: string) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, document: '✅' } : tx))
    );
    toast({
        title: 'Documento Adjuntado',
        description: 'Se ha asociado un documento a la transacción.',
    });
  };

  const handleSetCategory = (txId: string, newCategory: string) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === txId ? { ...tx, category: newCategory } : tx
      )
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  const getDocumentStatusIcon = (status: Transaction['document']) => {
    switch (status) {
      case '✅':
        return <FileCheck className="h-5 w-5 text-green-600" />;
      case '⚠️ Falta':
        return <FileWarning className="h-5 w-5 text-amber-600" />;
      default:
        return <FileQuestion className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-center">Comprovant</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const relevantCategories = availableCategories.filter(c => c.type === (tx.amount > 0 ? 'income' : 'expense'));
              
              return (
              <TableRow key={tx.id}>
                <TableCell>{formatDate(tx.date)}</TableCell>
                <TableCell className="font-medium">{tx.description}</TableCell>
                <TableCell className={`text-right font-mono ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(tx.amount)}
                </TableCell>
                <TableCell>
                  {tx.category ? (
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-auto p-0 text-left font-normal" >
                           <Badge variant={tx.amount > 0 ? 'success' : 'destructive'} className="cursor-pointer">
                              {tx.category}
                              <ChevronDown className="ml-1 h-3 w-3" />
                            </Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {relevantCategories.map((cat) => (
                           <DropdownMenuItem key={cat.id} onClick={() => handleSetCategory(tx.id, cat.name)}>
                            {cat.name}
                           </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCategorize(tx.id)}
                      disabled={loadingStates[tx.id]}
                    >
                      {loadingStates[tx.id] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4 text-primary" />
                      )}
                      Clasificar
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-center">{getDocumentStatusIcon(tx.document)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAttachDocument(tx.id)}>
                        <Paperclip className="mr-2 h-4 w-4" />
                        Adjuntar Comprovant
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
