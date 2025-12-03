'use client';

import { DonorManager } from '@/components/donor-manager';

export default function DonantsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Donants</h1>
        <p className="text-muted-foreground">
          Gestiona els donants i socis de la teva organització
        </p>
      </div>
      
      <DonorManager />
    </div>
  );
}
