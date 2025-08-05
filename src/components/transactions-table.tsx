

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  Sparkles,
  Loader2,
  ChevronDown,
  UserPlus,
  FileUp,
  Link as LinkIcon,
  Trash2,
  MoreVertical,
  Edit,
} from 'lucide-react';
import type { Transaction, Category, Contact } from '@/lib/data';
import { categorizeTransaction } from '@/ai/flows/categorize-transactions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAppLog } from '@/hooks/use-app-log';

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
  const { user } = useAuth();
  const { log } = useAppLog();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [formData, setFormData] = React.useState<{ description: string; amount: string; contactId: string | null }>({ description: '', amount: '', contactId: null });
  
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

  const handleAttachDocument = (transactionId: string) => {
    log(`[${transactionId}] Iniciando la subida de documento.`);
    if (!user?.uid) {
      const errorMsg = 'Error: No se ha podido identificar al usuario para la subida (user.uid is null).';
      log(errorMsg);
      toast({ variant: 'destructive', title: 'Error de Autenticación', description: errorMsg });
      return;
    }
    log(`Usuario autenticado: ${user.uid}`);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = "application/pdf,image/*,.doc,.docx,.xls,.xlsx";
    fileInput.style.display = 'none';

    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) {
        log(`[${transactionId}] Selección de archivo cancelada.`);
        if (fileInput.parentElement) {
            fileInput.parentElement.removeChild(fileInput);
        }
        return;
      }
      log(`[${transactionId}] Archivo seleccionado: ${file.name} (Tamaño: ${file.size} bytes)`);

      setLoadingStates(prev => ({ ...prev, [`doc_${transactionId}`]: true }));
      toast({ title: 'Subiendo documento...', description: `Adjuntando "${file.name}"...` });
      
      const storagePath = `documents/${user.uid}/${transactionId}/${file.name}`;
      log(`[${transactionId}] Ruta de subida en Storage: ${storagePath}`);
      const storageRef = ref(storage, storagePath);

      try {
        log(`[${transactionId}] Iniciando 'uploadBytes'...`);
        const uploadResult = await uploadBytes(storageRef, file);
        log(`[${transactionId}] 'uploadBytes' completado con éxito.`);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        log(`[${transactionId}] URL de descarga obtenida: ${downloadURL}`);

        setTransactions(prev => prev.map(tx =>
          tx.id === transactionId ? { ...tx, document: downloadURL } : tx
        ));

        toast({ title: '¡Éxito!', description: 'El documento se ha subido y vinculado correctamente.' });
        log(`[${transactionId}] ¡Subida completada con éxito!`);
      } catch (error: any) {
        console.error("Error al subir el documento:", error);
        log(`[${transactionId}] ERROR en la subida: ${error.code} - ${error.message}`);
        
        let description = 'Ocurrió un error inesperado al subir el documento.';
        if (error.code === 'storage/unauthorized' || error.code === 'storage/object-not-found') {
          description = 'Acceso denegado. Revisa las reglas de seguridad de Firebase Storage.';
        }
        toast({ variant: 'destructive', title: 'Error de subida', description, duration: 9000 });
      } finally {
        log(`[${transactionId}] Finalizando proceso de subida.`);
        setLoadingStates(prev => ({ ...prev, [`doc_${transactionId}`]: false }));
        // Crucially, remove the input from the DOM only after the upload attempt is complete.
        if (fileInput.parentElement) {
            fileInput.parentElement.removeChild(fileInput);
        }
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
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

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({ 
        description: transaction.description, 
        amount: String(transaction.amount),
        contactId: transaction.contactId || null
    });
    setIsEditDialogOpen(true);
  }

  const handleSaveEdit = () => {
    if (!editingTransaction) return;

    setTransactions(prev => prev.map(tx => 
        tx.id === editingTransaction.id 
            ? { ...tx, description: formData.description, amount: parseFloat(formData.amount), contactId: formData.contactId } 
            : tx
    ));

    toast({ title: 'Transacción actualizada' });
    setIsEditDialogOpen(false);
    setEditingTransaction(null);
  }

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = () => {
    if (transactionToDelete) {
        setTransactions(prev => prev.filter(tx => tx.id !== transactionToDelete.id));
        toast({ title: 'Transacción eliminada' });
    }
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  }


  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Tercero</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Comprovant</TableHead>
              <TableHead><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const relevantCategories = availableCategories.filter(
                (c) => c.type === (tx.amount > 0 ? 'income' : 'expense')
              );
              const isDocumentLoading = loadingStates[`doc_${tx.id}`];

              return (
                <TableRow key={tx.id}>
                  <TableCell>{formatDate(tx.date)}</TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(tx.amount)}
                  </TableCell>
                  <TableCell className="font-medium">{tx.description}</TableCell>
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
                      {isDocumentLoading ? (
                          <Button variant="outline" size="icon" disabled>
                              <Loader2 className="h-4 w-4 animate-spin" />
                          </Button>
                      ) : tx.document ? (
                          <Button asChild variant="outline" size="icon">
                              <a href={tx.document} target="_blank" rel="noopener noreferrer">
                                  <LinkIcon className="h-4 w-4" />
                              </a>
                          </Button>
                      ) : (
                          <Button variant="outline" size="icon" onClick={() => handleAttachDocument(tx.id)}>
                              <FileUp className="h-4 w-4" />
                          </Button>
                      )}
                  </TableCell>
                   <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(tx)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteClick(tx)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                   </TableCell>
                </TableRow>
              );
            })}
             {transactions.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        No hay transacciones. Empieza importando un extracto bancario.
                    </TableCell>
                </TableRow>
             )}
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
                <Select value={formData.contactId || ''} onValueChange={(value) => setFormData({...formData, contactId: value === 'null' ? null : value})}>
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
            <Button onClick={handleSaveEdit}>Guardar Cambios</Button>
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
    

    
