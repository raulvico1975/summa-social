
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  FolderKanban,
  GitMerge,
  Heart,
  Building2,
  FileWarning,
  CheckCircle2,
  AlertTriangle,
  Filter,
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
type DocumentFilter = 'all' | 'missing' | 'urgent' | 'complete';

// Calcula els dies des d'una data
const daysSince = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export function TransactionsTable() {
  const { firestore, user, storage } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();
  const categoryTranslations = t.categories as Record<string, string>;

  // Filtre de documents
  const [documentFilter, setDocumentFilter] = React.useState<DocumentFilter>('all');

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
  const [formData, setFormData] = React.useState<{ description: string; amount: string; contactId: string | null; projectId: string | null; }>({ description: '', amount: '', contactId: null, projectId: null });
  
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
  // ESTADÍSTIQUES DE DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  const documentStats = React.useMemo(() => {
    if (!transactions) return { total: 0, withDoc: 0, withoutDoc: 0, urgent: 0, expenses: 0, expensesWithDoc: 0 };
    
    const expenses = transactions.filter(tx => tx.amount < 0);
    const expensesWithDoc = expenses.filter(tx => tx.document);
    const expensesWithoutDoc = expenses.filter(tx => !tx.document);
    const urgentExpenses = expensesWithoutDoc.filter(tx => daysSince(tx.date) > 30);
    
    return {
      total: transactions.length,
      withDoc: transactions.filter(tx => tx.document).length,
      withoutDoc: transactions.filter(tx => !tx.document).length,
      urgent: urgentExpenses.length,
      expenses: expenses.length,
      expensesWithDoc: expensesWithDoc.length,
      expensesWithoutDocCount: expensesWithoutDoc.length,
      percentage: expenses.length > 0 ? Math.round((expensesWithDoc.length / expenses.length) * 100) : 100,
    };
  }, [transactions]);

  // Transaccions filtrades
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];
    
    switch (documentFilter) {
      case 'missing':
        return transactions.filter(tx => !tx.document && tx.amount < 0);
      case 'urgent':
        return transactions.filter(tx => !tx.document && tx.amount < 0 && daysSince(tx.date) > 30);
      case 'complete':
        return transactions.filter(tx => tx.document);
      default:
        return transactions;
    }
  }, [transactions, documentFilter]);

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

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER: Indicador visual de document
  // ═══════════════════════════════════════════════════════════════════════════
  const getDocumentIndicator = (tx: Transaction) => {
    const isExpense = tx.amount < 0;
    const days = daysSince(tx.date);
    
    if (tx.document) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        className: '',
        tooltip: 'Document adjuntat',
      };
    }
    
    if (!isExpense) {
      // Els ingressos no necessiten justificant obligatòriament
      return {
        icon: <FileUp className="h-4 w-4 text-muted-foreground" />,
        className: '',
        tooltip: 'Sense document',
      };
    }
    
    // Despeses sense document
    if (days > 30) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        className: 'bg-red-50',
        tooltip: `⚠️ ${days} dies sense justificant!`,
      };
    }
    
    return {
      icon: <FileWarning className="h-4 w-4 text-orange-500" />,
      className: 'bg-orange-50',
      tooltip: 'Pendent de justificant',
    };
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓ: Widget de salut documental (només per despeses)
          ═══════════════════════════════════════════════════════════════════════ */}
      {documentStats.expenses > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${documentStats.percentage === 100 ? 'bg-green-100' : documentStats.percentage >= 70 ? 'bg-orange-100' : 'bg-red-100'}`}>
                  {documentStats.percentage === 100 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : documentStats.urgent > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <FileWarning className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium">Justificants de despeses</h3>
                  <p className="text-sm text-muted-foreground">
                    {documentStats.percentage === 100 
                      ? '🎉 Totes les despeses estan justificades!' 
                      : `${documentStats.expensesWithoutDocCount} despeses sense justificant`
                    }
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">{documentStats.percentage}%</span>
                <p className="text-xs text-muted-foreground">completat</p>
              </div>
            </div>
            <Progress value={documentStats.percentage} className="h-2" />
            <div className="flex gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{documentStats.expensesWithDoc} amb document</span>
              </div>
              {documentStats.expensesWithoutDocCount > 0 && (
                <div className="flex items-center gap-1">
                  <FileWarning className="h-4 w-4 text-orange-500" />
                  <span>{documentStats.expensesWithoutDocCount} pendents</span>
                </div>
              )}
              {documentStats.urgent > 0 && (
                <div className="flex items-center gap-1 text-red-600 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{documentStats.urgent} urgents (&gt;30 dies)</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓ: Filtres i accions
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        {/* Filtres de documents */}
        <div className="flex gap-2">
          <Button
            variant={documentFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDocumentFilter('all')}
          >
            Tots ({transactions?.length || 0})
          </Button>
          <Button
            variant={documentFilter === 'missing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDocumentFilter('missing')}
            className={documentStats.expensesWithoutDocCount > 0 ? 'border-orange-300' : ''}
          >
            <FileWarning className="mr-1 h-4 w-4 text-orange-500" />
            Sense doc ({documentStats.expensesWithoutDocCount})
          </Button>
          {documentStats.urgent > 0 && (
            <Button
              variant={documentFilter === 'urgent' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setDocumentFilter('urgent')}
              className="border-red-300"
            >
              <AlertTriangle className="mr-1 h-4 w-4" />
              Urgents ({documentStats.urgent})
            </Button>
          )}
        </div>

        {/* Botó categoritzar */}
        <Button onClick={handleBatchCategorize} disabled={!hasUncategorized || isBatchCategorizing}>
          {isBatchCategorizing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
          )}
          {t.movements.table.categorizeAll}
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAULA DE TRANSACCIONS
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.movements.table.date}</TableHead>
              <TableHead className="text-right">{t.movements.table.amount}</TableHead>
              <TableHead>{t.movements.table.description}</TableHead>
              <TableHead>Contacte</TableHead>
              <TableHead>{t.movements.table.category}</TableHead>
              <TableHead>{t.movements.table.project}</TableHead>
              <TableHead>{t.movements.table.proof}</TableHead>
              <TableHead><span className="sr-only">{t.movements.table.actions}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((tx) => {
              const relevantCategories = availableCategories?.filter(
                (c) => c.type === (tx.amount > 0 ? 'income' : 'expense')
              ) || [];
              const isDocumentLoading = loadingStates[`doc_${tx.id}`];
              const translatedCategory = tx.category ? categoryTranslations[tx.category] || tx.category : null;
              const docIndicator = getDocumentIndicator(tx);

              return (
                <TableRow key={tx.id} className={docIndicator.className}>
                  <TableCell>{formatDate(tx.date)}</TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(tx.amount)}
                  </TableCell>
                  <TableCell className="font-medium max-w-xs truncate" title={tx.description}>
                    {tx.description}
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
                               <Button variant="ghost" size="sm">
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
                          <Sparkles className="mr-2 h-4 w-4 text-primary" />
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
                               <Button variant="ghost" size="sm">
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
                  {/* Columna Document - AMB INDICADORS VISUALS */}
                  <TableCell>
                      {isDocumentLoading ? (
                          <Button variant="outline" size="icon" disabled>
                              <Loader2 className="h-4 w-4 animate-spin" />
                          </Button>
                      ) : tx.document ? (
                          <Button asChild variant="outline" size="icon" className="border-green-300 hover:bg-green-50">
                              <a href={tx.document} target="_blank" rel="noopener noreferrer" title="Veure document">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </a>
                          </Button>
                      ) : (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleAttachDocument(tx.id)}
                            className={tx.amount < 0 && daysSince(tx.date) > 30 ? 'border-red-300 hover:bg-red-50' : tx.amount < 0 ? 'border-orange-300 hover:bg-orange-50' : ''}
                            title={docIndicator.tooltip}
                          >
                              {docIndicator.icon}
                          </Button>
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
                    <TableCell colSpan={8} className="h-24 text-center">
                        {documentFilter !== 'all' 
                          ? '🎉 Cap moviment coincideix amb el filtre seleccionat'
                          : t.movements.table.noTransactions
                        }
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIÀLEGS (sense canvis)
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
                {t.movements.table.description}
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
    </>
  );
}