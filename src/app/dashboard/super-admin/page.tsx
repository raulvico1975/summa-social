
'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { collection, doc, getDocs } from 'firebase/firestore';
import type { Organization, UserProfile, OrganizationRole } from '@/lib/data';
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
import { Loader2, PlusCircle, Edit, Trash2, MoreVertical } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { createOrganization, inviteUser, deleteUser, deleteOrganization } from '@/services/admin';
import { useToast } from '@/hooks/use-toast';

const SUPER_ADMIN_UID = 'f2AHJqjXiOZkYajwkOnZ8RY6h2k2';

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
};

function CreateOrganizationDialog({ onOrganizationCreated }: { onOrganizationCreated: () => void }) {
    const { t } = useTranslations();
    const [open, setOpen] = React.useState(false);
    const [name, setName] = React.useState('');
    const [taxId, setTaxId] = React.useState('');
    const [isCreating, setIsCreating] = React.useState(false);
    const { toast } = useToast();

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            await createOrganization({ name, taxId });
            toast({ title: "Organització creada", description: `L'organització "${name}" s'ha creat correctament.` });
            onOrganizationCreated();
            setOpen(false);
            setName('');
            setTaxId('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2" />
                    {t.superAdmin.createOrganization}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t.superAdmin.createOrganization}</DialogTitle>
                    <DialogDescription>{t.superAdmin.createOrganizationDescription}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="org-name" className="text-right">{t.superAdmin.orgName}</Label>
                        <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="org-taxid" className="text-right">{t.superAdmin.orgTaxId}</Label>
                        <Input id="org-taxid" value={taxId} onChange={(e) => setTaxId(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">{t.common.cancel}</Button></DialogClose>
                    <Button onClick={handleCreate} disabled={isCreating || !name || !taxId}>
                        {isCreating && <Loader2 className="mr-2 animate-spin" />}
                        {t.superAdmin.create}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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
        if (orgToDelete) {
            try {
                await deleteOrganization({ orgId: orgToDelete.id });
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
                    <CreateOrganizationDialog onOrganizationCreated={onDataChanged} />
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

function InviteUserDialog({ onUserInvited, organizations }: { onUserInvited: () => void, organizations: Organization[] }) {
    const { t } = useTranslations();
    const [open, setOpen] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [displayName, setDisplayName] = React.useState('');
    const [role, setRole] = React.useState<OrganizationRole>('viewer');
    const [organizationId, setOrganizationId] = React.useState('');
    const [isInviting, setIsInviting] = React.useState(false);
    const { toast } = useToast();

    const handleInvite = async () => {
        setIsInviting(true);
        try {
            const result = await inviteUser({ email, displayName, role, organizationId });
            toast({
                title: "Usuari Convidat",
                description: `S'ha enviat un correu a ${email} amb la contrasenya temporal: ${result.password}`,
                duration: 9000
            });
            onUserInvited();
            setOpen(false);
            setEmail('');
            setDisplayName('');
            setRole('viewer');
            setOrganizationId('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2" />
                    {t.superAdmin.inviteUser}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t.superAdmin.inviteUser}</DialogTitle>
                    <DialogDescription>{t.superAdmin.inviteUserDescription}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="user-email" className="text-right">Email</Label>
                        <Input id="user-email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="user-name" className="text-right">{t.superAdmin.userName}</Label>
                        <Input id="user-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="user-org" className="text-right">{t.superAdmin.userOrganization}</Label>
                        <Select value={organizationId} onValueChange={setOrganizationId}>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder={t.superAdmin.selectOrg} /></SelectTrigger>
                            <SelectContent>
                                {organizations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="user-role" className="text-right">{t.superAdmin.userRole}</Label>
                        <Select value={role} onValueChange={(value) => setRole(value as OrganizationRole)}>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder={t.superAdmin.selectRole} /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(t.superAdmin.roles).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">{t.common.cancel}</Button></DialogClose>
                    <Button onClick={handleInvite} disabled={isInviting || !email || !displayName || !organizationId || !role}>
                        {isInviting && <Loader2 className="mr-2 animate-spin" />}
                        {t.superAdmin.invite}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function UsersTable({ 
    users, 
    organizations, 
    onDataChanged 
}: { 
    users: (UserProfile & {id: string})[], 
    organizations: Organization[],
    onDataChanged: () => void 
}) {
    const { t } = useTranslations();
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
        if (userToDelete) {
            try {
                await deleteUser({ userId: userToDelete.id, orgId: userToDelete.organizationId });
                toast({ title: "Usuari eliminat", description: `L'usuari "${userToDelete.displayName}" s'ha eliminat.` });
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
                    <InviteUserDialog onUserInvited={onDataChanged} organizations={organizations} />
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
                                        <TableCell className="font-medium">{user.displayName}</TableCell>
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

export default function SuperAdminPage() {
    const { firestore } = useFirebase();
    const { firebaseUser, isLoading: isAuthLoading } = useCurrentOrganization();
    const { t } = useTranslations();
    const router = useRouter();

    const [key, setKey] = React.useState(0);
    const forceRerender = () => setKey(prev => prev + 1);

    const organizationsQuery = useMemoFirebase(() => collection(firestore, 'organizations'), [firestore]);
    const usersQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);

    const { data: organizations, isLoading: isOrgsLoading } = useCollection<Organization>(organizationsQuery, [key]);
    const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile & {id: string}>(usersQuery, [key]);

    const isLoading = isAuthLoading || isOrgsLoading || isUsersLoading;

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
        return null; // Don't render anything while redirecting
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight font-headline">{t.superAdmin.title}</h1>
                <p className="text-muted-foreground">{t.superAdmin.description}</p>
            </div>
            
            <OrganizationsTable organizations={organizations || []} users={users || []} onDataChanged={forceRerender} />
            <UsersTable users={users || []} organizations={organizations || []} onDataChanged={forceRerender} />
        </div>
    );
}
