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
import { PlusCircle, Edit, Trash2, User, Building2, RefreshCw, Heart } from 'lucide-react';
import type { Donor } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useCurrentOrganization } from '@/hooks/organization-provider';

const formatCurrency = (amount?: number) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('ca-ES');
  } catch {
    return dateString;
  }
};

type DonorFormData = Omit<Donor, 'id' | 'createdAt' | 'updatedAt'>;

const emptyFormData: DonorFormData = {
  type: 'donor',
  name: '',
  taxId: '',
  zipCode: '',
  donorType: 'individual',
  membershipType: 'one-time',
  monthlyAmount: undefined,
  memberSince: undefined,
  iban: '',
  email: '',
  phone: '',
  notes: '',
};

export function DonorManager() {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();

  // Query només per donants (type === 'donor')
  const contactsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );

  const donorsQuery = useMemoFirebase(
    () => contactsCollection ? query(contactsCollection, where('type', '==', 'donor')) : null,
    [contactsCollection]
  );

  const { data: donors } = useCollection<Donor>(donorsQuery);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [editingDonor, setEditingDonor] = React.useState<Donor | null>(null);
  const [donorToDelete, setDonorToDelete] = React.useState<Donor | null>(null);
  const [formData, setFormData] = React.useState<DonorFormData>(emptyFormData);

  const handleEdit = (donor: Donor) => {
    setEditingDonor(donor);
    setFormData({
      type: 'donor',
      name: donor.name,
      taxId: donor.taxId,
      zipCode: donor.zipCode,
      donorType: donor.donorType,
      membershipType: donor.membershipType,
      monthlyAmount: donor.monthlyAmount,
      memberSince: donor.memberSince,
      iban: donor.iban || '',
      email: donor.email || '',
      phone: donor.phone || '',
      notes: donor.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (donor: Donor) => {
    setDonorToDelete(donor);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (donorToDelete && contactsCollection) {
      deleteDocumentNonBlocking(doc(contactsCollection, donorToDelete.id));
      toast({
        title: 'Donant eliminat',
        description: `S'ha eliminat "${donorToDelete.name}" correctament.`,
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
    if (!formData.name || !formData.taxId || !formData.zipCode) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'El nom, DNI/CIF i codi postal són obligatoris.' 
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
      monthlyAmount: formData.monthlyAmount || null,
      memberSince: formData.memberSince || null,
      iban: formData.iban || null,
      email: formData.email || null,
      phone: formData.phone || null,
      notes: formData.notes || null,
      updatedAt: now,
    };

    if (editingDonor) {
      // Actualitzar
      setDocumentNonBlocking(doc(contactsCollection, editingDonor.id), dataToSave, { merge: true });
      toast({ title: 'Donant actualitzat', description: `S'ha actualitzat "${formData.name}" correctament.` });
    } else {
      // Crear
      addDocumentNonBlocking(contactsCollection, { ...dataToSave, createdAt: now });
      toast({ title: 'Donant creat', description: `S'ha creat "${formData.name}" correctament.` });
    }
    handleOpenChange(false);
  };

  const dialogTitle = editingDonor ? 'Editar Donant' : 'Nou Donant';
  const dialogDescription = editingDonor 
    ? 'Modifica les dades del donant.' 
    : 'Afegeix un nou donant o soci a l\'organització.';

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Gestió de Donants
              </CardTitle>
              <CardDescription>
                Administra els donants i socis de l'organització
              </CardDescription>
            </div>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Afegir Donant
              </Button>
            </DialogTrigger>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>DNI/CIF</TableHead>
                    <TableHead>Tipus</TableHead>
                    <TableHead>Modalitat</TableHead>
                    <TableHead>Import</TableHead>
                    <TableHead className="text-right">Accions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donors && donors.map((donor) => (
                    <TableRow key={donor.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {donor.donorType === 'individual' ? (
                            <User className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                          {donor.name}
                        </div>
                      </TableCell>
                      <TableCell>{donor.taxId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {donor.donorType === 'individual' ? 'Particular' : 'Empresa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {donor.membershipType === 'recurring' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Soci
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Puntual</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {donor.membershipType === 'recurring' 
                          ? formatCurrency(donor.monthlyAmount) + '/mes'
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(donor)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteRequest(donor)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!donors || donors.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        No hi ha donants registrats. Afegeix el primer!
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
                  placeholder="Nom complet o raó social"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taxId" className="text-right">DNI/CIF *</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => handleFormChange('taxId', e.target.value.toUpperCase())}
                  className="col-span-3"
                  placeholder="12345678A o B12345678"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zipCode" className="text-right">Codi Postal *</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleFormChange('zipCode', e.target.value)}
                  className="col-span-3"
                  placeholder="08001"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="donorType" className="text-right">Tipus</Label>
                <Select
                  value={formData.donorType}
                  onValueChange={(v) => handleFormChange('donorType', v)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Particular (Persona física)</SelectItem>
                    <SelectItem value="company">Empresa (Persona jurídica)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Secció: Tipus de donació */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Tipus de donació</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="membershipType" className="text-right">Modalitat</Label>
                <Select
                  value={formData.membershipType}
                  onValueChange={(v) => handleFormChange('membershipType', v)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">Donació puntual</SelectItem>
                    <SelectItem value="recurring">Soci/a (donació recurrent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.membershipType === 'recurring' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="monthlyAmount" className="text-right">Import mensual</Label>
                    <Input
                      id="monthlyAmount"
                      type="number"
                      step="0.01"
                      value={formData.monthlyAmount || ''}
                      onChange={(e) => handleFormChange('monthlyAmount', parseFloat(e.target.value) || undefined)}
                      className="col-span-3"
                      placeholder="10.00"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="memberSince" className="text-right">Soci des de</Label>
                    <Input
                      id="memberSince"
                      type="date"
                      value={formData.memberSince || ''}
                      onChange={(e) => handleFormChange('memberSince', e.target.value)}
                      className="col-span-3"
                    />
                  </div>

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
                </>
              )}
            </div>

            {/* Secció: Contacte */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Contacte (opcional)</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className="col-span-3"
                  placeholder="correu@exemple.com"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Telèfon</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  className="col-span-3"
                  placeholder="600 000 000"
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
              {editingDonor ? 'Guardar canvis' : 'Crear donant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar donant?</AlertDialogTitle>
            <AlertDialogDescription>
              Estàs segur que vols eliminar "{donorToDelete?.name}"? 
              Aquesta acció no es pot desfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDonorToDelete(null)}>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
