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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';
import { collection, doc, deleteDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { Users, UserPlus, MoreHorizontal, Trash2, Shield, User, Eye, Clock, Loader2, Download, Upload } from 'lucide-react';
import type { OrganizationMember, OrganizationRole, Invitation } from '@/lib/data';
import { InviteMemberDialog } from './invite-member-dialog';
import { MemberInviterImporter } from './member-inviter-importer';
import { exportMembersToExcel, downloadMembersInviteTemplate } from '@/lib/members-export';

export function MembersManager() {
  const { firestore, user } = useFirebase();
  const { organizationId, userRole } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();

  // Col·leccions
  const membersCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'members') : null,
    [firestore, organizationId]
  );

  const { data: members, isLoading: membersLoading } = useCollection<OrganizationMember>(membersCollection);

  // Invitacions pendents
  const invitationsQuery = useMemoFirebase(
    () => organizationId ? query(
      collection(firestore, 'invitations'),
      where('organizationId', '==', organizationId)
    ) : null,
    [firestore, organizationId]
  );

  const { data: allInvitations } = useCollection<Invitation>(invitationsQuery);

  // Filtrar només les invitacions pendents (no usades i no expirades)
  const pendingInvitations = React.useMemo(() => {
    if (!allInvitations) return [];
    const now = new Date();
    return allInvitations.filter(inv => 
      !inv.usedAt && new Date(inv.expiresAt) > now
    );
  }, [allInvitations]);

  // Estats
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);
  const [isImporterOpen, setIsImporterOpen] = React.useState(false);
  const [memberToDelete, setMemberToDelete] = React.useState<OrganizationMember | null>(null);
  const [invitationToDelete, setInvitationToDelete] = React.useState<Invitation | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const isAdmin = userRole === 'admin';

  const getRoleBadge = (role: OrganizationRole) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300"><Shield className="w-3 h-3 mr-1" />{t.members.roleAdmin}</Badge>;
      case 'user':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300"><User className="w-3 h-3 mr-1" />{t.members.roleUser}</Badge>;
      case 'viewer':
        return <Badge variant="secondary"><Eye className="w-3 h-3 mr-1" />{t.members.roleViewer}</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleChangeRole = async (member: OrganizationMember, newRole: OrganizationRole) => {
    if (!membersCollection || member.userId === user?.uid) return;

    setIsProcessing(true);
    try {
      await updateDoc(doc(membersCollection, member.userId), {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });

      // També actualitzar el perfil d'usuari
      await updateDoc(doc(firestore, 'users', member.userId), {
        role: newRole,
      });

      toast({
        title: t.members.roleUpdated,
        description: t.members.roleUpdatedDescription(member.displayName || member.email, t.members[`role${newRole.charAt(0).toUpperCase() + newRole.slice(1)}` as keyof typeof t.members] as string),
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ variant: 'destructive', title: t.common.error, description: t.members.errorUpdatingRole });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete || !membersCollection) return;

    setIsProcessing(true);
    try {
      await deleteDoc(doc(membersCollection, memberToDelete.userId));

      toast({
        title: t.members.memberRemoved,
        description: t.members.memberRemovedDescription(memberToDelete.displayName || memberToDelete.email),
      });
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({ variant: 'destructive', title: t.common.error, description: t.members.errorRemovingMember });
    } finally {
      setIsProcessing(false);
      setMemberToDelete(null);
    }
  };

  const handleDeleteInvitation = async () => {
    if (!invitationToDelete) return;

    setIsProcessing(true);
    try {
      await deleteDoc(doc(firestore, 'invitations', invitationToDelete.id));

      toast({
        title: t.members.invitationCancelled,
        description: t.members.invitationCancelledDescription(invitationToDelete.email || ''),
      });
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast({ variant: 'destructive', title: t.common.error, description: t.members.errorCancellingInvitation });
    } finally {
      setIsProcessing(false);
      setInvitationToDelete(null);
    }
  };

  if (membersLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t.members.title}
            </CardTitle>
            <CardDescription>
              {t.members.description}
            </CardDescription>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {/* Exportar membres */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportMembersToExcel(members || [])}
                disabled={!members || members.length === 0}
                title="Exportar membres a Excel"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Importar invitacions massives */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImporterOpen(true)}
                title="Importar invitacions massives"
              >
                <Upload className="h-4 w-4" />
              </Button>

              {/* Convidar membre individual */}
              <Button onClick={() => setIsInviteDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t.members.inviteMember}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Membres actius */}
          <div>
            <h3 className="text-sm font-medium mb-3">{t.members.activeMembers} ({members?.length || 0})</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.members.member}</TableHead>
                    <TableHead>{t.members.role}</TableHead>
                    <TableHead>{t.members.joinedAt}</TableHead>
                    {isAdmin && <TableHead className="w-[80px]">{t.members.actions}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members && members.length > 0 ? (
                    members.map((member) => (
                      <TableRow key={member.id || member.userId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{member.displayName || t.members.noName}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isAdmin && member.userId !== user?.uid ? (
                            <Select
                              value={member.role}
                              onValueChange={(value) => handleChangeRole(member, value as OrganizationRole)}
                              disabled={isProcessing}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">{t.members.roleAdmin}</SelectItem>
                                <SelectItem value="user">{t.members.roleUser}</SelectItem>
                                <SelectItem value="viewer">{t.members.roleViewer}</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2">
                              {getRoleBadge(member.role)}
                              {member.userId === user?.uid && (
                                <span className="text-xs text-muted-foreground">({t.members.you})</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(member.joinedAt)}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {member.userId !== user?.uid && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setMemberToDelete(member)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t.members.removeMember}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground h-24">
                        {t.members.noMembers}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Invitacions pendents */}
          {isAdmin && pendingInvitations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t.members.pendingInvitations} ({pendingInvitations.length})
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.members.email}</TableHead>
                      <TableHead>{t.members.role}</TableHead>
                      <TableHead>{t.members.expiresAt}</TableHead>
                      <TableHead className="w-[80px]">{t.members.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(invitation.expiresAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInvitationToDelete(invitation)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diàleg d'invitació */}
      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
      />

      {/* Confirmació eliminar membre */}
      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.members.confirmRemoveTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.members.confirmRemoveDescription(memberToDelete?.displayName || memberToDelete?.email || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.members.removeMember}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmació cancel·lar invitació */}
      <AlertDialog open={!!invitationToDelete} onOpenChange={() => setInvitationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.members.confirmCancelInvitationTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.members.confirmCancelInvitationDescription(invitationToDelete?.email || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvitation}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.members.cancelInvitation}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Importador d'invitacions massives */}
      <MemberInviterImporter
        open={isImporterOpen}
        onOpenChange={setIsImporterOpen}
      />
    </>
  );
}
