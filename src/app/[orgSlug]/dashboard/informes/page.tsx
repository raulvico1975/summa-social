'use client';

import { DonationsReportGenerator } from '@/components/donations-report-generator';
import { SuppliersReportGenerator } from '@/components/suppliers-report-generator';
import { DonationCertificateGenerator } from '@/components/donation-certificate-generator';
import { ClosingBundleCard } from '@/components/reports/closing-bundle-card';
import { useTranslations } from '@/i18n';

export default function ReportsPage() {
    const { t } = useTranslations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.reports.title}</h1>
        <p className="text-muted-foreground">{t.reports.description}</p>
      </div>
      <DonationsReportGenerator />
      <SuppliersReportGenerator />
      <DonationCertificateGenerator />
      <ClosingBundleCard />
    </div>
  );
}
