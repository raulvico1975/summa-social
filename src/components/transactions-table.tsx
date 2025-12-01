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
  DropdownMenuLabel,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Trash2,
  MoreVertical,
  Edit,
  FolderKanban,
  GitMerge,
  Heart,
  Building2,
  Download,
  Circle,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import type { Transaction, Category, Project, AnyContact, Donor, Supplier } from '@/lib/data';
import { categorizeTransaction } from '@/ai/flows/categorize-transactions';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAppLog } from '@/hooks/use-app-log';
import { RemittanceSplitter } from '@/components/remittance-splitter';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';

// Tipus de filtre per documents
type DocumentFilter = 'all' | 'missing';

export function TransactionsTable() {
  const { firestore, user, storage } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();
  const categoryTranslations = t.categories as Record<string, string>;

  // Filtre de documents
  const [documentFilter, setDocumentFilter] = React.useState<DocumentFilter>('all');

  // Estat per editar notes inline
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = React.useState('');

  // Col·leccions
  const transactionsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'transactions') : null,
    [firestore, organizationId]
  );
  const categoriesCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const contactsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const projectsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'projects') : null,
    [firestore, organizationId]
  );
  
  const { data: transactions } = useCollection<Transaction>(transactionsCollection);
  const { data: availableCategories } = useCollection<Category>(categoriesCollection);
  const { data: availableContacts } = useCollection<AnyContact>(contactsCollection);
  const { data: availableProjects } = useCollection<Project>(projectsCollection);

  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { log } = useAppLog();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [formData, setFormData] = React.useState<{ description: string; amount: string; note: string; contactId: string | null; projectId: string | null; }>({ description: '', amount: '', note: '', contactId: null, projectId: null });
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [transactionToDelete, setTransactionToDelete] = React.useState<Transaction | null>(null);

  const [isNewContactDialogOpen, setIsNewContactDialogOpen] = React.useState(false);
  const [newContactType, setNewContactType] = React.useState<'donor' | 'supplier'>('donor');
  const [newContactFormData, setNewContactFormData] = React.useState({ name: '', taxId: '', zipCode: '' });
  const [newContactTransactionId, setNewContactTransactionId] = React.useState<string | null>(null);
  const [isBatchCategorizing, setIsBatchCategorizing] = React.useState(false);

  const [isSplitterOpen, setIsSplitterOpen] = React.useState(false);
  const [transactionToSplit, setTransactionToSplit] = React.useState<Transaction | null>(null);

  // Maps per noms
  const contactMap = React.useMemo(() => 
    availableContacts?.reduce((acc, contact) => {
      acc[contact.id] = { name: contact.name, type: contact.type };
      return acc;
    }, {} as Record<string, { name: string; type: 'donor' | 'supplier' }>) || {}, 
  [availableContacts]);

  const donors = React.useMemo(() => 
    availableContacts?.filter(c => c.type === 'donor') as Donor[] || [], 
  [availableContacts]);
  
  const suppliers = React.useMemo(() => 
    availableContacts?.filter(c => c.type === 'supplier') as Supplier[] || [], 
  [availableContacts]);

  const projectMap = React.useMemo(() =>
    availableProjects?.reduce((acc, project) => {
        acc[project.id] = project.name;
        return acc;
    }, {} as Record<string, string>) || {},
  [availableProjects]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADÍSTIQUES SIMPLES
  // ═══════════════════════════════════════════════════════════════════════════
  const expensesWithoutDoc = React.useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(tx => tx.amount < 0 && !tx.document);
  }, [transactions]);

  // Transaccions filtrades
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];
    
    if (documentFilter === 'missing') {
      return expensesWithoutDoc;
    }
    return transactions;
  }, [transactions, documentFilter, expensesWithoutDoc]);

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTAR EXCEL
  // ═══════════════════════════════════════════════════════════════════════════
  const handleExportExpensesWithoutDoc = () => {
    if (expensesWithoutDoc.length === 0) {
      toast({ title: 'No hi ha despeses sense document', description: 'Totes les despeses tenen justificant.' });
      return;
    }

    // Crear CSV
    const headers = ['Data', 'Import', 'Concepte bancari', 'Nota', 'Contacte', 'Categoria', 'Projecte'];
    const rows = expensesWithoutDoc.map(tx => [
      formatDate(tx.date),
      tx.amount.toString().replace('.', ','),
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${(tx.note || '').replace(/"/g, '""')}"`,
      tx.contactId && contactMap[tx.contactId] ? contactMap[tx.contactId].name : '',
      tx.category ? (categoryTranslations[tx.category] || tx.category) : '',
      tx.projectId && projectMap[tx.projectId] ? projectMap[tx.projectId] : '',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Descarregar
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `despeses-sense-justificant-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ 
      title: 'Excel exportat', 
      description: `S'han exportat ${expensesWithoutDoc.length} despeses sense justificant.` 
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTIÓ DE NOTES INLINE
  // ═══════════════════════════════════════════════════════════════════════════
  const handleStartEditNote = (tx: Transaction) => {
    setEditingNoteId(tx.id);
    setEditingNoteValue(tx.note || '');
  };

  const handleSaveNote = (txId: string) => {
    if (!transactionsCollection) return;
    updateDocumentNonBlocking(doc(transactionsCollection, txId), { note: editingNoteValue || null });
    setEditingNoteId(null);
    setEditingNoteValue('');
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteValue('');
  };

  // Funcions existents...
  const handleCategorize = async (txId: string) => {
    if (!transactions) return;
    const transaction = transactions.find((tx) => tx.id === txId);
    if (!transaction || !availableCategories || !transactionsCollection) return;

    setLoadingStates((prev) => ({ ...prev, [txId]: true }));
    try {
      log(`Iniciando categorización para la transacción: ${txId}`);
      const expenseCategories = availableCategories.filter((c) => c.type === 'expense').map((c) => c.name);
      const incomeCategories = availableCategories.filter((c) => c.type === 'income').map((c) => c.name);

      const result = await categorizeTransaction({
        description: transaction.description,
        amount: transaction.amount,
        expenseCategories,
        incomeCategories,
      });
      
      updateDocumentNonBlocking(doc(transactionsCollection, txId), { category: result.category });
      
      const categoryName = categoryTranslations[result.category] || result.category;
      toast({
        title: 'Categorització Automàtica',
        description: `Transacció classificada com "${categoryName}" amb una confiança del ${(result.confidence * 100).toFixed(0)}%.`,
      });
      log(`¡Éxito! Transacción ${txId} clasificada como "${categoryName}".`);
    } catch (error) {
      console.error('Error categorizing transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Error de IA',
        description: 'No s\'ha pogut categoritzar la transacció.',
      });
       log(`ERROR categorizando ${txId}: ${error}`);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [txId]: false }));
    }
  };

  const handleBatchCategorize = async () => {
    if (!transactions || !availableCategories || !transactionsCollection) {
      toast({ title: 'Dades no disponibles', description: 'No s\'han pogut carregar les transaccions o categories.'});
      return;
    }
    const transactionsToCategorize = transactions.filter(tx => !tx.category);
    if (transactionsToCategorize.length === 0) {
      toast({ title: 'No hi ha res a classificar', description: 'Totes les transaccions ja tenen una categoria.'});
      return;
    }

    setIsBatchCategorizing(true);
    log(`Iniciando clasificación masiva de ${transactionsToCategorize.length} moviments.`);
    toast({ title: 'Iniciant classificació massiva...', description: `Classificant ${transactionsToCategorize.length} moviments.`});

    let successCount = 0;

    for (const tx of transactionsToCategorize) {
      log(`Clasificando movimiento ${successCount + 1}/${transactionsToCategorize.length}: "${tx.description.substring(0, 30)}..."`);
      try {
        const expenseCategories = availableCategories.filter((c) => c.type === 'expense').map((c) => c.name);
        const incomeCategories = availableCategories.filter((c) => c.type === 'income').map((c) => c.name);

        const result = await categorizeTransaction({
          description: tx.description,
          amount: tx.amount,
          expenseCategories,
          incomeCategories,
        });

        updateDocumentNonBlocking(doc(transactionsCollection, tx.id), { category: result.category });
        successCount++;
        const categoryName = categoryTranslations[result.category] || result.category;
        log(`¡Éxito! Movimiento ${tx.id} clasificado como "${categoryName}".`);
      } catch (error) {
        console.error('Error categorizing transaction:', error);
        log(`ERROR categorizando ${tx.id}: ${error}`);
      }
    }
    
    setIsBatchCategorizing(false);
    log(`¡Éxito! Clasificación masiva completada. ${successCount} moviments clasificados.`);
    toast({ title: 'Classificació massiva completada', description: `S'han classificat ${successCount} moviments.`});
  };

  const handleSetCategory = (txId: string, newCategory: string) => {
    if (!transactionsCollection) return;
    updateDocumentNonBlocking(doc(transactionsCollection, txId), { category: newCategory });
  };
  
  const handleSetContact = (txId: string, newContactId: string | null, contactType?: 'donor' | 'supplier') => {
    if (!transactionsCollection) return;
    updateDocumentNonBlocking(doc(transactionsCollection, txId), { 
      contactId: newContactId,
      contactType: newContactId ? contactType : null,
    });
  };
  
  const handleSetProject = (txId: string, newProjectId: string | null) => {
    if (!transactionsCollection) return;
    updateDocumentNonBlocking(doc(transactionsCollection, txId), { projectId: newProjectId });
  };

  const handleAttachDocument = (transactionId: string) => {
    log(`[${transactionId}] Iniciando la subida de documento.`);
    if (!organizationId || !transactionsCollection) {
      const errorMsg = 'ERROR: No s\'ha pogut identificar l\'organització per a la pujada.';
      log(errorMsg);
      toast({ variant: 'destructive', title: 'Error', description: errorMsg });
      return;
    }
    log(`Organització identificada: ${organizationId}`);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = "application/pdf,image/*,.doc,.docx,.xls,.xlsx";
    fileInput.style.display = 'none';

    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) {
        log(`[${transactionId}] Selección de archivo cancelada.`);
        document.body.removeChild(fileInput);
        return;
      }
      log(`[${transactionId}] Archivo seleccionado: ${file.name} (Tamaño: ${file.size} bytes)`);

      setLoadingStates(prev => ({ ...prev, [`doc_${transactionId}`]: true }));
      toast({ title: 'Pujant document...', description: `Adjuntant "${file.name}"...` });
      
      const storagePath = `organizations/${organizationId}/documents/${transactionId}/${file.name}`;
      log(`[${transactionId}] Ruta de subida en Storage: ${storagePath}`);
      const storageRef = ref(storage, storagePath);
      
      try {
          log(`[${transactionId}] Iniciando 'uploadBytes'...`);
          const uploadResult = await uploadBytes(storageRef, file);

          log(`[${transactionId}] 'uploadBytes' completado con éxito.`);
          const downloadURL = await getDownloadURL(uploadResult.ref);
          log(`[${transactionId}] URL de descarga obtenida: ${downloadURL}`);

          updateDocumentNonBlocking(doc(transactionsCollection, transactionId), { document: downloadURL });

          toast({ title: '✅ Èxit!', description: 'El document s\'ha pujat i vinculat correctament.' });
          log(`[${transactionId}] ¡Éxito! Subida completada.`);

      } catch (error: any) {
          console.error('FIREBASE_UPLOAD_ERROR_DIAGNOSTIC', error);
          const errorCode = error.code || 'UNKNOWN_CODE';
          const errorMessage = error.message || 'Error desconocido.';
          log(`[${transactionId}] ERROR en la subida: ${errorCode} - ${errorMessage}`);
          
          let description = `S'ha produït un error inesperat. Codi: ${errorCode}`;
          if (errorCode === 'storage/unauthorized' || errorCode === 'storage/object-not-found') {
            description = 'Accés denegat. Revisa les regles de seguretat de Firebase Storage.';
          } else if (errorCode === 'storage/canceled') {
            description = 'La pujada ha estat cancel·lada.';
          }
          toast({ variant: 'destructive', title: 'Error de pujada', description, duration: 9000 });
      } finally {
          log(`[${transactionId}] Finalizando proceso de subida.`);
          setLoadingStates(prev => ({ ...prev, [`doc_${transactionId}`]: false }));
          if (fileInput.parentElement) {
              document.body.removeChild(fileInput);
          }
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('ca-ES', {
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
        note: transaction.note || '',
        contactId: transaction.contactId || null,
        projectId: transaction.projectId || null,
    });
    setIsEditDialogOpen(true);
  }

  const handleSaveEdit = () => {
    if (!editingTransaction || !transactionsCollection) return;
    
    const selectedContact = formData.contactId ? availableContacts?.find(c => c.id === formData.contactId) : null;

    updateDocumentNonBlocking(doc(transactionsCollection, editingTransaction.id), {
      description: formData.description,
      amount: parseFloat(formData.amount),
      note: formData.note || null,
      contactId: formData.contactId,
      contactType: selectedContact?.type || null,
      projectId: formData.projectId
    });

    toast({ title: 'Transacció actualitzada' });
    setIsEditDialogOpen(false);
    setEditingTransaction(null);
  }

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = () => {
    if (transactionToDelete && transactionsCollection) {
        deleteDocumentNonBlocking(doc(transactionsCollection, transactionToDelete.id));
        toast({ title: 'Transacció eliminada' });
    }
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  }

  const handleOpenNewContactDialog = (txId: string, type: 'donor' | 'supplier') => {
    setNewContactTransactionId(txId);
    setNewContactType(type);
    setNewContactFormData({ name: '', taxId: '', zipCode: '' });
    setIsNewContactDialogOpen(true);
  };

  const handleSaveNewContact = () => {
    if (!newContactFormData.name || !newContactFormData.taxId || !newContactFormData.zipCode) {
      toast({ variant: 'destructive', title: t.common.error, description: 'Tots els camps són obligatoris.' });
      return;
    }
    if (!contactsCollection || !transactionsCollection) return;

    const now = new Date().toISOString();
    const newContactData = {
      type: newContactType,
      name: newContactFormData.name,
      taxId: newContactFormData.taxId,
      zipCode: newContactFormData.zipCode,
      createdAt: now,
      ...(newContactType === 'donor' && {
        donorType: 'individual',
        membershipType: 'one-time',
      }),
    };
    
    addDocumentNonBlocking(contactsCollection, newContactData)
      .then(docRef => {
        if (newContactTransactionId) {
          handleSetContact(newContactTransactionId, docRef.id, newContactType);
        }
      });
    
    const typeLabel = newContactType === 'donor' ? 'Donant' : 'Proveïdor';
    toast({ title: `${typeLabel} creat`, description: `S'ha creat "${newContactFormData.name}" correctament.` });
    setIsNewContactDialogOpen(false);
    setNewContactTransactionId(null);
  };
  
  const handleSplitRemittance = (transaction: Transaction) => {
    setTransactionToSplit(transaction);
    setIsSplitterOpen(true);
  };

  const handleOnSplitDone = () => {
    setIsSplitterOpen(false);
    setTransactionToSplit(null);
  };

  const hasUncategorized = React.useMemo(() => transactions?.some(tx => !tx.category), [transactions]);

  // Helper per renderitzar el contacte amb icona
  const renderContactBadge = (contactId: string | null | undefined) => {
    if (!contactId || !contactMap[contactId]) return null;
    const contact = contactMap[contactId];
    return (
      <span className="flex items-center gap-1">
        {contact.type === 'donor' ? (
          <Heart className="h-3 w-3 text-red-500" />
        ) : (
          <Building2 className="h-3 w-3 text-blue-500" />
        )}
        <span className="text-sm">{contact.name}</span>
      </span>
    );
  };

  return (
    <TooltipProvider>
      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓ: Filtres i accions - SIMPLIFICAT
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        {/* Filtres de documents - SIMPLIFICAT */}
        <div className="flex gap-2 items-center">
          <Button
            variant={documentFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDocumentFilter('all')}
          >
            Tots ({transactions?.length || 0})
          </Button>
          {expensesWithoutDoc.length > 0 && (
            <Button
              variant={documentFilter === 'missing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDocumentFilter('missing')}
            >
              <Circle className="mr-1.5 h-2 w-2 fill-muted-foreground text-muted-foreground" />
              Sense document ({expensesWithoutDoc.length})
            </Button>
          )}
          {/* Botó exportar */}
          {expensesWithoutDoc.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExpensesWithoutDoc}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Exportar despeses sense justificant (CSV)
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Botó categoritzar */}
        <Button onClick={handleBatchCategorize} disabled={!hasUncategorized || isBatchCategorizing}>
          {isBatchCategorizing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {t.movements.table.categorizeAll}
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAULA DE TRANSACCIONS - DISSENY NET
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">{t.movements.table.date}</TableHead>
              <TableHead className="text-right w-[120px]">{t.movements.table.amount}</TableHead>
              <TableHead>Concepte</TableHead>
              <TableHead className="w-[150px]">Contacte</TableHead>
              <TableHead className="w-[140px]">{t.movements.table.category}</TableHead>
              <TableHead className="w-[140px]">{t.movements.table.project}</TableHead>
              <TableHead className="w-[50px] text-center">Doc</TableHead>
              <TableHead className="w-[50px]"><span className="sr-only">{t.movements.table.actions}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((tx) => {
              const relevantCategories = availableCategories?.filter(
                (c) => c.type === (tx.amount > 0 ? 'income' : 'expense')
              ) || [];
              const isDocumentLoading = loadingStates[`doc_${tx.id}`];
              const translatedCategory = tx.category ? categoryTranslations[tx.category] || tx.category : null;
              const isExpense = tx.amount < 0;
              const hasDocument = !!tx.document;
              const isEditingNote = editingNoteId === tx.id;

              return (
                <TableRow key={tx.id}>
                  <TableCell className="text-muted-foreground">{formatDate(tx.date)}</TableCell>
                  <TableCell
                    className={`text-right font-mono font-medium ${
                      tx.amount > 0 ? 'text-green-600' : 'text-foreground'
                    }`}
                  >
                    {formatCurrency(tx.amount)}
                  </TableCell>
                  {/* Columna Concepte + Nota */}
                  <TableCell>
                    <div className="space-y-1">
                      {/* Concepte bancari original */}
                      <p className="text-sm truncate max-w-[300px]" title={tx.description}>
                        {tx.description}
                      </p>
                      {/* Nota editable */}
                      {isEditingNote ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editingNoteValue}
                            onChange={(e) => setEditingNoteValue(e.target.value)}
                            placeholder="Afegeix una nota..."
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveNote(tx.id);
                              if (e.key === 'Escape') handleCancelEditNote();
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveNote(tx.id)}>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEditNote}>
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : tx.note ? (
                        <button
                          onClick={() => handleStartEditNote(tx)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                        >
                          <span className="italic">"{tx.note}"</span>
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEditNote(tx)}
                          className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Afegir nota</span>
                        </button>
                      )}
                    </div>
                  </TableCell>
                  {/* Columna Contacte */}
                  <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           {tx.contactId && contactMap[tx.contactId] ? (
                                <Button variant="ghost" className="h-auto p-0 text-left font-normal flex items-center gap-1">
                                    {renderContactBadge(tx.contactId)}
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                </Button>
                           ) : (
                               <Button variant="ghost" size="sm" className="text-muted-foreground">
                                   <UserPlus className="mr-2 h-4 w-4"/>
                                   {t.movements.table.assign}
                               </Button>
                           )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Crear nou</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleOpenNewContactDialog(tx.id, 'donor')}>
                                <Heart className="mr-2 h-4 w-4 text-red-500" />
                                Nou donant...
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenNewContactDialog(tx.id, 'supplier')}>
                                <Building2 className="mr-2 h-4 w-4 text-blue-500" />
                                Nou proveïdor...
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem onClick={() => handleSetContact(tx.id, null)}>
                                {t.movements.table.unlink}
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {donors.length > 0 && (
                              <>
                                <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Heart className="h-3 w-3 text-red-500" />
                                  Donants
                                </DropdownMenuLabel>
                                {donors.map((donor) => (
                                    <DropdownMenuItem key={donor.id} onClick={() => handleSetContact(tx.id, donor.id, 'donor')}>
                                        {donor.name}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                              </>
                            )}
                            
                            {suppliers.length > 0 && (
                              <>
                                <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3 text-blue-500" />
                                  Proveïdors
                                </DropdownMenuLabel>
                                {suppliers.map((supplier) => (
                                    <DropdownMenuItem key={supplier.id} onClick={() => handleSetContact(tx.id, supplier.id, 'supplier')}>
                                        {supplier.name}
                                    </DropdownMenuItem>
                                ))}
                              </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  {/* Columna Categoria */}
                  <TableCell>
                    {translatedCategory ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button variant="ghost" className="h-auto p-0 text-left font-normal flex items-center gap-1">
                            <Badge
                              variant={tx.amount > 0 ? 'success' : 'destructive'}
                              className="cursor-pointer"
                            >
                              {translatedCategory}
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
                              {categoryTranslations[cat.name] || cat.name}
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
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        {t.movements.table.categorize}
                      </Button>
                    )}
                  </TableCell>
                  {/* Columna Projecte */}
                  <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           {tx.projectId && projectMap[tx.projectId] ? (
                                <Button variant="ghost" className="h-auto p-0 text-left font-normal flex items-center gap-1">
                                    <span className="text-sm">{projectMap[tx.projectId]}</span>
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                </Button>
                           ) : (
                               <Button variant="ghost" size="sm" className="text-muted-foreground">
                                   <FolderKanban className="mr-2 h-4 w-4"/>
                                   {t.movements.table.assign}
                               </Button>
                           )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => handleSetProject(tx.id, null)}>
                                {t.movements.table.unlink}
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            {availableProjects?.map((project) => (
                                <DropdownMenuItem key={project.id} onClick={() => handleSetProject(tx.id, project.id)}>
                                    {project.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  {/* Columna Document - INDICADOR SIMPLE AMB PUNTS */}
                  <TableCell className="text-center">
                      {isDocumentLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                      ) : hasDocument ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a 
                                href={tx.document!} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex"
                              >
                                <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>Veure document</TooltipContent>
                          </Tooltip>
                      ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                onClick={() => handleAttachDocument(tx.id)}
                                className="inline-flex hover:scale-110 transition-transform"
                              >
                                <Circle className={`h-3 w-3 ${isExpense ? 'text-muted-foreground' : 'text-muted-foreground/30'}`} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isExpense ? 'Adjuntar justificant' : 'Adjuntar document'}
                            </TooltipContent>
                          </Tooltip>
                      )}
                  </TableCell>
                  {/* Accions */}
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
                                    {t.movements.table.edit}
                                </DropdownMenuItem>
                                {!hasDocument && (
                                  <DropdownMenuItem onClick={() => handleAttachDocument(tx.id)}>
                                    <FileUp className="mr-2 h-4 w-4" />
                                    Adjuntar document
                                  </DropdownMenuItem>
                                )}
                                {tx.amount > 0 && (
                                  <DropdownMenuItem onClick={() => handleSplitRemittance(tx)}>
                                    <GitMerge className="mr-2 h-4 w-4" />
                                    {t.movements.table.splitRemittance}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteClick(tx)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t.movements.table.delete}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                   </TableCell>
                </TableRow>
              );
            })}
             {filteredTransactions.length === 0 && (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        {documentFilter === 'missing' 
                          ? '🎉 Totes les despeses tenen justificant!'
                          : t.movements.table.noTransactions
                        }
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIÀLEGS
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.movements.table.editTransaction}</DialogTitle>
            <DialogDescription>
              {t.movements.table.editTransactionDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Concepte bancari
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="note" className="text-right">
                Nota
              </Label>
              <Input
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="col-span-3"
                placeholder="Descripció clara del moviment..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                {t.movements.table.amount}
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
                    Contacte
                </Label>
                <Select value={formData.contactId || ''} onValueChange={(value) => setFormData({...formData, contactId: value === 'null' ? null : value})}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecciona un contacte" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="null">{t.common.none}</SelectItem>
                        {donors.length > 0 && (
                          <>
                            <SelectItem value="__donors_label__" disabled className="text-xs text-muted-foreground">
                              ── Donants ──
                            </SelectItem>
                            {donors.map(donor => (
                                <SelectItem key={donor.id} value={donor.id}>
                                  <span className="flex items-center gap-2">
                                    <Heart className="h-3 w-3 text-red-500" />
                                    {donor.name}
                                  </span>
                                </SelectItem>
                            ))}
                          </>
                        )}
                        {suppliers.length > 0 && (
                          <>
                            <SelectItem value="__suppliers_label__" disabled className="text-xs text-muted-foreground">
                              ── Proveïdors ──
                            </SelectItem>
                            {suppliers.map(supplier => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                  <span className="flex items-center gap-2">
                                    <Building2 className="h-3 w-3 text-blue-500" />
                                    {supplier.name}
                                  </span>
                                </SelectItem>
                            ))}
                          </>
                        )}
                    </SelectContent>
                </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project" className="text-right">
                    {t.movements.table.project}
                </Label>
                <Select value={formData.projectId || ''} onValueChange={(value) => setFormData({...formData, projectId: value === 'null' ? null : value})}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder={t.projects.selectFunder} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="null">{t.common.none}</SelectItem>
                        {availableProjects?.map(project => (
                            <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.common.cancel}</Button>
            </DialogClose>
            <Button onClick={handleSaveEdit}>{t.movements.table.saveChanges}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Contact Dialog */}
      <Dialog open={isNewContactDialogOpen} onOpenChange={setIsNewContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {newContactType === 'donor' ? (
                <>
                  <Heart className="h-5 w-5 text-red-500" />
                  Nou Donant
                </>
              ) : (
                <>
                  <Building2 className="h-5 w-5 text-blue-500" />
                  Nou Proveïdor
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {newContactType === 'donor' 
                ? 'Afegeix un nou donant i assigna\'l a aquesta transacció.'
                : 'Afegeix un nou proveïdor i assigna\'l a aquesta transacció.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-contact-name" className="text-right">Nom *</Label>
              <Input id="new-contact-name" value={newContactFormData.name} onChange={(e) => setNewContactFormData({...newContactFormData, name: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-contact-taxId" className="text-right">DNI/CIF *</Label>
              <Input id="new-contact-taxId" value={newContactFormData.taxId} onChange={(e) => setNewContactFormData({...newContactFormData, taxId: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-contact-zipCode" className="text-right">Codi Postal *</Label>
              <Input id="new-contact-zipCode" value={newContactFormData.zipCode} onChange={(e) => setNewContactFormData({...newContactFormData, zipCode: e.target.value })} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t.common.cancel}</Button></DialogClose>
            <Button onClick={handleSaveNewContact}>
              {newContactType === 'donor' ? 'Crear donant' : 'Crear proveïdor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Transaction Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.settings.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.settings.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remittance Splitter Dialog */}
      {transactionToSplit && availableContacts && (
        <RemittanceSplitter
          open={isSplitterOpen}
          onOpenChange={setIsSplitterOpen}
          transaction={transactionToSplit}
          existingDonors={donors}
          onSplitDone={handleOnSplitDone}
        />
      )}
    </TooltipProvider>
  );
}