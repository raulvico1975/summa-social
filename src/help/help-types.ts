export type HelpRouteKey =
  | '/dashboard'
  | '/dashboard/movimientos'
  | '/dashboard/donants'
  | '/dashboard/proveidors'
  | '/dashboard/treballadors'
  | '/dashboard/informes'
  | '/dashboard/configuracion'
  | '/dashboard/projectes'
  | '/dashboard/project-module/expenses'
  | '/dashboard/project-module/projects'
  | string;

export type HelpContent = {
  title: string;
  intro?: string;
  steps?: string[];
  tips?: string[];
  keywords?: string[];
};
