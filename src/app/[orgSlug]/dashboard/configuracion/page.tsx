'use client';

import { CategoryManager } from '@/components/category-manager';
import { PasswordChangeForm } from '@/components/password-change-form';
import { OrganizationSettings } from '@/components/organization-settings';
import { LanguageSelector } from '@/components/language-selector';
import { MembersManager } from '@/components/members-manager';
import { FeatureFlagsSettings } from '@/components/feature-flags-settings';
import { BankAccountsManager } from '@/components/bank-accounts/bank-accounts-manager';
import { DangerZone } from '@/components/danger-zone';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';
import { useFirebase } from '@/firebase';
import { SUPER_ADMIN_UID } from '@/lib/data';

export default function SettingsPage() {
  const { userRole } = useCurrentOrganization();
  const { t } = useTranslations();
  const { user } = useFirebase();

  // Només admins poden gestionar l'organització, categories i membres
  const canManageOrganization = userRole === 'admin';
  const canManageCategories = userRole === 'admin';
  const canManageMembers = userRole === 'admin';
  const canManageFeatures = userRole === 'admin';

  // Només SuperAdmin pot veure la Zona de Perill
  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;

  return (
    <div className="space-y-6">
      {/* Títol de la pàgina */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.settings.title}</h1>
        <p className="text-muted-foreground">{t.settings.description}</p>
      </div>

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
