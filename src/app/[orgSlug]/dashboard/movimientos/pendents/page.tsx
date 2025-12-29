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
  isDocumentReadyToConfirm,
  type PendingDocument,
  type PendingDocumentStatus,
} from '@/lib/pending-documents';
import { PendingDocumentsUploadModal } from '@/components/pending-documents/pending-documents-upload-modal';
import { PendingDocumentRow } from '@/components/pending-documents/pending-document-row';
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
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  // Feature flag check - redirect if not enabled
  const isPendingDocsEnabled = organization?.features?.pendingDocs ?? false;

  // Només admins poden operar (generar SEPA, conciliar, etc.)
  const canOperate = userRole === 'admin';

  // Estat del filtre (per defecte: Per revisar = drafts)
  const [statusFilter, setStatusFilter] = React.useState<PendingDocumentStatus[] | 'all' | 'matched' | 'archived'>(DRAFTS_FILTER);

  // Modal d'upload
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);

  // Estats de càrrega
  const [confirmingDocId, setConfirmingDocId] = React.useState<string | null>(null);
  const [isBulkConfirming, setIsBulkConfirming] = React.useState(false);
  const [archivingDocId, setArchivingDocId] = React.useState<string | null>(null);

  // Filtres client-side
  const [filters, setFilters] = React.useState<PendingDocumentsFilters>(EMPTY_FILTERS);

  // Selecció múltiple
  const [selectedDocIds, setSelectedDocIds] = React.useState<Set<string>>(new Set());

  // Modal SEPA
  const [isSepaModalOpen, setIsSepaModalOpen] = React.useState(false);

  // Modal de conciliació
  const [reconcileDoc, setReconcileDoc] = React.useState<PendingDocument | null>(null);
  const [reconcileTx, setReconcileTx] = React.useState<Transaction | null>(null);

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
        title: 'Error',
        description: 'No s\'ha pogut actualitzar el camp.',
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
        title: 'Document confirmat',
        description: `${doc.invoiceNumber || doc.file.filename} confirmat correctament.`,
      });
    } catch (error) {
      console.error('Error confirming document:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No s\'ha pogut confirmar el document.',
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
          title: `${result.confirmedCount} document${result.confirmedCount > 1 ? 's' : ''} confirmat${result.confirmedCount > 1 ? 's' : ''}`,
          description: result.skippedCount > 0
            ? `${result.skippedCount} pendent${result.skippedCount > 1 ? 's' : ''} (incomplerts).`
            : undefined,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Cap document confirmat',
          description: 'Tots els documents tenen camps obligatoris pendents.',
        });
      }
    } catch (error) {
      console.error('Error bulk confirming:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'han pogut confirmar els documents.',
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
        title: 'Document arxivat',
        description: `${doc.invoiceNumber || doc.file.filename} arxivat correctament.`,
      });
    } catch (error) {
      console.error('Error archiving document:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No s\'ha pogut arxivar el document.',
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
        title: 'Document restaurat',
        description: `${doc.invoiceNumber || doc.file.filename} restaurat a l'estat anterior.`,
      });
    } catch (error) {
      console.error('Error restoring document:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No s\'ha pogut restaurar el document.',
      });
    } finally {
      setArchivingDocId(null);
    }
  }, [firestore, organizationId, toast]);

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
  };

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
        title: 'Error',
        description: 'No s\'ha trobat cap suggeriment de conciliació.',
      });
      return;
    }

    const tx = transactions.find(t => t.id === suggestedId);
    if (!tx) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La transacció suggerida no existeix.',
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
      <div ref={topRef} className="w-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="../movimientos">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Moviments
              </Link>
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight font-headline">
                  Documents pendents
                </h1>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Experimental
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Factures i nòmines pendents de conciliació bancària
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
                    Generar remesa SEPA ({selectedDocs.length})
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
                    Confirmar totes ({readyDrafts.length})
                  </Button>
                )}
                <Button onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Pujar factures/nòmines
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
              Aquests documents encara no són moviments
            </AlertTitle>
            <AlertDescription className="text-orange-700">
              <span>
                Revisa les dades extretes (import, data, proveïdor) i confirma cada document.
                Un cop confirmat, passarà a «Pendents de banc» fins que arribi l'extracte.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {isFilterActive(PENDING_FILTER) && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">
              Següent pas: importar l'extracte bancari
            </AlertTitle>
            <AlertDescription className="text-blue-700">
              <span>
                Aquests documents estan confirmats i esperant el moviment bancari corresponent.
                Quan importis l'extracte, el sistema suggerirà quins documents corresponen a cada moviment.
              </span>
              <Button
                variant="link"
                size="sm"
                asChild
                className="ml-2 h-auto p-0 text-blue-800 underline underline-offset-2"
              >
                <Link href="../movimientos">
                  Anar a Moviments per importar extracte →
                </Link>
              </Button>
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
            Per revisar
            {drafts.length > 0 && (
              <Badge variant="outline" className="ml-2">{drafts.length}</Badge>
            )}
          </Button>
          <Button
            variant={isFilterActive(PENDING_FILTER) ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter(PENDING_FILTER)}
          >
            Pendents de banc
          </Button>
          <Button
            variant={isFilterActive('matched') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('matched')}
          >
            Conciliat
          </Button>
          <Button
            variant={isFilterActive('archived') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('archived')}
          >
            Arxivat
          </Button>
        </div>

        {/* Panell de filtres */}
        <PendingDocumentsFilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          contacts={contacts || []}
          categories={categories || []}
        />

        {/* Taula de documents */}
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
                <p className="text-destructive">Error carregant documents: {error.message}</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              // Empty state
              <EmptyState
                icon={FileStack}
                title={pendingDocs && pendingDocs.length > 0 ? "Cap resultat" : "Cap document pendent"}
                description={pendingDocs && pendingDocs.length > 0
                  ? "No hi ha documents que coincideixin amb els filtres seleccionats."
                  : "Puja factures o nòmines que encara no hagin aparegut al banc. Es conciliaran automàticament quan arribi l'extracte."
                }
                className="py-16"
              />
            ) : (
              // Taula amb documents
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Checkbox per selecció múltiple */}
                    {selectableDocs.length > 0 && (
                      <TableHead className="w-[40px] pr-0">
                        <Checkbox
                          checked={selectedDocIds.size > 0 && selectedDocIds.size === selectableDocs.length}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                          aria-label="Seleccionar tots"
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-[200px]">Fitxer</TableHead>
                    <TableHead className="text-right w-[110px]">Import</TableHead>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead className="w-[80px]">Tipus</TableHead>
                    <TableHead className="w-[100px]">Nº factura</TableHead>
                    <TableHead className="w-[160px]">Proveïdor</TableHead>
                    <TableHead className="w-[140px]">Categoria</TableHead>
                    <TableHead className="w-[90px]">Estat</TableHead>
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
            )}
          </CardContent>
        </Card>

        {/* Nota de peu */}
        <p className="text-xs text-muted-foreground text-center">
          Aquesta funcionalitat és experimental. Els documents pujats aquí no afecten saldos ni fiscalitat fins que es conciliïn amb un moviment bancari real.
        </p>

        {/* Modal d'upload */}
        <PendingDocumentsUploadModal
          open={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          onUploadComplete={handleUploadComplete}
          contacts={contacts || []}
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
