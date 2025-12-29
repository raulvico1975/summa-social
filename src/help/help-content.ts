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

export const HELP_CONTENT: Record<HelpRouteKey, HelpContent> = {
  '/dashboard': {
    title: 'Ajuda · Dashboard',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
  },
  '/dashboard/movimientos': {
    title: 'Ajuda · Moviments',
    intro:
      'Aquí importes i revises els moviments del banc, i els prepares perquè la fiscalitat i els informes surtin nets.',
    steps: [
      'Importa l\'extracte: clica "Importar extracte" i puja el CSV/XLSX del banc.',
      'Revisa la previsualització abans d\'importar (dates, imports i descripcions).',
      'Filtra el llistat per trobar pendents: "Sense categoritzar", "Sense contacte" i (si apareix) "Devolucions pendents".',
      'Obre un moviment i assigna Categoria i Contacte (donant/proveïdor/treballador) si falta.',
      'Adjunta el document (factura/justificant) quan calgui: icona de document o arrossegant-lo sobre la fila (si està disponible a la teva pantalla).',
      'Si veus una remesa (un sol ingrés amb moltes quotes), usa el menú ⋮ de la fila per "Dividir remesa".',
      'Si veus un ingrés de Stripe, usa el menú ⋮ per "Dividir remesa Stripe" i puja el CSV de Stripe (Pagos → export).',
      'Quan acabis, comprova que els moviments clau queden amb Categoria + Contacte: això redueix errors als models fiscals i certificats.',
    ],
    tips: [
      'Prioritza primer els filtres de pendents (Sense categoritzar / Sense contacte) abans d\'entrar a retocar casos puntuals.',
      'En devolucions, el moviment original no es toca: cal assignar el donant a la devolució perquè resti correctament a la fiscalitat.',
      'Si un contacte té "categoria per defecte", en assignar-lo a un moviment la categoria es pot completar automàticament.',
    ],
    keywords: ['importar', 'extracte', 'categoria', 'contacte', 'remesa', 'stripe', 'devolucions', 'document'],
  },
  '/dashboard/donants': {
    title: 'Ajuda · Donants',
    intro:
      'Aquí gestiones donants i socis, i prepares les dades perquè el Model 182 i els certificats surtin correctes.',
    steps: [
      'Crea un donant nou amb "+ Nou donant", o importa una llista amb "Importar donants" (Excel/CSV).',
      'Assegura\'t que els camps fiscals mínims estan complets: DNI/CIF i Codi Postal (imprescindibles per Model 182).',
      'Si un donant ja existeix i estàs important dades, activa "Actualitzar dades de donants existents" quan vulguis posar al dia CP, IBAN, email, estat, etc.',
      'Mantén l\'estat "Actiu/Baixa" al dia (i reactiva quan correspongui).',
      'Assigna una "Categoria per defecte" al donant si és útil: així, quan l\'assignis a un moviment, la categoria pot quedar predefinida.',
      'Obre la fitxa d\'un donant per veure l\'historial i el resum anual de donacions.',
      'Genera un certificat anual des de la fitxa del donant quan te\'l demanin (selecciona l\'any).',
      'Abans de generar Model 182 o certificats massius, resol donants amb dades incompletes (DNI/CP): és el que sol provocar errors.',
    ],
    tips: [
      'Si tens devolucions, revisa que estiguin assignades al donant correcte: afecten el total net certificat i el Model 182.',
      'Per a imports massius, és millor importar i corregir duplicats que no pas crear manualment un per un.',
      'Quan hi ha dubtes amb un donant, la fitxa (resum anual + moviments) és el lloc més ràpid per validar què està passant.',
    ],
    keywords: ['importar', 'dni', 'codi postal', 'model 182', 'certificat', 'baixa', 'categoria per defecte', 'historial'],
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
