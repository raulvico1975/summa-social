'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, User, Building2, RefreshCw, Heart, Upload, AlertTriangle, Search, X, RotateCcw, Download, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Donor, Category, Transaction } from '@/lib/data';
import { fromPeriodQuery } from '@/lib/period-query';
import type { DateFilterValue } from '@/components/date-filter';
import { useTransactionFilters } from '@/hooks/use-transaction-filters';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, archiveDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { findExistingContact } from '@/lib/contact-matching';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { DonorImporter } from './donor-importer';
import { DonorDetailDrawer } from './donor-detail-drawer';
import { useTranslations } from '@/i18n';
import { normalizeContact, formatCurrencyEU } from '@/lib/normalize';
import { cn } from '@/lib/utils';
import { exportDonorsToExcel } from '@/lib/donors-export';

type DonorFormData = Omit<Donor, 'id' | 'createdAt' | 'updatedAt'>;

const emptyFormData: DonorFormData = {
  type: 'donor',
  name: '',
  taxId: '',
  zipCode: '',
  city: '',
  province: '',
  address: '',
  donorType: 'individual',
  membershipType: 'one-time',
  monthlyAmount: undefined,
  memberSince: undefined,
  iban: '',
  email: '',
  phone: '',
  notes: '',
  defaultCategoryId: undefined,
  status: 'active',
  inactiveSince: undefined,
};

export function DonorManager() {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();

  const contactsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );

  const donorsQuery = useMemoFirebase(
    () => contactsCollection ? query(contactsCollection, where('type', '==', 'donor')) : null,
    [contactsCollection]
  );

  const { data: donorsRaw, isLoading: isLoadingDonors } = useCollection<Donor & { archivedAt?: string }>(donorsQuery);
  // Filtrar donants arxivats (soft-deleted)
  const donors = React.useMemo(
    () => donorsRaw?.filter(d => !d.archivedAt),
    [donorsRaw]
  );

  // Categories d'ingrés per al selector de categoria per defecte
  const categoriesCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const { data: allCategories } = useCollection<Category>(categoriesCollection);
  const incomeCategories = React.useMemo(
    () => allCategories?.filter(c => c.type === 'income') || [],
    [allCategories]
  );

  // Query per transaccions (només quan view=active)
  const transactionsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'transactions') : null,
    [firestore, organizationId]
  );
  const { data: allTransactions } = useCollection<Transaction>(transactionsCollection);
  // Memoitzar per evitar re-renders innecessaris
  const categoryTranslations = React.useMemo(
    () => t.categories as Record<string, string>,
    [t.categories]
  );

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [selectedDonor, setSelectedDonor] = React.useState<Donor | null>(null);
  const [editingDonor, setEditingDonor] = React.useState<Donor | null>(null);
  const [donorToDelete, setDonorToDelete] = React.useState<Donor | null>(null);
  const [formData, setFormData] = React.useState<DonorFormData>(emptyFormData);

  // Filtre de donants incomplets
  const [showIncompleteOnly, setShowIncompleteOnly] = React.useState(false);
  const [hasUrlFilter, setHasUrlFilter] = React.useState(false);

  // Filtre per estat (actiu/inactiu)
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('active');

  // Cercador intel·ligent
  const [searchQuery, setSearchQuery] = React.useState('');

  // Nous filtres: view=active i membershipType
  const [activeViewFilter, setActiveViewFilter] = React.useState(false);
  const [membershipTypeFilter, setMembershipTypeFilter] = React.useState<'all' | 'one-time' | 'recurring'>('all');
  const [periodFilter, setPeriodFilter] = React.useState<DateFilterValue | null>(null);
  const [periodLabel, setPeriodLabel] = React.useState<string>('');

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVOLUCIONS: Estat i càrrega
  // ═══════════════════════════════════════════════════════════════════════════
  const [donorsWithReturns, setDonorsWithReturns] = React.useState<Set<string>>(new Set());
  const [showWithReturnsOnly, setShowWithReturnsOnly] = React.useState(false);
  const [loadingReturns, setLoadingReturns] = React.useState(false);

  const loadDonorsWithReturns = React.useCallback(async () => {
    if (!organizationId || !firestore) return;
    setLoadingReturns(true);
    try {
      const txRef = collection(firestore, 'organizations', organizationId, 'transactions');
      const q = query(txRef, where('transactionType', '==', 'return'));
      const snapshot = await getDocs(q);
      const ids = new Set<string>();
      snapshot.forEach(doc => {
        const contactId = doc.data().contactId;
        if (contactId) ids.add(contactId);
      });
      setDonorsWithReturns(ids);
    } catch (e) {
      console.error('Error carregant devolucions:', e);
    } finally {
      setLoadingReturns(false);
    }
  }, [organizationId, firestore]);

  // Carregar devolucions al mount
  React.useEffect(() => {
    loadDonorsWithReturns();
  }, [loadDonorsWithReturns]);

  // Llegir paràmetres de la URL (filtre i id de donant)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filter = params.get('filter');
      if (filter === 'incomplete') {
        setShowIncompleteOnly(true);
        setHasUrlFilter(true);
      }

      // Nous filtres: view=active i membershipType
      const view = params.get('view');
      const membershipType = params.get('membershipType');

      if (view === 'active') {
        setActiveViewFilter(true);
        setHasUrlFilter(true);
        // Llegir el període dels paràmetres
        const period = fromPeriodQuery(params);
        if (period) {
          setPeriodFilter(period);
          // Construir label del període per mostrar a la UI
          if (period.type === 'all') {
            setPeriodLabel(t.donors.allPeriods || 'Tot el període');
          } else if (period.type === 'year' && period.year) {
            setPeriodLabel(`${period.year}`);
          } else if (period.type === 'month' && period.year && period.month) {
            setPeriodLabel(`${period.month}/${period.year}`);
          } else if (period.type === 'quarter' && period.year && period.quarter) {
            setPeriodLabel(`T${period.quarter} ${period.year}`);
          }
        }
      }

      if (membershipType === 'one-time' || membershipType === 'recurring') {
        setMembershipTypeFilter(membershipType);
        setHasUrlFilter(true);
      }

      // Si hi ha un ID de donant a la URL, obrir el drawer
      const donorId = params.get('id');
      if (donorId && donors) {
        const donor = donors.find(d => d.id === donorId);
        if (donor) {
          setSelectedDonor(donor);
          setIsDetailOpen(true);
          // Netejar el paràmetre id de la URL
          const url = new URL(window.location.href);
          url.searchParams.delete('id');
          window.history.replaceState({}, '', url.toString());
        }
      }
    }
  }, [donors, t.donors.allPeriods]);

  // Funció per netejar el filtre i actualitzar la URL
  const clearFilter = () => {
    setShowIncompleteOnly(false);
    setShowWithReturnsOnly(false);
    setActiveViewFilter(false);
    setMembershipTypeFilter('all');
    setPeriodFilter(null);
    setPeriodLabel('');
    setHasUrlFilter(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('filter');
      url.searchParams.delete('view');
      url.searchParams.delete('membershipType');
      url.searchParams.delete('periodType');
      url.searchParams.delete('periodYear');
      url.searchParams.delete('periodMonth');
      url.searchParams.delete('periodQuarter');
      url.searchParams.delete('periodFrom');
      url.searchParams.delete('periodTo');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Filtrar transaccions pel període seleccionat
  const filteredTransactions = useTransactionFilters(allTransactions || undefined, periodFilter || { type: 'all' });

  // Calcular IDs de contactes actius (amb transaccions al període)
  const activeContactIds = React.useMemo(() => {
    if (!activeViewFilter || !filteredTransactions) return new Set<string>();
    const ids = new Set<string>();
    filteredTransactions.forEach(tx => {
      if (tx.amount > 0 && tx.contactType === 'donor' && tx.contactId) {
        ids.add(tx.contactId);
      }
    });
    return ids;
  }, [activeViewFilter, filteredTransactions]);

  // Comptadors per estat
  const statusCounts = React.useMemo(() => {
    if (!donors) return { active: 0, inactive: 0, total: 0 };
    const active = donors.filter(d => !d.status || d.status === 'active').length;
    const inactive = donors.filter(d => d.status === 'inactive').length;
    return { active, inactive, total: donors.length };
  }, [donors]);

  // Filtrar donants (cerca + incomplets + estat + devolucions)
  const filteredDonors = React.useMemo(() => {
    if (!donors) return [];

    let result = donors;

    // Filtre per estat
    if (statusFilter === 'active') {
      result = result.filter(donor => !donor.status || donor.status === 'active');
    } else if (statusFilter === 'inactive') {
      result = result.filter(donor => donor.status === 'inactive');
    }

    // Filtre de cerca intel·ligent
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      // Normalitzar query per a cerca IBAN (sense espais)
      const queryNoSpaces = query.replace(/\s/g, '');

      result = result.filter(donor => {
        const searchFields = [
          donor.name,
          donor.taxId,
          donor.email,
          donor.phone,
          donor.city,
          donor.province,
          donor.zipCode,
          donor.address,
        ].filter(Boolean).map(f => f!.toLowerCase());

        // Cerca normal en camps de text
        const matchesTextFields = searchFields.some(field => field.includes(query));

        // Cerca especial per IBAN (normalitzat sense espais)
        const ibanNormalized = (donor.iban || '').toLowerCase().replace(/\s/g, '');
        const matchesIban = ibanNormalized.includes(queryNoSpaces);

        return matchesTextFields || matchesIban;
      });
    }

    // Filtre de donants incomplets
    if (showIncompleteOnly) {
      result = result.filter(donor => !donor.taxId || !donor.zipCode || (donor.membershipType === 'recurring' && !donor.iban));
    }

    // Filtre de donants amb devolucions
    if (showWithReturnsOnly) {
      result = result.filter(donor => donorsWithReturns.has(donor.id));
    }

    // Filtre per contactes actius (amb transaccions al període)
    if (activeViewFilter && activeContactIds.size > 0) {
      result = result.filter(donor => activeContactIds.has(donor.id));
    }

    // Filtre per tipus de membre (donant puntual vs soci recurrent)
    if (membershipTypeFilter !== 'all') {
      result = result.filter(donor => (donor.membershipType || 'one-time') === membershipTypeFilter);
    }

    return result;
  }, [donors, showIncompleteOnly, showWithReturnsOnly, searchQuery, statusFilter, donorsWithReturns, activeViewFilter, activeContactIds, membershipTypeFilter]);

  const incompleteDonorsCount = React.useMemo(() => {
    if (!donors) return 0;
    return donors.filter(donor => !donor.taxId || !donor.zipCode || (donor.membershipType === 'recurring' && !donor.iban)).length;
  }, [donors]);

  const handleEdit = (donor: Donor) => {
    setEditingDonor(donor);
    setFormData({
      type: 'donor',
      name: donor.name,
      taxId: donor.taxId,
      zipCode: donor.zipCode,
      city: donor.city || '',
      province: donor.province || '',
      address: donor.address || '',
      donorType: donor.donorType,
      membershipType: donor.membershipType,
      monthlyAmount: donor.monthlyAmount,
      memberSince: donor.memberSince,
      iban: donor.iban || '',
      email: donor.email || '',
      phone: donor.phone || '',
      notes: donor.notes || '',
      defaultCategoryId: donor.defaultCategoryId,
      status: donor.status || 'active',
      inactiveSince: donor.inactiveSince,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (donor: Donor) => {
    setDonorToDelete(donor);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (donorToDelete && contactsCollection) {
      // Soft-delete: arxiva en lloc d'eliminar per preservar integritat referencial
      archiveDocumentNonBlocking(doc(contactsCollection, donorToDelete.id));
      toast({
        title: t.donors.donorDeleted,
        description: t.donors.donorDeletedDescription(donorToDelete.name),
      });
    }
    setIsAlertOpen(false);
    setDonorToDelete(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingDonor(null);
      setFormData(emptyFormData);
    }
  };

  const handleAddNew = () => {
    setEditingDonor(null);
    setFormData(emptyFormData);
    setIsDialogOpen(true);
  };

  const handleFormChange = (field: keyof DonorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.donors.errorNameRequired
      });
      return;
    }

    if (!contactsCollection) {
      toast({ variant: 'destructive', title: t.common.error, description: t.common.dbConnectionError });
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NORMALITZACIÓ: Aplicar format consistent abans de guardar
    // ═══════════════════════════════════════════════════════════════════════
    const normalized = normalizeContact(formData);

    // Avís si falten dades pel Model 182
    if (!normalized.taxId || !normalized.zipCode) {
      toast({
        title: t.donors.incompleteDataWarning,
        description: t.donors.incompleteDataWarningDescription,
        duration: 5000,
      });
    }

    const now = new Date().toISOString();

    // Gestionar canvi d'estat actiu/baixa
    let inactiveSince: string | null | undefined = formData.inactiveSince;
    if (formData.status === 'inactive' && !inactiveSince) {
      // Si canvia a baixa i no tenia data, posar data actual
      inactiveSince = now;
    } else if (formData.status === 'active') {
      // Si canvia a actiu, esborrar data de baixa
      inactiveSince = null;
    }

    const dataToSave = {
      ...normalized,
      taxId: normalized.taxId || null,
      zipCode: normalized.zipCode || null,
      city: normalized.city || null,
      province: normalized.province || null,
      address: normalized.address || null,
      email: normalized.email || null,
      phone: normalized.phone || null,
      notes: normalized.notes || null,
      defaultCategoryId: formData.defaultCategoryId ?? null,
      monthlyAmount: normalized.monthlyAmount ?? null,
      memberSince: normalized.memberSince ?? null,
      iban: normalized.iban || null,
      status: formData.status || 'active',
      inactiveSince: inactiveSince,
      updatedAt: now,
    };

    if (editingDonor) {
      setDocumentNonBlocking(doc(contactsCollection, editingDonor.id), dataToSave, { merge: true });
      toast({
        title: t.donors.donorUpdated,
        description: t.donors.donorUpdatedDescription(normalized.name)
      });
    } else {
      // Validar si ja existeix un contacte amb el mateix NIF/IBAN/email
      const existingMatch = findExistingContact(
        donors as any[] || [],
        normalized.taxId || undefined,
        normalized.iban || undefined,
        normalized.email || undefined
      );

      if (existingMatch.found && existingMatch.contact) {
        const existing = existingMatch.contact;
        toast({
          variant: 'destructive',
          title: 'Possible duplicat detectat',
          description: `Ja existeix "${existing.name}" amb el mateix ${existingMatch.matchedBy === 'taxId' ? 'NIF' : existingMatch.matchedBy === 'iban' ? 'IBAN' : 'email'}. Revisa la llista abans de crear un duplicat.`,
          duration: 8000,
        });
        return;
      }

      addDocumentNonBlocking(contactsCollection, { ...dataToSave, roles: { donor: true }, createdAt: now });
      toast({
        title: t.donors.donorCreated,
        description: t.donors.donorCreatedDescription(normalized.name)
      });
    }
    handleOpenChange(false);
  };

  const handleImportComplete = (count: number) => {
    // El toast ja es mostra dins del DonorImporter
  };

  const handleViewDetail = (donor: Donor) => {
    setSelectedDonor(donor);
    setIsDetailOpen(true);
  };

  const handleReactivate = (donor: Donor) => {
    if (!contactsCollection) return;

    const now = new Date().toISOString();
    setDocumentNonBlocking(doc(contactsCollection, donor.id), {
      status: 'active',
      inactiveSince: null,
      updatedAt: now,
    }, { merge: true });

    toast({
      title: t.donors.donorReactivated,
      description: t.donors.donorReactivatedDescription(donor.name),
    });
  };

  const handleEditFromDrawer = (donor: Donor) => {
    setIsDetailOpen(false);
    handleEdit(donor);
  };

  const dialogTitle = editingDonor ? t.donors.editTitle : t.donors.addTitle;
  const dialogDescription = editingDonor
    ? t.donors.editDescription
    : t.donors.addDescription;

  // Helper per detectar dades incompletes
  const hasIncompleteData = (donor: Donor) => !donor.taxId || !donor.zipCode || (donor.membershipType === 'recurring' && !donor.iban);

  // Helper per obtenir què falta (per mostrar a la columna "Falta")
  const getMissingFields = (donor: Donor): string[] => {
    const missing: string[] = [];
    if (!donor.taxId) missing.push('NIF');
    if (!donor.zipCode) missing.push('CP');
    if (donor.membershipType === 'recurring' && !donor.iban) missing.push('IBAN');
    return missing;
  };

  return (
    <TooltipProvider>
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                {t.donors.title}
              </CardTitle>
              <CardDescription>
                {t.donors.description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => donors && exportDonorsToExcel(donors)}
                disabled={!donors || donors.length === 0}
                title={t.donors.exportTooltip ?? 'Exportar llista de donants a Excel'}
              >
                <Download className="mr-2 h-4 w-4" />
                {t.donors.export ?? 'Exportar'}
              </Button>
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                {t.donors.import}
              </Button>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t.donors.add}
                </Button>
              </DialogTrigger>
            </div>
          </CardHeader>
          <CardContent>
            {/* Cercador i botons de filtre */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Cercador intel·ligent */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.donors.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Botons de filtre per estat */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={statusFilter === 'active' && !showIncompleteOnly && !showWithReturnsOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setStatusFilter('active'); setShowIncompleteOnly(false); setShowWithReturnsOnly(false); }}
                >
                  {t.donors.allActive} ({statusCounts.active})
                </Button>
                {statusCounts.inactive > 0 && (
                  <Button
                    variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setStatusFilter('inactive'); setShowIncompleteOnly(false); setShowWithReturnsOnly(false); }}
                    className={statusFilter !== 'inactive' ? 'border-gray-400 text-gray-600' : ''}
                  >
                    {t.donors.allInactive} ({statusCounts.inactive})
                  </Button>
                )}
                <Button
                  variant={statusFilter === 'all' && !showIncompleteOnly && !showWithReturnsOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setStatusFilter('all'); setShowIncompleteOnly(false); setShowWithReturnsOnly(false); }}
                >
                  {t.donors.all} ({statusCounts.total})
                </Button>
                {incompleteDonorsCount > 0 && (
                  <Button
                    variant={showIncompleteOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setShowIncompleteOnly(true);
                      setShowWithReturnsOnly(false);
                      setStatusFilter('all');
                    }}
                    className={!showIncompleteOnly ? 'border-amber-300 text-amber-600' : ''}
                  >
                    <AlertTriangle className="mr-1.5 h-3 w-3" />
                    {t.donors.incomplete} ({incompleteDonorsCount})
                  </Button>
                )}
                {donorsWithReturns.size > 0 && (
                  <>
                    <Button
                      variant={showWithReturnsOnly ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setShowWithReturnsOnly(prev => !prev);
                        if (!showWithReturnsOnly) {
                          setShowIncompleteOnly(false);
                          setStatusFilter('all');
                        }
                      }}
                      className={!showWithReturnsOnly ? 'border-orange-300 text-orange-600' : ''}
                    >
                      {t.donorsFilter.withReturns} ({donorsWithReturns.size})
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={loadDonorsWithReturns}
                      disabled={loadingReturns}
                    >
                      <RefreshCw className={cn("h-4 w-4", loadingReturns && "animate-spin")} />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Avís de filtre actiu des de dashboard */}
            {hasUrlFilter && showIncompleteOnly && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    Filtrant: {t.donors.incomplete}
                  </p>
                  <p className="text-xs text-blue-600">
                    Mostrant només {filteredDonors.length} donants amb dades incompletes
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilter}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  {t.donors.showAll}
                </Button>
              </div>
            )}

            {/* Avís de filtre actiu: donants/socis actius al període */}
            {hasUrlFilter && (activeViewFilter || membershipTypeFilter !== 'all') && !showIncompleteOnly && (
              <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-lg flex items-center gap-3">
                <Heart className="h-5 w-5 text-violet-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-violet-800">
                    {membershipTypeFilter === 'one-time'
                      ? (t.donors.filterActiveDonors || 'Donants actius')
                      : membershipTypeFilter === 'recurring'
                        ? (t.donors.filterActiveMembers || 'Socis actius')
                        : (t.donors.filterActive || 'Donants i socis actius')}
                    {periodLabel && ` (${periodLabel})`}
                  </p>
                  <p className="text-xs text-violet-600">
                    {t.donors.showingCount
                      ? t.donors.showingCount({ count: filteredDonors.length })
                      : `Mostrant ${filteredDonors.length} ${membershipTypeFilter === 'recurring' ? 'socis' : 'donants'} amb aportacions al període`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilter}
                  className="border-violet-300 text-violet-700 hover:bg-violet-100"
                >
                  {t.donors.showAll}
                </Button>
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.donors.name}</TableHead>
                    <TableHead>{t.donors.taxId}</TableHead>
                    <TableHead>{t.donors.donorType}</TableHead>
                    <TableHead>{t.donors.membershipType}</TableHead>
                    <TableHead>{t.donors.amount}</TableHead>
                    {showIncompleteOnly && (
                      <TableHead className="text-amber-600">{t.donors.missingColumn || 'Falta'}</TableHead>
                    )}
                    <TableHead className="text-right">{t.donors.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonors && filteredDonors.map((donor) => (
                    <TableRow key={donor.id} className="h-10">
                      <TableCell className="font-medium py-1">
                        <div className="flex items-center gap-2">
                          {donor.donorType === 'individual' ? (
                            <User className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                          <button
                            type="button"
                            onClick={() => handleViewDetail(donor)}
                            className="text-blue-600 hover:text-blue-800 hover:underline text-left font-medium cursor-pointer"
                          >
                            {donor.name}
                          </button>
                          {donor.status === 'inactive' && (
                            <Badge variant="secondary" className="bg-gray-200 text-gray-600 text-xs py-0 px-1.5">
                              {t.donors.inactiveBadge}
                            </Badge>
                          )}
                          {donorsWithReturns.has(donor.id) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="ml-1 text-xs bg-orange-100 text-orange-700 border-orange-200">
                                  Dev.
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Aquest donant té devolucions assignades</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {hasIncompleteData(donor) && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                {t.donors.incompleteDataTooltip}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1 text-xs">{donor.taxId || <span className="text-amber-500">-</span>}</TableCell>
                      <TableCell className="py-1">
                        <Badge variant="outline" className="text-xs py-0 px-1.5">
                          {donor.donorType === 'individual' ? t.donors.types.individual : t.donors.types.company}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1">
                        {donor.membershipType === 'recurring' ? (
                          <Badge className="bg-green-100 text-green-800 text-xs py-0 px-1.5">
                            <RefreshCw className="mr-0.5 h-2.5 w-2.5" />
                            {t.donors.membership.recurring}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5">{t.donors.membership.oneTime}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-1 text-xs">
                        {donor.membershipType === 'recurring' && donor.monthlyAmount
                          ? formatCurrencyEU(donor.monthlyAmount) + `/${t.donors.perMonth}`
                          : '-'
                        }
                      </TableCell>
                      {showIncompleteOnly && (
                        <TableCell className="py-1">
                          <div className="flex flex-wrap gap-1">
                            {getMissingFields(donor).map(field => (
                              <Badge key={field} variant="outline" className="text-amber-600 border-amber-300 text-xs py-0 px-1.5">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-right py-1">
                        {donor.status === 'inactive' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleReactivate(donor)}
                                aria-label={t.donors.reactivate}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t.donors.reactivate}</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                              onClick={() => handleEdit(donor)}
                              aria-label={t.donors.editDonor ?? 'Editar donant'}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t.donors.editDonor ?? 'Editar'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDeleteRequest(donor)}
                              aria-label={t.donors.deleteDonor ?? 'Eliminar donant'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t.donors.deleteDonor ?? 'Eliminar'}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Skeleton loading state */}
                  {isLoadingDonors && !donorsRaw && (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        {showIncompleteOnly && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                        <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      </TableRow>
                    ))
                  )}
                  {/* Empty state (only when not loading) */}
                  {!isLoadingDonors && (!filteredDonors || filteredDonors.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={showIncompleteOnly ? 7 : 6} className="p-0">
                        <EmptyState
                          icon={searchQuery ? Search : Users}
                          title={
                            searchQuery
                              ? (t.emptyStates?.donors?.noResults ?? t.donors.noSearchResults)
                              : showIncompleteOnly
                                ? (t.donors.noIncompleteData || "No hi ha donants amb dades incompletes")
                                : showWithReturnsOnly
                                  ? "No hi ha donants amb devolucions"
                                  : (t.emptyStates?.donors?.noData ?? t.donors.noData)
                          }
                          description={
                            searchQuery
                              ? (t.emptyStates?.donors?.noResultsDesc ?? undefined)
                              : !showIncompleteOnly && !showWithReturnsOnly
                                ? (t.emptyStates?.donors?.noDataDesc ?? undefined)
                                : undefined
                          }
                          className="border-0 rounded-none py-12"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header fix */}
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          {/* Cos amb scroll si cal */}
          <div className="flex-1 min-h-0 overflow-y-auto py-4">
            {/* ═══════════════════════════════════════════════════════════════════
                BLOC 1: Dades bàsiques i fiscals (2 columnes)
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">{t.donors.basicData}</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna esquerra: Identificació */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t.donors.name}<span className="ml-1 text-destructive">*</span></Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder={t.donors.namePlaceholder}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="taxId">
                      {t.donors.taxId}
                      <span className="ml-1 text-destructive">*</span>
                      <span className="ml-1.5 text-xs font-normal text-amber-600">(Model 182)</span>
                    </Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => handleFormChange('taxId', e.target.value.toUpperCase())}
                      placeholder="12345678A o B12345678"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.form?.taxIdHelp ?? "8 dígits + lletra (DNI) o lletra + 7 dígits + lletra (NIE/CIF)."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="donorType">{t.donors.donorType}</Label>
                      <Select
                        value={formData.donorType}
                        onValueChange={(v) => handleFormChange('donorType', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">{t.donors.types.individual}</SelectItem>
                          <SelectItem value="company">{t.donors.types.company}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="status">{t.donors.statusField}</Label>
                      <Select
                        value={formData.status || 'active'}
                        onValueChange={(v) => handleFormChange('status', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t.donors.statusActive}</SelectItem>
                          <SelectItem value="inactive">{t.donors.statusInactive}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.status === 'inactive' && formData.inactiveSince && (
                    <div className="text-sm text-muted-foreground">
                      {t.donors.inactiveSinceLabel}: {new Date(formData.inactiveSince).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Columna dreta: Contacte i ubicació */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t.donors.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      placeholder="correu@exemple.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t.donors.phone}</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      placeholder="600 000 000"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="zipCode">
                        {t.donors.zipCode}
                        <span className="ml-1 text-destructive">*</span>
                      </Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => handleFormChange('zipCode', e.target.value)}
                        placeholder="08001"
                        maxLength={5}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.form?.zipCodeHelp ?? "5 dígits. Obligatori per al Model 182."}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="city">{t.donors.city}</Label>
                      <Input
                        id="city"
                        value={formData.city || ''}
                        onChange={(e) => handleFormChange('city', e.target.value)}
                        placeholder="Barcelona"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="province">{t.donors.province}</Label>
                      <Input
                        id="province"
                        value={formData.province || ''}
                        onChange={(e) => handleFormChange('province', e.target.value)}
                        placeholder="Barcelona"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Adreça a tota amplada */}
              <div className="space-y-1.5">
                <Label htmlFor="address">{t.donors.address}</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  placeholder="Carrer Major, 15, 2n 1a"
                />
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                BLOC 2: Tipus de donació i recurrència (2 columnes)
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="space-y-4 pt-4 mt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.donors.donationType}</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna esquerra: Tipus i categoria */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="membershipType">{t.donors.membershipType}</Label>
                    <Select
                      value={formData.membershipType}
                      onValueChange={(v) => handleFormChange('membershipType', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-time">{t.donors.membership.oneTime}</SelectItem>
                        <SelectItem value="recurring">{t.donors.membership.recurring}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="defaultCategoryId">
                      {t.contacts.defaultCategory}
                      <span className="block text-xs font-normal text-muted-foreground">{t.contacts.defaultCategoryHint}</span>
                    </Label>
                    <Select
                      value={formData.defaultCategoryId || '__none__'}
                      onValueChange={(v) => handleFormChange('defaultCategoryId', v === '__none__' ? undefined : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.contacts.selectDefaultCategory} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t.contacts.noDefaultCategory}</SelectItem>
                        {incomeCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{categoryTranslations[cat.name] || cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Columna dreta: Camps recurrents (només si aplica) */}
                {formData.membershipType === 'recurring' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="monthlyAmount">{t.donors.amountMonth}</Label>
                        <Input
                          id="monthlyAmount"
                          type="number"
                          step="0.01"
                          value={formData.monthlyAmount || ''}
                          onChange={(e) => handleFormChange('monthlyAmount', parseFloat(e.target.value) || undefined)}
                          placeholder="10.00"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="memberSince">{t.donors.memberSince}</Label>
                        <Input
                          id="memberSince"
                          type="date"
                          value={formData.memberSince || ''}
                          onChange={(e) => handleFormChange('memberSince', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="iban">{t.donors.iban}</Label>
                      <Input
                        id="iban"
                        value={formData.iban || ''}
                        onChange={(e) => handleFormChange('iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
                        placeholder="ES00 0000 0000 0000 0000 0000"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                BLOC 3: Notes (tota amplada, col·lapsable visualment)
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="space-y-3 pt-4 mt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.donors.notes}</h4>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder={t.donors.notesPlaceholder}
                rows={2}
              />
            </div>
          </div>

          {/* Footer fix */}
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <DialogClose asChild>
              <Button variant="outline">{t.common.cancel}</Button>
            </DialogClose>
            <Button onClick={handleSave}>
              {editingDonor ? t.donors.save : t.donors.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.donors.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.donors.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDonorToDelete(null)}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DonorImporter
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImportComplete={handleImportComplete}
      />

      <DonorDetailDrawer
        donor={selectedDonor}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleEditFromDrawer}
      />
    </TooltipProvider>
  );
}
