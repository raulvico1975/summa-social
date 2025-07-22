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
import type { Category } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

function CategoryTable({
  categories,
  onEdit,
  onDelete,
}: {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onEdit(category)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => onDelete(category)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {categories.length === 0 && (
             <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No hay categorías.
                </TableCell>
             </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = React.useState<Category[]>(initialCategories);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = React.useState<Category | null>(null);
  const [formData, setFormData] = React.useState<{ name: string; type: Category['type'] }>({ name: '', type: 'expense' });
  const { toast } = useToast();

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, type: category.type });
    setIsDialogOpen(true);
  };
  
  const handleDeleteRequest = (category: Category) => {
    setCategoryToDelete(category);
    setIsAlertOpen(true);
  }

  const handleDeleteConfirm = () => {
    if (categoryToDelete) {
      setCategories(categories.filter((c) => c.id !== categoryToDelete.id));
      toast({
        title: 'Categoría Eliminada',
        description: `La categoría "${categoryToDelete.name}" ha sido eliminada.`,
      });
    }
    setIsAlertOpen(false);
    setCategoryToDelete(null);
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingCategory(null);
      setFormData({ name: '', type: 'expense' });
    }
  }
  
  const handleAddNew = () => {
    setEditingCategory(null);
    setFormData({ name: '', type: 'expense' });
    setIsDialogOpen(true);
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  }

  const handleSelectChange = (value: Category['type']) => {
    setFormData({ ...formData, type: value });
  }
  
  const handleSave = () => {
    if (!formData.name) {
       toast({ variant: 'destructive', title: 'Error', description: 'El nombre de la categoría no puede estar vacío.' });
       return;
    }

    if (editingCategory) {
      // Update
      setCategories(categories.map((c) => c.id === editingCategory.id ? { ...c, ...formData } : c));
      toast({ title: 'Categoría Actualizada', description: `La categoría "${formData.name}" ha sido actualizada.` });
    } else {
      // Create
      const newCategory: Category = {
        id: `cat_${new Date().getTime()}`,
        ...formData
      };
      setCategories([...categories, newCategory]);
      toast({ title: 'Categoría Creada', description: `La categoría "${formData.name}" ha sido creada.` });
    }
    handleOpenChange(false);
  }

  const dialogTitle = editingCategory ? 'Editar Categoría' : 'Añadir Nueva Categoría';
  const dialogDescription = editingCategory ? 'Edita los detalles de tu categoría.' : 'Crea una nueva categoría para organizar tus transacciones.';

  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestionar Categorías</CardTitle>
            <CardDescription>Añade, edita o elimina tus categorías financieras.</CardDescription>
          </div>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Categoría
            </Button>
          </DialogTrigger>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="expenses">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expenses">Gastos</TabsTrigger>
              <TabsTrigger value="income">Ingresos</TabsTrigger>
            </TabsList>
            <TabsContent value="expenses" className="mt-4">
              <CategoryTable
                categories={expenseCategories}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            </TabsContent>
            <TabsContent value="income" className="mt-4">
              <CategoryTable
                categories={incomeCategories}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            </TabsContent>
          </Tabs>
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
            <Label htmlFor="type" className="text-right">
              Tipo
            </Label>
            <Select value={formData.type} onValueChange={handleSelectChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Gasto</SelectItem>
                <SelectItem value="income">Ingreso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave}>Guardar Categoría</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la categoría
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
