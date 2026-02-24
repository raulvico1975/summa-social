'use client';

import { DonationCertificateGenerator } from '@/components/donation-certificate-generator';
import { useTranslations } from '@/i18n';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CertificateGeneratorPage() {
    const { t } = useTranslations();
    const { can } = usePermissions();

  if (!can('sections.informes')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acces restringit</CardTitle>
            <CardDescription>No tens permisos per accedir a Informes.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.certificates.pageTitle}</h1>
        <p className="text-muted-foreground">{t.certificates.pageDescription}</p>
      </div>
      <DonationCertificateGenerator />
    </div>
  );
}
