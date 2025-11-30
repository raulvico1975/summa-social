
'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { collection } from 'firebase/firestore';
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
import { Loader2 } from 'lucide-react';

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

function OrganizationsTable({ organizations, users }: { organizations: Organization[], users: UserProfile[] }) {
    const { t } = useTranslations();

    const memberCountByOrg = React.useMemo(() => {
        return users.reduce((acc, user) => {
            if (user.organizationId) {
                acc[user.organizationId] = (acc[user.organizationId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [users]);
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t.superAdmin.organizationsTitle}</CardTitle>
                <CardDescription>{t.superAdmin.organizationsDescription}</CardDescription>
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {organizations.map(org => (
                                <TableRow key={org.id}>
                                    <TableCell className="font-medium">{org.name}</TableCell>
                                    <TableCell>{org.taxId || 'N/A'}</TableCell>
                                    <TableCell>{formatDate(org.createdAt)}</TableCell>
                                    <TableCell className="text-center">{memberCountByOrg[org.id] || 0}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function UsersTable({ users, organizations }: { users: (UserProfile & {id: string})[], organizations: Organization[] }) {
    const { t } = useTranslations();
    
    const orgNameMap = React.useMemo(() => 
        organizations.reduce((acc, org) => {
            acc[org.id] = org.name;
            return acc;
        }, {} as Record<string, string>),
    [organizations]);

    const roleTranslations: Record<string, string> = t.superAdmin.roles;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t.superAdmin.usersTitle}</CardTitle>
                <CardDescription>{t.superAdmin.usersDescription}</CardDescription>
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
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}


export default function SuperAdminPage() {
    const { firestore } = useFirebase();
    const { firebaseUser, isLoading: isAuthLoading } = useCurrentOrganization();
    const { t } = useTranslations();
    const router = useRouter();

    const organizationsQuery = useMemoFirebase(() => collection(firestore, 'organizations'), [firestore]);
    const usersQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);

    const { data: organizations, isLoading: isOrgsLoading } = useCollection<Organization>(organizationsQuery);
    const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile & {id: string}>(usersQuery);

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
            
            <OrganizationsTable organizations={organizations || []} users={users || []} />
            <UsersTable users={users || []} organizations={organizations || []} />
        </div>
    );
}
