
import { DonationsReportGenerator } from '@/components/donations-report-generator';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Informes</h1>
        <p className="text-muted-foreground">Genera informes personalizats per a la teva organització.</p>
      </div>
      <DonationsReportGenerator />
    </div>
  );
}
