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
  AlertTriangle,
  Undo2,
  Link,
  Ban,
} from 'lucide-react';
import type { Transaction, Category, Project, AnyContact, Donor, Supplier, TransactionType } from '@/lib/data';
import { categorizeTransaction } from '@/ai/flows/categorize-transactions';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAppLog } from '@/hooks/use-app-log';
import { RemittanceSplitter } from '@/components/remittance-splitter';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';

// Tipus de filtre
type TableFilter = 'all' | 'missing' | 'returns';

export function TransactionsTable() {
  const { firestore, user, storage } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();
  const categoryTranslations = t.categories as Record<string, string>;

  // Filtre actiu
  const [tableFilter, setTableFilter] = React.useState<TableFilter>('all');

  // Estat per editar notes inline
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = React.useState('');

  // Estat per diàleg de devolució
  const [isReturnDialogOpen, setIsReturnDialogOpen] = React.useState(false);
  const [returnTransaction, setReturnTransaction] = React.useState<Transaction | null>(null);
  const [returnDonorId, setReturnDonorId] = React.useState<string | null>(null);
  const [returnLinkedTxId, setReturnLinkedTxId] = React.useState<string | null>(null);
  const [donorDonations, setDonorDonations] = React.useState<Transaction[]>([]);
  const [isLoadingDonations, setIsLoadingDonations] = React.useState(false);

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
  // ESTADÍSTIQUES
  // ═══════════════════════════════════════════════════════════════════════════
  const expensesWithoutDoc = React.useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(tx => tx.amount < 0 && !tx.document);
  }, [transactions]);

  // Devolucions (return + return_fee)
  const returnTransactions = React.useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(tx => 
      tx.transactionType === 'return' || tx.transactionType === 'return_fee'
    );
  }, [transactions]);

  // Devolucions pendents d'assignar
  const pendingReturns = React.useMemo(() => {
    return returnTransactions.filter(tx => 
      tx.transactionType === 'return' && !tx.contactId
    );
  }, [returnTransactions]);

  // Transaccions filtrades
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];
    
    switch (tableFilter) {
      case 'missing':
        return expensesWithoutDoc;
      case 'returns':
        return returnTransactions;
      default:
        return transactions;
    }
  }, [transactions, tableFilter, expensesWithoutDoc, returnTransactions]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTIÓ DE DEVOLUCIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleOpenReturnDialog = (tx: Transaction) => {
    setReturnTransaction(tx);
    setReturnDonorId(tx.contactId || null);
    setReturnLinkedTxId(tx.linkedTransactionId || null);
    setDonorDonations([]);
    setIsReturnDialogOpen(true);
  };

  // Carregar donacions del donant seleccionat
  React.useEffect(() => {
    if (!returnDonorId || !transactionsCollection || !firestore) {
      setDonorDonations([]);
      return;
    }

    const loadDonorDonations = async () => {
      setIsLoadingDonations(true);
      try {
        // Buscar donacions d'aquest donant
        const q = query(
          transactionsCollection,
          where('contactId', '==', returnDonorId),
          where('amount', '>', 0)
        );
        const snapshot = await getDocs(q);
        const donations = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
          .filter(tx => tx.donationStatus !== 'returned') // Excloure ja retornades
          .sort((a, b) => b.date.localeCompare(a.date)); // Més recents primer
        
        setDonorDonations(donations);
      } catch (error) {
        console.error('Error loading donor donations:', error);
      } finally {
        setIsLoadingDonations(false);
      }
    };

    loadDonorDonations();
  }, [returnDonorId, transactionsCollection, firestore]);

  const handleSaveReturn = async () => {
    if (!returnTransaction || !transactionsCollection) return;

    try {
      // 1. Actualitzar la devolució amb el donant
      const returnUpdate: Record<string, any> = {
        contactId: returnDonorId,
        contactType: returnDonorId ? 'donor' : null,
      };
      
      if (returnLinkedTxId) {
        returnUpdate.linkedTransactionId = returnLinkedTxId;
      }

      updateDocumentNonBlocking(doc(transactionsCollection, returnTransaction.id), returnUpdate);

      // 2. Si s'ha vinculat a una donació, marcar-la com "retornada"
      if (returnLinkedTxId) {
        updateDocumentNonBlocking(doc(transactionsCollection, returnLinkedTxId), {
          donationStatus: 'returned',
          linkedTransactionId: returnTransaction.id,
        });

        // 3. Actualitzar comptador de devolucions del donant
        if (returnDonorId && contactsCollection) {
          const donor = donors.find(d => d.id === returnDonorId);
          if (donor) {
            updateDocumentNonBlocking(doc(contactsCollection, returnDonorId), {
              returnCount: (donor.returnCount || 0) + 1,
              lastReturnDate: new Date().toISOString(),
              status: 'pending_return',
            });
          }
        }
      }

      toast({
        title: 'Devolució assignada',
        description: returnLinkedTxId 
          ? 'La devolució s\'ha vinculat a la donació original. Aquesta donació no comptarà al Model 182.'
          : 'S\'ha assignat el donant a la devolució.',
      });

      setIsReturnDialogOpen(false);
      setReturnTransaction(null);
      setReturnDonorId(null);
      setReturnLinkedTxId(null);
    } catch (error) {
      console.error('Error saving return:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut guardar la devolució.',
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTAR EXCEL
  // ═══════════════════════════════════════════════════════════════════════════
  const handleExportExpensesWithoutDoc = () => {
    if (expensesWithoutDoc.length === 0) {
      toast({ title: 'No hi ha despeses sense document', description: 'Totes les despeses tenen justificant.' });
      return;
    }

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

  // Helper per renderitzar badge de tipus de transacció
  const renderTransactionTypeBadge = (tx: Transaction) => {
    if (tx.transactionType === 'return') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="gap-1 text-xs">
              <Undo2 className="h-3 w-3" />
              Devolució
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {tx.contactId ? 'Devolució assignada' : 'Pendent d\'assignar donant'}
          </TooltipContent>
        </Tooltip>
      );
    }
    if (tx.transactionType === 'return_fee') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-xs text-orange-600 border-orange-300">
              <Ban className="h-3 w-3" />
              Comissió
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Comissió bancària per devolució
          </TooltipContent>
        </Tooltip>
      );
    }
    if (tx.donationStatus === 'returned') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-xs text-gray-500 line-through">
              Retornada
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Aquesta donació ha estat retornada i no compta al Model 182
          </TooltipContent>
        </Tooltip>
      );
    }
    return null;
  };

  return (
    <TooltipProvider>
      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓ: Filtres i accions
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        {/* Filtres */}
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant={tableFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTableFilter('all')}
          >
            Tots ({transactions?.length || 0})
          </Button>
          
          {/* Filtre devolucions */}
          {returnTransactions.length > 0 && (
            <Button
              variant={tableFilter === 'returns' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTableFilter('returns')}
              className={tableFilter !== 'returns' && pendingReturns.length > 0 ? 'border-red-300 text-red-600' : ''}
            >
              <Undo2 className="mr-1.5 h-3 w-3" />
              Devolucions ({returnTransactions.length})
              {pendingReturns.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                  {pendingReturns.length}
                </Badge>
              )}
            </Button>
          )}
          
          {/* Filtre sense document */}
          {expensesWithoutDoc.length > 0 && (
            <Button
              variant={tableFilter === 'missing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTableFilter('missing')}
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

      {/* Avís devolucions pendents */}
      {pendingReturns.length > 0 && tableFilter !== 'returns' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              {pendingReturns.length} devolució{pendingReturns.length > 1 ? 'ns' : ''} pendent{pendingReturns.length > 1 ? 's' : ''} d'assignar
            </p>
            <p className="text-xs text-red-600">
              Assigna el donant afectat per excloure la donació del Model 182.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setTableFilter('returns')}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Revisar
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAULA DE TRANSACCIONS
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
              const isReturn = tx.transactionType === 'return';
              const isReturnFee = tx.transactionType === 'return_fee';
              const isReturnedDonation = tx.donationStatus === 'returned';

              return (
                <TableRow 
                  key={tx.id}
                  className={
                    isReturn ? 'bg-red-50/50' : 
                    isReturnFee ? 'bg-orange-50/50' :
                    isReturnedDonation ? 'bg-gray-50/50' : ''
                  }
                >
                  <TableCell className="text-muted-foreground">{formatDate(tx.date)}</TableCell>
                  <TableCell
                    className={`text-right font-mono font-medium ${
                      isReturnedDonation ? 'text-gray-400 line-through' :
                      tx.amount > 0 ? 'text-green-600' : 'text-foreground'
                    }`}
                  >
                    {formatCurrency(tx.amount)}
                  </TableCell>
                  {/* Columna Concepte + Nota + Badge devolució */}
                  <TableCell>
                    <div className="space-y-1">
                      {/* Badge de tipus */}
                      {renderTransactionTypeBadge(tx)}
                      
                      {/* Concepte bancari original */}
                      <p className={`text-sm truncate max-w-[300px] ${isReturnedDonation ? 'text-gray-400' : ''}`} title={tx.description}>
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
                    {/* Si és una devolució sense assignar, mostrar botó especial */}
                    {isReturn && !tx.contactId ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenReturnDialog(tx)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <AlertTriangle className="mr-1.5 h-3 w-3" />
                        Assignar
                      </Button>
                    ) : (
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
                              {/* Si és una devolució, opció especial */}
                              {isReturn && (
                                <>
                                  <DropdownMenuItem onClick={() => handleOpenReturnDialog(tx)}>
                                    <Link className="mr-2 h-4 w-4 text-red-500" />
                                    Gestionar devolució...
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              
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
                    )}
                  </TableCell>
                  {/* Columna Categoria */}
                  <TableCell>
                    {translatedCategory ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button variant="ghost" className="h-auto p-0 text-left font-normal flex items-center gap-1">
                            <Badge
                              variant={tx.amount > 0 ? 'success' : 'destructive'}
                              className={`cursor-pointer ${isReturnedDonation ? 'opacity-50' : ''}`}
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
                                    <span className={`text-sm ${isReturnedDonation ? 'text-gray-400' : ''}`}>{projectMap[tx.projectId]}</span>
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
                  {/* Columna Document */}
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
                                {/* Opció especial per devolucions */}
                                {isReturn && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleOpenReturnDialog(tx)}>
                                      <Link className="mr-2 h-4 w-4 text-red-500" />
                                      Gestionar devolució
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                
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
                                {tx.amount > 0 && !isReturn && !isReturnFee && (
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
                        {tableFilter === 'missing' 
                          ? '🎉 Totes les despeses tenen justificant!'
                          : tableFilter === 'returns'
                          ? '✅ No hi ha devolucions'
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

      {/* Return Assignment Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Undo2 className="h-5 w-5" />
              Gestionar Devolució
            </DialogTitle>
            <DialogDescription>
              Assigna el donant afectat i vincula la devolució amb la donació original per excloure-la del Model 182.
            </DialogDescription>
          </DialogHeader>
          
          {returnTransaction && (
            <div className="space-y-4 py-4">
              {/* Info de la devolució */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800">Devolució</p>
                <p className="text-sm text-red-600 truncate">{returnTransaction.description}</p>
                <p className="text-lg font-bold text-red-700 mt-1">
                  {formatCurrency(returnTransaction.amount)}
                </p>
                <p className="text-xs text-red-500">{formatDate(returnTransaction.date)}</p>
              </div>

              {/* Selector de donant */}
              <div className="space-y-2">
                <Label>Donant afectat</Label>
                <Select 
                  value={returnDonorId || ''} 
                  onValueChange={(v) => {
                    setReturnDonorId(v || null);
                    setReturnLinkedTxId(null); // Reset linked tx when donor changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el donant" />
                  </SelectTrigger>
                  <SelectContent>
                    {donors.map(donor => (
                      <SelectItem key={donor.id} value={donor.id}>
                        <span className="flex items-center gap-2">
                          <Heart className="h-3 w-3 text-red-500" />
                          {donor.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de donació original */}
              {returnDonorId && (
                <div className="space-y-2">
                  <Label>Donació original (opcional)</Label>
                  {isLoadingDonations ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregant donacions...
                    </div>
                  ) : donorDonations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No s'han trobat donacions d'aquest donant.
                    </p>
                  ) : (
                    <Select 
                      value={returnLinkedTxId || ''} 
                      onValueChange={(v) => setReturnLinkedTxId(v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vincular a una donació..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No vincular</SelectItem>
                        {donorDonations.map(donation => (
                          <SelectItem key={donation.id} value={donation.id}>
                            {formatDate(donation.date)} - {formatCurrency(donation.amount)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {returnLinkedTxId && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      La donació vinculada serà marcada com "Retornada" i exclosa del Model 182.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel·lar</Button>
            </DialogClose>
            <Button 
              onClick={handleSaveReturn}
              disabled={!returnDonorId}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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