'use client';

import { SepaCollectionWorkspace } from '@/components/sepa-collection/SepaCollectionWorkspace';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SepaCollectionPage() {
  const { canAccessSepaCollection } = usePermissions();

  if (!canAccessSepaCollection) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accés restringit</CardTitle>
            <CardDescription>No tens permisos per accedir a la gestió de remeses.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <SepaCollectionWorkspace />;
}
