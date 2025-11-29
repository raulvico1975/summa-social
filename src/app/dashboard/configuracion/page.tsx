import { CategoryManager } from '@/components/category-manager';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Configuración</h1>
        <p className="text-muted-foreground">Gestiona las categorías y otros ajustes de la aplicación.</p>
      </div>
      <CategoryManager />
    </div>
  );
}
