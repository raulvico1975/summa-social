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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MoreHorizontal,
  FileCheck,
  FileWarning,
  Sparkles,
  Loader2,
  Paperclip,
  FileQuestion,
  ChevronDown,
  Trash2,
  Edit,
  UserPlus,
} from 'lucide-react';
import type { Transaction, Category, Contact } from '@/lib/data';
import { categorizeTransaction } from '@/ai/flows/categorize-transactions';
import { useToast } from '@/hooks/use-toast';

export function TransactionsTable({
  transactions,
  setTransactions,
  availableCategories,
  availableContacts,
}: {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  availableCategories: Category[];
  availableContacts: Contact[];
}) {
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});
  const { toast } = useToast();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [formData, setFormData] = React.useState({ description: '', amount: '', contactId: '' });
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [transactionToDelete, setTransactionToDelete] = React.useState<Transaction | null>(null);

  const contactMap = React.useMemo(() => 
    availableContacts.reduce((acc, contact) => {
      acc[contact.id] = contact.name;
      return acc;
    }, {} as Record<string, string>), 
  [availableContacts]);

  const handleCategorize = async (txId: string) => {
    const transaction = transactions.find((tx) => tx.id === txId);
    if (!transaction) return;

    setLoadingStates((prev) => ({ ...prev, [txId]: true }));
    try {
      const expenseCategories = availableCategories.filter((c) => c.type === 'expense').map((c) => c.name);
      const incomeCategories = availableCategories.filter((c) => c.type === 'income').map((c) => c.name);

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

  const handleSetCategory = (txId: string, newCategory: string) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, category: newCategory } : tx))
    );
  };
  
  const handleSetContact = (txId: string, newContactId: string | null) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, contactId: newContactId } : tx))
    );
  };
  
  const handleEditRequest = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormData({ description: tx.description, amount: String(tx.amount), contactId: tx.contactId || '' });
    setIsEditDialogOpen(true);
  };
  
  const handleEditSave = () => {
    if (editingTransaction) {
      const updatedAmount = parseFloat(formData.amount);
      if (isNaN(updatedAmount)) {
        toast({ variant: 'destructive', title: 'Error', description: 'El importe debe ser un número válido.' });
        return;
      }

      setTransactions(prev => prev.map(tx => 
        tx.id === editingTransaction.id 
          ? { ...tx, description: formData.description, amount: updatedAmount, contactId: formData.contactId || null } 
          : tx
      ));
      toast({ title: 'Transacción Actualizada', description: 'El movimiento ha sido actualizado.' });
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
    }
  };

  const handleDeleteRequest = (tx: Transaction) => {
    setTransactionToDelete(tx);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    if (transactionToDelete) {
      setTransactions(prev => prev.filter(tx => tx.id !== transactionToDelete.id));
      toast({ title: 'Transacción Eliminada', description: 'El movimiento ha sido eliminado.' });
    }
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
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
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

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
              <TableHead>Contacto</TableHead>
              <TableHead className="text-center">Comprovant</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const relevantCategories = availableCategories.filter(
                (c) => c.type === (tx.amount > 0 ? 'income' : 'expense')
              );

              return (
                <TableRow key={tx.id}>
                  <TableCell>{formatDate(tx.date)}</TableCell>
                  <TableCell className="font-medium">{tx.description}</TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(tx.amount)}
                  </TableCell>
                  <TableCell>
                    {tx.category ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button variant="ghost" className="h-auto p-0 text-left font-normal flex items-center gap-1">
                            <Badge
                              variant={tx.amount > 0 ? 'success' : 'destructive'}
                              className="cursor-pointer"
                            >
                              {tx.category}
                            </Badge>
                             <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {relevantCategories.map((cat) => (
                            <DropdownMenuItem
                              key={cat.id}
                              onClick={() => handleSetCategory(tx.id, cat.name)}
                            >
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
                   <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           {tx.contactId ? (
                                <Button variant="ghost" className="h-auto p-0 text-left font-normal flex items-center gap-1">
                                    <span className="text-sm">{contactMap[tx.contactId]}</span>
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                </Button>
                           ) : (
                               <Button variant="ghost" size="sm">
                                   <UserPlus className="mr-2 h-4 w-4"/>
                                   Asignar
                               </Button>
                           )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => handleSetContact(tx.id, null)}>
                                (Desvincular)
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            {availableContacts.map((contact) => (
                                <DropdownMenuItem key={contact.id} onClick={() => handleSetContact(tx.id, contact.id)}>
                                    {contact.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                        <DropdownMenuItem onClick={() => handleEditRequest(tx)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleAttachDocument(tx.id)}>
                          <Paperclip className="mr-2 h-4 w-4" />
                          Adjuntar Comprovant
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteRequest(tx)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Transacción</DialogTitle>
            <DialogDescription>
              Modifica los detalles del movimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Concepto
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Importe
              </Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contact" className="text-right">
                    Contacto
                </Label>
                <Select value={formData.contactId} onValueChange={(value) => setFormData({...formData, contactId: value})}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecciona un contacto" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="null">(Ninguno)</SelectItem>
                        {availableContacts.map(contact => (
                            <SelectItem key={contact.id} value={contact.id}>{contact.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleEditSave}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la transacción
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
