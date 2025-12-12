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
} from 'lucide-react';
import type { Transaction, Category, Project, AnyContact, Donor, Supplier, ContactType } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
import { useToast } from '@/hooks/use-toast';
import { RemittanceSplitter } from '@/components/remittance-splitter';
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

export function TransactionsTable() {
  const { firestore, user, storage } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();
  // Memoitzar categoryTranslations per evitar re-renders innecessaris
  const categoryTranslations = React.useMemo(
    () => t.categories as Record<string, string>,
    [t.categories]
  );

  // Filtre actiu
  const [tableFilter, setTableFilter] = React.useState<TableFilter>('all');

  // Cercador intel·ligent
  const [searchQuery, setSearchQuery] = React.useState('');

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
      case 'uncategorized':
        result = uncategorizedTransactions;
        break;
      case 'noContact':
        result = noContactTransactions;
        break;
      default:
        result = transactions;
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

    // Ordenar per data descendent (més recents primer)
    return [...result].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDateAsc ? dateA - dateB : dateB - dateA;
    });
  }, [transactions, tableFilter, expensesWithoutDoc, returnTransactions, uncategorizedTransactions, noContactTransactions, sortDateAsc, searchQuery, contactMap, projectMap, getCategoryDisplayName]);

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

  const handleSplitRemittance = (transaction: Transaction) => {
    setTransactionToSplit(transaction);
    setIsSplitterOpen(true);
  };

  const handleOnSplitDone = () => {
    setIsSplitterOpen(false);
    setTransactionToSplit(null);
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
    delete: t.movements.table.delete,
  }), [t]);

  // Memoized filter translations
  const filterTranslations = React.useMemo(() => ({
    categorizeAll: t.movements.table.categorizeAll,
    all: t.movements.table.all,
    returns: t.movements.table.returns,
    withoutDocument: t.movements.table.withoutDocument,
    uncategorized: t.movements.table.uncategorized,
    noContact: t.movements.table.noContact,
    exportTooltip: t.movements.table.exportTooltip,
    searchPlaceholder: t.movements.table.searchPlaceholder,
  }), [t]);

  return (
    <TooltipProvider>
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
          t={filterTranslations}
        />
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
                onCreateNewContact={handleOpenNewContactDialog}
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
    </TooltipProvider>
  );
}
