'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { collection, doc, addDoc, setDoc } from 'firebase/firestore';
import type { Organization, UserProfile, Invitation, OrganizationRole } from '@/lib/data';
import { useTranslations } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Trash2, UserPlus, Copy, Check, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
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
import { useToast } from '@/hooks/use-toast';

const SUPER_ADMIN_UID = 'f2AHJqjXiOZkYajwkOnZ8RY6h2k2';

// Funció per generar un token aleatori
function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return dateString;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIÀLEG CREAR ORGANITZACIÓ (AMB INVITACIÓ AUTOMÀTICA)
// ═══════════════════════════════════════════════════════════════════════════════

function CreateOrganizationDialog({ onOrganizationCreated }: { onOrganizationCreated: () => void }) {
  const { t } = useTranslations();
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [open, setOpen] = React.useState(false);
  
  // Dades organització
  const [name, setName] = React.useState('');
  const [taxId, setTaxId] = React.useState('');
  
  // Dades primer admin
  const [adminEmail, setAdminEmail] = React.useState('');
  
  // Estat
  const [isCreating, setIsCreating] = React.useState(false);
  const [generatedLink, setGeneratedLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleCreate = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore no està disponible.' });
      return;
    }
    if (!name || !taxId) {
      toast({ variant: 'destructive', title: t.common.error, description: "El nom i el CIF són obligatoris." });
      return;
    }
    if (!adminEmail) {
      toast({ variant: 'destructive', title: t.common.error, description: "L'email de l'administrador és obligatori." });
      return;
    }

    setIsCreating(true);
    try {
      // 1. Crear l'organització
      const orgsCollection = collection(firestore, 'organizations');
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const now = new Date().toISOString();
      
      const newOrgData: Omit<Organization, 'id'> = {
        slug,
        name,
        taxId: taxId.toUpperCase(),
        createdAt: now,
        status: 'active',
        createdBy: user.uid,
      };

      const orgRef = doc(orgsCollection);
      await setDoc(orgRef, { ...newOrgData, id: orgRef.id });

      // 2. Crear la invitació automàticament
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 dies

      const invitationData: Omit<Invitation, 'id'> = {
        token,
        organizationId: orgRef.id,
        organizationName: name,
        role: 'admin' as OrganizationRole,
        email: adminEmail.toLowerCase(),
        createdAt: now,
        expiresAt: expiresAt.toISOString(),
        createdBy: user.uid,
      };

      const invitationsCollection = collection(firestore, 'invitations');
      await addDoc(invitationsCollection, invitationData);

      // 3. Generar l'enllaç
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/registre?token=${token}`;
      setGeneratedLink(link);

      toast({ title: "Organització creada", description: `L'organització "${name}" s'ha creat amb la invitació.` });
      onOrganizationCreated();
      
    } catch (error: any) {
      console.error('Error creant organització:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({ title: 'Copiat!', description: 'L\'enllaç s\'ha copiat al portapapers.' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form after closing
    setTimeout(() => {
      setName('');
      setTaxId('');
      setAdminEmail('');
      setGeneratedLink(null);
      setCopied(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t.superAdmin.createOrganization}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {generatedLink ? '✅ Organització creada!' : t.superAdmin.createOrganization}
          </DialogTitle>
          <DialogDescription>
            {generatedLink 
              ? 'Envia aquest enllaç a l\'administrador perquè creï el seu compte.'
              : t.superAdmin.createOrganizationDescription
            }
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <>
            <div className="grid gap-4 py-4">
              {/* Dades organització */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Dades de l'organització</h4>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="org-name" className="text-right">{t.superAdmin.orgName}</Label>
                  <Input 
                    id="org-name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="col-span-3"
                    placeholder="Fundació Exemple"
                    disabled={isCreating}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="org-taxid" className="text-right">{t.superAdmin.orgTaxId}</Label>
                  <Input 
                    id="org-taxid" 
                    value={taxId} 
                    onChange={(e) => setTaxId(e.target.value.toUpperCase())} 
                    className="col-span-3"
                    placeholder="G12345678"
                    disabled={isCreating}
                  />
                </div>
              </div>

              {/* Dades primer admin */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground">Primer administrador</h4>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="admin-email" className="text-right">Email</Label>
                  <div className="col-span-3">
                    <Input 
                      id="admin-email" 
                      type="email"
                      value={adminEmail} 
                      onChange={(e) => setAdminEmail(e.target.value)} 
                      placeholder="admin@fundacio.org"
                      disabled={isCreating}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Rebrà l'enllaç per crear el seu compte d'administrador.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isCreating}>
                  {t.common.cancel}
                </Button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={isCreating || !name || !taxId || !adminEmail}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear i generar invitació
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-4 space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Tot llest!</span>
                </div>
                <p className="text-sm text-green-600">
                  Envia aquest enllaç a <strong>{adminEmail}</strong> perquè creï el seu compte.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Enllaç d'invitació</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly className="font-mono text-xs" />
                  <Button onClick={handleCopy} variant="outline" size="icon">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  L'enllaç expira en 7 dies.
                </p>
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p><strong>Organització:</strong> {name}</p>
                <p><strong>CIF:</strong> {taxId}</p>
                <p><strong>Admin:</strong> {adminEmail}</p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Tancar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIÀLEG GENERAR INVITACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

function GenerateInvitationDialog({ 
  organizations,
  onInvitationCreated 
}: { 
  organizations: Organization[],
  onInvitationCreated: () => void 
}) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [open, setOpen] = React.useState(false);
  const [selectedOrgId, setSelectedOrgId] = React.useState<string>('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<OrganizationRole>('admin');
  const [expirationDays, setExpirationDays] = React.useState('7');
  const [isCreating, setIsCreating] = React.useState(false);
  const [generatedLink, setGeneratedLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const selectedOrg = organizations.find(o => o.id === selectedOrgId);

  const handleCreate = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut connectar amb la base de dades.' });
      return;
    }

    if (!selectedOrgId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona una organització.' });
      return;
    }

    setIsCreating(true);

    try {
      const token = generateToken();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + parseInt(expirationDays) * 24 * 60 * 60 * 1000);

      const invitationData: Omit<Invitation, 'id'> = {
        token,
        organizationId: selectedOrgId,
        organizationName: selectedOrg?.name || '',
        role,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        createdBy: user.uid,
        ...(email && { email: email.toLowerCase() }),
      };

      // Guardar a la col·lecció global d'invitacions
      const invitationsCollection = collection(firestore, 'invitations');
      await addDoc(invitationsCollection, invitationData);

      // Generar l'enllaç
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/registre?token=${token}`;
      setGeneratedLink(link);

      toast({ 
        title: 'Invitació creada', 
        description: `L'enllaç d'invitació s'ha generat correctament.` 
      });

      onInvitationCreated();
    } catch (error: any) {
      console.error('Error creant invitació:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({ title: 'Copiat!', description: 'L\'enllaç s\'ha copiat al portapapers.' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form after closing
    setTimeout(() => {
      setSelectedOrgId('');
      setEmail('');
      setRole('admin');
      setExpirationDays('7');
      setGeneratedLink(null);
      setCopied(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Generar Invitació
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar Invitació</DialogTitle>
          <DialogDescription>
            Crea un enllaç d'invitació per afegir un nou usuari a una organització.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <>
            <div className="grid gap-4 py-4">
              {/* Seleccionar Organització */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="org" className="text-right">Organització</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona una organització" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email (opcional) */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <div className="col-span-3">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Opcional - restringir a un email"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Si s'especifica, només aquest email podrà usar la invitació.
                  </p>
                </div>
              </div>

              {/* Rol */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Rol</Label>
                <Select value={role} onValueChange={(v) => setRole(v as OrganizationRole)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="user">Usuari</SelectItem>
                    <SelectItem value="viewer">Visualitzador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiració */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expiration" className="text-right">Expira en</Label>
                <Select value={expirationDays} onValueChange={setExpirationDays}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 dia</SelectItem>
                    <SelectItem value="7">7 dies</SelectItem>
                    <SelectItem value="30">30 dies</SelectItem>
                    <SelectItem value="90">90 dies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel·lar</Button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={isCreating || !selectedOrgId}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generar Invitació
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-4 space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Invitació creada!</span>
                </div>
                <p className="text-sm text-green-600">
                  Envia aquest enllaç a l'usuari per a que pugui registrar-se.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Enllaç d'invitació</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly className="font-mono text-xs" />
                  <Button onClick={handleCopy} variant="outline" size="icon">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p><strong>Organització:</strong> {selectedOrg?.name}</p>
                <p><strong>Rol:</strong> {role}</p>
                {email && <p><strong>Email restringit:</strong> {email}</p>}
                <p><strong>Expira en:</strong> {expirationDays} dies</p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Tancar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAULA D'ORGANITZACIONS
// ═══════════════════════════════════════════════════════════════════════════════

function OrganizationsTable({
  organizations,
  users,
  onDataChanged
}: {
  organizations: Organization[],
  users: (UserProfile & { id: string })[],
  onDataChanged: () => void
}) {
  const { t } = useTranslations();
  const { firestore } = useFirebase();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [orgToDelete, setOrgToDelete] = React.useState<Organization | null>(null);
  const { toast } = useToast();

  const memberCountByOrg = React.useMemo(() => {
    return users.reduce((acc, user) => {
      if (user.organizationId) {
        acc[user.organizationId] = (acc[user.organizationId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [users]);

  const handleDeleteRequest = (org: Organization) => {
    setOrgToDelete(org);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (orgToDelete && firestore) {
      try {
        const orgRef = doc(firestore, 'organizations', orgToDelete.id);
        deleteDocumentNonBlocking(orgRef);

        toast({ title: "Organització eliminada", description: `L'organització "${orgToDelete.name}" s'ha eliminat.` });
        onDataChanged();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } finally {
        setIsAlertOpen(false);
        setOrgToDelete(null);
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader className='flex-row items-center justify-between'>
          <div>
            <CardTitle>{t.superAdmin.organizationsTitle}</CardTitle>
            <CardDescription>{t.superAdmin.organizationsDescription}</CardDescription>
          </div>
          <div className="flex gap-2">
            <GenerateInvitationDialog organizations={organizations} onInvitationCreated={onDataChanged} />
            <CreateOrganizationDialog onOrganizationCreated={onDataChanged} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.superAdmin.orgName}</TableHead>
                  <TableHead>{t.superAdmin.orgTaxId}</TableHead>
                  <TableHead>{t.superAdmin.orgCreatedAt}</TableHead>
                  <TableHead className="text-center">{t.superAdmin.orgMembers}</TableHead>
                  <TableHead className="text-right">{t.superAdmin.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map(org => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>{org.taxId || 'N/A'}</TableCell>
                    <TableCell>{formatDate(org.createdAt)}</TableCell>
                    <TableCell className="text-center">{memberCountByOrg[org.id] || 0}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRequest(org)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {organizations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                      No hi ha organitzacions creades
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.superAdmin.confirmDeleteOrgTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.superAdmin.confirmDeleteOrgDescription(orgToDelete?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAULA D'USUARIS
// ═══════════════════════════════════════════════════════════════════════════════

function UsersTable({
  users,
  organizations,
  onDataChanged
}: {
  users: (UserProfile & { id: string })[],
  organizations: Organization[],
  onDataChanged: () => void
}) {
  const { t } = useTranslations();
  const { firestore } = useFirebase();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<(UserProfile & { id: string }) | null>(null);
  const { toast } = useToast();

  const orgNameMap = React.useMemo(() =>
    organizations.reduce((acc, org) => {
      acc[org.id] = org.name;
      return acc;
    }, {} as Record<string, string>),
    [organizations]);

  const roleTranslations: Record<string, string> = t.superAdmin.roles;

  const handleDeleteRequest = (user: UserProfile & { id: string }) => {
    setUserToDelete(user);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete && firestore) {
      try {
        const userRef = doc(firestore, 'users', userToDelete.id);
        deleteDocumentNonBlocking(userRef);

        toast({ title: "Perfil d'usuari eliminat", description: `El perfil de "${userToDelete.displayName}" s'ha eliminat.` });
        onDataChanged();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } finally {
        setIsAlertOpen(false);
        setUserToDelete(null);
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader className='flex-row items-center justify-between'>
          <div>
            <CardTitle>{t.superAdmin.usersTitle}</CardTitle>
            <CardDescription>{t.superAdmin.usersDescription}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.superAdmin.userName}</TableHead>
                  <TableHead>{t.superAdmin.userOrganization}</TableHead>
                  <TableHead>{t.superAdmin.userRole}</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead className="text-right">{t.superAdmin.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.displayName || 'Sense nom'}</TableCell>
                    <TableCell>{orgNameMap[user.organizationId] || user.organizationId}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{roleTranslations[user.role] || user.role}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRequest(user)} disabled={user.id === SUPER_ADMIN_UID}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                      No hi ha usuaris registrats
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.superAdmin.confirmDeleteUserTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.superAdmin.confirmDeleteUserDescription(userToDelete?.displayName || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAULA D'INVITACIONS PENDENTS
// ═══════════════════════════════════════════════════════════════════════════════

function InvitationsTable({
  invitations,
  organizations,
  onDataChanged
}: {
  invitations: Invitation[],
  organizations: Organization[],
  onDataChanged: () => void
}) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const orgNameMap = React.useMemo(() =>
    organizations.reduce((acc, org) => {
      acc[org.id] = org.name;
      return acc;
    }, {} as Record<string, string>),
    [organizations]);

  // Filtrar només invitacions pendents (no usades i no expirades)
  const pendingInvitations = React.useMemo(() => {
    const now = new Date();
    return invitations.filter(inv => {
      if (inv.usedAt) return false;
      const expiresAt = new Date(inv.expiresAt);
      return expiresAt > now;
    });
  }, [invitations]);

  const handleCopyLink = async (invitation: Invitation) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/registre?token=${invitation.token}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(invitation.id);
    toast({ title: 'Copiat!', description: 'L\'enllaç s\'ha copiat al portapapers.' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (invitation: Invitation) => {
    if (firestore) {
      try {
        const invRef = doc(firestore, 'invitations', invitation.id);
        deleteDocumentNonBlocking(invRef);
        toast({ title: 'Invitació eliminada' });
        onDataChanged();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    }
  };

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Invitacions Pendents
        </CardTitle>
        <CardDescription>
          Invitacions que encara no s'han utilitzat
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organització</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead className="text-right">Accions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvitations.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    {orgNameMap[inv.organizationId] || inv.organizationName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{inv.role}</Badge>
                  </TableCell>
                  <TableCell>{inv.email || 'Qualsevol'}</TableCell>
                  <TableCell>{formatDate(inv.expiresAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleCopyLink(inv)}>
                      {copiedId === inv.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(inv)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÀGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function SuperAdminPage() {
  const { firestore } = useFirebase();
  const { firebaseUser, isLoading: isAuthLoading } = useCurrentOrganization();
  const { t } = useTranslations();
  const router = useRouter();

  const [key, setKey] = React.useState(0);
  const forceRerender = () => setKey(prev => prev + 1);

  const organizationsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'organizations') : null, [firestore]);
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const invitationsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'invitations') : null, [firestore]);

  const { data: organizations, isLoading: isOrgsLoading } = useCollection<Organization>(organizationsQuery, [key]);
  const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile & { id: string }>(usersQuery, [key]);
  const { data: invitations, isLoading: isInvitationsLoading } = useCollection<Invitation>(invitationsQuery, [key]);

  const isLoading = isAuthLoading || isOrgsLoading || isUsersLoading || isInvitationsLoading;

  React.useEffect(() => {
    if (!isAuthLoading && firebaseUser?.uid !== SUPER_ADMIN_UID) {
      router.replace('/dashboard');
    }
  }, [firebaseUser, isAuthLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t.superAdmin.loading}</p>
        </div>
      </div>
    );
  }

  if (firebaseUser?.uid !== SUPER_ADMIN_UID) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.superAdmin.title}</h1>
        <p className="text-muted-foreground">{t.superAdmin.description}</p>
      </div>

      <OrganizationsTable organizations={organizations || []} users={users || []} onDataChanged={forceRerender} />
      <InvitationsTable invitations={invitations || []} organizations={organizations || []} onDataChanged={forceRerender} />
      <UsersTable users={users || []} organizations={organizations || []} onDataChanged={forceRerender} />
    </div>
  );
}
