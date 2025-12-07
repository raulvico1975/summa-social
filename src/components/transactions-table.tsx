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
import { ContactCombobox } from '@/components/contact-combobox';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
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
  Search,
} from 'lucide-react';
import type { Transaction, Category, Project, AnyContact, Donor, Supplier, TransactionType } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
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
type TableFilter = 'all' | 'missing' | 'returns' | 'uncategorized' | 'noContact';

export function TransactionsTable() {
  const { firestore, user, storage } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();
  const categoryTranslations = t.categories as Record<string, string>;

  // Filtre actiu
  const [tableFilter, setTableFilter] = React.useState<TableFilter>('all');

  // Llegir paràmetre de filtre de la URL
  const [hasUrlFilter, setHasUrlFilter] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filter = params.get('filter');
      if (filter === 'uncategorized' || filter === 'noContact') {
        setTableFilter(filter);
        setHasUrlFilter(true);
      }
    }
  }, []);

  // Funció per netejar el filtre i actualitzar la URL
  const clearFilter = () => {
    setTableFilter('all');
    setHasUrlFilter(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('filter');
      window.history.replaceState({}, '', url.toString());
    }
  };
  const [sortDateAsc, setSortDateAsc] = React.useState(false); // false = més recents primer

  // Columna Projecte col·lapsable
  const [showProjectColumn, setShowProjectColumn] = React.useState(false);

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
  const [openCategoryPopover, setOpenCategoryPopover] = React.useState<string | null>(null);


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

  // Moviments sense categoritzar
  const uncategorizedTransactions = React.useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(tx => tx.category === null || tx.category === 'Revisar');
  }, [transactions]);

  // Moviments sense contacte assignat (amount > 50€)
  const noContactTransactions = React.useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(tx => !tx.contactId && Math.abs(tx.amount) > 50);
  }, [transactions]);

  // // Transaccions filtrades i ordenades per data (més recents primer)
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];

    let result: Transaction[];
    switch (tableFilter) {
      case 'missing':
        result = expensesWithoutDoc;
        break;
      case 'returns':
        result = returnTransactions;
        break;
      case 'uncategorized':
        result = uncategorizedTransactions;
        break;
      case 'noContact':
        result = noContactTransactions;
        break;
      default:
        result = transactions;
    }

    // Ordenar per data descendent (més recents primer)
    return [...result].sort((a, b) => {
  const dateA = new Date(a.date).getTime();
  const dateB = new Date(b.date).getTime();
  return sortDateAsc ? dateA - dateB : dateB - dateA;
});
  }, [transactions, tableFilter, expensesWithoutDoc, returnTransactions, uncategorizedTransactions, noContactTransactions, sortDateAsc]);

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
        title: t.movements.table.returnAssigned,
        description: t.movements.table.returnAssignedDescription(contactMap[returnDonorId as string]?.name || ''),
      });

      setIsReturnDialogOpen(false);
      setReturnTransaction(null);
      setReturnDonorId(null);
      setReturnLinkedTxId(null);
    } catch (error) {
      console.error('Error saving return:', error);
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.movements.table.returnSaveError,
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTAR EXCEL
  // ═══════════════════════════════════════════════════════════════════════════
  const handleExportExpensesWithoutDoc = () => {
    if (expensesWithoutDoc.length === 0) {
      toast({ title: t.movements.table.noExpensesWithoutDocument, description: t.movements.table.allExpensesHaveProof });
      return;
    }

    const headers = [t.movements.table.date, t.movements.table.amount, t.movements.table.bankConcept, t.movements.table.noteLabel, t.movements.table.contact, t.movements.table.category, t.movements.table.project];
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
      log(`🤖 Iniciando categorización para: "${transaction.description.substring(0, 40)}..."`);
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
      log(`✅ Transacció classificada com "${categoryName}" (confiança: ${(result.confidence * 100).toFixed(0)}%).`);
    } catch (error) {
      console.error('Error categorizing transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Error de IA',
        description: t.movements.table.categorizationError,
      });
       log(`❌ ERROR categorizando: ${error}`);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [txId]: false }));
    }
  };

  const handleBatchCategorize = async () => {
    if (!transactions || !availableCategories || !transactionsCollection) {
      toast({ title: t.movements.table.dataUnavailable, description: t.movements.table.dataLoadError});
      return;
    }
    const transactionsToCategorize = transactions.filter(tx => !tx.category);
    if (transactionsToCategorize.length === 0) {
      toast({ title: t.movements.table.nothingToCategorize, description: t.movements.table.allAlreadyCategorized});
      return;
    }

    setIsBatchCategorizing(true);
    log(`📊 Iniciando clasificación masiva de ${transactionsToCategorize.length} moviments.`);
    toast({ title: t.movements.table.startingBatchCategorization, description: `Classificant ${transactionsToCategorize.length} moviments.`});

    let successCount = 0;

    // Processar en lots per evitar superar la quota de l'API
    // Quota gratuïta: 15 peticions/minut → processa 10 cada minut
    const BATCH_SIZE = 10;
    const DELAY_MS = 60000; // 60 segons entre lots

    const expenseCategories = availableCategories.filter((c) => c.type === 'expense').map((c) => c.name);
    const incomeCategories = availableCategories.filter((c) => c.type === 'income').map((c) => c.name);

    for (let i = 0; i < transactionsToCategorize.length; i += BATCH_SIZE) {
      const batch = transactionsToCategorize.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(transactionsToCategorize.length / BATCH_SIZE);

      log(`🔄 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} transacciones)...`);

      const batchResults = await Promise.all(batch.map(async (tx, batchIndex) => {
        const index = i + batchIndex;
        log(`Clasificando movimiento ${index + 1}/${transactionsToCategorize.length}: "${tx.description.substring(0, 30)}..."`);
        try {
          const result = await categorizeTransaction({
            description: tx.description,
            amount: tx.amount,
            expenseCategories,
            incomeCategories,
          });

          updateDocumentNonBlocking(doc(transactionsCollection, tx.id), { category: result.category });
          const categoryName = categoryTranslations[result.category] || result.category;
          log(`✅ Movimiento ${tx.id} clasificado como "${categoryName}".`);
          return { success: true };
        } catch (error) {
          console.error('Error categorizing transaction:', error);
          log(`❌ ERROR categorizando ${tx.id}: ${error}`);
          return { success: false };
        }
      }));

      successCount += batchResults.filter(r => r.success).length;

      // Esperar entre lots (excepte l'últim)
      if (i + BATCH_SIZE < transactionsToCategorize.length) {
        log(`⏳ Esperando ${DELAY_MS / 1000}s antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    setIsBatchCategorizing(false);
    log(`✅ Clasificación masiva completada. ${successCount} moviments clasificados.`);
    toast({ title: t.movements.table.batchCategorizationComplete, description: t.movements.table.itemsCategorized(successCount)});
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
      const errorMsg = t.movements.table.organizationNotIdentified;
      log(errorMsg);
      toast({ variant: 'destructive', title: t.common.error, description: errorMsg });
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
      toast({ title: t.movements.table.uploadingDocument, description: `Adjuntant "${file.name}"...` });

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

          toast({ title: t.movements.table.uploadSuccess, description: t.movements.table.documentUploadedSuccessfully });
          log(`[${transactionId}] ¡Éxito! Subida completada.`);

      } catch (error: any) {
          console.error('FIREBASE_UPLOAD_ERROR_DIAGNOSTIC', error);
          const errorCode = error.code || 'UNKNOWN_CODE';
          const errorMessage = error.message || 'Error desconocido.';
          log(`[${transactionId}] ERROR en la subida: ${errorCode} - ${errorMessage}`);

          let description = t.movements.table.unexpectedError(errorCode);
          if (errorCode === 'storage/unauthorized' || errorCode === 'storage/object-not-found') {
            description = t.movements.table.firebasePermissionDenied;
          } else if (errorCode === 'storage/canceled') {
            description = t.movements.table.uploadCancelled;
          }
          toast({ variant: 'destructive', title: t.movements.table.uploadError, description, duration: 9000 });
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

    toast({ title: t.movements.table.transactionUpdated });
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
        toast({ title: t.movements.table.transactionDeleted });
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
    // Només el nom és obligatori
    if (!newContactFormData.name) {
      toast({ variant: 'destructive', title: t.common.error, description: t.donors.errorNameRequired });
      return;
    }

    if (!contactsCollection || !transactionsCollection) return;

    // Avís si falta DNI o CP per als donants
    const hasIncompleteData = newContactType === 'donor' && (!newContactFormData.taxId || !newContactFormData.zipCode);

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

    const typeLabel = newContactType === 'donor' ? t.donors.title.slice(0, -1) : t.suppliers.title.slice(0, -1);

    // Mostrar toast de creació
    toast({ title: t.movements.table.contactCreatedSuccess(typeLabel, newContactFormData.name).split('.')[0] });

    // Mostrar avís si falta DNI o CP
    if (hasIncompleteData) {
      setTimeout(() => {
        toast({
          title: t.donors.incompleteDataWarning,
          description: t.donors.incompleteDataWarningDescription,
        });
      }, 500);
    }

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
          <Heart className="h-3 w-3 text-red-500 shrink-0" />
        ) : (
          <Building2 className="h-3 w-3 text-blue-500 shrink-0" />
        )}
        <span className="text-sm truncate max-w-[90px]" title={contact.name}>{contact.name}</span>
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
              {t.movements.table.returnBadge}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {tx.contactId ? t.movements.table.returnAssignedTooltip : t.movements.table.pendingDonorAssignment}
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
              {t.movements.table.commissionBadge}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {t.movements.table.bankCommissionReturn}
          </TooltipContent>
        </Tooltip>
      );
    }
    if (tx.donationStatus === 'returned') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-xs text-gray-500 line-through">
              {t.movements.table.returnedDonation}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {t.movements.table.returnedDonationInfo}
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
          {/* Botó categoritzar - MOU AL PRINCIPI PER MÉS VISIBILITAT */}
          <Button
            onClick={handleBatchCategorize}
            disabled={!hasUncategorized || isBatchCategorizing}
            variant="default"
            size="sm"
          >
            {isBatchCategorizing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {t.movements.table.categorizeAll}
          </Button>

          <div className="h-4 w-px bg-border" /> {/* Separador visual */}

          <Button
            variant={tableFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTableFilter('all')}
          >
            {t.movements.table.all} ({transactions?.length || 0})
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
              {t.movements.table.returns} ({returnTransactions.length})
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
              {t.movements.table.withoutDocument} ({expensesWithoutDoc.length})
            </Button>
          )}

          {/* Filtre sense categoritzar */}
          {uncategorizedTransactions.length > 0 && (
            <Button
              variant={tableFilter === 'uncategorized' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTableFilter('uncategorized')}
              className={tableFilter !== 'uncategorized' ? 'border-orange-300 text-orange-600' : ''}
            >
              <AlertTriangle className="mr-1.5 h-3 w-3" />
              {t.movements.table.uncategorized} ({uncategorizedTransactions.length})
            </Button>
          )}

          {/* Filtre sense contacte */}
          {noContactTransactions.length > 0 && (
            <Button
              variant={tableFilter === 'noContact' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTableFilter('noContact')}
            >
              <Circle className="mr-1.5 h-2 w-2 fill-muted-foreground text-muted-foreground" />
              {t.movements.table.noContact} ({noContactTransactions.length})
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
                {t.movements.table.exportTooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Avís devolucions pendents */}
      {pendingReturns.length > 0 && tableFilter !== 'returns' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              {t.movements.table.pendingReturnsWarning(pendingReturns.length)}
            </p>
            <p className="text-xs text-red-600">
              {t.movements.table.pendingReturnsWarningDescription}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTableFilter('returns')}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            {t.movements.table.reviewReturns}
          </Button>
        </div>
      )}

      {/* Avís de filtre actiu des de dashboard */}
      {hasUrlFilter && (tableFilter === 'uncategorized' || tableFilter === 'noContact') && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">
              Filtrant: {tableFilter === 'uncategorized' ? t.movements.table.uncategorized : t.movements.table.noContact}
            </p>
            <p className="text-xs text-blue-600">
              Mostrant només {filteredTransactions.length} moviments filtrats
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilter}
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            {t.movements.table.showAll}
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
              <TableHead className="w-[90px]">
  <button
    onClick={() => setSortDateAsc(!sortDateAsc)}
    className="flex items-center gap-1 hover:text-foreground transition-colors"
  >
    {t.movements.table.date}
    {sortDateAsc ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    )}
  </button>
</TableHead>
              <TableHead className="text-right w-[100px]">{t.movements.table.amount}</TableHead>
              <TableHead className="max-w-[280px]">{t.movements.table.concept}</TableHead>
              <TableHead className="w-[130px]">{t.movements.table.contact}</TableHead>
              <TableHead className="w-[120px]">{t.movements.table.category}</TableHead>
              {showProjectColumn ? (
                <TableHead className="w-[120px]">
                  <div className="flex items-center gap-1">
                    {t.movements.table.project}
                    <button
                      onClick={() => setShowProjectColumn(false)}
                      className="p-0.5 hover:bg-accent rounded transition-colors"
                      title={t.movements.table.hideProjectColumn}
                    >
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </TableHead>
              ) : (
                <TableHead className="w-[50px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowProjectColumn(true)}
                        className="flex items-center justify-center w-full px-1 py-1 hover:bg-accent rounded transition-colors text-muted-foreground"
                      >
                        <FolderKanban className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t.movements.table.projects}</TooltipContent>
                  </Tooltip>
                </TableHead>
              )}
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
                    {formatCurrencyEU(tx.amount)}
                  </TableCell>
                  {/* Columna Concepte + Nota + Badge devolució */}
                  <TableCell>
                    <div className="space-y-1">
                      {/* Badge de tipus */}
                      {renderTransactionTypeBadge(tx)}
                      
                      {/* Concepte bancari original */}
                      <p className={`text-sm truncate max-w-[280px] ${isReturnedDonation ? 'text-gray-400' : ''}`} title={tx.description}>
                        {tx.description}
                      </p>
                      {/* Nota editable */}
                      {isEditingNote ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editingNoteValue}
                            onChange={(e) => setEditingNoteValue(e.target.value)}
                            placeholder={t.movements.table.addNote}
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
                          <span>{t.movements.table.addNote}</span>
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
                        {t.movements.table.assign}
                      </Button>
                    ) : (
                      <ContactCombobox
                        contacts={availableContacts?.map(c => ({
                          id: c.id,
                          name: c.name,
                          type: c.type
                        })) || []}
                        value={tx.contactId}
                        onSelect={(contactId) => {
                          if (contactId) {
                            const contact = availableContacts?.find(c => c.id === contactId);
                            handleSetContact(tx.id, contactId, contact?.type);
                          } else {
                            handleSetContact(tx.id, null);
                          }
                        }}
                        onCreateNew={(type) => handleOpenNewContactDialog(tx.id, type)}
                      />
                    )}
                  </TableCell>
                  {/* Columna Categoria */}
                  <TableCell>
                    <Popover open={openCategoryPopover === tx.id} onOpenChange={(open) => setOpenCategoryPopover(open ? tx.id : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          role="combobox"
                          disabled={loadingStates[tx.id]}
                          className={`justify-start rounded-full border-0 px-3 py-1 text-xs font-semibold h-auto min-w-0 w-auto gap-1 ${
                            tx.amount > 0
                              ? 'bg-green-600 text-white hover:bg-green-600/80 hover:text-white'
                              : 'bg-red-500 text-white hover:bg-red-500/80 hover:text-white'
                          } ${isReturnedDonation ? 'opacity-50' : ''}`}
                        >
                          {loadingStates[tx.id] ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>{t.movements.table.categorize}...</span>
                            </span>
                          ) : (
                            <span className="truncate">
                              {tx.category ? (categoryTranslations[tx.category] || tx.category) : t.movements.table.uncategorized}
                            </span>
                          )}
                          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-70" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t.movements.table.searchCategory} />
                          <CommandList>
                            <CommandEmpty>{t.movements.table.noResults}</CommandEmpty>
                            <CommandGroup>
                              {relevantCategories.map((cat) => (
                                <CommandItem
                                  key={cat.id}
                                  value={categoryTranslations[cat.name] || cat.name}
                                  onSelect={() => {
                                    handleSetCategory(tx.id, cat.name);
                                    setOpenCategoryPopover(null);
                                  }}
                                >
                                  {categoryTranslations[cat.name] || cat.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            <CommandGroup>
                              <CommandItem
                                value={t.movements.table.suggestWithAI}
                                onSelect={() => {
                                  handleCategorize(tx.id);
                                  setOpenCategoryPopover(null);
                                }}
                                className="text-primary"
                              >
                                <Sparkles className="mr-2 h-3 w-3" />
                                {t.movements.table.suggestWithAI}
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  {/* Columna Projecte - col·lapsable */}
                  {showProjectColumn ? (
                    <TableCell>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             {tx.projectId && projectMap[tx.projectId] ? (
                                  <Button variant="ghost" className="h-auto p-0 text-left font-normal flex items-center gap-1">
                                      <span className={`text-sm truncate max-w-[100px] ${isReturnedDonation ? 'text-gray-400' : ''}`}>{projectMap[tx.projectId]}</span>
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
                  ) : (
                    <TableCell className="text-center">
                      {tx.projectId && projectMap[tx.projectId] && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Circle className="h-2 w-2 fill-blue-500 text-blue-500 mx-auto" />
                          </TooltipTrigger>
                          <TooltipContent>{projectMap[tx.projectId]}</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  )}
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
                            <TooltipContent>{t.movements.table.viewDocument}</TooltipContent>
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
                              {isExpense ? t.movements.table.attachProof : t.movements.table.attachDocument}
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
                                      {t.movements.table.manageReturn}
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
                                    {t.movements.table.attachDocument}
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
                          ? t.movements.table.allExpensesHaveProofEmpty
                          : tableFilter === 'returns'
                          ? t.movements.table.noReturns
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
              {t.movements.table.assignAffectedDonor}
            </DialogTitle>
            <DialogDescription>
              {t.movements.table.assignAffectedDonorDescription}
            </DialogDescription>
          </DialogHeader>
          
          {returnTransaction && (
            <div className="space-y-4 py-4">
              {/* Info de la devolució */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800">{t.movements.table.returnInfo}</p>
                <p className="text-sm text-red-600 truncate">{returnTransaction.description}</p>
                <p className="text-lg font-bold text-red-700 mt-1">
                  {formatCurrencyEU(returnTransaction.amount)}
                </p>
                <p className="text-xs text-red-500">{formatDate(returnTransaction.date)}</p>
              </div>

              {/* Selector de donant */}
              <div className="space-y-2">
                <Label>{t.movements.table.affectedDonor}</Label>
                <Select
                  value={returnDonorId || ''}
                  onValueChange={(v) => {
                    setReturnDonorId(v || null);
                    setReturnLinkedTxId(null); // Reset linked tx when donor changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.movements.table.selectDonor} />
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
                  <Label>{t.movements.table.originalDonation}</Label>
                  {isLoadingDonations ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.movements.table.loadingDonations}
                    </div>
                  ) : donorDonations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t.movements.table.noDonationsFound}
                    </p>
                  ) : (
                    <Select
                      value={returnLinkedTxId || ''}
                      onValueChange={(v) => setReturnLinkedTxId(v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.movements.table.linkToDonation} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t.movements.table.noLink}</SelectItem>
                        {donorDonations.map(donation => (
                          <SelectItem key={donation.id} value={donation.id}>
                            {formatDate(donation.date)} - {formatCurrencyEU(donation.amount)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {returnLinkedTxId && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {t.movements.table.linkedDonationInfo}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.common.cancel}</Button>
            </DialogClose>
            <Button 
              onClick={handleSaveReturn}
              disabled={!returnDonorId}
            >
              {t.common.save}
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
                {t.movements.table.bankConcept}
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
                {t.movements.table.noteLabel}
              </Label>
              <Input
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="col-span-3"
                placeholder={t.movements.table.descriptionPlaceholder}
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
                    {t.movements.table.contact}
                </Label>
                <Select value={formData.contactId || ''} onValueChange={(value) => setFormData({...formData, contactId: value === 'null' ? null : value})}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder={t.movements.table.selectContact} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="null">{t.common.none}</SelectItem>
                        {donors.length > 0 && (
                          <>
                            <SelectItem value="__donors_label__" disabled className="text-xs text-muted-foreground">
                              {t.movements.table.donorsSection}
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
                              {t.movements.table.suppliersSection}
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
                  {t.movements.table.newDonor}
                </>
              ) : (
                <>
                  <Building2 className="h-5 w-5 text-blue-500" />
                  {t.movements.table.newSupplier}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {newContactType === 'donor'
                ? t.movements.table.addNewDonorDescription
                : t.movements.table.addNewSupplierDescription
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-contact-name" className="text-right">{t.movements.table.nameRequired}</Label>
              <Input id="new-contact-name" value={newContactFormData.name} onChange={(e) => setNewContactFormData({...newContactFormData, name: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-contact-taxId" className="text-right">{t.donors.taxId}</Label>
              <Input id="new-contact-taxId" value={newContactFormData.taxId} onChange={(e) => setNewContactFormData({...newContactFormData, taxId: e.target.value })} className="col-span-3" placeholder="Opcional" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-contact-zipCode" className="text-right">
                {t.donors.zipCode}
              </Label>
              <Input id="new-contact-zipCode" value={newContactFormData.zipCode} onChange={(e) => setNewContactFormData({...newContactFormData, zipCode: e.target.value })} className="col-span-3" placeholder="Opcional" />
            </div>
            {newContactType === 'donor' && (
              <div className="col-span-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  ℹ️ {t.donors.incompleteDataWarningDescription}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t.common.cancel}</Button></DialogClose>
            <Button onClick={handleSaveNewContact}>
              {newContactType === 'donor' ? t.movements.table.createDonor : t.movements.table.createSupplier}
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
