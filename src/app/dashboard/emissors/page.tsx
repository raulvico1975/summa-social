
'use client';

import { EmisorManager } from '@/components/emisor-manager';
import { useTranslations } from '@/i18n';

export default function EmissorsPage() {
  const { t } = useTranslations();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.emissors.title}</h1>
        <p className="text-muted-foreground">{t.emissors.description}</p>
      </div>
      <EmisorManager />
    </div>
  );
}
