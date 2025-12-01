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
import { PlusCircle, Edit, Trash2, Building2 } from 'lucide-react';
import type { Supplier, SupplierCategory } from '@/lib/data';
import { SUPPLIER_CATEGORIES } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useCurrentOrganization } from '@/hooks/organization-provider';

// Traduccions de categories
const CATEGORY_LABELS: Record<SupplierCategory, string> = {
  services: 'Serveis professionals',
  utilities: 'Subministraments',
  materials: 'Materials i equipament',
  rent: 'Lloguer',
  insurance: 'Assegurances',
  banking: 'Serveis bancaris',
  communications: 'Telecomunicacions',
  transport: 'Transport',
  maintenance: 'Manteniment',
  other: 'Altres',
};

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

  // Query només per proveïdors (type === 'supplier')
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
        title: 'Proveïdor eliminat',
        description: `S'ha eliminat "${supplierToDelete.name}" correctament.`,
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
        title: 'Error', 
        description: 'El nom i el CIF són obligatoris.' 
      });
      return;
    }

    if (!contactsCollection) {
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut connectar amb la base de dades.' });
      return;
    }

    const now = new Date().toISOString();
    const dataToSave = {
      ...formData,
      // Netejar camps buits
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
      // Actualitzar
      setDocumentNonBlocking(doc(contactsCollection, editingSupplier.id), dataToSave, { merge: true });
      toast({ title: 'Proveïdor actualitzat', description: `S'ha actualitzat "${formData.name}" correctament.` });
    } else {
      // Crear
      addDocumentNonBlocking(contactsCollection, { ...dataToSave, createdAt: now });
      toast({ title: 'Proveïdor creat', description: `S'ha creat "${formData.name}" correctament.` });
    }
    handleOpenChange(false);
  };

  const dialogTitle = editingSupplier ? 'Editar Proveïdor' : 'Nou Proveïdor';
  const dialogDescription = editingSupplier 
    ? 'Modifica les dades del proveïdor.' 
    : 'Afegeix un nou proveïdor o empresa col·laboradora.';

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                Gestió de Proveïdors
              </CardTitle>
              <CardDescription>
                Administra els proveïdors i empreses col·laboradores
              </CardDescription>
            </div>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Afegir Proveïdor
              </Button>
            </DialogTrigger>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>CIF</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Contacte</TableHead>
                    <TableHead className="text-right">Accions</TableHead>
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
                            {CATEGORY_LABELS[supplier.category as SupplierCategory] || supplier.category}
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
                        No hi ha proveïdors registrats. Afegeix el primer!
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
            {/* Secció: Dades bàsiques */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Dades bàsiques</h4>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="col-span-3"
                  placeholder="Nom de l'empresa"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taxId" className="text-right">CIF *</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => handleFormChange('taxId', e.target.value.toUpperCase())}
                  className="col-span-3"
                  placeholder="B12345678"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Categoria</Label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(v) => handleFormChange('category', v || undefined)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona una categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Secció: Adreça */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Adreça</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Adreça</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  className="col-span-3"
                  placeholder="Carrer, número, pis..."
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zipCode" className="text-right">Codi Postal</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleFormChange('zipCode', e.target.value)}
                  className="col-span-3"
                  placeholder="08001"
                />
              </div>
            </div>

            {/* Secció: Contacte */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Contacte</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
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
                <Label htmlFor="phone" className="text-right">Telèfon</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  className="col-span-3"
                  placeholder="934 000 000"
                />
              </div>
            </div>

            {/* Secció: Dades bancàries i pagament */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Dades de pagament</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="iban" className="text-right">IBAN</Label>
                <Input
                  id="iban"
                  value={formData.iban || ''}
                  onChange={(e) => handleFormChange('iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
                  className="col-span-3"
                  placeholder="ES00 0000 0000 0000 0000 0000"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentTerms" className="text-right">Condicions</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms || ''}
                  onChange={(e) => handleFormChange('paymentTerms', e.target.value)}
                  className="col-span-3"
                  placeholder="Ex: 30 dies, al comptat..."
                />
              </div>
            </div>

            {/* Secció: Notes */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  className="col-span-3"
                  placeholder="Observacions internes..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel·lar</Button>
            </DialogClose>
            <Button onClick={handleSave}>
              {editingSupplier ? 'Guardar canvis' : 'Crear proveïdor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proveïdor?</AlertDialogTitle>
            <AlertDialogDescription>
              Estàs segur que vols eliminar "{supplierToDelete?.name}"? 
              Aquesta acció no es pot desfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
