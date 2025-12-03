'use client';

import { DonationsReportGenerator } from '@/components/donations-report-generator';
import { useTranslations } from '@/i18n';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';
import { useCurrentOrganization } from '@/hooks/organization-provider';

export default function ReportsPage() {
  const { t } = useTranslations();
  const { organization } = useCurrentOrganization();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.reports.title}</h1>
        <p className="text-muted-foreground">{t.reports.description}</p>
      </div>

      <div className="grid gap-6">
        <DonationsReportGenerator />
        
        <Link href={`/${organization?.slug}/dashboard/informes/certificats`}>
          <Card className="hover:bg-accent cursor-pointer transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Certificats de Donació
              </CardTitle>
              <CardDescription>
                Genera certificats fiscals per als teus donants
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
