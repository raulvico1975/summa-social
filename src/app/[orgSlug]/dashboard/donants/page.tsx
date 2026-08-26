'use client';

import { DonorManager } from '@/components/donor-manager';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DonorsPage() {
  const { can } = usePermissions();

  if (!can('sections.donants')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accés restringit</CardTitle>
            <CardDescription>No tens permisos per accedir a Socis i donants.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <DonorManager />;
}
