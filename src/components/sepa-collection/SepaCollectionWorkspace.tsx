'use client';

import * as React from 'react';
import { Clock3, PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from '@/i18n';
import { SepaCollectionWizard } from './SepaCollectionWizard';
import { SepaCollectionRunsHistory } from './SepaCollectionRunsHistory';

type SepaCollectionView = 'create' | 'history';

export function SepaCollectionWorkspace() {
  const { t, tr } = useTranslations();
  const [view, setView] = React.useState<SepaCollectionView>('create');

  return (
    <Tabs value={view} onValueChange={(value) => setView(value as SepaCollectionView)} className="w-full space-y-4 lg:space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 max-w-3xl space-y-1">
          <h1 className="text-2xl font-bold tracking-tight font-headline">
            {tr('sepaPain008.workspace.entryLabel', 'Gestió de remeses')}
          </h1>
          <p className="text-muted-foreground">
            {t.sepaCollection.description}
          </p>
        </div>

        <div className="flex justify-start xl:justify-end">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl border border-border/70 bg-background p-1 sm:w-auto sm:min-w-[360px]">
            <TabsTrigger value="create" className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm text-center">
              <PlusCircle className="h-4 w-4" />
              <span>{t.sepaCollection.newCollection}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm text-center">
              <Clock3 className="h-4 w-4" />
              <span>{tr('sepaPain008.history.tab', 'Historial')}</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <div className="w-full">
        <TabsContent value="create" forceMount className={view === 'create' ? 'mt-0' : 'hidden'}>
          <SepaCollectionWizard />
        </TabsContent>

        <TabsContent value="history" forceMount className={view === 'history' ? 'mt-0' : 'hidden'}>
          <SepaCollectionRunsHistory />
        </TabsContent>
      </div>
    </Tabs>
  );
}
