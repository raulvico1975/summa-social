
'use client';

import { DonationsReportGenerator } from '@/components/donations-report-generator';
import { useTranslations } from '@/i18n';

export default function ReportsPage() {
  const { t } = useTranslations();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.reports.title}</h1>
        <p className="text-muted-foreground">{t.reports.description}</p>
      </div>
      <DonationsReportGenerator />
    </div>
  );
}
