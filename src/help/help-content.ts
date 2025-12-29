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
};

export const HELP_CONTENT: Record<HelpRouteKey, HelpContent> = {
  '/dashboard': {
    title: 'Ajuda · Dashboard',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
  },
  '/dashboard/movimientos': {
    title: 'Ajuda · Moviments',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
  },
  '/dashboard/donants': {
    title: 'Ajuda · Donants',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
  },
  '/dashboard/proveidors': {
    title: 'Ajuda · Proveïdors',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
  },
  '/dashboard/treballadors': {
    title: 'Ajuda · Treballadors',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
  },
  '/dashboard/informes': {
    title: 'Ajuda · Informes',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
  },
  '/dashboard/configuracion': {
    title: 'Ajuda · Configuració',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
  },
  '/dashboard/projectes': {
    title: 'Ajuda · Projectes',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
  },
  '/dashboard/project-module/expenses': {
    title: 'Ajuda · Assignació de despeses',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
  },
  '/dashboard/project-module/projects': {
    title: 'Ajuda · Gestió de projectes',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
  },
};

export const HELP_FALLBACK: HelpContent = {
  title: 'Ajuda',
  intro: 'Aquesta pantalla encara no té ajuda.',
  steps: [],
};

/**
 * Normalitza un pathname eliminant el segment orgSlug inicial.
 * Ex: /acme/dashboard/movimientos -> /dashboard/movimientos
 */
export function normalizePathname(pathname: string): HelpRouteKey {
  const parts = pathname.split('/').filter(Boolean);

  // Si el primer segment no és 'dashboard', assumim que és orgSlug
  if (parts.length > 0 && parts[0] !== 'dashboard') {
    // Eliminar orgSlug
    parts.shift();
  }

  return '/' + parts.join('/');
}

/**
 * Obté el contingut d'ajuda per a una ruta donada.
 */
export function getHelpContent(pathname: string): HelpContent {
  const normalizedPath = normalizePathname(pathname);
  return HELP_CONTENT[normalizedPath] ?? HELP_FALLBACK;
}
