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
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, UserCog } from 'lucide-react';
import type { Employee, Category } from '@/lib/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, archiveDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { findExistingContact } from '@/lib/contact-matching';
import { collection, doc, query, where } from 'firebase/firestore';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';
import { normalizeContact, formatIBANDisplay } from '@/lib/normalize';

type EmployeeFormData = Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>;

const emptyFormData: EmployeeFormData = {
  type: 'employee',
  name: '',
  taxId: '',
  zipCode: '',
  iban: '',
  startDate: '',
  email: '',
  phone: '',
  notes: '',
  defaultCategoryId: undefined,
};

export function EmployeeManager() {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();

  const contactsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );

  const employeesQuery = useMemoFirebase(
    () => contactsCollection ? query(contactsCollection, where('type', '==', 'employee')) : null,
    [contactsCollection]
  );

  const { data: employeesRaw } = useCollection<Employee & { archivedAt?: string }>(employeesQuery);
  // Filtrar empleats arxivats (soft-deleted)
  const employees = React.useMemo(
    () => employeesRaw?.filter(e => !e.archivedAt),
    [employeesRaw]
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
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = React.useState<Employee | null>(null);
  const [formData, setFormData] = React.useState<EmployeeFormData>(emptyFormData);

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      type: 'employee',
      name: employee.name,
      taxId: employee.taxId || '',
      zipCode: employee.zipCode || '',
      iban: employee.iban || '',
      startDate: employee.startDate || '',
      email: employee.email || '',
      phone: employee.phone || '',
      notes: employee.notes || '',
      defaultCategoryId: employee.defaultCategoryId,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (employeeToDelete && contactsCollection) {
      // Soft-delete: arxiva en lloc d'eliminar per preservar integritat referencial
      archiveDocumentNonBlocking(doc(contactsCollection, employeeToDelete.id));
      toast({
        title: t.employees.employeeDeleted,
        description: t.employees.employeeDeletedDescription(employeeToDelete.name),
      });
    }
    setIsAlertOpen(false);
    setEmployeeToDelete(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingEmployee(null);
      setFormData(emptyFormData);
    }
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setFormData(emptyFormData);
    setIsDialogOpen(true);
  };

  const handleFormChange = (field: keyof EmployeeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.employees.errorNameRequired
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

    const now = new Date().toISOString();
    const dataToSave = {
      type: normalized.type,
      name: normalized.name,
      taxId: normalized.taxId || null,
      zipCode: normalized.zipCode || null,
      iban: normalized.iban || null,
      startDate: normalized.startDate || null,
      email: normalized.email || null,
      phone: normalized.phone || null,
      notes: normalized.notes || null,
      defaultCategoryId: formData.defaultCategoryId || null,
      updatedAt: now,
    };

    if (editingEmployee) {
      setDocumentNonBlocking(doc(contactsCollection, editingEmployee.id), dataToSave, { merge: true });
      toast({
        title: t.employees.employeeUpdated,
        description: t.employees.employeeUpdatedDescription(normalized.name)
      });
    } else {
      // Validar si ja existeix un contacte amb el mateix NIF/IBAN/email
      const existingMatch = findExistingContact(
        employees as any[] || [],
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

      addDocumentNonBlocking(contactsCollection, { ...dataToSave, roles: { employee: true }, createdAt: now });
      toast({
        title: t.employees.employeeCreated,
        description: t.employees.employeeCreatedDescription(normalized.name)
      });
    }
    handleOpenChange(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('ca-ES');
    } catch {
      return dateString;
    }
  };

  const dialogTitle = editingEmployee
    ? t.employees.editTitle
    : t.employees.addTitle;
  const dialogDescription = editingEmployee
    ? t.employees.editDescription
    : t.employees.addDescription;

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-purple-500" />
                {t.employees.title}
              </CardTitle>
              <CardDescription>
                {t.employees.description}
              </CardDescription>
            </div>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t.employees.add}
              </Button>
            </DialogTrigger>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.employees.name}</TableHead>
                    <TableHead>{t.employees.taxId}</TableHead>
                    <TableHead>{t.employees.startDate}</TableHead>
                    <TableHead>{t.employees.contact}</TableHead>
                    <TableHead className="text-right">{t.employees.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees && employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-purple-500" />
                          {employee.name}
                        </div>
                      </TableCell>
                      <TableCell>{employee.taxId || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{formatDate(employee.startDate)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {employee.email && <div>{employee.email}</div>}
                          {employee.phone && <div className="text-muted-foreground">{employee.phone}</div>}
                          {!employee.email && !employee.phone && <span className="text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteRequest(employee)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!employees || employees.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        {t.employees.noData}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header fix */}
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          {/* Cos amb scroll si cal */}
          <div className="flex-1 min-h-0 overflow-y-auto py-4">
            {/* ═══════════════════════════════════════════════════════════════════
                BLOC 1: Dades bàsiques i contacte (2 columnes)
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">{t.employees.basicData}</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna esquerra: Identificació */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t.employees.name} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="Maria García López"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="taxId">{t.employees.taxId}</Label>
                      <Input
                        id="taxId"
                        value={formData.taxId}
                        onChange={(e) => handleFormChange('taxId', e.target.value.toUpperCase())}
                        placeholder="12345678A"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="startDate">{t.employees.startDate}</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate || ''}
                        onChange={(e) => handleFormChange('startDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Columna dreta: Contacte */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t.employees.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      placeholder="maria@exemple.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t.employees.phone}</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      placeholder="600 000 000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                BLOC 2: Dades de pagament (2 columnes)
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="space-y-4 pt-4 mt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.employees.paymentData}</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="iban">{t.employees.iban}</Label>
                  <Input
                    id="iban"
                    value={formData.iban || ''}
                    onChange={(e) => handleFormChange('iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
                    placeholder="ES00 0000 0000 0000 0000 0000"
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
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                BLOC 3: Notes (tota amplada)
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="space-y-3 pt-4 mt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.employees.notes}</h4>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder="Observacions sobre el treballador..."
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
              {editingEmployee ? t.employees.save : t.employees.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.employees.confirmDeleteTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.employees.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}