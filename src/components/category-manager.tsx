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
import { PlusCircle, Edit, Trash2, Download, Upload } from 'lucide-react';
import type { Category } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, getCountFromServer } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { CategoryImporter } from './category-importer';
import { exportCategoriesToExcel } from '@/lib/categories-export';

function CategoryTable({
  categories,
  onEdit,
  onDelete,
  canEdit
}: {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  canEdit: boolean;
}) {
  const { t } = useTranslations();
  const categoryTranslations = t.categories as Record<string, string>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.settings.name}</TableHead>
            {canEdit && <TableHead className="text-right">{t.settings.actions}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{categoryTranslations[category.name] || category.name}</TableCell>
              {canEdit && (
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
              )}
            </TableRow>
          ))}
          {categories.length === 0 && (
             <TableRow>
                <TableCell colSpan={canEdit ? 2 : 1} className="text-center text-muted-foreground">
                    {t.settings.noCategories}
                </TableCell>
             </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function CategoryManager() {
  const { firestore } = useFirebase();
  const { organizationId, userRole } = useCurrentOrganization();
  const { t } = useTranslations();
  const categoryTranslations = t.categories as Record<string, string>;
  
  const canEdit = userRole === 'admin' || userRole === 'user';

  const categoriesCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const { data: categories } = useCollection<Category>(categoriesCollection);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isImporterOpen, setIsImporterOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = React.useState<Category | null>(null);
  const [affectedTransactionsCount, setAffectedTransactionsCount] = React.useState<number | null>(null);
  const [isCountingTransactions, setIsCountingTransactions] = React.useState(false);
  const [formData, setFormData] = React.useState<{ name: string; type: Category['type'] }>({ name: '', type: 'expense' });
  const { toast } = useToast();

  const incomeCategories = React.useMemo(() => categories?.filter((c) => c.type === 'income') || [], [categories]);
  const expenseCategories = React.useMemo(() => categories?.filter((c) => c.type === 'expense') || [], [categories]);

  const handleEdit = (category: Category) => {
    if (!canEdit) return;
    setEditingCategory(category);
    setFormData({ name: category.name, type: category.type });
    setIsDialogOpen(true);
  };
  
  const handleDeleteRequest = async (category: Category) => {
    if (!canEdit || !organizationId) return;
    setCategoryToDelete(category);
    setAffectedTransactionsCount(null);
    setIsCountingTransactions(true);
    setIsAlertOpen(true);

    try {
      // Comptar moviments que tenen aquesta categoria
      const transactionsRef = collection(firestore, 'organizations', organizationId, 'transactions');
      const q = query(transactionsRef, where('category', '==', category.name));
      const snapshot = await getCountFromServer(q);
      setAffectedTransactionsCount(snapshot.data().count);
    } catch (error) {
      console.error('Error comptant transaccions:', error);
      setAffectedTransactionsCount(0);
    } finally {
      setIsCountingTransactions(false);
    }
  }

  const handleDeleteConfirm = () => {
    if (!canEdit) return;
    if (categoryToDelete && categoriesCollection) {
      deleteDocumentNonBlocking(doc(categoriesCollection, categoryToDelete.id));
      const categoryName = categoryTranslations[categoryToDelete.name] || categoryToDelete.name;
      toast({
        title: t.settings.categoryDeletedToast,
        description: t.settings.categoryDeletedToastDescription(categoryName),
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
    if (!canEdit) return;
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
    if (!canEdit) return;

    if (!formData.name) {
       toast({ variant: 'destructive', title: t.common.error, description: t.settings.errorNameEmpty });
       return;
    }

    if (!categoriesCollection) {
      toast({ variant: 'destructive', title: t.common.error, description: t.common.dbConnectionError });
      return;
    }
    
    // For new categories, we treat the name as a key if it doesn't have spaces
    const nameKey = editingCategory ? formData.name : formData.name.trim().replace(/\s+/g, '-').toLowerCase();
    const finalData = { ...formData, name: nameKey };


    if (editingCategory) {
      // Update
      setDocumentNonBlocking(doc(categoriesCollection, editingCategory.id), finalData, { merge: true });
      toast({ title: t.settings.categoryUpdatedToast, description: t.settings.categoryUpdatedToastDescription(formData.name) });
    } else {
      // Create
      addDocumentNonBlocking(categoriesCollection, finalData);
      toast({ title: t.settings.categoryCreatedToast, description: t.settings.categoryCreatedToastDescription(formData.name) });
    }
    handleOpenChange(false);
  }

  const dialogTitle = editingCategory ? t.settings.editTitle : t.settings.addTitle;
  const dialogDescription = editingCategory ? t.settings.editDescription : t.settings.addDescription;
  const dialogFormDataName = editingCategory ? (categoryTranslations[formData.name] || formData.name) : formData.name;

  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t.settings.manageCategories}</CardTitle>
            <CardDescription>{t.settings.manageCategoriesDescription}</CardDescription>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              {/* Exportar categories */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => categories && categories.length > 0 && exportCategoriesToExcel(categories, categoryTranslations)}
                disabled={!categories || categories.length === 0}
                title="Exportar a Excel"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Importar categories */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsImporterOpen(true)}
                title="Importar categories"
              >
                <Upload className="h-4 w-4" />
              </Button>

              {/* Afegir categoria */}
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t.settings.addCategory}
                </Button>
              </DialogTrigger>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="expenses">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expenses">{t.settings.expenses}</TabsTrigger>
              <TabsTrigger value="income">{t.settings.income}</TabsTrigger>
            </TabsList>
            <TabsContent value="expenses" className="mt-4">
              <CategoryTable
                categories={expenseCategories}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                canEdit={canEdit}
              />
            </TabsContent>
            <TabsContent value="income" className="mt-4">
              <CategoryTable
                categories={incomeCategories}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                canEdit={canEdit}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {canEdit && (
        <DialogContent>
            <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                {t.settings.name}
                </Label>
                <Input id="name" value={dialogFormDataName} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                {t.settings.type}
                </Label>
                <Select value={formData.type} onValueChange={handleSelectChange}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t.common.noSelection} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="expense">{t.settings.expense}</SelectItem>
                    <SelectItem value="income">{t.settings.income}</SelectItem>
                </SelectContent>
                </Select>
            </div>
            </div>
            <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">{t.common.cancel}</Button>
            </DialogClose>
            <Button onClick={handleSave}>{t.settings.save}</Button>
            </DialogFooter>
        </DialogContent>
      )}
    </Dialog>

    {canEdit && (
        <AlertDialog open={isAlertOpen} onOpenChange={(open) => {
          setIsAlertOpen(open);
          if (!open) {
            setCategoryToDelete(null);
            setAffectedTransactionsCount(null);
          }
        }}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t.settings.confirmDeleteTitle}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p>{t.settings.confirmDeleteDescription}</p>
                    {isCountingTransactions ? (
                      <p className="text-sm text-muted-foreground">Comptant moviments afectats...</p>
                    ) : affectedTransactionsCount !== null && affectedTransactionsCount > 0 ? (
                      <p className="text-sm font-medium text-amber-600">
                        {affectedTransactionsCount} {affectedTransactionsCount === 1 ? 'moviment quedarà' : 'moviments quedaran'} sense categoria.
                      </p>
                    ) : null}
                  </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>{t.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} disabled={isCountingTransactions}>
                {t.common.delete}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}

    {/* Importador de categories */}
    <CategoryImporter
      open={isImporterOpen}
      onOpenChange={setIsImporterOpen}
    />
    </>
  );
}
