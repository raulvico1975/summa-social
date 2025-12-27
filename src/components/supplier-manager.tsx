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
import { PlusCircle, Edit, Trash2, Building2, Upload, Search, X, Factory } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { Supplier, Category } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, archiveDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { findExistingContact } from '@/lib/contact-matching';
import { collection, doc, query, where } from 'firebase/firestore';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { SupplierImporter } from './supplier-importer';
import { useTranslations } from '@/i18n';

type SupplierFormData = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;

const emptyFormData: SupplierFormData = {
  type: 'supplier',
  name: '',
  taxId: '',
  zipCode: '',
  category: undefined,
  address: '',
  email: '',
  phone: '',
  iban: '',
  paymentTerms: '',
  notes: '',
  defaultCategoryId: undefined,
};

export function SupplierManager() {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();

  const contactsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );

  const suppliersQuery = useMemoFirebase(
    () => contactsCollection ? query(contactsCollection, where('type', '==', 'supplier')) : null,
    [contactsCollection]
  );

  const { data: suppliersRaw } = useCollection<Supplier & { archivedAt?: string }>(suppliersQuery);
  // Filtrar proveïdors arxivats (soft-deleted)
  const suppliers = React.useMemo(
    () => suppliersRaw?.filter(s => !s.archivedAt),
    [suppliersRaw]
  );

  // Categories de despesa per al selector de categoria per defecte
  const categoriesCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const { data: allCategories } = useCollection<Category>(categoriesCollection);
  const expenseCategories = React.useMemo(
    () => allCategories?.filter(c => c.type === 'expense') || [],
    [allCategories]
  );
  const categoryTranslations = t.categories as Record<string, string>;

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = React.useState<Supplier | null>(null);
  const [formData, setFormData] = React.useState<SupplierFormData>(emptyFormData);

  // Cercador intel·ligent
  const [searchQuery, setSearchQuery] = React.useState('');

  // Filtrar proveïdors per cerca
  const filteredSuppliers = React.useMemo(() => {
    if (!suppliers) return [];
    if (!searchQuery.trim()) return suppliers;

    const query = searchQuery.toLowerCase().trim();
    return suppliers.filter(supplier => {
      const searchFields = [
        supplier.name,
        supplier.taxId,
        supplier.email,
        supplier.phone,
        supplier.zipCode,
        supplier.address,
      ].filter(Boolean).map(f => f!.toLowerCase());

      return searchFields.some(field => field.includes(query));
    });
  }, [suppliers, searchQuery]);

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      type: 'supplier',
      name: supplier.name,
      taxId: supplier.taxId,
      zipCode: supplier.zipCode,
      category: supplier.category,
      address: supplier.address || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      iban: supplier.iban || '',
      paymentTerms: supplier.paymentTerms || '',
      notes: supplier.notes || '',
      defaultCategoryId: supplier.defaultCategoryId,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (supplierToDelete && contactsCollection) {
      // Soft-delete: arxiva en lloc d'eliminar per preservar integritat referencial
      archiveDocumentNonBlocking(doc(contactsCollection, supplierToDelete.id));
      toast({
        title: t.suppliers.supplierDeleted,
        description: t.suppliers.supplierDeletedDescription(supplierToDelete.name),
      });
    }
    setIsAlertOpen(false);
    setSupplierToDelete(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingSupplier(null);
      setFormData(emptyFormData);
    }
  };

  const handleAddNew = () => {
    setEditingSupplier(null);
    setFormData(emptyFormData);
    setIsDialogOpen(true);
  };

  const handleFormChange = (field: keyof SupplierFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.taxId) {
      toast({ 
        variant: 'destructive', 
        title: t.common.error,
        description: t.suppliers.errorRequiredFields
      });
      return;
    }

    if (!contactsCollection) {
      toast({ variant: 'destructive', title: t.common.error, description: t.common.dbConnectionError });
      return;
    }

    const now = new Date().toISOString();
    const dataToSave = {
      ...formData,
      category: formData.category || null,
      address: formData.address || null,
      email: formData.email || null,
      phone: formData.phone || null,
      iban: formData.iban || null,
      paymentTerms: formData.paymentTerms || null,
      notes: formData.notes || null,
      zipCode: formData.zipCode || '',
      defaultCategoryId: formData.defaultCategoryId || null,
      updatedAt: now,
    };

    if (editingSupplier) {
      setDocumentNonBlocking(doc(contactsCollection, editingSupplier.id), dataToSave, { merge: true });
      toast({ title: t.suppliers.supplierUpdated, description: t.suppliers.supplierUpdatedDescription(formData.name) });
    } else {
      // Validar si ja existeix un contacte amb el mateix NIF/IBAN/email
      const existingMatch = findExistingContact(
        suppliers as any[] || [],
        formData.taxId || undefined,
        formData.iban || undefined,
        formData.email || undefined
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

      addDocumentNonBlocking(contactsCollection, { ...dataToSave, roles: { supplier: true }, createdAt: now });
      toast({ title: t.suppliers.supplierCreated, description: t.suppliers.supplierCreatedDescription(formData.name) });
    }
    handleOpenChange(false);
  };

  const handleImportComplete = (count: number) => {
    // El toast ja es mostra dins del SupplierImporter
  };

  const dialogTitle = editingSupplier ? t.suppliers.editTitle : t.suppliers.addTitle;
  const dialogDescription = editingSupplier 
    ? t.suppliers.editDescription 
    : t.suppliers.addDescription;

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                {t.suppliers.title}
              </CardTitle>
              <CardDescription>
                {t.suppliers.description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                {t.suppliers.import}
              </Button>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t.suppliers.add}
                </Button>
              </DialogTrigger>
            </div>
          </CardHeader>
          <CardContent>
            {/* Cercador intel·ligent */}
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.suppliers.searchPlaceholder}
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
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.suppliers.name}</TableHead>
                    <TableHead>{t.suppliers.taxId}</TableHead>
                    <TableHead>{t.contacts.defaultCategory}</TableHead>
                    <TableHead>{t.suppliers.contactInfo}</TableHead>
                    <TableHead className="text-right">{t.suppliers.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {supplier.name}
                        </div>
                      </TableCell>
                      <TableCell>{supplier.taxId}</TableCell>
                      <TableCell>
                        {supplier.defaultCategoryId ? (
                          <Badge variant="outline">
                            {(() => {
                              const cat = expenseCategories.find(c => c.id === supplier.defaultCategoryId);
                              return cat ? (categoryTranslations[cat.name] || cat.name) : '-';
                            })()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {supplier.email && <div>{supplier.email}</div>}
                          {supplier.phone && <div className="text-muted-foreground">{supplier.phone}</div>}
                          {!supplier.email && !supplier.phone && <span className="text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          onClick={() => handleEdit(supplier)}
                          aria-label={t.suppliers.editSupplier ?? 'Editar proveïdor'}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => handleDeleteRequest(supplier)}
                          aria-label={t.suppliers.deleteSupplier ?? 'Eliminar proveïdor'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSuppliers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <EmptyState
                          icon={searchQuery ? Search : Factory}
                          title={
                            searchQuery
                              ? (t.emptyStates?.suppliers?.noResults ?? t.suppliers.noSearchResults)
                              : (t.emptyStates?.suppliers?.noData ?? t.suppliers.noData)
                          }
                          description={
                            searchQuery
                              ? (t.emptyStates?.suppliers?.noResultsDesc ?? undefined)
                              : (t.emptyStates?.suppliers?.noDataDesc ?? undefined)
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
                BLOC 1: Dades bàsiques i identificació (2 columnes)
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">{t.suppliers.basicData}</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna esquerra: Identificació */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t.suppliers.name} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder={t.suppliers.namePlaceholder}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="taxId">{t.suppliers.taxId} *</Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => handleFormChange('taxId', e.target.value.toUpperCase())}
                      placeholder="B12345678"
                    />
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
                        {expenseCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{categoryTranslations[cat.name] || cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Columna dreta: Contacte */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t.suppliers.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      placeholder="facturacio@empresa.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t.suppliers.phone}</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      placeholder="934 000 000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="zipCode">{t.suppliers.zipCode}</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleFormChange('zipCode', e.target.value)}
                      placeholder="08001"
                    />
                  </div>
                </div>
              </div>

              {/* Adreça a tota amplada */}
              <div className="space-y-1.5">
                <Label htmlFor="address">{t.suppliers.address}</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  placeholder={t.suppliers.addressPlaceholder}
                />
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                BLOC 2: Dades de pagament (2 columnes)
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="space-y-4 pt-4 mt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.suppliers.paymentData}</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="iban">{t.suppliers.iban}</Label>
                  <Input
                    id="iban"
                    value={formData.iban || ''}
                    onChange={(e) => handleFormChange('iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
                    placeholder="ES00 0000 0000 0000 0000 0000"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentTerms">{t.suppliers.paymentTerms}</Label>
                  <Input
                    id="paymentTerms"
                    value={formData.paymentTerms || ''}
                    onChange={(e) => handleFormChange('paymentTerms', e.target.value)}
                    placeholder={t.suppliers.paymentTermsPlaceholder}
                  />
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                BLOC 3: Notes (tota amplada)
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="space-y-3 pt-4 mt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.suppliers.notes}</h4>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder={t.suppliers.notesPlaceholder}
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
              {editingSupplier ? t.suppliers.save : t.suppliers.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.suppliers.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.suppliers.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SupplierImporter 
        open={isImportOpen} 
        onOpenChange={setIsImportOpen}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
