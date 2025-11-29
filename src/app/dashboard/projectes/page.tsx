
import { ProjectManager } from '@/components/project-manager';

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Projectes</h1>
        <p className="text-muted-foreground">Gestiona els teus projectes amb fons finalistes i fes seguiment dels seus balanços.</p>
      </div>
      <ProjectManager />
    </div>
  );
}
