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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { PlusCircle, Edit, Trash2, User, Building2, RefreshCw, Heart, Upload, AlertTriangle } from 'lucide-react';
import type { Donor } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { DonorImporter } from './donor-importer';
import { useTranslations } from '@/i18n';
import { normalizeContact, formatCurrencyEU } from '@/lib/normalize';

type DonorFormData = Omit<Donor, 'id' | 'createdAt' | 'updatedAt'>;

const emptyFormData: DonorFormData = {
  type: 'donor',
  name: '',
  taxId: '',
  zipCode: '',
  address: '',
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
  const { t } = useTranslations();

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
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [editingDonor, setEditingDonor] = React.useState<Donor | null>(null);
  const [donorToDelete, setDonorToDelete] = React.useState<Donor | null>(null);
  const [formData, setFormData] = React.useState<DonorFormData>(emptyFormData);

  // Filtre de donants incomplets
  const [showIncompleteOnly, setShowIncompleteOnly] = React.useState(false);
  const [hasUrlFilter, setHasUrlFilter] = React.useState(false);

  // Llegir paràmetre de filtre de la URL
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filter = params.get('filter');
      if (filter === 'incomplete') {
        setShowIncompleteOnly(true);
        setHasUrlFilter(true);
      }
    }
  }, []);

  // Funció per netejar el filtre i actualitzar la URL
  const clearFilter = () => {
    setShowIncompleteOnly(false);
    setHasUrlFilter(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('filter');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Filtrar donants incomplets
  const filteredDonors = React.useMemo(() => {
    if (!donors) return [];
    if (!showIncompleteOnly) return donors;
    return donors.filter(donor => !donor.taxId || !donor.zipCode);
  }, [donors, showIncompleteOnly]);

  const incompleteDonorsCount = React.useMemo(() => {
    if (!donors) return 0;
    return donors.filter(donor => !donor.taxId || !donor.zipCode).length;
  }, [donors]);

  const handleEdit = (donor: Donor) => {
    setEditingDonor(donor);
    setFormData({
      type: 'donor',
      name: donor.name,
      taxId: donor.taxId,
      zipCode: donor.zipCode,
      address: donor.address || '',
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
        title: t.donors.donorDeleted,
        description: t.donors.donorDeletedDescription(donorToDelete.name),
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
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.donors.errorNameRequired
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

    // Avís si falten dades pel Model 182
    if (!normalized.taxId || !normalized.zipCode) {
      toast({
        title: t.donors.incompleteDataWarning,
        description: t.donors.incompleteDataWarningDescription,
        duration: 5000,
      });
    }

    const now = new Date().toISOString();
    const dataToSave = {
      ...normalized,
      taxId: normalized.taxId || null,
      zipCode: normalized.zipCode || null,
      address: normalized.address || null,
      email: normalized.email || null,
      phone: normalized.phone || null,
      notes: normalized.notes || null,
      updatedAt: now,
    };

    if (editingDonor) {
      setDocumentNonBlocking(doc(contactsCollection, editingDonor.id), dataToSave, { merge: true });
      toast({
        title: t.donors.donorUpdated,
        description: t.donors.donorUpdatedDescription(normalized.name)
      });
    } else {
      addDocumentNonBlocking(contactsCollection, { ...dataToSave, createdAt: now });
      toast({
        title: t.donors.donorCreated,
        description: t.donors.donorCreatedDescription(normalized.name)
      });
    }
    handleOpenChange(false);
  };

  const handleImportComplete = (count: number) => {
    // El toast ja es mostra dins del DonorImporter
  };

  const dialogTitle = editingDonor ? t.donors.editTitle : t.donors.addTitle;
  const dialogDescription = editingDonor 
    ? t.donors.editDescription 
    : t.donors.addDescription;

  // Helper per detectar dades incompletes
  const hasIncompleteData = (donor: Donor) => !donor.taxId || !donor.zipCode;

  return (
    <TooltipProvider>
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                {t.donors.title}
              </CardTitle>
              <CardDescription>
                {t.donors.description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                {t.donors.import}
              </Button>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t.donors.add}
                </Button>
              </DialogTrigger>
            </div>
          </CardHeader>
          <CardContent>
            {/* Botons de filtre */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                variant={!showIncompleteOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowIncompleteOnly(false)}
              >
                {t.donors.all} ({donors?.length || 0})
              </Button>
              {incompleteDonorsCount > 0 && (
                <Button
                  variant={showIncompleteOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowIncompleteOnly(true)}
                  className={!showIncompleteOnly ? 'border-amber-300 text-amber-600' : ''}
                >
                  <AlertTriangle className="mr-1.5 h-3 w-3" />
                  {t.donors.incomplete} ({incompleteDonorsCount})
                </Button>
              )}
            </div>

            {/* Avís de filtre actiu des de dashboard */}
            {hasUrlFilter && showIncompleteOnly && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    Filtrant: {t.donors.incomplete}
                  </p>
                  <p className="text-xs text-blue-600">
                    Mostrant només {filteredDonors.length} donants amb dades incompletes
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilter}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  {t.donors.showAll}
                </Button>
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.donors.name}</TableHead>
                    <TableHead>{t.donors.taxId}</TableHead>
                    <TableHead>{t.donors.donorType}</TableHead>
                    <TableHead>{t.donors.membershipType}</TableHead>
                    <TableHead>{t.donors.amount}</TableHead>
                    <TableHead className="text-right">{t.donors.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonors && filteredDonors.map((donor) => (
                    <TableRow key={donor.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {donor.donorType === 'individual' ? (
                            <User className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                          {donor.name}
                          {hasIncompleteData(donor) && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                {t.donors.incompleteDataTooltip}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{donor.taxId || <span className="text-amber-500">-</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {donor.donorType === 'individual' ? t.donors.types.individual : t.donors.types.company}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {donor.membershipType === 'recurring' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <RefreshCw className="mr-1 h-3 w-3" />
                            {t.donors.membership.recurring}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t.donors.membership.oneTime}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {donor.membershipType === 'recurring' && donor.monthlyAmount
                          ? formatCurrencyEU(donor.monthlyAmount) + `/${t.donors.perMonth}`
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
                  {(!filteredDonors || filteredDonors.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        {showIncompleteOnly
                          ? "No hi ha donants amb dades incompletes"
                          : t.donors.noData}
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
              <h4 className="text-sm font-medium text-muted-foreground">{t.donors.basicData}</h4>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">{t.donors.name} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="col-span-3"
                  placeholder={t.donors.namePlaceholder}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taxId" className="text-right">
                  <span>{t.donors.taxId}</span>
                  <span className="block text-xs font-normal text-amber-600">Model 182</span>
                </Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => handleFormChange('taxId', e.target.value.toUpperCase())}
                  className="col-span-3"
                  placeholder="12345678A o B12345678"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zipCode" className="text-right">
                  <span>{t.donors.zipCode}</span>
                  <span className="block text-xs font-normal text-amber-600">Model 182</span>
                </Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleFormChange('zipCode', e.target.value)}
                  className="col-span-3"
                  placeholder="08001"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">{t.donors.address}</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  className="col-span-3"
                  placeholder="Carrer Major, 15, 2n 1a"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="donorType" className="text-right">{t.donors.donorType}</Label>
                <Select
                  value={formData.donorType}
                  onValueChange={(v) => handleFormChange('donorType', v)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{t.donors.types.individual_long}</SelectItem>
                    <SelectItem value="company">{t.donors.types.company_long}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.donors.donationType}</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="membershipType" className="text-right">{t.donors.membershipType}</Label>
                <Select
                  value={formData.membershipType}
                  onValueChange={(v) => handleFormChange('membershipType', v)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">{t.donors.membership.oneTime}</SelectItem>
                    <SelectItem value="recurring">{t.donors.membership.recurring}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.membershipType === 'recurring' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="monthlyAmount" className="text-right">{t.donors.amountMonth}</Label>
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
                    <Label htmlFor="memberSince" className="text-right">{t.donors.memberSince}</Label>
                    <Input
                      id="memberSince"
                      type="date"
                      value={formData.memberSince || ''}
                      onChange={(e) => handleFormChange('memberSince', e.target.value)}
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="iban" className="text-right">{t.donors.iban}</Label>
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

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.donors.contactOptional}</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">{t.donors.email}</Label>
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
                <Label htmlFor="phone" className="text-right">{t.donors.phone}</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  className="col-span-3"
                  placeholder="600 000 000"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">{t.donors.notes}</h4>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">{t.donors.notes}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  className="col-span-3"
                  placeholder={t.donors.notesPlaceholder}
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
              {editingDonor ? t.donors.save : t.donors.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.donors.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.donors.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDonorToDelete(null)}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DonorImporter 
        open={isImportOpen} 
        onOpenChange={setIsImportOpen}
        onImportComplete={handleImportComplete}
      />
    </TooltipProvider>
  );
}