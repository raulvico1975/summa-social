'use client';

import { DonationCertificateGenerator } from '@/components/donation-certificate-generator';
import { useTranslations } from '@/i18n';

export default function CertificateGeneratorPage() {
    const { t } = useTranslations();
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
