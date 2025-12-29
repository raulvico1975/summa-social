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
    intro:
      'Aquí generes els outputs per a la gestoria: Model 182, Model 347 i certificats de donació.',
    steps: [
      'Tria la secció adequada: Model 182 (donacions), Model 347 (tercers) o Certificats.',
      'Selecciona l\'any fiscal abans de generar cap fitxer.',
      'Model 182: revisa les alertes de donants amb dades incompletes (sobretot DNI/CIF i Codi Postal).',
      'Model 182: corregeix les dades des de Donants i torna a aquesta pantalla per regenerar.',
      'Model 182: genera l\'Excel i envia\'l a la gestoria.',
      'Model 347: comprova que els proveïdors tinguin CIF correcte; només apareixeran els que superin el llindar anual.',
      'Model 347: genera el CSV i envia\'l a la gestoria.',
      'Certificats: genera un certificat individual quan un donant te\'l demani, o bé genera\'ls en lot si ho fas per campanya anual.',
      'Si hi ha devolucions assignades a donants, aquestes resten automàticament del total net (important per 182 i certificats).',
    ],
    tips: [
      'Abans de tancar l\'any, assegura\'t que les devolucions estan assignades al donant correcte: és la causa típica de totals incoherents.',
      'Si un donant no té DNI o Codi Postal, pot bloquejar o embrutar el Model 182: prioritza completar aquests camps.',
      'Per certificats massius, revisa primer 2 o 3 donants representatius (amb i sense devolucions) per validar que els imports quadren.',
    ],
    keywords: ['model 182', 'model 347', 'certificats', 'excel', 'csv', 'any', 'donacions', 'devolucions', 'gestoria'],
  },
  '/dashboard/configuracion': {
    title: 'Ajuda · Configuració',
    intro:
      'Aquí configures les dades base de l\'organització perquè els certificats i els informes fiscals surtin correctes.',
    steps: [
      'Completa les dades fiscals de l\'organització (nom, CIF, adreça i contacte): són les que apareixen als certificats i documents.',
      'Puja el logo de l\'organització: s\'utilitza als certificats i dona coherència visual a l\'output.',
      'Configura la firma digitalitzada (imatge) i omple el nom i càrrec del signant: sense això, els certificats poden quedar incomplets.',
      'Revisa les categories: assegura\'t que tens categories d\'ingrés i despesa coherents amb el teu dia a dia (donacions, quotes, nòmines, despeses bancàries…).',
      'Si treballeu en equip, gestiona els membres: convida persones i assigna rols segons el que necessiten fer (editar vs només lectura).',
      'Ajusta preferències si existeixen (p. ex. llindars d\'alertes): l\'objectiu és veure només el que aporta valor i evitar soroll.',
      'Quan tinguis dubtes d\'un resultat fiscal, torna aquí i revisa primer: dades de l\'entitat + signatura + categories (és el que més sovint ho explica).',
    ],
    tips: [
      'Prioritza sempre: dades fiscals + signatura. És el que impacta directament en certificats i Model 182.',
      'Si una persona només ha de consultar dades, posa rol de lectura: evita canvis accidentals.',
      'Si canvies categories després d\'haver treballat mesos, fes-ho amb prudència: és millor afegir que no pas renombrar agressivament.',
    ],
    keywords: ['organització', 'cif', 'adreça', 'logo', 'firma', 'signant', 'categories', 'membres', 'rols', 'preferències'],
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
