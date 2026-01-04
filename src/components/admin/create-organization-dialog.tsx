
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
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { generateSlug, isSlugAvailable, reserveSlug, isValidSlug } from '@/lib/slugs';
import { logAdminAction } from '@/lib/admin-audit';
import { Loader2, Building2, Mail, User, Copy, Check } from 'lucide-react';
import type { Organization, Invitation, OrganizationRole } from '@/lib/data';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from '@/i18n';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const { t } = useTranslations();

  // Formulari
  const [name, setName] = React.useState('');
  const [taxId, setTaxId] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [adminEmail, setAdminEmail] = React.useState('');
  const [adminName, setAdminName] = React.useState('');

  // Estat
  const [isCreating, setIsCreating] = React.useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState('');

  // Actualitza el slug quan canvia el nom
  React.useEffect(() => {
    if (name && !slug) {
      setSlug(generateSlug(name));
    }
  }, [name, slug]);

  // Reset quan es tanca
  React.useEffect(() => {
    if (!open) {
      setName('');
      setTaxId('');
      setSlug('');
      setAdminEmail('');
      setAdminName('');
      setError('');
      setCreatedInviteUrl(null);
      setCopied(false);
    }
  }, [open]);

  const handleSlugChange = (value: string) => {
    // Permet editar el slug manualment però el sanititza
    setSlug(generateSlug(value));
  };

  const handleCreate = async () => {
    // Validacions
    if (!name.trim()) {
      setError(t.superAdmin.createOrganizationDialog.errors.nameRequired);
      return;
    }
    if (!taxId.trim()) {
      setError(t.superAdmin.createOrganizationDialog.errors.taxIdRequired);
      return;
    }
    if (!slug.trim()) {
      setError(t.superAdmin.createOrganizationDialog.errors.slugRequired);
      return;
    }
    if (!adminEmail.trim()) {
      setError(t.superAdmin.createOrganizationDialog.errors.adminEmailRequired);
      return;
    }

    // Validar format del slug
    if (!isValidSlug(slug.trim())) {
      setError('El slug ha de tenir entre 3 i 50 caràcters, només lletres minúscules, números i guions.');
      return;
    }

    setError('');
    setIsCreating(true);

    try {
      // 1. Comprovar que el slug està disponible
      const available = await isSlugAvailable(firestore, slug.trim());
      if (!available) {
        setError(t.superAdmin.createOrganizationDialog.errors.slugExists);
        setIsCreating(false);
        return;
      }

      // 2. Crear l'organització (sense slug encara)
      const orgRef = doc(collection(firestore, 'organizations'));
      const now = new Date().toISOString();

      const orgData: Omit<Organization, 'id'> = {
        name: name.trim(),
        slug: slug.trim(),
        taxId: taxId.trim().toUpperCase(),
        status: 'active',
        createdAt: now,
        createdBy: user!.uid,
      };

      await setDoc(orgRef, { ...orgData, id: orgRef.id });

      // 3. Reservar el slug a la col·lecció /slugs
      await reserveSlug(firestore, orgRef.id, slug.trim(), name.trim());

      // 4. Crear la invitació per al primer admin
      const invitationRef = doc(collection(firestore, 'invitations'));
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 dies

      const invitationData: Omit<Invitation, 'id'> = {
        token,
        organizationId: orgRef.id,
        organizationName: name.trim(),
        role: 'admin' as OrganizationRole,
        email: adminEmail.trim().toLowerCase(),
        createdAt: now,
        expiresAt: expiresAt.toISOString(),
        createdBy: user!.uid,
      };

      await setDoc(invitationRef, { ...invitationData, id: invitationRef.id });

      // 5. Generar URL d'invitació
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/registre?token=${token}`;
      setCreatedInviteUrl(inviteUrl);

      // 6. Audit log (best-effort)
      logAdminAction(firestore, 'CREATE_ORG', user!.uid, slug.trim());

      toast({
        title: t.superAdmin.createOrganizationDialog.titleSuccess,
        description: t.superAdmin.createOrganizationDialog.successToast(name),
      });

    } catch (err: any) {
      console.error('Error creating organization:', err);
      setError(t.superAdmin.createOrganizationDialog.errors.createError);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyUrl = () => {
    if (createdInviteUrl) {
      navigator.clipboard.writeText(createdInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: t.superAdmin.createOrganizationDialog.linkCopied });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {createdInviteUrl ? t.superAdmin.createOrganizationDialog.titleSuccess : t.superAdmin.createOrganizationDialog.title}
          </DialogTitle>
          <DialogDescription>
            {createdInviteUrl
              ? t.superAdmin.createOrganizationDialog.descriptionSuccess
              : t.superAdmin.createOrganizationDialog.description
            }
          </DialogDescription>
        </DialogHeader>

        {createdInviteUrl ? (
          // Pantalla d'èxit amb l'enllaç
          <div className="space-y-4 py-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription dangerouslySetInnerHTML={{ __html: t.superAdmin.createOrganizationDialog.inviteLinkAlert(adminEmail) }} />
            </Alert>

            <div className="space-y-2">
              <Label>{t.superAdmin.createOrganizationDialog.inviteLinkLabel}</Label>
              <div className="flex gap-2">
                <Input
                  value={createdInviteUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.superAdmin.createOrganizationDialog.inviteLinkExpires}
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                {t.superAdmin.createOrganizationDialog.close}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Formulari de creació
          <div className="space-y-4 py-4">
            {/* Dades de l'organització */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t.superAdmin.createOrganizationDialog.organizationDataTitle}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-full space-y-2">
                  <Label htmlFor="name">{t.superAdmin.createOrganizationDialog.nameLabel}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.superAdmin.createOrganizationDialog.namePlaceholder}
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">{t.superAdmin.createOrganizationDialog.taxIdLabel}</Label>
                  <Input
                    id="taxId"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                    placeholder={t.superAdmin.createOrganizationDialog.taxIdPlaceholder}
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">{t.superAdmin.createOrganizationDialog.slugLabel}</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder={t.superAdmin.createOrganizationDialog.slugPlaceholder}
                    disabled={isCreating}
                  />
                </div>
              </div>
            </div>

            {/* Dades del primer admin */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {t.superAdmin.createOrganizationDialog.firstAdminTitle}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">{t.superAdmin.createOrganizationDialog.adminEmailLabel}</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder={t.superAdmin.createOrganizationDialog.adminEmailPlaceholder}
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminName">{t.superAdmin.createOrganizationDialog.adminNameLabel}</Label>
                  <Input
                    id="adminName"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder={t.superAdmin.createOrganizationDialog.adminNamePlaceholder}
                    disabled={isCreating}
                  />
                </div>
              </div>
            </div>

            {/* Missatge d'error */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                {t.superAdmin.createOrganizationDialog.cancel}
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.superAdmin.createOrganizationDialog.create}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
