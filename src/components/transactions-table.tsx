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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreHorizontal,
  FileCheck,
  FileWarning,
  Sparkles,
  Loader2,
  Paperclip,
  Lightbulb,
  FileQuestion,
} from 'lucide-react';
import type { Transaction, Category } from '@/lib/data';
import { categories } from '@/lib/data';
import { categorizeTransaction } from '@/ai/flows/categorize-transactions';
import { suggestMissingDocuments } from '@/ai/flows/suggest-missing-documents';
import { useToast } from '@/hooks/use-toast';

type SuggestedDocs = {
  suggestedDocuments: string[];
  reasoning: string;
};

export function TransactionsTable({ initialTransactions }: { initialTransactions: Transaction[] }) {
  const [transactions, setTransactions] = React.useState<Transaction[]>(initialTransactions);
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});
  const [suggestedDocs, setSuggestedDocs] = React.useState<SuggestedDocs | null>(null);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const { toast } = useToast();
  
  // In a real app, this would come from a context or API call
  const availableCategories: Category[] = categories; 

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
  
  const handleSuggestDocs = async (transaction: Transaction) => {
     setLoadingStates((prev) => ({ ...prev, [`suggest_${transaction.id}`]: true }));
     try {
       const result = await suggestMissingDocuments({
         transactionDetails: `Fecha: ${transaction.date}, Descripción: ${transaction.description}, Importe: ${transaction.amount}`,
       });
       setSuggestedDocs(result);
       setIsAlertOpen(true);
     } catch (error) {
       console.error('Error suggesting documents:', error);
       toast({
         variant: 'destructive',
         title: 'Error de IA',
         description: 'No se pudieron sugerir documentos.',
       });
     } finally {
       setLoadingStates((prev) => ({ ...prev, [`suggest_${transaction.id}`]: false }));
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
  
  const getTypeBadgeVariant = (type: Transaction['type']) => {
    switch (type) {
        case 'Donació':
        case 'Altres Ingressos':
        case 'Transferència RD':
            return 'success';
        case 'Despesa':
            return 'destructive'
        default:
            return 'secondary'
    }
  }

  return (
    <>
      <style>{`
        .badge-success {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          border-color: transparent;
        }
      `}</style>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Tipo Movimiento</TableHead>
              <TableHead>Partida Comptable</TableHead>
              <TableHead className="text-center">Comprovant</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>{formatDate(tx.date)}</TableCell>
                <TableCell className="font-medium">{tx.description}</TableCell>
                <TableCell className={`text-right font-mono ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(tx.amount)}
                </TableCell>
                <TableCell>
                  <Badge className={getTypeBadgeVariant(tx.type)}>{tx.type}</Badge>
                </TableCell>
                <TableCell>
                  {tx.category ? (
                    <Badge variant="secondary">{tx.category}</Badge>
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
                      <DropdownMenuItem onClick={() => handleSuggestDocs(tx)}>
                         {loadingStates[`suggest_${tx.id}`] ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Lightbulb className="mr-2 h-4 w-4" />
                          )}
                        Sugerir documentos
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sugerencia de Documentos Faltantes</AlertDialogTitle>
            <AlertDialogDescription>
              {suggestedDocs?.reasoning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <h4 className="font-semibold mb-2">Documentos sugeridos:</h4>
            <ul className="list-disc pl-5 space-y-1">
              {suggestedDocs?.suggestedDocuments.map((doc, index) => (
                <li key={index} className="text-sm text-muted-foreground">{doc}</li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsAlertOpen(false)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
