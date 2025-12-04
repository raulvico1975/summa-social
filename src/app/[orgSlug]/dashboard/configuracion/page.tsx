'use client';

import { CategoryManager } from '@/components/category-manager';
import { PasswordChangeForm } from '@/components/password-change-form';
import { OrganizationSettings } from '@/components/organization-settings';
import { LanguageSelector } from '@/components/language-selector';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';

export default function SettingsPage() {
  const { userRole } = useCurrentOrganization();
  const { t } = useTranslations();

  // Només admins i tresorers poden veure la configuració de l'organització
  const canManageOrganization = userRole === 'admin';
  const canManageCategories = userRole === 'admin' || userRole === 'treasurer';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {canManageOrganization ? (
            <OrganizationSettings />
          ) : (
             <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                {t.settings.permissionDenied}
             </div>
          )}
        </div>
        <div className="space-y-6">
          <PasswordChangeForm />
          <LanguageSelector />
        </div>
      </div>
       {canManageCategories ? (
        <CategoryManager />
      ) : (
         <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            {t.settings.permissionDenied}
         </div>
      )}
    </div>
  );
}
