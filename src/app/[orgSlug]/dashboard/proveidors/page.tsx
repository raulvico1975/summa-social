'use client';

import { SupplierManager } from '@/components/supplier-manager';

export default function ProveidorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Proveïdors</h1>
        <p className="text-muted-foreground">
          Gestiona els proveïdors i empreses col·laboradores
        </p>
      </div>
      
      <SupplierManager />
    </div>
  );
}
