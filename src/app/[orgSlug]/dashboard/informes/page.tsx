'use client';

import dynamic from 'next/dynamic';
import { ClosingBundleCard } from '@/components/reports/closing-bundle-card';
import { useTranslations } from '@/i18n';

const DonationsReportGenerator = dynamic(
  () => import('@/components/donations-report-generator').then((mod) => mod.DonationsReportGenerator),
  { ssr: false },
);

const SuppliersReportGenerator = dynamic(
  () => import('@/components/suppliers-report-generator').then((mod) => mod.SuppliersReportGenerator),
  { ssr: false },
);

const DonationCertificateGenerator = dynamic(
  () => import('@/components/donation-certificate-generator').then((mod) => mod.DonationCertificateGenerator),
  { ssr: false },
);

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
