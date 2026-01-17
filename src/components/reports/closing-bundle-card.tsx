'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive } from 'lucide-react';
import { useTranslations } from '@/i18n';
import { ClosingBundleDialog } from './closing-bundle-dialog';

export function ClosingBundleCard() {
  const { t } = useTranslations();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t.reports.closingBundle.title}</CardTitle>
          <CardDescription>
            {t.reports.closingBundle.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setDialogOpen(true)}>
            <Archive className="mr-2 h-4 w-4" />
            {t.reports.closingBundle.cta}
          </Button>
        </CardContent>
      </Card>

      <ClosingBundleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
