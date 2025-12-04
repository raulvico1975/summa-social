'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Building2, Save, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import type { Organization } from '@/lib/data';
import { useTranslations } from '@/i18n';

export function OrganizationSettings() {
  const { firestore, storage } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  
  const [formData, setFormData] = React.useState({
    name: '',
    taxId: '',
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
  });

  // Carregar dades de l'organització
  React.useEffect(() => {
    if (!organizationId || !firestore) return;

    const loadOrganization = async () => {
      try {
        const orgRef = doc(firestore, 'organizations', organizationId);
        const orgSnap = await getDoc(orgRef);
        
        if (orgSnap.exists()) {
          const data = orgSnap.data() as Organization;
          setFormData({
            name: data.name || '',
            taxId: data.taxId || '',
            address: data.address || '',
            city: data.city || '',
            zipCode: data.zipCode || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            logoUrl: (data as any).logoUrl || '',
          });
        }
      } catch (error) {
        console.error('Error carregant organització:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No s\'han pogut carregar les dades de l\'organització.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadOrganization();
  }, [organizationId, firestore, toast]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!organizationId || !firestore) return;

    setSaving(true);
    try {
      const orgRef = doc(firestore, 'organizations', organizationId);
      
      // Preparar dades per guardar (sense undefined)
      const dataToSave: Record<string, any> = {
        name: formData.name,
        taxId: formData.taxId,
        updatedAt: new Date().toISOString(),
      };

      // Afegir camps opcionals només si tenen valor
      if (formData.address) dataToSave.address = formData.address;
      if (formData.city) dataToSave.city = formData.city;
      if (formData.zipCode) dataToSave.zipCode = formData.zipCode;
      if (formData.phone) dataToSave.phone = formData.phone;
      if (formData.email) dataToSave.email = formData.email;
      if (formData.website) dataToSave.website = formData.website;
      if (formData.logoUrl) dataToSave.logoUrl = formData.logoUrl;

      await updateDoc(orgRef, dataToSave);

      toast({
        title: t.settings.organization.saved,
        description: t.settings.organization.savedDescription,
      });
    } catch (error) {
      console.error('Error guardant:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'han pogut guardar les dades.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizationId || !storage) return;

    // Validar tipus i mida
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El fitxer ha de ser una imatge.',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La imatge no pot superar els 2MB.',
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const logoRef = ref(storage, `organizations/${organizationId}/logo`);
      await uploadBytes(logoRef, file);
      const downloadUrl = await getDownloadURL(logoRef);
      
      setFormData(prev => ({ ...prev, logoUrl: downloadUrl }));
      
      toast({
        title: t.settings.organization.uploadLogo,
        description: 'El logo s\'ha pujat correctament. Recorda guardar els canvis.',
      });
    } catch (error) {
      console.error('Error pujant logo:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut pujar el logo.',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {t.settings.organization.title}
        </CardTitle>
        <CardDescription>
          {t.settings.organization.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo */}
        <div className="space-y-3">
          <Label>{t.settings.organization.logo}</Label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 overflow-hidden">
              {formData.logoUrl ? (
                <img 
                  src={formData.logoUrl} 
                  alt="Logo" 
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={uploadingLogo}
                onClick={() => document.getElementById('logo-input')?.click()}
              >
                {uploadingLogo ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {formData.logoUrl ? t.settings.organization.uploadLogo : t.settings.organization.uploadLogo}
              </Button>
              <input
                id="logo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <p className="text-xs text-muted-foreground">{t.settings.organization.logoHint}</p>
            </div>
          </div>
        </div>

        {/* Dades bàsiques */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">{t.settings.organization.name} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Fundació Exemple"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxId">{t.settings.organization.taxId} *</Label>
            <Input
              id="taxId"
              value={formData.taxId}
              onChange={(e) => handleChange('taxId', e.target.value.toUpperCase())}
              placeholder="G12345678"
            />
          </div>
        </div>

        {/* Adreça */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">{t.settings.organization.address}</h4>
          <div className="space-y-2">
            <Label htmlFor="address">{t.settings.organization.address}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Carrer Exemple, 123"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">{t.settings.organization.city}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Barcelona"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">{t.settings.organization.zipCode}</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleChange('zipCode', e.target.value)}
                placeholder="08001"
              />
            </div>
          </div>
        </div>

        {/* Contacte */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Contacte</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">{t.settings.organization.phone}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="93 123 45 67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t.settings.organization.email}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="info@exemple.org"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">{t.settings.organization.website}</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://www.exemple.org"
            />
          </div>
        </div>

        {/* Botó guardar */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar canvis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
