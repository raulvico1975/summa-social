import { EmisorManager } from '@/components/emisor-manager';

export default function EmissorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Emissors</h1>
        <p className="text-muted-foreground">Gestiona els emissors de la teva organització (proveïdors, donants, etc.).</p>
      </div>
      <EmisorManager />
    </div>
  );
}
