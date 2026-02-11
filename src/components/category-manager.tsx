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
// AlertDialog ja no s'utilitza - l'API arxiva directe si count==0
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Edit, Archive, Download, Upload, Tag, MoreVertical } from 'lucide-react';
import type { Category } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { ReassignModal, type ReassignItem } from './reassign-modal';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { CategoryImporter } from './category-importer';
import { exportCategoriesToExcel } from '@/lib/categories-export';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { MobileListItem } from '@/components/mobile/mobile-list-item';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MOBILE_ACTIONS_BAR, MOBILE_CTA_PRIMARY } from '@/lib/ui/mobile-actions';

function CategoryTable({
  categories,
  onEdit,
  onDelete,
  canEdit,
  isMobile
}: {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  canEdit: boolean;
  isMobile: boolean;
}) {
  const { t } = useTranslations();
  const categoryTranslations = t.categories as Record<string, string>;

  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
        {categories.map((category) => (
          <MobileListItem
            key={category.id}
            title={categoryTranslations[category.name] || category.name}
            leadingIcon={<Tag className="h-4 w-4" />}
            actions={
              canEdit && !category.systemKey ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(category)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(category)}
                      className="text-amber-600"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      {t.common?.archive ?? 'Eliminar'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : undefined
            }
          />
        ))}
        {categories.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            {t.settings.noCategories}
          </div>
        )}
      </div>
    );
  }

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
                  {!category.systemKey && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-amber-500 hover:text-amber-600"
                        onClick={() => onDelete(category)}
                        title={t.common?.archive ?? 'Eliminar'}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </>
                  )}
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
  const { firestore, user } = useFirebase();
  const { organizationId, userRole } = useCurrentOrganization();
  const { t } = useTranslations();
  const categoryTranslations = t.categories as Record<string, string>;
  const isMobile = useIsMobile();

  const canEdit = userRole === 'admin' || userRole === 'user';

  const categoriesCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const { data: categories } = useCollection<Category>(categoriesCollection);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isReassignOpen, setIsReassignOpen] = React.useState(false);
  const [isImporterOpen, setIsImporterOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [categoryToArchive, setCategoryToArchive] = React.useState<Category | null>(null);
  const [affectedTransactionsCount, setAffectedTransactionsCount] = React.useState<number | null>(null);
  const [isCountingTransactions, setIsCountingTransactions] = React.useState(false);
  const [formData, setFormData] = React.useState<{ name: string; type: Category['type'] }>({ name: '', type: 'expense' });
  const { toast } = useToast();

  // Filtrar categories actives (no arxivades)
  const activeCategories = React.useMemo(() =>
    categories?.filter((c) => !c.archivedAt) || [],
    [categories]
  );
  const incomeCategories = React.useMemo(() => activeCategories.filter((c) => c.type === 'income'), [activeCategories]);
  const expenseCategories = React.useMemo(() => activeCategories.filter((c) => c.type === 'expense'), [activeCategories]);

  const handleEdit = (category: Category) => {
    if (!canEdit) return;
    setEditingCategory(category);
    setFormData({ name: category.name, type: category.type });
    setIsDialogOpen(true);
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ARXIVAT (v1.35): Flux amb reassignació via API
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // API-FIRST: La UI crida sempre l'API per arxivar.
  // L'API decideix si té moviments (i retorna activeCount) o arxiva directe.
  // Això evita problemes de permisos amb queries Firestore client.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Reset complet de l'estat d'arxivat quan es cancel·la o tanca el modal.
   * Evita dead-lock d'estat UI.
   */
  const resetArchiveFlow = React.useCallback(() => {
    setIsReassignOpen(false);
    setCategoryToArchive(null);
    setAffectedTransactionsCount(null);
    setIsCountingTransactions(false);
  }, []);

  const handleArchiveRequest = async (category: Category) => {
    if (!canEdit || !organizationId || !user) return;
    setCategoryToArchive(category);
    setAffectedTransactionsCount(null);
    setIsCountingTransactions(true);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/categories/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orgId: organizationId,
          fromCategoryId: category.id,
          // NO enviem toCategoryId → l'API decidirà si cal reassignar
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Arxivat directe (no tenia moviments assignats)
        const categoryName = categoryTranslations[category.name] || category.name;
        toast({
          title: t.settings?.categoryArchivedToast ?? 'Categoria arxivada',
          description: t.settings?.categoryArchivedToastDescription?.(categoryName) ?? `La categoria "${categoryName}" ha estat arxivada.`,
        });
        setCategoryToArchive(null);
      } else {
        // Mapejar code de l'API → clau i18n
        const errorDescription =
          result.code === 'SYSTEM_CATEGORY_LOCKED'
            ? (t.settings?.systemCategoryLocked ?? result.error)
            : result.code === 'CATEGORY_IN_USE'
              ? (t.settings?.categoryInUse ?? result.error)
              : (t.settings?.archiveError ?? result.error ?? 'Error desconegut');
        toast({
          variant: 'destructive',
          title: t.settings?.archiveError ?? "No s'ha pogut eliminar",
          description: errorDescription,
        });
        setCategoryToArchive(null);
      }
    } catch (error) {
      console.error('Error eliminant categoria:', error);
      toast({
        variant: 'destructive',
        title: t.settings?.archiveError ?? "No s'ha pogut eliminar",
        description: error instanceof Error ? error.message : 'Error desconegut',
      });
      setCategoryToArchive(null);
    } finally {
      setIsCountingTransactions(false);
    }
  };

  const handleReassignConfirm = async (toCategoryId: string): Promise<{ success: boolean; error?: string }> => {
    if (!categoryToArchive || !user) {
      return { success: false, error: 'No hi ha categoria seleccionada' };
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/categories/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orgId: organizationId,
          fromCategoryId: categoryToArchive.id,
          toCategoryId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const categoryName = categoryTranslations[categoryToArchive.name] || categoryToArchive.name;
        toast({
          title: t.settings?.categoryArchivedToast ?? 'Categoria arxivada',
          description: `${result.reassignedCount ?? 0} moviments reassignats. "${categoryName}" arxivada.`,
        });
        setCategoryToArchive(null);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Error desconegut' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error desconegut' };
    }
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
        <CardHeader className={cn("flex flex-col gap-4", "sm:flex-row sm:items-center sm:justify-between")}>
          <div>
            <CardTitle>{t.settings.manageCategories}</CardTitle>
            <CardDescription>{t.settings.manageCategoriesDescription}</CardDescription>
          </div>
          {canEdit && (
            <div className={cn(MOBILE_ACTIONS_BAR, "sm:justify-end")}>
              {/* Afegir categoria */}
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleAddNew} className={MOBILE_CTA_PRIMARY}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t.settings.addCategory}
                </Button>
              </DialogTrigger>
              <div className="flex gap-2">
                {/* Importar categories */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsImporterOpen(true)}
                  title="Importar categories"
                >
                  <Upload className="h-4 w-4" />
                </Button>
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
              </div>
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
                onDelete={handleArchiveRequest}
                canEdit={canEdit}
                isMobile={isMobile}
              />
            </TabsContent>
            <TabsContent value="income" className="mt-4">
              <CategoryTable
                categories={incomeCategories}
                onEdit={handleEdit}
                onDelete={handleArchiveRequest}
                canEdit={canEdit}
                isMobile={isMobile}
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

    {/* Modal de reassignació (amb moviments) */}
    {/* NOTA: Ja no hi ha AlertDialog de confirmació simple.
        L'API arxiva directe si count==0, o retorna HAS_ACTIVE_TRANSACTIONS si count>0. */}
    {/* IMPORTANT: NO condicionar a categoryToArchive per evitar desmuntatge prematur
        que causa dead-lock d'estat. El modal sempre existeix però amb open={false}. */}
    {canEdit && (
      <ReassignModal
        open={isReassignOpen && categoryToArchive !== null}
        onOpenChange={(open) => {
          if (!open) {
            resetArchiveFlow();
          } else {
            setIsReassignOpen(true);
          }
        }}
        type="category"
        sourceItem={categoryToArchive ? {
          id: categoryToArchive.id,
          name: categoryTranslations[categoryToArchive.name] || categoryToArchive.name,
        } : { id: '', name: '' }}
        targetItems={categoryToArchive ? activeCategories
          .filter(c => c.id !== categoryToArchive.id && c.type === categoryToArchive.type)
          .map(c => ({
            id: c.id,
            name: categoryTranslations[c.name] || c.name,
          })) : []
        }
        affectedCount={affectedTransactionsCount || 0}
        onConfirm={handleReassignConfirm}
      />
    )}

    {/* Importador de categories */}
    <CategoryImporter
      open={isImporterOpen}
      onOpenChange={setIsImporterOpen}
    />
    </>
  );
}
