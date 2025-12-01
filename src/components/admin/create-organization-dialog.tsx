
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
import { collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { Loader2, Building2, Mail, User, Copy, Check } from 'lucide-react';
import type { Organization, Invitation, OrganizationRole } from '@/lib/data';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Genera un slug a partir del nom
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina accents
    .replace(/[^a-z0-9\s-]/g, '')    // Elimina caràcters especials
    .replace(/\s+/g, '-')            // Espais a guions
    .replace(/-+/g, '-')             // Múltiples guions a un
    .substring(0, 50)                // Màxim 50 caràcters
    .replace(/^-|-$/g, '');          // Elimina guions inicials/finals
};

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
      setError('El nom és obligatori');
      return;
    }
    if (!taxId.trim()) {
      setError('El CIF és obligatori');
      return;
    }
    if (!slug.trim()) {
      setError('El slug és obligatori');
      return;
    }
    if (!adminEmail.trim()) {
      setError('L\'email de l\'administrador és obligatori');
      return;
    }

    setError('');
    setIsCreating(true);

    try {
      // 1. Comprovar que el slug no existeix
      const slugQuery = query(collection(firestore, 'organizations'), where('slug', '==', slug));
      const slugSnapshot = await getDocs(slugQuery);
      if (!slugSnapshot.empty) {
        setError('Aquest slug ja existeix. Prova amb un altre.');
        setIsCreating(false);
        return;
      }

      // 2. Crear l'organització
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

      // 3. Crear la invitació per al primer admin
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

      // 4. Generar URL d'invitació
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/registre?token=${token}`;
      setCreatedInviteUrl(inviteUrl);

      toast({
        title: 'Organització creada!',
        description: `${name} s'ha creat correctament.`,
      });

    } catch (err: any) {
      console.error('Error creating organization:', err);
      setError('Error creant l\'organització. Torna-ho a provar.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyUrl = () => {
    if (createdInviteUrl) {
      navigator.clipboard.writeText(createdInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Enllaç copiat!' });
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
            {createdInviteUrl ? 'Organització creada!' : 'Crear nova organització'}
          </DialogTitle>
          <DialogDescription>
            {createdInviteUrl 
              ? 'Envia aquest enllaç a l\'administrador de l\'organització perquè creï el seu compte.'
              : 'Introdueix les dades de la nova organització i de qui serà el seu primer administrador.'
            }
          </DialogDescription>
        </DialogHeader>

        {createdInviteUrl ? (
          // Pantalla d'èxit amb l'enllaç
          <div className="space-y-4 py-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Envia aquest enllaç a <strong>{adminEmail}</strong> perquè creï el seu compte d'administrador.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Enllaç d'invitació</Label>
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
                L'enllaç expira en 7 dies.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                Tancar
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
                Dades de l'organització
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Nom de l'entitat *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Fundació Flors de Kiskeya"
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">CIF *</Label>
                  <Input
                    id="taxId"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                    placeholder="G12345678"
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="fundacio-flors"
                    disabled={isCreating}
                  />
                </div>
              </div>
            </div>

            {/* Dades del primer admin */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Primer administrador
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@fundacio.org"
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminName">Nom (opcional)</Label>
                  <Input
                    id="adminName"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Maria Garcia"
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
                Cancel·lar
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear i generar invitació
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
