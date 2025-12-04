'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Loader2, Mail, Copy, Check, UserPlus } from 'lucide-react';
import type { Invitation, OrganizationRole } from '@/lib/data';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteCreated?: () => void;
}

// Genera un token únic
const generateToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export function InviteMemberDialog({ open, onOpenChange, onInviteCreated }: InviteMemberDialogProps) {
  const { firestore, user } = useFirebase();
  const { organization, organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();

  // Formulari
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<OrganizationRole>('user');

  // Estat
  const [isCreating, setIsCreating] = React.useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState('');

  // Ref per seleccionar l'input
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset quan es tanca
  React.useEffect(() => {
    if (!open) {
      setEmail('');
      setRole('user');
      setError('');
      setCreatedInviteUrl(null);
      setCopied(false);
    }
  }, [open]);

  // Seleccionar l'enllaç quan es crea
  React.useEffect(() => {
    if (createdInviteUrl && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.select();
      }, 100);
    }
  }, [createdInviteUrl]);

  const handleCreate = async () => {
    // Validacions
    if (!email.trim()) {
      setError(t.members.errorEmailRequired);
      return;
    }

    if (!email.includes('@')) {
      setError(t.members.errorInvalidEmail);
      return;
    }

    if (!organizationId || !organization) {
      setError(t.common.error);
      return;
    }

    setError('');
    setIsCreating(true);

    try {
      // Crear la invitació
      const invitationRef = doc(collection(firestore, 'invitations'));
      const token = generateToken();
      const now = new Date().toISOString();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 dies

      const invitationData: Omit<Invitation, 'id'> = {
        token,
        organizationId: organizationId,
        organizationName: organization.name,
        role: role,
        email: email.trim().toLowerCase(),
        createdAt: now,
        expiresAt: expiresAt.toISOString(),
        createdBy: user!.uid,
      };

      await setDoc(invitationRef, { ...invitationData, id: invitationRef.id });

      // Generar URL d'invitació
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/registre?token=${token}`;
      setCreatedInviteUrl(inviteUrl);

      toast({
        title: t.members.invitationCreated,
        description: t.members.invitationCreatedDescription(email),
      });

      onInviteCreated?.();

    } catch (err: any) {
      console.error('Error creating invitation:', err);
      setError(t.members.errorCreatingInvitation);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyUrl = async () => {
    if (createdInviteUrl) {
      try {
        await navigator.clipboard.writeText(createdInviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: t.members.linkCopied });
      } catch (err) {
        // Si falla el clipboard API, seleccionem el text per copiar manualment
        inputRef.current?.select();
        toast({ 
          title: t.members.selectAndCopy || 'Selecciona i copia',
          description: t.members.selectAndCopyDescription || 'Prem Cmd+C (Mac) o Ctrl+C (Windows) per copiar',
        });
      }
    }
  };

  const handleSelectAll = () => {
    inputRef.current?.select();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const getRoleDescription = (r: OrganizationRole): string => {
    switch (r) {
      case 'admin': return t.members.roleAdminDescription;
      case 'user': return t.members.roleUserDescription;
      case 'viewer': return t.members.roleViewerDescription;
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {createdInviteUrl ? t.members.invitationReady : t.members.inviteMember}
          </DialogTitle>
          <DialogDescription>
            {createdInviteUrl 
              ? t.members.invitationReadyDescription
              : t.members.inviteMemberDescription
            }
          </DialogDescription>
        </DialogHeader>

        {createdInviteUrl ? (
          // Pantalla d'èxit amb l'enllaç
          <div className="space-y-4 py-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                {t.members.sendLinkTo} <strong>{email}</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>{t.members.invitationLink}</Label>
              <div className="flex gap-2">
                <Input 
                  ref={inputRef}
                  value={createdInviteUrl} 
                  readOnly 
                  className="font-mono text-xs"
                  onClick={handleSelectAll}
                />
                <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.members.linkExpires} • Clica l'enllaç per seleccionar-lo i copia amb Cmd+C
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                {t.common.close}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Formulari
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.members.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t.members.role}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as OrganizationRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{t.members.roleAdmin}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{t.members.roleUser}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{t.members.roleViewer}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getRoleDescription(role)}
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                {t.common.cancel}
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.members.createInvitation}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}