'use client';

import * as React from 'react';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Contact, Category, Transaction } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/i18n';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  FileStack,
  Upload,
  Info,
  Loader2,
  CheckCheck,
  CreditCard,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import {
  buildPendingDocumentsQuery,
  updatePendingDocument,
  confirmPendingDocument,
  confirmManyPendingDocuments,
  archivePendingDocument,
  restorePendingDocument,
  deletePendingDocument,
  isDocumentReadyToConfirm,
  type PendingDocument,
  type PendingDocumentStatus,
} from '@/lib/pending-documents';
import { PendingDocumentsUploadModal } from '@/components/pending-documents/pending-documents-upload-modal';
import { PendingDocumentRow } from '@/components/pending-documents/pending-document-row';
import { PendingDocumentCard } from '@/components/pending-documents/pending-document-card';
import {
  PendingDocumentsFilterPanel,
  filterPendingDocuments,
  EMPTY_FILTERS,
  type PendingDocumentsFilters,
} from '@/components/pending-documents/pending-documents-filter-panel';
import { SepaGenerationModal } from '@/components/pending-documents/sepa-generation-modal';
import { ReconciliationModal } from '@/components/pending-documents/reconciliation-modal';

// Filtres per pestanyes (exclusius)
const DRAFTS_FILTER: PendingDocumentStatus[] = ['draft'];
const PENDING_FILTER: PendingDocumentStatus[] = ['confirmed', 'sepa_generated'];

export default function PendingDocsPage() {
  const { organization, organizationId, userRole } = useCurrentOrganization();
  const { firestore, storage } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslations();

  // Feature flag check - redirect if not enabled
  const isPendingDocsEnabled = organization?.features?.pendingDocs ?? false;

  // Només admins poden operar (generar SEPA, conciliar, etc.)
  const canOperate = userRole === 'admin';

  // Estat del filtre (per defecte: Per revisar = drafts)
  const [statusFilter, setStatusFilter] = React.useState<PendingDocumentStatus[] | 'all' | 'matched' | 'archived'>(DRAFTS_FILTER);

  // Modal d'upload
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [initialUploadFiles, setInitialUploadFiles] = React.useState<File[] | undefined>(undefined);

  // Estats de càrrega
  const [confirmingDocId, setConfirmingDocId] = React.useState<string | null>(null);
  const [isBulkConfirming, setIsBulkConfirming] = React.useState(false);
  const [archivingDocId, setArchivingDocId] = React.useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = React.useState<string | null>(null);

  // Filtres client-side
  const [filters, setFilters] = React.useState<PendingDocumentsFilters>(EMPTY_FILTERS);

  // Selecció múltiple
  const [selectedDocIds, setSelectedDocIds] = React.useState<Set<string>>(new Set());

  // Modal SEPA
  const [isSepaModalOpen, setIsSepaModalOpen] = React.useState(false);

  // Modal de conciliació
  const [reconcileDoc, setReconcileDoc] = React.useState<PendingDocument | null>(null);
  const [reconcileTx, setReconcileTx] = React.useState<Transaction | null>(null);

  // Control d'expansió per files (només una a la vegada)
  const [expandedDocId, setExpandedDocId] = React.useState<string | null>(null);

  // Drag & drop extern (per obrir modal amb fitxers)
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  // Ref per scroll a dalt després d'upload
  const topRef = React.useRef<HTMLDivElement>(null);

  // Construir la query memoitzada
  const pendingDocsQuery = useMemoFirebase(
    () => {
      if (!organizationId || !firestore || !isPendingDocsEnabled) return null;

      // Determinar quins estats filtrar
      let statusIn: PendingDocumentStatus[] | undefined;
      if (statusFilter === 'all') {
        statusIn = undefined; // Tots
      } else if (statusFilter === 'matched') {
        statusIn = ['matched'];
      } else if (statusFilter === 'archived') {
        statusIn = ['archived'];
      } else {
        statusIn = statusFilter;
      }

      return buildPendingDocumentsQuery(firestore, organizationId, { statusIn });
    },
    [firestore, organizationId, isPendingDocsEnabled, statusFilter]
  );

  // Subscriure a la col·lecció
  const { data: pendingDocs, isLoading, error } = useCollection<PendingDocument>(pendingDocsQuery);

  // Carregar contactes
  const contactsQuery = useMemoFirebase(
    () => organizationId && firestore
      ? collection(firestore, 'organizations', organizationId, 'contacts')
      : null,
    [firestore, organizationId]
  );
  const { data: contacts } = useCollection<Contact>(contactsQuery);

  // Carregar categories
  const categoriesQuery = useMemoFirebase(
    () => organizationId && firestore
      ? collection(firestore, 'organizations', organizationId, 'categories')
      : null,
    [firestore, organizationId]
  );
  const { data: categories } = useCollection<Category>(categoriesQuery);

  // Carregar transaccions (per conciliació)
  const transactionsQuery = useMemoFirebase(
    () => organizationId && firestore
      ? collection(firestore, 'organizations', organizationId, 'transactions')
      : null,
    [firestore, organizationId]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  React.useEffect(() => {
    if (organization && !isPendingDocsEnabled) {
      router.replace('../movimientos');
    }
  }, [organization, isPendingDocsEnabled, router]);

  // Handler per actualitzar un camp
  const handleFieldUpdate = React.useCallback(async (
    docId: string,
    field: string,
    value: string | number | null
  ) => {
    if (!firestore || !organizationId) return;

    try {
      await updatePendingDocument(firestore, organizationId, docId, {
        [field]: value,
        fieldSources: { [field]: 'manual' },
      });
    } catch (error) {
      console.error('Error updating field:', error);
      toast({
        variant: 'destructive',
        title: t.pendingDocs.toasts.error,
        description: t.pendingDocs.toasts.errorConfirm,
      });
    }
  }, [firestore, organizationId, toast]);

  // Handler per confirmar un document
  const handleConfirm = React.useCallback(async (doc: PendingDocument) => {
    if (!firestore || !organizationId) return;

    setConfirmingDocId(doc.id);
    try {
      await confirmPendingDocument(firestore, organizationId, doc);
      toast({
        title: t.pendingDocs.toasts.confirmed,
        description: `${doc.invoiceNumber || doc.file.filename}`,
      });
    } catch (error) {
      console.error('Error confirming document:', error);
      toast({
        variant: 'destructive',
        title: t.pendingDocs.toasts.error,
        description: error instanceof Error ? error.message : t.pendingDocs.toasts.errorConfirm,
      });
    } finally {
      setConfirmingDocId(null);
    }
  }, [firestore, organizationId, toast]);

  // Handler per confirmar tots els documents vàlids
  const handleBulkConfirm = React.useCallback(async () => {
    if (!firestore || !organizationId || !pendingDocs) return;

    const drafts = pendingDocs.filter(d => d.status === 'draft');
    if (drafts.length === 0) return;

    setIsBulkConfirming(true);
    try {
      const result = await confirmManyPendingDocuments(firestore, organizationId, drafts);

      if (result.confirmedCount > 0) {
        toast({
          title: t.pendingDocs.toasts.confirmedMultiple({ count: result.confirmedCount }),
          description: result.skippedCount > 0
            ? `${result.skippedCount} ${t.pendingDocs.statuses.incomplete.toLowerCase()}`
            : undefined,
        });
      } else {
        toast({
          variant: 'destructive',
          title: t.pendingDocs.toasts.error,
          description: t.pendingDocs.toasts.errorConfirm,
        });
      }
    } catch (error) {
      console.error('Error bulk confirming:', error);
      toast({
        variant: 'destructive',
        title: t.pendingDocs.toasts.error,
        description: t.pendingDocs.toasts.errorConfirm,
      });
    } finally {
      setIsBulkConfirming(false);
    }
  }, [firestore, organizationId, pendingDocs, toast]);

  // Handler per arxivar un document
  const handleArchive = React.useCallback(async (doc: PendingDocument) => {
    if (!firestore || !organizationId) return;

    setArchivingDocId(doc.id);
    try {
      await archivePendingDocument(firestore, organizationId, doc);
      toast({
        title: t.pendingDocs.toasts.archived,
        description: `${doc.invoiceNumber || doc.file.filename}`,
      });
    } catch (error) {
      console.error('Error archiving document:', error);
      toast({
        variant: 'destructive',
        title: t.pendingDocs.toasts.error,
        description: error instanceof Error ? error.message : t.pendingDocs.toasts.errorArchive,
      });
    } finally {
      setArchivingDocId(null);
    }
  }, [firestore, organizationId, toast]);

  // Handler per restaurar un document arxivat
  const handleRestore = React.useCallback(async (doc: PendingDocument) => {
    if (!firestore || !organizationId) return;

    setArchivingDocId(doc.id);
    try {
      await restorePendingDocument(firestore, organizationId, doc);
      toast({
        title: t.pendingDocs.toasts.restored,
        description: `${doc.invoiceNumber || doc.file.filename}`,
      });
    } catch (error) {
      console.error('Error restoring document:', error);
      toast({
        variant: 'destructive',
        title: t.pendingDocs.toasts.error,
        description: error instanceof Error ? error.message : t.pendingDocs.toasts.errorRestore,
      });
    } finally {
      setArchivingDocId(null);
    }
  }, [firestore, organizationId, toast]);

  // Handler per eliminar un document
  const handleDelete = React.useCallback(async (doc: PendingDocument) => {
    if (!firestore || !storage || !organizationId) return;

    setDeletingDocId(doc.id);
    try {
      const result = await deletePendingDocument(firestore, storage, organizationId, doc.id);

      // Tancar expansió si estava obert
      if (expandedDocId === doc.id) {
        setExpandedDocId(null);
      }

      toast({
        title: t.pendingDocs.toasts.deleted,
        description: `${doc.invoiceNumber || doc.file.filename}`,
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        variant: 'destructive',
        title: t.pendingDocs.toasts.error,
        description: error instanceof Error ? error.message : t.pendingDocs.toasts.errorDelete,
      });
    } finally {
      setDeletingDocId(null);
    }
  }, [firestore, storage, organizationId, toast, expandedDocId]);

  // Si encara no tenim l'organització o el flag no està actiu, mostrar loading
  if (!organization || !isPendingDocsEnabled) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Helper per determinar si un filtre està actiu
  const isFilterActive = (filter: typeof statusFilter) => {
    if (Array.isArray(filter) && Array.isArray(statusFilter)) {
      return JSON.stringify(filter) === JSON.stringify(statusFilter);
    }
    return filter === statusFilter;
  };

  // Callback quan es completa l'upload
  const handleUploadComplete = (count: number) => {
    // Scroll a dalt per veure els nous documents
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Anar a "Per revisar" per veure els nous drafts
    setStatusFilter(DRAFTS_FILTER);
    // Netejar fitxers inicials
    setInitialUploadFiles(undefined);
  };

  // Handlers de drag & drop extern (zona de la pàgina)
  const handlePageDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Només activar si hi ha fitxers
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  }, []);

  const handlePageDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Només desactivar si sortim de la zona principal
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDraggingOver(false);
    }
  }, []);

  const handlePageDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files.length > 0) {
      // Filtrar només fitxers vàlids abans d'obrir el modal
      const allFiles = Array.from(e.dataTransfer.files);
      const validFiles = allFiles.filter(f => {
        const ext = f.name.toLowerCase().split('.').pop();
        return ['pdf', 'xml', 'jpg', 'jpeg', 'png'].includes(ext || '');
      });

      if (validFiles.length === 0) {
        // Cap fitxer vàlid → mostrar toast i no obrir modal
        toast({
          variant: 'destructive',
          title: t.pendingDocs.upload.invalidFiles,
          description: t.pendingDocs.upload.invalidFilesDesc,
        });
        return;
      }

      setInitialUploadFiles(validFiles);
      setIsUploadModalOpen(true);
    }
  }, [toast, t]);

  // Aplicar filtres client-side
  const filteredDocs = React.useMemo(() => {
    if (!pendingDocs) return [];
    return filterPendingDocuments(pendingDocs, filters, contacts || []);
  }, [pendingDocs, filters, contacts]);

  // Comptar drafts (sense filtres, per el botó bulk confirm)
  const drafts = pendingDocs?.filter(d => d.status === 'draft') || [];
  const readyDrafts = drafts.filter(isDocumentReadyToConfirm);

  // Documents seleccionables: només confirmed (per generar SEPA)
  const selectableDocs = filteredDocs.filter(d => d.status === 'confirmed');

  // Handlers de selecció
  const handleSelectDoc = React.useCallback((docId: string, selected: boolean) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(docId);
      } else {
        next.delete(docId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = React.useCallback((selected: boolean) => {
    if (selected) {
      setSelectedDocIds(new Set(selectableDocs.map(d => d.id)));
    } else {
      setSelectedDocIds(new Set());
    }
  }, [selectableDocs]);

  // Documents seleccionats
  const selectedDocs = React.useMemo(() => {
    return filteredDocs.filter(d => selectedDocIds.has(d.id));
  }, [filteredDocs, selectedDocIds]);

  // Netejar selecció quan canvia el filtre
  React.useEffect(() => {
    setSelectedDocIds(new Set());
  }, [statusFilter]);

  // Handler per quan es completa la generació SEPA
  const handleSepaComplete = React.useCallback(() => {
    setSelectedDocIds(new Set());
    // Refrescar la llista (la subscripció ho farà automàticament)
  }, []);

  // Handler per obrir el modal de conciliació
  const handleReconcile = React.useCallback((doc: PendingDocument) => {
    // Buscar la primera transacció suggerida
    const suggestedId = doc.suggestedTransactionIds?.[0];
    if (!suggestedId || !transactions) {
      toast({
        variant: 'destructive',
        title: t.pendingDocs.toasts.error,
        description: t.pendingDocs.toasts.errorLink,
      });
      return;
    }

    const tx = transactions.find(t => t.id === suggestedId);
    if (!tx) {
      toast({
        variant: 'destructive',
        title: t.pendingDocs.toasts.error,
        description: t.pendingDocs.toasts.errorLink,
      });
      return;
    }

    setReconcileDoc(doc);
    setReconcileTx(tx);
  }, [transactions, toast]);

  // Handler quan es completa la conciliació
  const handleReconcileComplete = React.useCallback(() => {
    setReconcileDoc(null);
    setReconcileTx(null);
    // La subscripció refrescarà automàticament
  }, []);

  // Path per navegar a moviments (per link a transacció conciliada)
  const movimentsPath = `../movimientos`;

  return (
    <TooltipProvider>
      <div
        ref={topRef}
        className="w-full flex flex-col gap-6 relative"
        onDragOver={handlePageDragOver}
        onDragLeave={handlePageDragLeave}
        onDrop={handlePageDrop}
      >
        {/* Overlay de drag & drop */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 bg-primary/5 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
            <div className="bg-background/95 backdrop-blur-sm rounded-lg px-6 py-4 shadow-lg border">
              <div className="flex items-center gap-3 text-primary">
                <Upload className="h-8 w-8" />
                <span className="text-lg font-medium">
                  {t.pendingDocs.upload.dropHere}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="../movimientos">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t.movements.title}
              </Link>
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                  {t.pendingDocs.title}
                </h1>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Experimental
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {t.pendingDocs.subtitle}
              </p>
            </div>
            {canOperate && (
              <div className="flex items-center gap-2">
                {/* Botó SEPA quan hi ha selecció */}
                {selectedDocs.length > 0 && (
                  <Button
                    onClick={() => setIsSepaModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t.pendingDocs.actions.generateSepa} ({selectedDocs.length})
                  </Button>
                )}
                {/* Botó "Confirmar totes" només a la pestanya "Per revisar" */}
                {isFilterActive(DRAFTS_FILTER) && readyDrafts.length > 0 && selectedDocs.length === 0 && (
                  <Button
                    variant="outline"
                    onClick={handleBulkConfirm}
                    disabled={isBulkConfirming}
                  >
                    {isBulkConfirming ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCheck className="mr-2 h-4 w-4" />
                    )}
                    {t.pendingDocs.actions.confirmAll} ({readyDrafts.length})
                  </Button>
                )}
                <Button onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t.pendingDocs.actions.upload}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Banner informatiu segons la pestanya activa */}
        {isFilterActive(DRAFTS_FILTER) && (
          <Alert className="border-orange-200 bg-orange-50">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">
              {t.pendingDocs.banners.prebank}
            </AlertTitle>
            <AlertDescription className="text-orange-700">
              <span>
                {t.pendingDocs.banners.reviewInfo}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {isFilterActive(PENDING_FILTER) && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">
              {t.pendingDocs.banners.prebank}
            </AlertTitle>
            <AlertDescription className="text-blue-700">
              <span>
                {t.pendingDocs.banners.bankPendingInfo}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs de filtre (exclusius) */}
        <div className="flex items-center gap-2 border-b pb-2">
          <Button
            variant={isFilterActive(DRAFTS_FILTER) ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter(DRAFTS_FILTER)}
          >
            {t.pendingDocs.tabs.review}
            {drafts.length > 0 && (
              <Badge variant="outline" className="ml-2">{drafts.length}</Badge>
            )}
          </Button>
          <Button
            variant={isFilterActive(PENDING_FILTER) ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter(PENDING_FILTER)}
          >
            {t.pendingDocs.tabs.bankPending}
          </Button>
          <Button
            variant={isFilterActive('matched') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('matched')}
          >
            {t.pendingDocs.tabs.reconciled}
          </Button>
          <Button
            variant={isFilterActive('archived') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('archived')}
          >
            {t.pendingDocs.tabs.archived}
          </Button>
        </div>

        {/* Panell de filtres */}
        <PendingDocumentsFilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          contacts={contacts || []}
          categories={categories || []}
        />

        {/* Llista de documents */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              // Skeleton loading
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : error ? (
              // Error state
              <div className="p-8 text-center">
                <p className="text-destructive">{t.pendingDocs.toasts.error}: {error.message}</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              // Empty state
              <EmptyState
                icon={FileStack}
                title={pendingDocs && pendingDocs.length > 0 ? t.pendingDocs.empty.review : t.pendingDocs.empty.bankPending}
                description={pendingDocs && pendingDocs.length > 0
                  ? t.pendingDocs.empty.reviewDesc
                  : t.pendingDocs.empty.bankPendingDesc
                }
                className="py-16"
              />
            ) : isFilterActive(DRAFTS_FILTER) ? (
              // Vista compacta + expandible per drafts (responsive)
              <div className="divide-y">
                {filteredDocs.map((doc) => (
                  <PendingDocumentCard
                    key={doc.id}
                    doc={doc}
                    contacts={contacts || []}
                    categories={categories || []}
                    onUpdate={handleFieldUpdate}
                    onConfirm={handleConfirm}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    isConfirming={confirmingDocId === doc.id}
                    isArchiving={archivingDocId === doc.id}
                    isDeleting={deletingDocId === doc.id}
                    isExpanded={expandedDocId === doc.id}
                    onToggleExpand={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                  />
                ))}
              </div>
            ) : (
              // Vista per altres pestanyes: taula a lg+, llista compacta a < lg
              <>
                {/* Taula desktop (lg+) */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {/* Checkbox per selecció múltiple */}
                        {selectableDocs.length > 0 && (
                          <TableHead className="w-[40px] pr-0">
                            <Checkbox
                              checked={selectedDocIds.size > 0 && selectedDocIds.size === selectableDocs.length}
                              onCheckedChange={(checked) => handleSelectAll(!!checked)}
                              aria-label={t.pendingDocs.selection.selectAll}
                            />
                          </TableHead>
                        )}
                        <TableHead>{t.pendingDocs.fields.filename}</TableHead>
                        <TableHead className="text-right">{t.pendingDocs.fields.amount}</TableHead>
                        <TableHead>{t.pendingDocs.fields.invoiceDate}</TableHead>
                        <TableHead>{t.pendingDocs.fields.type}</TableHead>
                        <TableHead>{t.pendingDocs.fields.invoiceNumber}</TableHead>
                        <TableHead>{t.pendingDocs.fields.supplier}</TableHead>
                        <TableHead>{t.pendingDocs.fields.category}</TableHead>
                        <TableHead>{t.pendingDocs.statuses.draft}</TableHead>
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocs.map((doc) => (
                        <PendingDocumentRow
                          key={doc.id}
                          doc={doc}
                          contacts={contacts || []}
                          categories={categories || []}
                          onUpdate={handleFieldUpdate}
                          onConfirm={handleConfirm}
                          onArchive={handleArchive}
                          onRestore={handleRestore}
                          onReconcile={handleReconcile}
                          isConfirming={confirmingDocId === doc.id}
                          isArchiving={archivingDocId === doc.id}
                          movimentsPath={movimentsPath}
                          isSelectable={canOperate && doc.status === 'confirmed'}
                          isSelected={selectedDocIds.has(doc.id)}
                          onSelect={handleSelectDoc}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Llista mòbil (< lg) */}
                <div className="lg:hidden divide-y">
                  {filteredDocs.map((doc) => {
                    const supplierName = doc.supplierId
                      ? contacts?.find(c => c.id === doc.supplierId)?.name
                      : null;
                    return (
                      <div key={doc.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium truncate">{doc.file.filename}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {supplierName && <span>{supplierName} · </span>}
                            {doc.invoiceDate && <span>{doc.invoiceDate}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-medium tabular-nums">
                            {doc.amount !== null ? `${doc.amount.toFixed(2)} €` : '—'}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] mt-1',
                              doc.status === 'confirmed' && 'bg-blue-50 text-blue-700 border-blue-200',
                              doc.status === 'sepa_generated' && 'bg-purple-50 text-purple-700 border-purple-200',
                              doc.status === 'matched' && 'bg-green-50 text-green-700 border-green-200',
                              doc.status === 'archived' && 'bg-amber-50 text-amber-700 border-amber-200'
                            )}
                          >
                            {t.pendingDocs.statuses[doc.status] || doc.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Nota de peu */}
        <p className="text-xs text-muted-foreground text-center">
          {t.pendingDocs.banners.prebankDescription}
        </p>

        {/* Modal d'upload */}
        <PendingDocumentsUploadModal
          open={isUploadModalOpen}
          onOpenChange={(open) => {
            setIsUploadModalOpen(open);
            if (!open) setInitialUploadFiles(undefined);
          }}
          onUploadComplete={handleUploadComplete}
          contacts={contacts || []}
          initialFiles={initialUploadFiles}
        />

        {/* Modal SEPA */}
        <SepaGenerationModal
          open={isSepaModalOpen}
          onOpenChange={setIsSepaModalOpen}
          selectedDocuments={selectedDocs}
          contacts={contacts || []}
          onComplete={handleSepaComplete}
        />

        {/* Modal de conciliació */}
        <ReconciliationModal
          open={!!reconcileDoc}
          onOpenChange={(open) => {
            if (!open) {
              setReconcileDoc(null);
              setReconcileTx(null);
            }
          }}
          pendingDoc={reconcileDoc}
          transaction={reconcileTx}
          contacts={contacts || []}
          categories={categories || []}
          onComplete={handleReconcileComplete}
        />
      </div>
    </TooltipProvider>
  );
}
