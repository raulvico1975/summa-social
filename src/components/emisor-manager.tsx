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
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useIsMobile } from '@/hooks/use-is-mobile';


export function EmisorManager() {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();
  const isMobile = useIsMobile();

  // ═══════════════════════════════════════════════════════════════════════════
  // CANVI: Ara la col·lecció apunta a organizations/{orgId}/emissors
  // ═══════════════════════════════════════════════════════════════════════════
  const emissorsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'emissors') : null,
    [firestore, organizationId]
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
        title: t.emissors.emissorDeleted,
        description: t.emissors.emissorDeletedDescription(emisorToDelete.name),
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
       toast({ variant: 'destructive', title: t.common.error, description: t.emissors.errorAllFields });
       return;
    }

    if (!emissorsCollection) {
      toast({ variant: 'destructive', title: t.common.error, description: t.common.dbConnectionError });
      return;
    }

    if (editingEmisor) {
      // Update
      setDocumentNonBlocking(doc(emissorsCollection, editingEmisor.id), formData, { merge: true });
      toast({ title: t.emissors.emissorUpdated, description: t.emissors.emissorUpdatedDescription(formData.name) });
    } else {
      // Create
      addDocumentNonBlocking(emissorsCollection, formData);
      toast({ title: t.emissors.emissorCreated, description: t.emissors.emissorCreatedDescription(formData.name) });
    }
    handleOpenChange(false);
  }

  const dialogTitle = editingEmisor ? t.emissors.edit : t.emissors.addTitle;
  const dialogDescription = editingEmisor ? t.emissors.editDescription : t.emissors.addDescription;
  
  const emisorTypeMap: Record<Emisor['type'], string> = t.emissors.types;

  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t.emissors.manage}</CardTitle>
            <CardDescription>{t.emissors.manageDescription}</CardDescription>
          </div>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.emissors.add}
            </Button>
          </DialogTrigger>
        </CardHeader>
        <CardContent>
            {/* ═══════════════════════════════════════════════════════════════════════
                DESKTOP: Taula clàssica
                ═══════════════════════════════════════════════════════════════════════ */}
            {!isMobile && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.emissors.name}</TableHead>
                      <TableHead>{t.emissors.taxId}</TableHead>
                      <TableHead>{t.emissors.zipCode}</TableHead>
                      <TableHead>{t.emissors.type}</TableHead>
                      <TableHead className="text-right">{t.emissors.actions}</TableHead>
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
                          {t.emissors.noEmissors}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
                MÒBIL: Stacked rows (sense scroll horitzontal)
                ═══════════════════════════════════════════════════════════════════════ */}
            {isMobile && (
              <div className="space-y-2">
                {emissors && emissors.map((emisor) => (
                  <div key={emisor.id} className="border rounded-lg p-3">
                    {/* Fila 1: Nom + Accions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{emisor.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{emisor.taxId}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(emisor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleDeleteRequest(emisor)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Fila 2: CP + Tipus */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {emisor.zipCode && (
                        <span className="text-xs text-muted-foreground">{emisor.zipCode}</span>
                      )}
                      <Badge variant="secondary" className="text-xs">{emisorTypeMap[emisor.type]}</Badge>
                    </div>
                  </div>
                ))}

                {(!emissors || emissors.length === 0) && (
                  <div className="text-center text-muted-foreground py-12">
                    {t.emissors.noEmissors}
                  </div>
                )}
              </div>
            )}
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
              {t.emissors.name}
            </Label>
            <Input id="name" value={formData.name} onChange={handleFormChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="taxId" className="text-right">
              {t.emissors.taxId}
            </Label>
            <Input id="taxId" value={formData.taxId} onChange={handleFormChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="zipCode" className="text-right">
              {t.emissors.zipCode}
            </Label>
            <Input id="zipCode" value={formData.zipCode} onChange={handleFormChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              {t.emissors.type}
            </Label>
            <Select value={formData.type} onValueChange={handleSelectChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t.emissors.selectType} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="donor">{t.emissors.types.donor}</SelectItem>
                <SelectItem value="supplier">{t.emissors.types.supplier}</SelectItem>
                <SelectItem value="volunteer">{t.emissors.types.volunteer}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button variant="outline">{t.common.cancel}</Button>
          </DialogClose>
          <Button onClick={handleSave}>{t.emissors.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.emissors.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.emissors.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmisorToDelete(null)}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
