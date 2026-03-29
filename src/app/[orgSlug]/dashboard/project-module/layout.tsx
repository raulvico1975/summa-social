// src/app/[orgSlug]/dashboard/project-module/layout.tsx
// Guard per al Mòdul Projectes - només accessible si features.projectModule = true

'use client';

import * as React from 'react';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Lock, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useTranslations } from '@/i18n';

interface ProjectModuleLayoutProps {
  children: React.ReactNode;
}

export default function ProjectModuleLayout({ children }: ProjectModuleLayoutProps) {
  const { organization, organizationId, userRole } = useCurrentOrganization();
  const { firestore } = useFirebase();
  const { buildUrl } = useOrgUrl();
  const { toast } = useToast();
  const { t, tr } = useTranslations();
  const router = useRouter();
  const { canAccessProjectsArea } = usePermissions();
  const [isActivating, setIsActivating] = React.useState(false);

  // Feature flag: Mòdul Projectes
  const isProjectModuleEnabled = organization?.features?.projectModule ?? false;
  const isAdmin = userRole === 'admin';

  // Handler per activar el mòdul
  const handleActivateModule = async () => {
    if (!organizationId) return;

    setIsActivating(true);
    try {
      const orgRef = doc(firestore, 'organizations', organizationId);
      await updateDoc(orgRef, {
        'features.projectModule': true,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: tr('projectModule.layout.activatedTitle', 'Mòdul activat'),
        description: tr('projectModule.layout.activatedDescription', "El Mòdul Projectes s'ha activat correctament."),
      });

      // Refrescar la pàgina per carregar les dades
      router.refresh();
    } catch (error) {
      console.error('Error activant mòdul:', error);
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: tr('projectModule.layout.activationError', "No s'ha pogut activar el mòdul. Torna-ho a intentar."),
      });
    } finally {
      setIsActivating(false);
    }
  };

  if (!canAccessProjectsArea) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{tr('projectModule.capture.restrictedTitle', 'Accés restringit')}</CardTitle>
            <CardDescription>
              {tr('projectModule.layout.restrictedBody', 'No tens permisos per operar al mòdul de Projectes.')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Si el mòdul no està activat, mostrar pantalla de bloqueig
  if (!isProjectModuleEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">{tr('projectModule.layout.notEnabledTitle', 'Mòdul Projectes no activat')}</CardTitle>
            <CardDescription>
              {tr('projectModule.layout.notEnabledDescription', 'El Mòdul Projectes permet gestionar despeses, pressupostos i justificacions econòmiques per projectes.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FolderKanban className="h-4 w-4 text-emerald-600" />
                <span>{tr('projectModule.layout.featureBudgets', 'Gestió de pressupostos per projecte')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FolderKanban className="h-4 w-4 text-emerald-600" />
                <span>{tr('projectModule.layout.featureImputations', 'Imputació de despeses a partides')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FolderKanban className="h-4 w-4 text-emerald-600" />
                <span>{tr('projectModule.layout.featureJustifications', 'Justificació assistida amb suggerències')}</span>
              </div>
            </div>

            {isAdmin ? (
              <Button
                className="w-full"
                onClick={handleActivateModule}
                disabled={isActivating}
              >
                {isActivating
                  ? tr('projectModule.layout.activating', 'Activant...')
                  : tr('projectModule.layout.activateAction', 'Activar Mòdul Projectes')}
              </Button>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                <p>{tr('projectModule.layout.contactAdmin', "Contacta amb l'administrador de l'organització per activar aquest mòdul.")}</p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(buildUrl('/dashboard/configuracion'))}
            >
              <Settings className="h-4 w-4 mr-2" />
              {tr('projectModule.layout.goToSettings', 'Anar a Configuració')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mòdul activat: renderitzar children normalment
  return <>{children}</>;
}
