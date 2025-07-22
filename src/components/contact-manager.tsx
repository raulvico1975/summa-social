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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { Contact } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const CONTACTS_STORAGE_KEY = 'summa-social-contacts';

const contactTypeMap: Record<Contact['type'], string> = {
    donor: 'Donante',
    supplier: 'Proveedor',
    volunteer: 'Voluntario'
};

export function ContactManager({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = React.useState<Contact[]>(initialContacts);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = React.useState<Contact | null>(null);
  const [formData, setFormData] = React.useState<Omit<Contact, 'id'>>({ name: '', taxId: '', zipCode: '', type: 'supplier' });
  const { toast } = useToast();
  
  React.useEffect(() => {
    try {
      const storedContacts = localStorage.getItem(CONTACTS_STORAGE_KEY);
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }
    } catch (error) {
      console.error("Failed to parse contacts from localStorage", error);
    }
  }, []);

  const updateContacts = (newContacts: Contact[]) => {
    setContacts(newContacts);
    try {
      localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(newContacts));
    } catch (error) {
      console.error("Failed to save contacts to localStorage", error);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({ name: contact.name, taxId: contact.taxId, zipCode: contact.zipCode, type: contact.type });
    setIsDialogOpen(true);
  };
  
  const handleDeleteRequest = (contact: Contact) => {
    setContactToDelete(contact);
    setIsAlertOpen(true);
  }

  const handleDeleteConfirm = () => {
    if (contactToDelete) {
      updateContacts(contacts.filter((c) => c.id !== contactToDelete.id));
      toast({
        title: 'Contacto Eliminado',
        description: `El contacto "${contactToDelete.name}" ha sido eliminado.`,
      });
    }
    setIsAlertOpen(false);
    setContactToDelete(null);
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingContact(null);
      setFormData({ name: '', taxId: '', zipCode: '', type: 'supplier' });
    }
  }
  
  const handleAddNew = () => {
    setEditingContact(null);
    setFormData({ name: '', taxId: '', zipCode: '', type: 'supplier' });
    setIsDialogOpen(true);
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  }

  const handleSelectChange = (value: Contact['type']) => {
    setFormData({ ...formData, type: value });
  }
  
  const handleSave = () => {
    if (!formData.name || !formData.taxId || !formData.zipCode) {
       toast({ variant: 'destructive', title: 'Error', description: 'Todos los campos son obligatorios.' });
       return;
    }

    if (editingContact) {
      // Update
      updateContacts(contacts.map((c) => c.id === editingContact.id ? { ...c, ...formData } : c));
      toast({ title: 'Contacto Actualizado', description: `El contacto "${formData.name}" ha sido actualizado.` });
    } else {
      // Create
      const newContact: Contact = {
        id: `cont_${new Date().getTime()}`,
        ...formData
      };
      updateContacts([...contacts, newContact]);
      toast({ title: 'Contacto Creado', description: `El contacto "${formData.name}" ha sido creado.` });
    }
    handleOpenChange(false);
  }

  const dialogTitle = editingContact ? 'Editar Contacto' : 'Añadir Nuevo Contacto';
  const dialogDescription = editingContact ? 'Edita los detalles de tu contacto.' : 'Crea un nuevo contacto para tu organización.';

  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestionar Contactos</CardTitle>
            <CardDescription>Añade, edita o elimina los contactos de tu organización.</CardDescription>
          </div>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Contacto
            </Button>
          </DialogTrigger>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>DNI/CIF</TableHead>
                    <TableHead>Código Postal</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.taxId}</TableCell>
                    <TableCell>{contact.zipCode}</TableCell>
                    <TableCell>
                        <Badge variant="secondary">{contactTypeMap[contact.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(contact)}>
                        <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteRequest(contact)}
                        >
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                {contacts.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No hay contactos.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        </CardContent>
      </Card>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input id="name" value={formData.name} onChange={handleFormChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="taxId" className="text-right">
              DNI/CIF
            </Label>
            <Input id="taxId" value={formData.taxId} onChange={handleFormChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="zipCode" className="text-right">
              C. Postal
            </Label>
            <Input id="zipCode" value={formData.zipCode} onChange={handleFormChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Tipo
            </Label>
            <Select value={formData.type} onValueChange={handleSelectChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="donor">Donante</SelectItem>
                <SelectItem value="supplier">Proveedor</SelectItem>
                <SelectItem value="volunteer">Voluntario</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave}>Guardar Contacto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el contacto
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setContactToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
