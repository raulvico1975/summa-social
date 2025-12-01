'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { collection, doc } from 'firebase/firestore';
import type { Organization, UserProfile } from '@/lib/data';
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
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
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

// ** NEW COMPONENT **
// Client-side dialog to create an organization.
function CreateOrganizationDialog({ onOrganizationCreated }: { onOrganizationCreated: () => void }) {
    const { t } = useTranslations();
    const { firestore } = useFirebase();
    const [open, setOpen] = React.useState(false);
    const [name, setName] = React.useState('');
    const [taxId, setTaxId] = React.useState('');
    const [isCreating, setIsCreating] = React.useState(false);
    const { toast } = useToast();

    const handleCreate = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firestore no està disponible.' });
            return;
        }
        if (!name || !taxId) {
            toast({ variant: 'destructive', title: t.common.error, description: "El nom i el CIF són obligatoris." });
            return;
        }

        setIsCreating(true);
        try {
            const orgsCollection = collection(firestore, 'organizations');
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const newOrgData: Omit<Organization, 'id'> = {
                slug,
                name,
                taxId,
                createdAt: new Date().toISOString()
            };
            
            // Use the non-blocking fire-and-forget function
            await addDocumentNonBlocking(orgsCollection, newOrgData);
            
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
                // This is a simplified deletion. A robust solution would use a Cloud Function
                // to recursively delete subcollections and handle users.
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
                // This is a simplified deletion. A robust solution would use a Cloud Function
                // to handle user deletion from Auth as well.
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
                     {/* The "Invite User" button is removed as we pivot away from Admin SDK */}
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

    const organizationsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'organizations') : null, [firestore]);
    const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);

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
