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
import { Button } from '@/components/ui/button';
import { DonorSearchCombobox } from '@/components/donor-search-combobox';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Check,
  AlertTriangle,
  Undo2,
  Download,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Transaction, Category, Project, AnyContact, Donor, Supplier, ContactType } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
import { useToast } from '@/hooks/use-toast';
import { RemittanceSplitter } from '@/components/remittance-splitter';
import { RemittanceDetailModal } from '@/components/remittance-detail-modal';
import { ReturnImporter } from '@/components/return-importer';
import { StripeImporter } from '@/components/stripe-importer';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useReturnManagement } from '@/components/transactions/hooks/useReturnManagement';
import { useTransactionCategorization } from '@/components/transactions/hooks/useTransactionCategorization';
import { useTransactionActions } from '@/components/transactions/hooks/useTransactionActions';
import { EditTransactionDialog } from '@/components/transactions/EditTransactionDialog';
import { NewContactDialog } from '@/components/transactions/NewContactDialog';
import { TransactionRow } from '@/components/transactions/components/TransactionRow';
import { TransactionsFilters, TableFilter } from '@/components/transactions/components/TransactionsFilters';
import { DateFilter, type DateFilterValue } from '@/components/date-filter';
import { useTransactionFilters } from '@/hooks/use-transaction-filters';
import { MISSION_TRANSFER_CATEGORY_KEY, TRANSACTION_URL_FILTERS, type TransactionUrlFilter } from '@/lib/constants';

interface TransactionsTableProps {
  initialDateFilter?: DateFilterValue | null;
}

export function TransactionsTable({ initialDateFilter = null }: TransactionsTableProps = {}) {
  const { firestore, user, storage } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t, language } = useTranslations();
  const locale = language === 'es' ? 'es-ES' : 'ca-ES';
  // Memoitzar categoryTranslations per evitar re-renders innecessaris
  const categoryTranslations = React.useMemo(
    () => t.categories as Record<string, string>,
    [t.categories]
  );

  // Filtre actiu
  const [tableFilter, setTableFilter] = React.useState<TableFilter>('all');

  // Filtre de dates
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>(initialDateFilter || { type: 'all' });

  // Cercador intel·ligent
  const [searchQuery, setSearchQuery] = React.useState('');

  // Llegir paràmetre de filtre de la URL
  const [hasUrlFilter, setHasUrlFilter] = React.useState(false);

  // Filtre per contactId (des d'enllaç de donant)
  const [contactIdFilter, setContactIdFilter] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filter = params.get('filter');
      const contactId = params.get('contactId');

      if (isTransactionUrlFilter(filter)) {
        setTableFilter(filter);
        setHasUrlFilter(true);
      }

      if (contactId) {
        setContactIdFilter(contactId);
        setHasUrlFilter(true);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!initialDateFilter) return;
    setDateFilter(prev => (areDateFiltersEqual(prev, initialDateFilter) ? prev : initialDateFilter));
  }, [initialDateFilter]);

  // Funció per netejar el filtre i actualitzar la URL
  const clearFilter = () => {
    setTableFilter('all');
    setContactIdFilter(null);
    setHasUrlFilter(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('filter');
      url.searchParams.delete('contactId');
      window.history.replaceState({}, '', url.toString());
    }
  };
  const [sortDateAsc, setSortDateAsc] = React.useState(false); // false = més recents primer

  // Columna Projecte col·lapsable
  const [showProjectColumn, setShowProjectColumn] = React.useState(false);

  // Filtre per amagar desglossament de remeses
  const [hideRemittanceItems, setHideRemittanceItems] = React.useState(true);


  // Col·leccions
  const transactionsCollection = useMemoFirebase(
    () => {
      if (!organizationId) return null;
      const col = collection(firestore, 'organizations', organizationId, 'transactions');
      console.log('🔍 [TransactionsTable] transactionsCollection.path:', col.path);
      console.log('🔍 [TransactionsTable] organizationId:', organizationId);
      return col;
    },
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
  
  const { data: allTransactions } = useCollection<Transaction>(transactionsCollection);
  const { data: availableCategories } = useCollection<Category>(categoriesCollection);
  const { data: availableContacts } = useCollection<AnyContact>(contactsCollection);
  const { data: availableProjects } = useCollection<Project>(projectsCollection);

  // Aplicar filtre de dates primer
  const transactions = useTransactionFilters(allTransactions ?? undefined, dateFilter);

  // Helper per obtenir el nom traduït d'una categoria (pot ser ID o nom clau)
  const getCategoryDisplayName = React.useCallback((categoryValue: string | null | undefined): string => {
    if (!categoryValue) return '';
    // Primer buscar per ID (defaultCategoryId guarda IDs)
    const categoryById = availableCategories?.find(c => c.id === categoryValue);
    if (categoryById) {
      return categoryTranslations[categoryById.name] || categoryById.name;
    }
    // Si no és ID, és un nom clau - buscar traducció directament
    return categoryTranslations[categoryValue] || categoryValue;
  }, [availableCategories, categoryTranslations]);

  const { toast } = useToast();

  const [isSplitterOpen, setIsSplitterOpen] = React.useState(false);
  const [transactionToSplit, setTransactionToSplit] = React.useState<Transaction | null>(null);

  // Modal detall remesa
  const [isRemittanceDetailOpen, setIsRemittanceDetailOpen] = React.useState(false);
  const [selectedRemittanceId, setSelectedRemittanceId] = React.useState<string | null>(null);

  // Modal importador devolucions
  const [isReturnImporterOpen, setIsReturnImporterOpen] = React.useState(false);

  // Modal importador Stripe
  const [isStripeImporterOpen, setIsStripeImporterOpen] = React.useState(false);
  const [stripeTransactionToSplit, setStripeTransactionToSplit] = React.useState<Transaction | null>(null);

  // Maps per noms
  const contactMap = React.useMemo(() =>
    availableContacts?.reduce((acc, contact) => {
      acc[contact.id] = { name: contact.name, type: contact.type };
      return acc;
    }, {} as Record<string, { name: string; type: ContactType }>) || {},
  [availableContacts]);

  const donors = React.useMemo(() => 
    availableContacts?.filter(c => c.type === 'donor') as Donor[] || [], 
  [availableContacts]);
  
  const suppliers = React.useMemo(() =>
    availableContacts?.filter(c => c.type === 'supplier') as Supplier[] || [],
  [availableContacts]);

  // Memoized contacts for ContactCombobox to prevent re-renders
  const comboboxContacts = React.useMemo(() =>
    availableContacts?.map(c => ({ id: c.id, name: c.name, type: c.type })) || [],
  [availableContacts]);

  // Memoized donors for DonorSelector (StripeImporter)
  const comboboxDonors = React.useMemo(() =>
    availableContacts?.filter(c => c.type === 'donor').map(c => ({ id: c.id, name: c.name, type: 'donor' as const })) || [],
  [availableContacts]);

  const projectMap = React.useMemo(() =>
    availableProjects?.reduce((acc, project) => {
        acc[project.id] = project.name;
        return acc;
    }, {} as Record<string, string>) || {},
  [availableProjects]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTIÓ DE DEVOLUCIONS (HOOK EXTERN)
  // ═══════════════════════════════════════════════════════════════════════════
  const {
    isReturnDialogOpen,
    handleCloseReturnDialog,
    returnTransaction,
    returnDonorId,
    setReturnDonorId,
    returnLinkedTxId,
    setReturnLinkedTxId,
    donorDonations,
    isLoadingDonations,
    handleOpenReturnDialog,
    handleSaveReturn,
  } = useReturnManagement({
    transactionsCollection,
    contactsCollection,
    donors,
    contactMap,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORITZACIÓ IA (HOOK EXTERN)
  // ═══════════════════════════════════════════════════════════════════════════
  const {
    loadingStates,
    isBatchCategorizing,
    handleCategorize,
    handleBatchCategorize,
  } = useTransactionCategorization({
    transactionsCollection,
    transactions,
    availableCategories,
    getCategoryDisplayName,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCIONS DE TRANSACCIONS (HOOK EXTERN)
  // ═══════════════════════════════════════════════════════════════════════════
  const {
    // Note Setter
    handleSetNote,
    // Property Setters
    handleSetCategory,
    handleSetContact,
    handleSetProject,
    // Document Upload / Delete
    docLoadingStates,
    handleAttachDocument,
    handleDeleteDocument,
    isDeleteDocDialogOpen,
    transactionToDeleteDoc,
    handleDeleteDocConfirm,
    handleCloseDeleteDocDialog,
    // Edit Dialog
    isEditDialogOpen,
    editingTransaction,
    handleEditClick,
    handleSaveEdit,
    handleCloseEditDialog,
    // Delete Dialog
    isDeleteDialogOpen,
    transactionToDelete,
    handleDeleteClick,
    handleDeleteConfirm,
    handleCloseDeleteDialog,
    // New Contact Dialog
    isNewContactDialogOpen,
    newContactType,
    handleOpenNewContactDialog,
    handleSaveNewContact,
    handleCloseNewContactDialog,
  } = useTransactionActions({
    transactionsCollection,
    contactsCollection,
    organizationId,
    storage,
    transactions,
    availableContacts,
  });

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

  // Estadístiques de devolucions pendents (diferenciant remeses vs individuals)
  const pendingReturnsStats = React.useMemo(() => {
    if (!transactions) return {
      individualCount: 0,
      remittanceCount: 0,
      remittanceItemsCount: 0,
      hasPendingRemittances: false,
      hasPendingIndividuals: false,
      pendingRemittancesList: [] as Transaction[],
      pendingIndividualsList: [] as Transaction[],
    };

    // Devolucions individuals pendents (return sense contactId i NO part d'una remesa)
    const pendingIndividuals = transactions.filter(tx =>
      tx.transactionType === 'return' &&
      !tx.contactId &&
      !tx.isRemittance &&
      tx.source !== 'remittance'  // No és filla d'una remesa
    );

    // Fitxers de devolucions pendents (remeses amb status !== 'complete')
    const pendingRemittances = transactions.filter(tx =>
      tx.isRemittance &&
      tx.remittanceType === 'returns' &&
      tx.remittanceStatus !== 'complete'
    );

    // Total d'ítems pendents dins les remeses
    const remittanceItemsCount = pendingRemittances.reduce((sum, tx) =>
      sum + (tx.remittancePendingCount ?? 0), 0
    );

    // Ordenar remeses per data descendent (més recents primer)
    const sortedRemittances = [...pendingRemittances].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
      individualCount: pendingIndividuals.length,
      remittanceCount: pendingRemittances.length,
      remittanceItemsCount,
      hasPendingRemittances: pendingRemittances.length > 0,
      hasPendingIndividuals: pendingIndividuals.length > 0,
      pendingRemittancesList: sortedRemittances,
      pendingIndividualsList: pendingIndividuals,
    };
  }, [transactions]);

  // Alias per compatibilitat amb codi existent
  const hasPendingRemittances = pendingReturnsStats.hasPendingRemittances;

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

  // Transaccions filtrades i ordenades per data (més recents primer)
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
      case 'income':
        result = transactions.filter(tx => tx.amount > 0);
        break;
      case 'operatingExpenses':
        result = transactions.filter(
          tx => tx.amount < 0 && tx.category !== MISSION_TRANSFER_CATEGORY_KEY
        );
        break;
      case 'missionTransfers':
        result = transactions.filter(tx => tx.category === MISSION_TRANSFER_CATEGORY_KEY);
        break;
      case 'pendingReturns':
        result = pendingReturns;
        break;
      case 'pendingRemittances':
        // Només fitxers de devolucions pendents (remeses)
        result = pendingReturnsStats.pendingRemittancesList;
        break;
      case 'pendingIndividuals':
        // Només devolucions individuals pendents
        result = pendingReturnsStats.pendingIndividualsList;
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

    // Filtre per amagar quotes individuals de remeses
    if (hideRemittanceItems) {
      result = result.filter(tx => tx.source !== 'remittance');
    }

    // Filtre de cerca intel·ligent
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(tx => {
        // Camps de text de la transacció
        const txFields = [
          tx.description,
          tx.note,
        ].filter(Boolean).map(f => f!.toLowerCase());

        // Nom del contacte
        const contactName = tx.contactId && contactMap[tx.contactId]
          ? contactMap[tx.contactId].name.toLowerCase()
          : '';

        // Nom del projecte
        const projectName = tx.projectId && projectMap[tx.projectId]
          ? projectMap[tx.projectId].toLowerCase()
          : '';

        // Nom de la categoria traduït
        const categoryName = tx.category
          ? getCategoryDisplayName(tx.category).toLowerCase()
          : '';

        // Import (cerca per número)
        const amountStr = Math.abs(tx.amount).toString();
        const amountFormatted = formatCurrencyEU(tx.amount).toLowerCase();

        // Comprovar si coincideix amb algun camp
        return (
          txFields.some(field => field.includes(query)) ||
          contactName.includes(query) ||
          projectName.includes(query) ||
          categoryName.includes(query) ||
          amountStr.includes(query.replace(',', '.').replace('.', '')) ||
          amountFormatted.includes(query)
        );
      });
    }

    // Filtre per contactId (des d'enllaç de donant)
    if (contactIdFilter) {
      result = result.filter(tx => tx.contactId === contactIdFilter);
    }

    // Ordenar per data descendent (més recents primer)
    return [...result].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDateAsc ? dateA - dateB : dateB - dateA;
    });
  }, [transactions, tableFilter, expensesWithoutDoc, returnTransactions, uncategorizedTransactions, noContactTransactions, sortDateAsc, searchQuery, contactMap, projectMap, getCategoryDisplayName, hideRemittanceItems, contactIdFilter]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RESUM FILTRAT
  // ═══════════════════════════════════════════════════════════════════════════
  const hasActiveFilter = tableFilter !== 'all' || searchQuery.trim() !== '' || dateFilter.type !== 'all' || contactIdFilter !== null;

  const filteredSummary = React.useMemo(() => {
    if (!hasActiveFilter || !allTransactions) return null;
    const visible = filteredTransactions;
    return {
      showing: visible.length,
      total: allTransactions.length,
      income: visible.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0),
      expenses: visible.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0),
    };
  }, [filteredTransactions, allTransactions, hasActiveFilter]);

  const clearAllFilters = React.useCallback(() => {
    setTableFilter('all');
    setSearchQuery('');
    setDateFilter({ type: 'all' });
    setContactIdFilter(null);
    setHasUrlFilter(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('filter');
      url.searchParams.delete('contactId');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTAR EXCEL
  // ═══════════════════════════════════════════════════════════════════════════

  const handleExportFilteredTransactions = () => {
    if (filteredTransactions.length === 0) {
      toast({ title: t.movements.table.noTransactions });
      return;
    }

    const excelData = filteredTransactions.map(tx => ({
      [t.movements.table.date]: formatDate(tx.date),
      [t.movements.table.amount]: tx.amount,
      [t.movements.table.concept]: tx.description,
      [t.movements.table.contact]: tx.contactId && contactMap[tx.contactId] ? contactMap[tx.contactId].name : '',
      [t.movements.table.category]: tx.category ? getCategoryDisplayName(tx.category) : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t.movements.table.excelSheetName);

    // Ajustar amplada de columnes
    const colWidths = [
      { wch: 12 }, // Data
      { wch: 12 }, // Import
      { wch: 40 }, // Concepte
      { wch: 25 }, // Contacte
      { wch: 20 }, // Categoria
    ];
    worksheet['!cols'] = colWidths;

    const fileName = t.movements.table.filteredExcelFileName({
      date: new Date().toISOString().split('T')[0],
    });
    XLSX.writeFile(workbook, fileName);

    toast({
      title: t.movements.table.exportSuccess,
      description: t.movements.table.exportedCount(filteredTransactions.length),
    });
  };

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
      tx.category ? getCategoryDisplayName(tx.category) : '',
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
    link.download = t.movements.table.expensesWithoutDocumentFileName({
      date: new Date().toISOString().split('T')[0],
    });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: t.movements.table.expensesExportedTitle,
      description: t.movements.table.expensesExportedDescription(expensesWithoutDoc.length),
    });
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleSplitRemittance = (transaction: Transaction) => {
    setTransactionToSplit(transaction);
    setIsSplitterOpen(true);
  };

  const handleOnSplitDone = () => {
    setIsSplitterOpen(false);
    setTransactionToSplit(null);
  };

  const handleViewRemittanceDetail = (remittanceId: string) => {
    setSelectedRemittanceId(remittanceId);
    setIsRemittanceDetailOpen(true);
  };

  // Stripe Importer handlers
  const handleSplitStripeRemittance = (transaction: Transaction) => {
    setStripeTransactionToSplit(transaction);
    setIsStripeImporterOpen(true);
  };

  const handleStripeImportDone = () => {
    setIsStripeImporterOpen(false);
    setStripeTransactionToSplit(null);
  };

  const hasUncategorized = React.useMemo(() => transactions?.some(tx => !tx.category), [transactions]);

  // Memoized categories map per tipus
  const categoriesByType = React.useMemo(() => ({
    income: availableCategories?.filter(c => c.type === 'income') || [],
    expense: availableCategories?.filter(c => c.type === 'expense') || [],
  }), [availableCategories]);

  // Memoized translations object for TransactionRow
  const rowTranslations = React.useMemo(() => ({
    date: t.movements.table.date,
    amount: t.movements.table.amount,
    returnBadge: t.movements.table.returnBadge,
    returnAssignedTooltip: t.movements.table.returnAssignedTooltip,
    pendingDonorAssignment: t.movements.table.pendingDonorAssignment,
    commissionBadge: t.movements.table.commissionBadge,
    bankCommissionReturn: t.movements.table.bankCommissionReturn,
    returnedDonation: t.movements.table.returnedDonation,
    returnedDonationInfo: t.movements.table.returnedDonationInfo,
    assign: t.movements.table.assign,
    assignDonor: t.movements.table.assignDonor || 'Assignar donant',
    assignDonorTooltip: t.movements.table.assignDonorTooltip || 'Assigna el donant afectat per aquesta devolució',
    remittanceUseImporter: t.movements.table.remittanceUseImporter || 'Aquesta devolució forma part d\'una remesa. Fes servir "Importar fitxer del banc" per desglossar-la.',
    uploadBankFile: t.movements.table.uploadBankFile || 'Pujar fitxer',
    uploadBankFileTooltip: t.movements.table.uploadBankFileTooltip || 'Importar fitxer del banc per identificar devolucions',
    unlink: t.movements.table.unlink,
    searchCategory: t.movements.table.searchCategory,
    noResults: t.movements.table.noResults,
    suggestWithAI: t.movements.table.suggestWithAI,
    categorize: t.movements.table.categorize,
    uncategorized: t.movements.table.uncategorized,
    viewDocument: t.movements.table.viewDocument,
    attachProof: t.movements.table.attachProof,
    attachDocument: t.movements.table.attachDocument,
    deleteDocument: t.movements.table.deleteDocument,
    manageReturn: t.movements.table.manageReturn,
    edit: t.movements.table.edit,
    splitRemittance: t.movements.table.splitRemittance,
    splitStripeRemittance: t.movements.table.splitStripeRemittance,
    delete: t.movements.table.delete,
    viewRemittanceDetail: t.movements.table.viewRemittanceDetail,
    remittanceQuotes: t.movements.table.remittanceQuotes,
  }), [t]);

  // Memoized filter translations
  const filterTranslations = React.useMemo(() => ({
    categorizeAll: t.movements.table.categorizeAll,
    all: t.movements.table.all,
    returns: t.movements.table.returns,
    pendingReturns: t.movements.table.pendingReturns || 'Devolucions pendents',
    withoutDocument: t.movements.table.withoutDocument,
    uncategorized: t.movements.table.uncategorized,
    noContact: t.movements.table.noContact,
    pendingFilters: t.movements.table.pendingFilters,
    exportTooltip: t.movements.table.exportTooltip,
    searchPlaceholder: t.movements.table.searchPlaceholder,
    hideRemittanceItems: t.movements.table.hideRemittanceItems,
    importReturnsFile: t.movements.table.uploadBankFile,
  }), [t]);

  return (
    <TooltipProvider>
      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓ: Filtre de dates
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="mb-4">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓ: Filtres i accions
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <TransactionsFilters
          currentFilter={tableFilter}
          onFilterChange={setTableFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalCount={transactions?.length || 0}
          returnsCount={returnTransactions.length}
          pendingReturnsCount={pendingReturns.length}
          expensesWithoutDocCount={expensesWithoutDoc.length}
          uncategorizedCount={uncategorizedTransactions.length}
          noContactCount={noContactTransactions.length}
          hasUncategorized={hasUncategorized ?? false}
          isBatchCategorizing={isBatchCategorizing}
          onBatchCategorize={handleBatchCategorize}
          onExportExpensesWithoutDoc={handleExportExpensesWithoutDoc}
          hideRemittanceItems={hideRemittanceItems}
          onHideRemittanceItemsChange={setHideRemittanceItems}
          onOpenReturnImporter={() => setIsReturnImporterOpen(true)}
          t={filterTranslations}
        />
      </div>

      {/* Avís devolucions pendents - flux únic simplificat */}
      {pendingReturns.length > 0 && tableFilter !== 'pendingReturns' && (
        <div className="mb-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <Undo2 className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                {t.pendingReturnsAlert.title}
              </p>
              <p className="text-xs text-red-600">
                {t.pendingReturnsAlert.description(pendingReturns.length)}
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setTableFilter('pendingReturns')}
              className="bg-red-600 hover:bg-red-700"
            >
              {t.pendingReturnsAlert.review}
            </Button>
          </div>
        </div>
      )}

      {/* Barra de resum quan hi ha filtre actiu */}
      {filteredSummary && (
        <div className="mb-4 px-4 py-2 bg-muted/50 border rounded-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {/* Context: filtre per contactId des de fitxa donant */}
            {contactIdFilter && contactMap[contactIdFilter] && (
              <span className="text-orange-600 font-medium">
                Devolucions de {contactMap[contactIdFilter].name}
              </span>
            )}
            <span>
              {t.movements.table.showingOf(filteredSummary.showing, filteredSummary.total)}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span>
              {t.movements.table.income}: <span className="text-green-600 font-medium">{formatCurrencyEU(filteredSummary.income)}</span>
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span>
              {t.movements.table.expenses}: <span className="text-red-600 font-medium">{formatCurrencyEU(filteredSummary.expenses)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleExportFilteredTransactions}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t.movements.table.exportFiltered}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={clearAllFilters}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t.movements.table.clearFilters}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAULA DE TRANSACCIONS
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="h-9">
              <TableHead className="w-[70px] py-2">
  <button
    onClick={() => setSortDateAsc(!sortDateAsc)}
    className="flex items-center gap-1 hover:text-foreground transition-colors text-xs"
  >
    {t.movements.table.date}
    {sortDateAsc ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    )}
  </button>
</TableHead>
              <TableHead className="text-right w-[85px] py-2">{t.movements.table.amount}</TableHead>
              <TableHead className="max-w-[250px] py-2">{t.movements.table.concept}</TableHead>
              <TableHead className="w-[120px] py-2">{t.movements.table.contact}</TableHead>
              <TableHead className="w-[100px] py-2">{t.movements.table.category}</TableHead>
              {showProjectColumn ? (
                <TableHead className="w-[100px] py-2">
                  <div className="flex items-center gap-1">
                    {t.movements.table.project}
                    <button
                      onClick={() => setShowProjectColumn(false)}
                      className="p-0.5 hover:bg-accent rounded transition-colors"
                      title={t.movements.table.hideProjectColumn}
                    >
                      <ChevronUp className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </TableHead>
              ) : (
                <TableHead className="w-[40px] py-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowProjectColumn(true)}
                        className="flex items-center justify-center w-full px-1 py-0.5 hover:bg-accent rounded transition-colors text-muted-foreground"
                      >
                        <FolderKanban className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t.movements.table.projects}</TooltipContent>
                  </Tooltip>
                </TableHead>
              )}
              <TableHead className="w-[40px] text-center py-2">Doc</TableHead>
              <TableHead className="w-[40px] py-2"><span className="sr-only">{t.movements.table.actions}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                contactName={tx.contactId ? contactMap[tx.contactId]?.name || null : null}
                contactType={tx.contactId ? contactMap[tx.contactId]?.type || null : null}
                projectName={tx.projectId ? projectMap[tx.projectId] || null : null}
                relevantCategories={tx.amount > 0 ? categoriesByType.income : categoriesByType.expense}
                categoryTranslations={categoryTranslations}
                comboboxContacts={comboboxContacts}
                availableProjects={availableProjects}
                showProjectColumn={showProjectColumn}
                isDocumentLoading={docLoadingStates[tx.id] || false}
                isCategoryLoading={loadingStates[tx.id] || false}
                onSetNote={handleSetNote}
                onSetCategory={handleSetCategory}
                onSetContact={handleSetContact}
                onSetProject={handleSetProject}
                onAttachDocument={handleAttachDocument}
                onDeleteDocument={handleDeleteDocument}
                onCategorize={handleCategorize}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onOpenReturnDialog={handleOpenReturnDialog}
                onSplitRemittance={handleSplitRemittance}
                onSplitStripeRemittance={handleSplitStripeRemittance}
                onViewRemittanceDetail={handleViewRemittanceDetail}
                onCreateNewContact={handleOpenNewContactDialog}
                onOpenReturnImporter={() => setIsReturnImporterOpen(true)}
                t={rowTranslations}
                getCategoryDisplayName={getCategoryDisplayName}
              />
            ))}
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
      <Dialog open={isReturnDialogOpen} onOpenChange={(open) => !open && handleCloseReturnDialog()}>
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

              {/* Selector de donant amb cerca */}
              <div className="space-y-2">
                <Label>{t.movements.table.affectedDonor}</Label>
                <DonorSearchCombobox
                  donors={donors}
                  value={returnDonorId}
                  onSelect={(donorId) => {
                    setReturnDonorId(donorId);
                    setReturnLinkedTxId(null); // Reset linked tx when donor changes
                  }}
                />
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
                      value={returnLinkedTxId || 'none'}
                      onValueChange={(v) => setReturnLinkedTxId(v === 'none' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.movements.table.linkToDonation} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t.movements.table.noLink}</SelectItem>
                        {donorDonations.filter(d => d.id).map(donation => (
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
      <EditTransactionDialog
        open={isEditDialogOpen}
        transaction={editingTransaction}
        donors={donors}
        suppliers={suppliers}
        projects={availableProjects}
        availableContacts={availableContacts}
        onSave={handleSaveEdit}
        onClose={handleCloseEditDialog}
      />

      {/* New Contact Dialog */}
      <NewContactDialog
        open={isNewContactDialogOpen}
        contactType={newContactType}
        onSave={handleSaveNewContact}
        onClose={handleCloseNewContactDialog}
      />
      
      {/* Delete Transaction Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => !open && handleCloseDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.settings.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.settings.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDeleteDialog}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Document Dialog */}
      <AlertDialog open={isDeleteDocDialogOpen} onOpenChange={(open) => !open && handleCloseDeleteDocDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.movements.table.confirmDeleteDocument}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.movements.table.confirmDeleteDocumentDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDeleteDocDialog}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocConfirm}>
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

      {/* Remittance Detail Modal */}
      {organizationId && (
        <RemittanceDetailModal
          open={isRemittanceDetailOpen}
          onOpenChange={setIsRemittanceDetailOpen}
          remittanceId={selectedRemittanceId}
          organizationId={organizationId}
        />
      )}

      {/* Return Importer Modal */}
      <ReturnImporter
        open={isReturnImporterOpen}
        onOpenChange={setIsReturnImporterOpen}
        onComplete={() => {
          setIsReturnImporterOpen(false);
        }}
      />

      {/* Stripe Importer Modal */}
      {stripeTransactionToSplit && (
        <StripeImporter
          open={isStripeImporterOpen}
          onOpenChange={setIsStripeImporterOpen}
          bankTransaction={{
            id: stripeTransactionToSplit.id,
            amount: stripeTransactionToSplit.amount,
            date: stripeTransactionToSplit.date,
            description: stripeTransactionToSplit.description,
          }}
          lookupDonorByEmail={async (email: string) => {
            // Match per email (case-insensitive, exact)
            const normalizedEmail = email.toLowerCase().trim();
            const matchedDonor = donors.find(d => d.email?.toLowerCase().trim() === normalizedEmail);
            if (matchedDonor) {
              return {
                id: matchedDonor.id,
                name: matchedDonor.name,
                defaultCategoryId: matchedDonor.defaultCategoryId || null,
              };
            }
            return null;
          }}
          donors={comboboxDonors}
          onImportDone={handleStripeImportDone}
        />
      )}
    </TooltipProvider>
  );
}

function areDateFiltersEqual(a: DateFilterValue, b: DateFilterValue): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'all') return true;
  if (a.type === 'year' || a.type === 'quarter' || a.type === 'month') {
    if (a.year !== b.year) return false;
  }
  if (a.type === 'quarter') {
    return a.quarter === b.quarter;
  }
  if (a.type === 'month') {
    return a.month === b.month;
  }
  if (a.type === 'year') {
    return true;
  }
  if (a.type === 'custom') {
    const aRange = a.customRange;
    const bRange = (b as DateFilterValue).customRange;
    const aFrom = aRange?.from?.getTime() ?? null;
    const bFrom = bRange?.from?.getTime() ?? null;
    const aTo = aRange?.to?.getTime() ?? null;
    const bTo = bRange?.to?.getTime() ?? null;
    return aFrom === bFrom && aTo === bTo;
  }
  return false;
}

function isTransactionUrlFilter(value: string | null): value is TransactionUrlFilter {
  if (!value) return false;
  return (TRANSACTION_URL_FILTERS as readonly string[]).includes(value);
}
