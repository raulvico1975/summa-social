'use client';

import Link from 'next/link';
import { CategoryManager } from '@/components/category-manager';
import { PasswordChangeForm } from '@/components/password-change-form';
import { OrganizationSettings } from '@/components/organization-settings';
import { LanguageSelector } from '@/components/language-selector';
import { MembersManager } from '@/components/members-manager';
import { FeatureFlagsSettings } from '@/components/feature-flags-settings';
import { BankAccountsManager } from '@/components/bank-accounts/bank-accounts-manager';
import { DangerZone } from '@/components/danger-zone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight } from 'lucide-react';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { SUPER_ADMIN_UID } from '@/lib/data';
import type { Contact, Category } from '@/lib/data';
import { computeOnboardingStatus } from '@/lib/onboarding';

export default function SettingsPage() {
  const { userRole, organizationId, organization } = useCurrentOrganization();
  const { t } = useTranslations();
  const { user, firestore } = useFirebase();
  const { buildUrl } = useOrgUrl();

  // Carregar dades per computar estat onboarding
  const contactsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: contacts } = useCollection<Contact>(contactsQuery);

  const categoriesQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const onboardingStatus = computeOnboardingStatus(organization, contacts, categories);

  // Només admins poden gestionar l'organització, categories i membres
  const canManageOrganization = userRole === 'admin';
  const canManageCategories = userRole === 'admin';
  const canManageMembers = userRole === 'admin';
  const canManageFeatures = userRole === 'admin';

  // Mostrar enllaç a onboarding només per admins i si no està complet
  const showOnboardingLink = userRole === 'admin' && !onboardingStatus.isComplete;

  // Només SuperAdmin pot veure la Zona de Perill
  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;

  return (
    <div className="space-y-6">
      {/* Títol de la pàgina */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.settings.title}</h1>
        <p className="text-muted-foreground">{t.settings.description}</p>
      </div>

      {/* Enllaç a configuració inicial (només si incomplert) */}
      {showOnboardingLink && (
        <Card className="border-blue-200/60 bg-blue-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">
                {t.onboarding?.setupTitle ?? "Configuració inicial"}
              </CardTitle>
              <span className="text-sm text-muted-foreground">{onboardingStatus.progress}%</span>
            </div>
            <Progress value={onboardingStatus.progress} className="h-2" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <CardDescription>
                {t.onboarding?.continueSetup ?? "Continua configurant la teva organització"}
              </CardDescription>
              <Button asChild variant="outline" size="sm">
                <Link href={buildUrl('/onboarding')}>
                  {t.onboarding?.continue ?? "Continuar"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuració d'usuari: Idioma i Contrasenya */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t.settings.userSettingsTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LanguageSelector />
          <PasswordChangeForm />
        </div>
      </div>

      {/* Gestió de membres (només admins) */}
      {canManageMembers && <MembersManager />}

      {/* Mòduls opcionals (només admins) */}
      {canManageFeatures && <FeatureFlagsSettings />}

      {/* Configuració de l'organització */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t.settings.organizationSettingsTitle}</h2>
        {canManageOrganization ? (
          <OrganizationSettings />
        ) : (
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            {t.settings.permissionDenied}
          </div>
        )}
      </div>

      {/* Gestió de categories */}
      {canManageCategories ? (
        <CategoryManager />
      ) : (
        <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          {t.settings.permissionDenied}
        </div>
      )}

      {/* Gestió de comptes bancaris (només admins) */}
      {canManageOrganization && <BankAccountsManager />}

      {/* Zona de Perill - només SuperAdmin */}
      {isSuperAdmin && <DangerZone />}
    </div>
  );
}
