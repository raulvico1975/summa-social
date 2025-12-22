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
import { Puzzle, FolderKanban, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function FeatureFlagsSettings() {
  const { firestore } = useFirebase();
  const { organization, organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const router = useRouter();

  const [isUpdating, setIsUpdating] = React.useState(false);

  // Feature flags actuals
  const isProjectModuleEnabled = organization?.features?.projectModule ?? false;

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

        {/* Espai per futurs mòduls */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Properament més mòduls disponibles.
        </p>
      </CardContent>
    </Card>
  );
}
