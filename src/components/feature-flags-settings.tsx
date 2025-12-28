// src/components/feature-flags-settings.tsx
// Component per gestionar els feature flags de l'organització

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { doc, updateDoc } from 'firebase/firestore';
import { Puzzle, FolderKanban, Loader2, FileStack } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function FeatureFlagsSettings() {
  const { firestore } = useFirebase();
  const { organization, organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const router = useRouter();

  const [isUpdating, setIsUpdating] = React.useState(false);
  const [updatingFlag, setUpdatingFlag] = React.useState<string | null>(null);

  // Feature flags actuals
  const isProjectModuleEnabled = organization?.features?.projectModule ?? false;
  const isPendingDocsEnabled = organization?.features?.pendingDocs ?? false;

  const handleToggleProjectModule = async (enabled: boolean) => {
    if (!organizationId || !firestore) return;

    setIsUpdating(true);
    try {
      const orgRef = doc(firestore, 'organizations', organizationId);
      await updateDoc(orgRef, {
        'features.projectModule': enabled,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: enabled ? 'Mòdul activat' : 'Mòdul desactivat',
        description: enabled
          ? 'El Mòdul Projectes s\'ha activat correctament.'
          : 'El Mòdul Projectes s\'ha desactivat.',
      });

      // Refrescar per actualitzar sidebar
      router.refresh();
    } catch (error) {
      console.error('Error actualitzant feature flag:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut actualitzar el mòdul. Torna-ho a intentar.',
      });
    } finally {
      setIsUpdating(false);
      setUpdatingFlag(null);
    }
  };

  const handleTogglePendingDocs = async (enabled: boolean) => {
    if (!organizationId || !firestore) return;

    setIsUpdating(true);
    setUpdatingFlag('pendingDocs');
    try {
      const orgRef = doc(firestore, 'organizations', organizationId);
      await updateDoc(orgRef, {
        'features.pendingDocs': enabled,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: enabled ? 'Mòdul activat' : 'Mòdul desactivat',
        description: enabled
          ? 'Documents pendents de conciliació activat.'
          : 'Documents pendents de conciliació desactivat.',
      });

      router.refresh();
    } catch (error) {
      console.error('Error actualitzant feature flag:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut actualitzar el mòdul. Torna-ho a intentar.',
      });
    } finally {
      setIsUpdating(false);
      setUpdatingFlag(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="h-5 w-5" />
          Mòduls opcionals
        </CardTitle>
        <CardDescription>
          Activa o desactiva mòduls addicionals per a la teva organització.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mòdul Projectes */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-emerald-100 p-2">
              <FolderKanban className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="project-module" className="text-base font-medium cursor-pointer">
                  Mòdul Projectes
                </Label>
                {isProjectModuleEnabled && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Actiu
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Gestió de pressupostos, imputació de despeses i justificació econòmica per projectes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="project-module"
              checked={isProjectModuleEnabled}
              onCheckedChange={handleToggleProjectModule}
              disabled={isUpdating}
            />
          </div>
        </div>

        {/* Mòdul Documents Pendents */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-orange-100 p-2">
              <FileStack className="h-5 w-5 text-orange-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="pending-docs" className="text-base font-medium cursor-pointer">
                  Documents pendents
                </Label>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Experimental
                </Badge>
                {isPendingDocsEnabled && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    Actiu
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Pujar factures i nòmines abans de tenir l'extracte bancari. Es concilien automàticament quan arriba el moviment.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {updatingFlag === 'pendingDocs' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="pending-docs"
              checked={isPendingDocsEnabled}
              onCheckedChange={handleTogglePendingDocs}
              disabled={isUpdating}
            />
          </div>
        </div>

        {/* Espai per futurs mòduls */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Properament més mòduls disponibles.
        </p>
      </CardContent>
    </Card>
  );
}
