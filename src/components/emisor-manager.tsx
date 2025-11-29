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
import type { Emisor } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';


const emisorTypeMap: Record<Emisor['type'], string> = {
    donor: 'Donant',
    supplier: 'Proveïdor',
    volunteer: 'Voluntari'
};

export function EmisorManager() {
  const { firestore, user } = useFirebase();
  const emissorsCollection = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'emissors') : null,
    [firestore, user]
  );
  const { data: emissors } = useCollection<Emisor>(emissorsCollection);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [editingEmisor, setEditingEmisor] = React.useState<Emisor | null>(null);
  const [emisorToDelete, setEmisorToDelete] = React.useState<Emisor | null>(null);
  const [formData, setFormData] = React.useState<Omit<Emisor, 'id'>>({ name: '', taxId: '', zipCode: '', type: 'supplier' });
  const { toast } = useToast();
  
  const handleEdit = (emisor: Emisor) => {
    setEditingEmisor(emisor);
    setFormData({ name: emisor.name, taxId: emisor.taxId, zipCode: emisor.zipCode, type: emisor.type });
    setIsDialogOpen(true);
  };
  
  const handleDeleteRequest = (emisor: Emisor) => {
    setEmisorToDelete(emisor);
    setIsAlertOpen(true);
  }

  const handleDeleteConfirm = () => {
    if (emisorToDelete && emissorsCollection) {
      deleteDocumentNonBlocking(doc(emissorsCollection, emisorToDelete.id));
      toast({
        title: 'Emissor Eliminat',
        description: `L'emissor "${emisorToDelete.name}" ha estat eliminat.`,
      });
    }
    setIsAlertOpen(false);
    setEmisorToDelete(null);
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingEmisor(null);
      setFormData({ name: '', taxId: '', zipCode: '', type: 'supplier' });
    }
  }
  
  const handleAddNew = () => {
    setEditingEmisor(null);
    setFormData({ name: '', taxId: '', zipCode: '', type: 'supplier' });
    setIsDialogOpen(true);
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  }

  const handleSelectChange = (value: Emisor['type']) => {
    setFormData({ ...formData, type: value });
  }
  
  const handleSave = () => {
    if (!formData.name || !formData.taxId || !formData.zipCode) {
       toast({ variant: 'destructive', title: 'Error', description: 'Tots els camps són obligatoris.' });
       return;
    }

    if (!emissorsCollection) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido conectar a la base de datos.' });
      return;
    }

    if (editingEmisor) {
      // Update
      setDocumentNonBlocking(doc(emissorsCollection, editingEmisor.id), formData, { merge: true });
      toast({ title: 'Emissor Actualitzat', description: `L'emissor "${formData.name}" ha estat actualitzat.` });
    } else {
      // Create
      addDocumentNonBlocking(emissorsCollection, formData);
      toast({ title: 'Emissor Creat', description: `L'emissor "${formData.name}" ha estat creat.` });
    }
    handleOpenChange(false);
  }

  const dialogTitle = editingEmisor ? 'Editar Emissor' : 'Añadir Nuevo Emissor';
  const dialogDescription = editingEmisor ? 'Edita los detalles de tu emissor.' : 'Crea un nuevo emissor para tu organización.';

  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestionar Emissors</CardTitle>
            <CardDescription>Añade, edita o elimina los emissors de tu organización.</CardDescription>
          </div>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Emissor
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
                {emissors && emissors.map((emisor) => (
                    <TableRow key={emisor.id}>
                    <TableCell className="font-medium">{emisor.name}</TableCell>
                    <TableCell>{emisor.taxId}</TableCell>
                    <TableCell>{emisor.zipCode}</TableCell>
                    <TableCell>
                        <Badge variant="secondary">{emisorTypeMap[emisor.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(emisor)}>
                        <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteRequest(emisor)}
                        >
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                {(!emissors || emissors.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No hay emissors.
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
          <Button onClick={handleSave}>Guardar Emissor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el emissor
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmisorToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
