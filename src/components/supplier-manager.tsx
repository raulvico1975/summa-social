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
import { PlusCircle, Edit, Trash2, Building2, Upload } from 'lucide-react';
import type { Supplier, SupplierCategory } from '@/lib/data';
import { SUPPLIER_CATEGORIES } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
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
};

export function SupplierManager() {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();

  const categoryLabels = t.suppliers.categories as Record<SupplierCategory, string>;

  const contactsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );

  const suppliersQuery = useMemoFirebase(
    () => contactsCollection ? query(contactsCollection, where('type', '==', 'supplier')) : null,
    [contactsCollection]
  );

  const { data: suppliers } = useCollection<Supplier>(suppliersQuery);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = React.useState<Supplier | null>(null);
  const [formData, setFormData] = React.useState<SupplierFormData>(emptyFormData);

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
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (supplierToDelete && contactsCollection) {
      deleteDocumentNonBlocking(doc(contactsCollection, supplierToDelete.id));
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
      updatedAt: now,
    };

    if (editingSupplier) {
      setDocumentNonBlocking(doc(contactsCollection, editingSupplier.id), dataToSave, { merge: true });
      toast({ title: t.suppliers.supplierUpdated, description: t.suppliers.supplierUpdatedDescription(formData.name) });
    } else {
      addDocumentNonBlocking(contactsCollection, { ...dataToSave, createdAt: now });
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.suppliers.name}</TableHead>
                    <TableHead>{t.suppliers.taxId}</TableHead>
                    <TableHead>{t.suppliers.category}</TableHead>
                    <TableHead>{t.suppliers.contactInfo}</TableHead>
                    <TableHead className="text-right">{t.suppliers.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers && suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {supplier.name}
                        </div>
                      </TableCell>
                      <TableCell>{supplier.taxId}</TableCell>
                      <TableCell>
                        {supplier.category ? (
                          <Badge variant="outline">
                            {categoryLabels[supplier.category as SupplierCategory] || supplier.category}
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
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteRequest(supplier)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!suppliers || suppliers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        {t.suppliers.noData}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">{t.suppliers.basicData}</h4>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">{t.suppliers.name} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="col-span-3"
                  placeholder={t.suppliers.namePlaceholder}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taxId" className="text-right">{t.suppliers.taxId} *</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => handleFormChange('taxId', e.target.value.toUpperCase())}
                  className="col-span-3"
                  placeholder="B12345678"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">{t.suppliers.category}</Label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(v) => handleFormChange('category', v || undefined)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t.suppliers.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.suppliers.addressInfo}</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">{t.suppliers.address}</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  className="col-span-3"
                  placeholder={t.suppliers.addressPlaceholder}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zipCode" className="text-right">{t.suppliers.zipCode}</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleFormChange('zipCode', e.target.value)}
                  className="col-span-3"
                  placeholder="08001"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.suppliers.contactInfo}</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">{t.suppliers.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className="col-span-3"
                  placeholder="facturacio@empresa.com"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">{t.suppliers.phone}</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  className="col-span-3"
                  placeholder="934 000 000"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.suppliers.paymentData}</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="iban" className="text-right">{t.suppliers.iban}</Label>
                <Input
                  id="iban"
                  value={formData.iban || ''}
                  onChange={(e) => handleFormChange('iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
                  className="col-span-3"
                  placeholder="ES00 0000 0000 0000 0000 0000"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentTerms" className="text-right">{t.suppliers.paymentTerms}</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms || ''}
                  onChange={(e) => handleFormChange('paymentTerms', e.target.value)}
                  className="col-span-3"
                  placeholder={t.suppliers.paymentTermsPlaceholder}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.suppliers.notes}</h4>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">{t.suppliers.notes}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  className="col-span-3"
                  placeholder={t.suppliers.notesPlaceholder}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
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
