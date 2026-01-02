/**
 * Afegeix traduccions d'ajuda contextual (HelpSheet) als JSON i18n
 *
 * Execució: npx tsx scripts/i18n/add-help-translations.ts
 *
 * Estructura de claus:
 * - help.<routeKey>.title
 * - help.<routeKey>.intro
 * - help.<routeKey>.steps.0, .1, .2...
 * - help.<routeKey>.tips.0, .1, .2...
 * - help.<routeKey>.keywords.0, .1, .2...
 * - help.<routeKey>.extra.order.title
 * - help.<routeKey>.extra.order.items.0, .1, .2...
 * - help.<routeKey>.extra.pitfalls.title
 * - help.<routeKey>.extra.pitfalls.items.0, .1, .2...
 * - ... (i totes les altres seccions extra)
 * - help.<routeKey>.extra.manual.label
 * - help.<routeKey>.extra.video.label
 * - help.<routeKey>.extra.video.note
 *
 * NOTA: Les hrefs de manual/video queden al codi (no traducibles).
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Tipus
// ─────────────────────────────────────────────────────────────────────────────

type HelpExtraSection = {
  title: string;
  items: string[];
};

type HelpExtraLink = {
  label: string;
  note?: string;
};

type HelpExtra = {
  order?: HelpExtraSection;
  pitfalls?: HelpExtraSection;
  whenNot?: HelpExtraSection;
  checks?: HelpExtraSection;
  returns?: HelpExtraSection;
  remittances?: HelpExtraSection;
  contacts?: HelpExtraSection;
  categories?: HelpExtraSection;
  documents?: HelpExtraSection;
  bankAccounts?: HelpExtraSection;
  ai?: HelpExtraSection;
  bulk?: HelpExtraSection;
  importing?: HelpExtraSection;
  filters?: HelpExtraSection;
  quality?: HelpExtraSection;
  manual?: HelpExtraLink;
  video?: HelpExtraLink;
};

type HelpContent = {
  title: string;
  intro?: string;
  steps?: string[];
  tips?: string[];
  extra?: HelpExtra;
  keywords?: string[];
};

type HelpData = Record<string, HelpContent>;
type JsonMessages = Record<string, string>;

// ─────────────────────────────────────────────────────────────────────────────
// Normalització de routeKey
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalitza el routeKey per usar com a clau JSON
 * /dashboard/movimientos → movimientos
 * /dashboard/project-module/expenses → project_expenses
 * /dashboard/project-module/projects → project_projects
 * /dashboard/ejes-de-actuacion → ejes_de_actuacion
 * /redirect-to-org → redirect_to_org
 */
function normalizeRouteKey(route: string): string {
  // Eliminar /dashboard/ prefix
  let key = route.replace(/^\/dashboard\//, '').replace(/^\//, '');

  // Si és projecte, normalitzar
  if (key.startsWith('project-module/')) {
    key = key.replace('project-module/', 'project_');
  }

  // Reemplaçar - per _ i / per _
  key = key.replace(/-/g, '_').replace(/\//g, '_');

  // Cas especial: dashboard root
  if (key === '' || route === '/dashboard') {
    key = 'dashboard';
  }

  return key;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aplanar HelpContent a claus JSON
// ─────────────────────────────────────────────────────────────────────────────

function flattenHelpContent(routeKey: string, content: HelpContent): JsonMessages {
  const result: JsonMessages = {};
  const prefix = `help.${normalizeRouteKey(routeKey)}`;

  // title (obligatori)
  result[`${prefix}.title`] = content.title;

  // intro (opcional)
  if (content.intro) {
    result[`${prefix}.intro`] = content.intro;
  }

  // steps[] (opcional)
  if (content.steps && content.steps.length > 0) {
    content.steps.forEach((step, i) => {
      result[`${prefix}.steps.${i}`] = step;
    });
  }

  // tips[] (opcional)
  if (content.tips && content.tips.length > 0) {
    content.tips.forEach((tip, i) => {
      result[`${prefix}.tips.${i}`] = tip;
    });
  }

  // keywords[] (opcional)
  if (content.keywords && content.keywords.length > 0) {
    content.keywords.forEach((kw, i) => {
      result[`${prefix}.keywords.${i}`] = kw;
    });
  }

  // extra sections
  if (content.extra) {
    const extraSections: (keyof HelpExtra)[] = [
      'order',
      'pitfalls',
      'whenNot',
      'checks',
      'returns',
      'remittances',
      'contacts',
      'categories',
      'documents',
      'bankAccounts',
      'ai',
      'bulk',
      'importing',
      'filters',
      'quality',
    ];

    for (const sectionName of extraSections) {
      const section = content.extra[sectionName] as HelpExtraSection | undefined;
      if (section && section.title && section.items) {
        result[`${prefix}.extra.${sectionName}.title`] = section.title;
        section.items.forEach((item, i) => {
          result[`${prefix}.extra.${sectionName}.items.${i}`] = item;
        });
      }
    }

    // manual.label (no href)
    if (content.extra.manual?.label) {
      result[`${prefix}.extra.manual.label`] = content.extra.manual.label;
    }

    // video.label i video.note (no href)
    if (content.extra.video) {
      if (content.extra.video.label) {
        result[`${prefix}.extra.video.label`] = content.extra.video.label;
      }
      if (content.extra.video.note) {
        result[`${prefix}.extra.video.note`] = content.extra.video.note;
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dades d'ajuda per idioma
// ─────────────────────────────────────────────────────────────────────────────

const HELP_CA: HelpData = {
  '/dashboard': {
    title: 'Ajuda · Dashboard',
    intro:
      'Aquesta pantalla és la foto ràpida: et diu com està l\'organització avui (sense entrar al detall). Serveix per orientar-te, no per "tancar" feina.',
    steps: [
      'Mira primer el balanç i les principals xifres (ingressos/despeses) per entendre el període.',
      'Detecta senyals de feina pendent (moviments sense contacte/categoria, devolucions) i ves directament a Moviments.',
      'Si estàs en mode fiscal, revisa terminis i prepara Informes quan toqui.',
      'Si treballes per projectes, entra al mòdul de Projectes per veure execució i assignacions.',
      'Torna al Dashboard per verificar que l\'ordre general té sentit (tendència i coherència).',
    ],
    tips: [
      'El Dashboard és brúixola: decisions i correccions es fan a Moviments/Contactes/Informes.',
      'Si una xifra "et sorprèn", no ho arreglis aquí: baixa al detall i valida l\'origen.',
      'Una revisió curta (1–2 cops per setmana) evita que els pendents creixin.',
    ],
    extra: {
      order: {
        title: 'Ordre recomanat (2 minuts)',
        items: [
          'Foto general (xifres).',
          'Pendents → Moviments.',
          'Fiscal → Informes.',
          'Projectes → Assignació.',
        ],
      },
      pitfalls: {
        title: 'Errors habituals',
        items: [
          'Esperar que el Dashboard resolgui problemes (només mostra).',
          'Interpretar xifres sense revisar devolucions/remeses.',
          'Voler "tancar" el mes només des d\'aquí.',
        ],
      },
      whenNot: {
        title: 'Quan no cal preocupar-se',
        items: [
          'Si el dia a dia està controlat, no cal mirar-ho cada dia.',
          'Si hi ha pendents petits, resol-los a Moviments i torna després.',
        ],
      },
      manual: {
        label: 'Manual d\'usuari · Entendre el Dashboard',
      },
      video: {
        label: 'Vídeo (properament)',
        note: 'Llegir el Dashboard i saber què fer després (6 minuts)',
      },
    },
    keywords: ['dashboard', 'balanç', 'pendents', 'moviments', 'informes', 'projectes', 'tendència'],
  },
  '/dashboard/movimientos': {
    title: 'Ajuda · Moviments',
    intro:
      'Aquesta pantalla és el centre de control del dia a dia: aquí revises què entra i què surt del banc, detectes pendents i evites errors abans que es facin grans.',
    steps: [
      'Comença pels pendents: filtra per "Sense contacte", "Sense categoria" i "Devolucions pendents" si apareixen.',
      'Assigna primer el contacte (donant, proveïdor o treballador): dona context al moviment.',
      'Assigna després la categoria quan el contacte ja és clar.',
      'Revisa ingressos agrupats (remeses): divideix-les abans de continuar si cal.',
      'Adjunta documents només quan aporten valor (factures, justificants rellevants).',
    ],
    tips: [
      'Ordre recomanat: contacte → categoria → document. Canviar l\'ordre sol generar dubtes després.',
      'Si un moviment et genera dubte, deixa\'l pendent i segueix amb la resta.',
      'Una passada regular pels pendents evita acumulacions difícils de revisar.',
    ],
    extra: {
      order: {
        title: 'Ordre recomanat de treball',
        items: [
          'Filtrar pendents (què està sense resoldre).',
          'Assignar contactes.',
          'Assignar categories.',
          'Revisar remeses i devolucions.',
          'Adjuntar documents quan aporten valor.',
        ],
      },
      pitfalls: {
        title: 'Errors habituals',
        items: [
          'Assignar categoria sense haver definit el contacte.',
          'Forçar una assignació només per "deixar-ho net".',
          'Dividir remeses massa tard, amb altres camps ja tocats.',
          'Generar informes sense haver revisat devolucions.',
        ],
      },
      whenNot: {
        title: 'Quan no cal fer res',
        items: [
          'No cal assignar projecte si només controles el dia a dia.',
          'No cal adjuntar document a moviments petits i evidents.',
          'No cal resoldre tots els dubtes al moment: pendents conscients també són control.',
        ],
      },
      returns: {
        title: 'Devolucions (control ràpid)',
        items: [
          'Prioritat: assignar el donant correcte. Si no hi ha donant, fiscalment no resta on toca.',
          'En remeses de devolucions, el pare no porta contacte: el donant va a les filles.',
          "Si hi ha pendents, resol-les abans d'exportar 182/certificats (evita totals inflats).",
          "Si dubtes, deixa pendent conscient i continua; però no ho oblidis abans de tancament.",
        ],
      },
      remittances: {
        title: 'Remeses (quotes i Stripe)',
        items: [
          "Remesa = un moviment que agrupa moltes quotes. Divideix-la abans d'assignar contactes/categoria a mà.",
          'Després de dividir, treballa sobre les quotes filles (són les que compten per donant).',
          "Stripe: usa \"Dividir remesa Stripe\" i revisa pendents d'assignació (matching per email).",
          'Si una remesa ja està processada, no la tornis a tocar: revisa el detall des del badge/modal.',
        ],
      },
      contacts: {
        title: 'Contactes (criteri ràpid)',
        items: [
          'Assigna primer el contacte: dona context i fa la categoria més fiable.',
          'Si és una nòmina → Treballador. Si és una factura d\'un tercer → Proveïdor. Si és un ingrés de quota/donació → Donant.',
          'Si no tens clar el contacte, deixa\'l pendent i busca pistes al concepte bancari o al document.',
          'Evita crear contactes nous per casos puntuals petits: crea només els recurrents o rellevants.',
        ],
      },
      categories: {
        title: 'Categories (criteri ràpid)',
        items: [
          'Assigna la categoria després del contacte: el contacte sovint suggereix la categoria correcta (categoria per defecte).',
          'Si dubtes entre dues categories, tria la més estable i coherent amb l\'històric (consistència > precisió fictícia).',
          'No forcis categories "per deixar-ho net": un pendent conscient és millor que una categoria equivocada.',
          'Per imports massius, filtra pendents i aplica un criteri repetible abans d\'entrar al detall.',
        ],
      },
      documents: {
        title: 'Documents (criteri ràpid)',
        items: [
          'No cal adjuntar document a cada moviment: reserva-ho per factures, justificants importants o requisits de subvenció.',
          'Si adjuntes des del modal del moviment, el document queda vinculat automàticament.',
          'Un nom de fitxer clar (data + concepte) ajuda després a trobar-lo sense cercar.',
          'Per justificació de projectes, el document pot ser obligatori: revisa-ho abans de tancar.',
        ],
      },
      bankAccounts: {
        title: 'Multi-compte bancari (criteri ràpid)',
        items: [
          'Cada compte sincronitza per separat: si tens més d\'un, filtra per compte quan revisem pendents.',
          'Els saldos del Dashboard sumen tots els comptes: no interpretis com a problema un saldo global diferent del que veus al banc.',
          'Transferències internes apareixen com a sortida d\'un compte i entrada a l\'altre: assigna la mateixa categoria (p. ex. Transferències internes) i no les comptis dues vegades com a despesa/ingrés real.',
          'Quan sincronitzis un nou compte, revisa les dades inicials (saldo obert, data inici) abans de continuar.',
        ],
      },
      ai: {
        title: 'Categorització amb IA (quan usar-la)',
        items: [
          'Ús ideal: molts moviments sense categoria i patrons repetitius.',
          'Regla d\'or: la IA suggereix, tu valides. No assumeixis que sempre encerta.',
          'Si el contacte és clar, assigna primer el contacte: la categoria sol sortir més neta.',
          'Després de l\'IA, revisa una mostra (5–10) abans de donar-ho per bo.',
        ],
      },
      bulk: {
        title: 'Accions massives (per netejar ràpid)',
        items: [
          'Filtra primer (pendents) i després selecciona en bloc: així no toques el que ja està bé.',
          'Aplica canvis repetibles (mateixa categoria) a grups coherents, no a "tot el mes".',
          'Si tens dubtes, fes-ho en lots petits: és més fàcil desfer i revisar.',
          'Després d\'una acció massiva, revisa 3–5 files a l\'atzar per validar.',
        ],
      },
      importing: {
        title: 'Importar extracte (sense sorpreses)',
        items: [
          'Descarrega l\'extracte del banc en CSV/XLSX i puja\'l tal qual.',
          'Evita obrir i desar el CSV amb Excel si canvia formats: pot trencar separadors i decimals.',
          'Abans d\'importar, revisa la previsualització: dates, imports i descripcions.',
          'Si detectes duplicats o imports estranys, atura i revisa el fitxer abans de continuar.',
        ],
      },
      filters: {
        title: 'Filtres (com treballar ràpid)',
        items: [
          'Regla: filtrar abans d\'editar. Primer troba el grup de pendents, després actua.',
          'Filtres estrella: Sense contacte, Sense categoria, Devolucions pendents.',
          'Per revisar una tasca concreta, combina filtre + cerca (nom, import, paraula clau).',
          'En grans volums, treballa per lots petits (per setmana o per tipus) i valida al final.',
        ],
      },
      manual: {
        label: "Manual d'usuari · Gestió de Moviments",
      },
      video: {
        label: 'Vídeo (properament)',
        note: 'Com mantenir Moviments sota control en 10 minuts',
      },
    },
    keywords: [
      'control',
      'pendents',
      'contacte',
      'categoria',
      'remesa',
      'devolucions',
      'document',
      'dia a dia',
      'ia',
      'massiu',
      'importar',
      'filtres',
    ],
  },
  '/dashboard/donants': {
    title: 'Ajuda · Donants',
    intro:
      'Aquesta pantalla és la base fiscal de l\'entitat: si DNI/CIF i Codi Postal són correctes, el Model 182 i els certificats surten nets.',
    steps: [
      'Prioritza DNI/CIF i Codi Postal: és el que més sovint bloqueja o embruta el 182.',
      'Evita duplicats: si importes, actualitza existents en lloc de crear-ne de nous.',
      'Mantén Actiu/Baixa al dia per tenir llista neta sense perdre històric.',
      'Assigna categoria per defecte si ajuda a categoritzar moviments de manera consistent.',
      'Abans de certificats o 182, valida 2–3 donants representatius (amb i sense devolucions).',
    ],
    tips: [
      'Ordre operatiu: DNI/CP → estat → (si cal) categoria per defecte.',
      'Si una devolució està mal assignada, distorsiona el total net del certificat.',
      'No tot donant necessita fitxa perfecta: fiscal mínim i prou.',
    ],
    extra: {
      order: {
        title: 'Ordre recomanat',
        items: [
          'Completar DNI/CIF i Codi Postal.',
          'Revisar estat Actiu/Baixa.',
          'Evitar duplicats (actualitzar).',
          'Validar devolucions si n\'hi ha.',
        ],
      },
      pitfalls: {
        title: 'Errors habituals',
        items: [
          'Deixar DNI o Codi Postal buit i esperar que el 182 surti bé.',
          'Crear duplicats per manca de criteri en importacions.',
          'Ignorar devolucions i inflar totals nets.',
        ],
      },
      whenNot: {
        title: 'Quan no cal complicar-ho',
        items: [
          'No cal omplir totes les dades si no aporten valor (prioritza fiscal).',
          'No cal generar certificats massius si encara hi ha dades fiscals pendents.',
        ],
      },
      returns: {
        title: 'Devolucions (impacte fiscal)',
        items: [
          'Una devolució assignada al donant resta del total net (certificat i Model 182).',
          'Si la devolució no té donant assignat, no resta a ningú: el total queda inflat.',
          'Si una devolució està assignada al donant equivocat, distorsiona dos donants a la vegada.',
          'Abans de tancar l\'any, revisa devolucions pendents i les del donant amb imports estranys.',
        ],
      },
      quality: {
        title: 'Qualitat fiscal (check ràpid)',
        items: [
          'DNI/CIF i Codi Postal complets: és el mínim per 182.',
          'Evitar duplicats: un sol donant per DNI (actualitza, no repliquis).',
          'Coherència d\'estat: baixa quan toca, actiu si segueix aportant.',
          'Mostra de validació: 2–3 donants representatius abans d\'exports massius.',
        ],
      },
      manual: {
        label: 'Manual d\'usuari · Gestió de Donants',
      },
      video: {
        label: 'Vídeo (properament)',
        note: 'Deixar Donants a punt per al Model 182 (10 minuts)',
      },
    },
    keywords: ['donants', 'socis', 'dni', 'cif', 'codi postal', 'model 182', 'certificats', 'baixa', 'devolucions', 'qualitat'],
  },
  '/dashboard/proveidors': {
    title: 'Ajuda · Proveïdors',
    intro:
      'Aquesta pantalla ordena els tercers que et facturen. Si el CIF i la identificació estan bé, el Model 347 surt sense neteges d\'última hora.',
    steps: [
      'Crea proveïdors per despeses recurrents o significatives (no per tot).',
      'Completa nom + CIF: és el camp crític per al Model 347.',
      'Posa categoria per defecte si és sempre el mateix tipus de despesa.',
      'Mantén actiu/inactiu per netejar llista sense perdre historial.',
    ],
    tips: [
      'CIF correcte > qualsevol altra dada.',
      'Si canvia el nom comercial però no el CIF, actualitza el mateix proveïdor.',
      'Categoria per defecte accelera Moviments, però revisa-la si hi ha excepcions.',
    ],
    extra: {
      order: {
        title: 'Ordre recomanat',
        items: [
          'Crear només els recurrents.',
          'Validar CIF.',
          'Definir categoria per defecte.',
          'Marcar inactius els que ja no s\'usen.',
        ],
      },
      pitfalls: {
        title: 'Errors habituals',
        items: [
          'Crear duplicats del mateix proveïdor amb el mateix CIF.',
          'Deixar CIF buit i esperar que el 347 surti bé.',
          'Barrejar proveïdors amb treballadors (cada tipus té funció diferent).',
        ],
      },
      whenNot: {
        title: 'Quan no cal',
        items: [
          'No cal crear proveïdor per despeses puntuals petites.',
          'No cal omplir dades extra si no les faràs servir.',
        ],
      },
      manual: {
        label: 'Manual d\'usuari · Proveïdors i Treballadors',
      },
      video: {
        label: 'Vídeo (properament)',
        note: 'Preparar Proveïdors per al Model 347 (8 minuts)',
      },
    },
    keywords: ['proveïdor', 'cif', 'model 347', 'tercers', 'categoria per defecte', 'inactiu', 'duplicats'],
  },
  '/dashboard/treballadors': {
    title: 'Ajuda · Treballadors',
    intro:
      'Aquesta pantalla serveix per ordenar despeses de personal (nòmines i pagaments recurrents). Ben mantinguda, fa el dia a dia més net i coherent.',
    steps: [
      'Crea un treballador quan tinguis pagaments recurrents de personal (nòmines, dietes fixes, etc.).',
      'Introdueix nom i DNI: et dona traçabilitat i evita confusions amb noms similars.',
      'Defineix categoria per defecte (habitualment Nòmines) per agilitzar l\'assignació a Moviments.',
      'Mantén l\'estat Actiu/Inactiu quan una persona entra o surt (no cal esborrar).',
      'Quan assignis un moviment, revisa que contacte + categoria reflecteixin el que és (nòmina vs altres pagaments).',
    ],
    tips: [
      'Objectiu: coherència. No és una eina de RRHH, és classificació operativa.',
      'Inactiu > eliminar: mantens històric i evites perdre context.',
      'Si hi ha pagaments mixtos, no forcis la categoria per defecte: ajusta puntualment.',
    ],
    extra: {
      order: {
        title: 'Ordre recomanat',
        items: [
          'Crear només recurrents.',
          'Posar DNI.',
          'Categoria per defecte.',
          'Estat actiu/inactiu.',
        ],
      },
      pitfalls: {
        title: 'Errors habituals',
        items: [
          'Barrejar treballadors amb proveïdors (cada tipus té funció diferent).',
          'Esborrar treballadors i perdre històric.',
          'Aplicar sempre la categoria per defecte encara que no toqui.',
        ],
      },
      whenNot: {
        title: 'Quan no cal complicar-ho',
        items: [
          'No cal crear treballadors per pagaments puntuals irrelevants.',
          'No cal omplir camps extra si no els faràs servir.',
        ],
      },
      manual: {
        label: 'Manual d\'usuari · Proveïdors i Treballadors',
      },
      video: {
        label: 'Vídeo (properament)',
        note: 'Ordenar nòmines i despeses de personal (8 minuts)',
      },
    },
    keywords: ['treballadors', 'nòmines', 'personal', 'dni', 'categoria per defecte', 'actiu', 'inactiu'],
  },
  '/dashboard/informes': {
    title: 'Ajuda · Informes',
    intro:
      'Aquesta pantalla serveix per generar els outputs per a la gestoria: Model 182, Model 347 i certificats. Aquí no es corregeixen dades; aquí es verifiquen i s\'exporten.',
    steps: [
      'Tria l\'any fiscal i treballa sempre amb un any cada cop.',
      'Model 182: resol primer les alertes de donants (sobretot DNI/CIF i Codi Postal).',
      'Revisa devolucions assignades: afecten directament el total del 182 i dels certificats.',
      'Genera el Model 182 i envia\'l a la gestoria.',
      'Model 347: només apareixeran proveïdors que superin el llindar anual; comprova CIF abans d\'exportar.',
      'Genera certificats individuals o en lot quan correspongui.',
    ],
    tips: [
      'Si el 182 no quadra, gairebé sempre és per devolucions o dades incompletes de donants.',
      'Valida 2–3 casos representatius abans d\'enviar certificats massius.',
      'Treballa sempre amb un sol any obert per evitar confusions.',
    ],
    extra: {
      order: {
        title: 'Ordre recomanat quan toca fer informes',
        items: [
          'Seleccionar l\'any fiscal.',
          'Resoldre alertes de donants (DNI/CP).',
          'Revisar devolucions.',
          'Generar Model 182.',
          'Generar Model 347.',
          'Generar certificats.',
        ],
      },
      pitfalls: {
        title: 'Errors habituals',
        items: [
          'Generar el 182 amb donants sense DNI o Codi Postal.',
          'Oblidar devolucions pendents i inflar els totals.',
          'Barrejar anys (corregir dades d\'un any mentre n\'exportes un altre).',
          'Fer certificats massius sense validar cap cas prèviament.',
        ],
      },
      checks: {
        title: 'Checks finals abans d\'enviar a gestoria',
        items: [
          '182: cap alerta crítica pendent.',
          '182: totals coherents amb el que esperes.',
          '347: proveïdors amb CIF correcte.',
          'Certificats: signatura i càrrec configurats.',
        ],
      },
      manual: {
        label: 'Manual d\'usuari · Informes Fiscals',
      },
      video: {
        label: 'Vídeo (properament)',
        note: 'Preparar Model 182 i certificats sense sorpreses (15 minuts)',
      },
    },
    keywords: [
      'model 182',
      'model 347',
      'certificats',
      'gestoria',
      'any fiscal',
      'devolucions',
      'alertes',
      'exportar',
    ],
  },
  '/dashboard/configuracion': {
    title: 'Ajuda · Configuració',
    intro:
      'Aquí deixes l\'organització "a punt": dades fiscals, logo i signatura. Si això està bé, certificats i informes surten consistents.',
    steps: [
      'Completa dades fiscals de l\'entitat (nom, CIF, adreça): és el que surt als outputs.',
      'Puja logo i configura signatura + càrrec: és el que dona validesa als certificats.',
      'Revisa categories amb criteri: afegeix les que falten i evita canvis agressius.',
      'Gestiona membres i rols: edició només per qui realment la necessita.',
    ],
    tips: [
      'Prioritat real: fiscals + signatura. La resta és secundària.',
      'Millor afegir categories que renombrar-les si ja tens historial.',
      'Rols de lectura eviten errors accidentals.',
    ],
    extra: {
      order: {
        title: 'Ordre recomanat (10 minuts)',
        items: [
          'Dades fiscals.',
          'Logo.',
          'Signatura i càrrec.',
          'Categories i rols.',
        ],
      },
      pitfalls: {
        title: 'Errors habituals',
        items: [
          'Deixar signatura/càrrec a mig configurar i generar certificats.',
          'Renombrar categories ja en ús i perdre coherència.',
          'Donar permisos d\'edició a qui només ha de consultar.',
        ],
      },
      whenNot: {
        title: 'Quan no cal tocar res',
        items: [
          'Si només vols treballar Moviments, no cal "polir" Configuració cada dia.',
          'No cal tenir totes les dades perfectes per començar (excepte fiscals/signatura).',
        ],
      },
      manual: {
        label: 'Manual d\'usuari · Configuració inicial',
      },
      video: {
        label: 'Vídeo (properament)',
        note: 'Configurar Summa Social bé des del primer dia (8 minuts)',
      },
    },
    keywords: ['configuració', 'cif', 'adreça', 'logo', 'signatura', 'càrrec', 'categories', 'membres', 'rols'],
  },
  '/dashboard/project-module/expenses': {
    title: 'Ajuda · Assignació de despeses (Projectes)',
    intro:
      'Aquesta safata és l\'inbox de despeses assignables: aquí decideixes a quin projecte i a quina partida va cada despesa, de forma ràpida i reversible.',
    steps: [
      'Entén què veus: cada fila és una despesa (bancària o de terreny) amb un estat d\'assignació 0% / parcial / 100%.',
      'Comença pels pendents: filtra per "No assignades" (0%) per prioritzar el que encara no està imputat a cap projecte.',
      'Quick Assign 100%: usa l\'acció ràpida per assignar tota la despesa a un projecte i (si cal) a una partida concreta.',
      'Split (assignació múltiple): si una despesa s\'ha de repartir entre projectes o partides, usa l\'assignació múltiple i reparteix imports fins que quadrin.',
      'Revisa l\'estat: l\'objectiu és que el percentatge reflecteixi la realitat (100% quan està totalment imputada; parcial quan només una part).',
      'Desassignar: si t\'has equivocat, desfés l\'assignació i torna-la a deixar com a 0% (o ajusta-la).',
      'Assignació massiva: selecciona diverses despeses i aplica una assignació en bloc quan siguin casos repetitius (mateix projecte/partida).',
      'Final de revisió: abans de donar per bo un projecte, assegura\'t que les despeses rellevants estan 100% i que els splits no deixen imports "perduts".',
    ],
    tips: [
      'Quan un projecte està sobreexecutat en una partida, el split parcial és la manera realista de quadrar sense inventar despeses.',
      'Si una despesa no encaixa en cap projecte, és millor deixar-la a 0% que no pas forçar una assignació incorrecta.',
      'Les despeses de terreny sovint es pengen primer i s\'assignen després: prioritza la coherència de l\'assignació, no la velocitat d\'entrada.',
    ],
    extra: {
      manual: {
        label: 'Manual d\'usuari · Assignació de despeses',
      },
      video: {
        label: 'Vídeo (properament)',
        note: 'Assignar despeses a projectes de forma àgil (10 minuts)',
      },
    },
    keywords: [
      'assignació',
      'projecte',
      'partida',
      'quick assign',
      'split',
      '100%',
      'parcial',
      'desassignar',
      'massiu',
      'terreny',
    ],
  },
  '/dashboard/project-module/projects': {
    title: 'Ajuda · Gestió de projectes',
    intro:
      'Aquí crees i gestiones els projectes del mòdul de Projectes, que després faràs servir per assignar-hi despeses.',
    steps: [
      'Crea un projecte quan necessitis agrupar despeses sota un mateix paraigua (p. ex. una subvenció, un programa o un període de treball concret).',
      'Posa un nom clar i recognoscible: és el que veuràs a la safata d\'assignació de despeses.',
      'Afegeix un codi o referència si treballes amb justificacions externes (opcional però recomanable).',
      'Revisa l\'estat del projecte: actiu mentre s\'hi assignen despeses; tancat quan ja no s\'ha d\'utilitzar.',
      'Si el projecte té pressupost, introdueix-lo o gestiona les partides des de la seva pantalla econòmica.',
      'El projecte agafa sentit quan li assigns despeses des de "Assignació de despeses".',
      'Evita crear projectes duplicats per variacions petites: és millor tenir pocs projectes ben definits.',
      'Quan el projecte s\'acaba, tanca\'l per mantenir l\'ordre i evitar assignacions accidentals.',
    ],
    tips: [
      'Si dubtes si una despesa ha d\'anar a un projecte, deixa-la sense assignar fins tenir criteri.',
      'Un projecte ben definit fa que la pantalla d\'assignació sigui més ràpida i menys propensa a errors.',
      'Tancar projectes antics redueix soroll i ajuda a evitar seleccions equivocades.',
    ],
    extra: {
      manual: {
        label: 'Manual d\'usuari · Gestió de projectes',
      },
      video: {
        label: 'Vídeo (properament)',
        note: 'Crear i gestionar projectes de forma eficient (8 minuts)',
      },
    },
    keywords: ['projecte', 'crear', 'editar', 'tancar', 'codi', 'pressupost', 'partides', 'assignació'],
  },
};

const HELP_ES: HelpData = {
  '/dashboard': {
    title: 'Ayuda · Dashboard',
    intro:
      'Esta pantalla es la foto rápida: te dice cómo está la organización hoy. Todo lo que ves aquí son datos derivados de otras pantallas.',
    steps: [
      'Revisa el balance general: te indica el saldo actual de la cuenta.',
      'Mira los pendientes: cuántos movimientos sin contacto, sin categoría o con devol. pendiente.',
      'Valora si hay que actuar o no: el dashboard señala, no obliga.',
      'Accede a la pantalla concreta si quieres resolver algo.',
    ],
    tips: [
      'El dashboard no se edita: es un reflejo de otras pantallas.',
      'No hace falta tener 0 pendientes para estar "bien": usa criterio.',
      'Los filtros rápidos te llevan al sitio correcto si quieres profundizar.',
    ],
    extra: {
      order: {
        title: 'Orden recomendado (2 minutos)',
        items: [
          'Mira el balance.',
          'Valora pendientes.',
          'Si algo pide atención, entra en la pantalla correspondiente.',
        ],
      },
      pitfalls: {
        title: 'Errores habituales',
        items: [
          'Intentar editar aquí (no se puede: es solo lectura).',
          'Obsesionarse con cero pendientes sin criterio.',
          'Ignorar avisos de desbalanceo importantes.',
        ],
      },
      whenNot: {
        title: 'Cuándo no hace falta preocuparse',
        items: [
          'Un puñado de pendientes no significa caos: prioriza lo que importa.',
          'Si acabas de sincronizar, es normal que haya cosas por clasificar.',
        ],
      },
      manual: {
        label: 'Manual de usuario · Entender el Dashboard',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Leer el Dashboard en 2 minutos y decidir si hay que actuar',
      },
    },
    keywords: ['dashboard', 'balance', 'pendientes', 'resumen', 'contacto', 'categoría', 'devol.'],
  },
  '/dashboard/movimientos': {
    title: 'Ayuda · Movimientos',
    intro:
      'Esta pantalla es el centro de control del día a día: aquí revisas lo que entra y sale del banco, detectas pendientes y evitas que los errores crezcan.',
    steps: [
      'Empieza por los pendientes: filtra por "Sin contacto", "Sin categoría" y "Devoluciones pendientes" si aparecen.',
      'Asigna primero el contacto (donante, proveedor o trabajador): da contexto al movimiento.',
      'Asigna después la categoría cuando el contacto ya esté claro.',
      'Revisa ingresos agrupados (remesas): divídelas antes de continuar si hace falta.',
      'Adjunta documentos solo cuando aporten valor (facturas, justificantes relevantes).',
    ],
    tips: [
      'Orden recomendado: contacto → categoría → documento. Cambiar el orden suele generar dudas después.',
      'Si un movimiento te genera duda, déjalo pendiente y sigue con el resto.',
      'Una revisión regular de pendientes evita acumulaciones difíciles de revisar.',
    ],
    extra: {
      order: {
        title: 'Orden recomendado de trabajo',
        items: [
          'Filtrar pendientes (qué está sin resolver).',
          'Asignar contactos.',
          'Asignar categorías.',
          'Revisar remesas y devoluciones.',
          'Adjuntar documentos cuando aporten valor.',
        ],
      },
      pitfalls: {
        title: 'Errores habituales',
        items: [
          'Asignar categoría sin haber definido el contacto.',
          'Forzar una asignación solo por "dejarlo limpio".',
          'Dividir remesas demasiado tarde, con otros campos ya tocados.',
          'Generar informes sin haber revisado devoluciones.',
        ],
      },
      whenNot: {
        title: 'Cuándo no hace falta hacer nada',
        items: [
          'No hace falta asignar proyecto si solo controlas el día a día.',
          'No hace falta adjuntar documento a movimientos pequeños y evidentes.',
          'No hace falta resolver todas las dudas al momento: dejar pendientes con criterio también es control.',
        ],
      },
      returns: {
        title: 'Devoluciones (control rápido)',
        items: [
          'Prioridad: asignar el donante correcto. Si no hay donante, fiscalmente no resta donde toca.',
          'En remesas de devoluciones, el padre no lleva contacto: el donante va en las hijas.',
          'Si hay pendientes, resuélvelos antes de exportar 182/certificados (evitas totales inflados).',
          'Si dudas, deja pendiente consciente y sigue; pero no lo olvides antes de cierre.',
        ],
      },
      remittances: {
        title: 'Remesas (cuotas y Stripe)',
        items: [
          'Remesa = un movimiento que agrupa muchas cuotas. Divídela antes de asignar contacto/categoría a mano.',
          'Tras dividir, trabaja sobre las cuotas hijas (son las que cuentan por donante).',
          'Stripe: usa "Dividir remesa Stripe" y revisa pendientes de asignación (matching por email).',
          'Si una remesa ya está procesada, no la vuelvas a tocar: revisa el detalle desde el badge/modal.',
        ],
      },
      contacts: {
        title: 'Contactos (criterio rápido)',
        items: [
          'Asigna primero el contacto: da contexto y hace que la categoría sea más fiable.',
          'Si es una nómina → Trabajador. Si es una factura de un tercero → Proveedor. Si es un ingreso de cuota/donación → Donante.',
          'Si no tienes claro el contacto, déjalo pendiente y busca pistas en el concepto bancario o el documento.',
          'Evita crear contactos nuevos para casos puntuales pequeños: crea solo los recurrentes o relevantes.',
        ],
      },
      categories: {
        title: 'Categorías (criterio rápido)',
        items: [
          'Asigna la categoría después del contacto: el contacto suele sugerir la categoría correcta (categoría por defecto).',
          'Si dudas entre dos categorías, elige la más estable y coherente con el histórico (consistencia > precisión ficticia).',
          'No fuerces categorías "para dejarlo limpio": un pendiente consciente es mejor que una categoría equivocada.',
          'Para volúmenes grandes, filtra pendientes y aplica un criterio repetible antes de entrar al detalle.',
        ],
      },
      documents: {
        title: 'Documentos (criterio rápido)',
        items: [
          'No hace falta adjuntar documento a cada movimiento: resérvalo para facturas, justificantes importantes o requisitos de subvención.',
          'Si adjuntas desde el modal del movimiento, el documento queda vinculado automáticamente.',
          'Un nombre de archivo claro (fecha + concepto) ayuda después a encontrarlo sin buscar.',
          'Para justificación de proyectos, el documento puede ser obligatorio: revísalo antes de cerrar.',
        ],
      },
      bankAccounts: {
        title: 'Multi-cuenta bancaria (criterio rápido)',
        items: [
          'Cada cuenta sincroniza por separado: si tienes más de una, filtra por cuenta cuando revises pendientes.',
          'Los saldos del Dashboard suman todas las cuentas: no interpretes como problema un saldo global diferente del que ves en el banco.',
          'Las transferencias internas aparecen como salida de una cuenta y entrada en la otra: asigna la misma categoría (p. ej. Transferencias internas) y no las cuentes dos veces como gasto/ingreso real.',
          'Cuando sincronices una nueva cuenta, revisa los datos iniciales (saldo apertura, fecha inicio) antes de continuar.',
        ],
      },
      ai: {
        title: 'Categorización con IA (cuándo usarla)',
        items: [
          'Uso ideal: muchos movimientos sin categoría y patrones repetitivos.',
          'Regla de oro: la IA sugiere, tú validas. No asumas que siempre acierta.',
          'Si el contacto está claro, asigna primero el contacto: la categoría suele salir más limpia.',
          'Después de usar IA, revisa una muestra (5–10) antes de darlo por bueno.',
        ],
      },
      bulk: {
        title: 'Acciones masivas (para limpiar rápido)',
        items: [
          'Filtra primero (pendientes) y luego selecciona en bloque: así no tocas lo que ya está bien.',
          'Aplica cambios repetibles (misma categoría) a grupos coherentes, no a "todo el mes".',
          'Si tienes dudas, hazlo en lotes pequeños: es más fácil deshacer y revisar.',
          'Después de una acción masiva, revisa 3–5 filas al azar para validar.',
        ],
      },
      importing: {
        title: 'Importar extracto (sin sorpresas)',
        items: [
          'Descarga el extracto del banco en CSV/XLSX y súbelo tal cual.',
          'Evita abrir y guardar el CSV con Excel si cambia formatos: puede romper separadores y decimales.',
          'Antes de importar, revisa la previsualización: fechas, importes y descripciones.',
          'Si detectas duplicados o importes extraños, para y revisa el fichero antes de seguir.',
        ],
      },
      filters: {
        title: 'Filtros (para trabajar rápido)',
        items: [
          'Regla: filtra antes de editar. Primero encuentra el grupo de pendientes y luego actúa.',
          'Filtros clave: Sin contacto, Sin categoría, Devoluciones pendientes.',
          'Para revisar una tarea concreta, combina filtro + búsqueda (nombre, importe, palabra clave).',
          'Con mucho volumen, trabaja en lotes pequeños (por semana o por tipo) y valida al final.',
        ],
      },
      manual: {
        label: 'Manual de usuario · Gestión de Movimientos',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Cómo mantener Movimientos bajo control en 10 minutos',
      },
    },
    keywords: [
      'control',
      'pendientes',
      'contacto',
      'categoría',
      'remesa',
      'devoluciones',
      'documento',
      'día a día',
      'ia',
      'masivo',
      'importar',
      'filtros',
    ],
  },
  '/dashboard/donants': {
    title: 'Ayuda · Donantes',
    intro:
      'Esta pantalla es la base fiscal de la entidad: si DNI/CIF y Código Postal son correctos, el Modelo 182 y los certificados salen limpios.',
    steps: [
      'Prioriza DNI/CIF y Código Postal: es lo que más suele bloquear o ensuciar el 182.',
      'Evita duplicados: si importas, actualiza existentes en lugar de crear nuevos.',
      'Mantén Activo/Baja al día para una lista limpia sin perder histórico.',
      'Asigna categoría por defecto si ayuda a categorizar movimientos de forma consistente.',
      'Antes de certificados o 182, valida 2–3 donantes representativos (con y sin devoluciones).',
    ],
    tips: [
      'Orden operativo: DNI/CP → estado → (si aplica) categoría por defecto.',
      'Si una devolución está mal asignada, distorsiona el total neto del certificado.',
      'No todo donante necesita una ficha perfecta: fiscal mínimo y listo.',
    ],
    extra: {
      order: {
        title: 'Orden recomendado',
        items: [
          'Completar DNI/CIF y Código Postal.',
          'Revisar estado Activo/Baja.',
          'Evitar duplicados (actualizar).',
          'Validar devoluciones si las hay.',
        ],
      },
      pitfalls: {
        title: 'Errores habituales',
        items: [
          'Dejar DNI o Código Postal vacío esperando que el 182 salga bien.',
          'Crear duplicados por falta de criterio en importaciones.',
          'Ignorar devoluciones e inflar totales netos.',
        ],
      },
      whenNot: {
        title: 'Cuándo no hace falta complicarlo',
        items: [
          'No hace falta rellenar todos los datos si no aportan valor (prioriza fiscal).',
          'No hace falta generar certificados masivos si aún hay datos fiscales pendientes.',
        ],
      },
      returns: {
        title: 'Devoluciones (impacto fiscal)',
        items: [
          'Una devolución asignada al donante resta del total neto (certificado y Modelo 182).',
          'Si la devolución no tiene donante asignado, no resta a nadie: el total queda inflado.',
          'Si una devolución está asignada al donante equivocado, distorsiona a dos donantes a la vez.',
          'Antes de cerrar el año, revisa devoluciones pendientes y las de donantes con importes extraños.',
        ],
      },
      quality: {
        title: 'Calidad fiscal (check rápido)',
        items: [
          'DNI/CIF y Código Postal completos: mínimo para 182.',
          'Evitar duplicados: un donante por DNI (actualiza, no dupliques).',
          'Coherencia de estado: baja cuando toca, activo si sigue aportando.',
          'Muestra de validación: 2–3 donantes representativos antes de exportaciones masivas.',
        ],
      },
      manual: {
        label: 'Manual de usuario · Gestión de Donantes',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Dejar Donantes listos para el Modelo 182 (10 minutos)',
      },
    },
    keywords: ['donantes', 'socios', 'dni', 'cif', 'código postal', 'modelo 182', 'certificados', 'baja', 'devoluciones', 'calidad'],
  },
  '/dashboard/proveidors': {
    title: 'Ayuda · Proveedores',
    intro:
      'Esta pantalla ordena los terceros que te facturan. Si el CIF y la identificación están bien, el Modelo 347 sale sin limpiezas de última hora.',
    steps: [
      'Crea proveedores para gastos recurrentes o relevantes (no para todo).',
      'Completa nombre + CIF: es el campo crítico para el Modelo 347.',
      'Define categoría por defecto si casi siempre es el mismo tipo de gasto.',
      'Usa activo/inactivo para limpiar la lista sin perder histórico.',
    ],
    tips: [
      'CIF correcto > cualquier otro dato.',
      'Si cambia el nombre comercial pero no el CIF, actualiza el mismo proveedor.',
      'La categoría por defecto acelera Movimientos, pero revísala si hay excepciones.',
    ],
    extra: {
      order: {
        title: 'Orden recomendado',
        items: [
          'Crear solo los recurrentes.',
          'Validar CIF.',
          'Definir categoría por defecto.',
          'Marcar inactivos los que ya no se usan.',
        ],
      },
      pitfalls: {
        title: 'Errores habituales',
        items: [
          'Crear duplicados del mismo proveedor con el mismo CIF.',
          'Dejar el CIF vacío esperando que el 347 salga bien.',
          'Mezclar proveedores con trabajadores (cada tipo cumple una función).',
        ],
      },
      whenNot: {
        title: 'Cuándo no hace falta',
        items: [
          'No hace falta crear proveedor para gastos puntuales pequeños.',
          'No hace falta rellenar datos extra si no los vas a usar.',
        ],
      },
      manual: {
        label: 'Manual de usuario · Proveedores y Trabajadores',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Preparar Proveedores para el Modelo 347 (8 minutos)',
      },
    },
    keywords: ['proveedor', 'cif', 'modelo 347', 'terceros', 'categoría por defecto', 'inactivo', 'duplicados'],
  },
  '/dashboard/treballadors': {
    title: 'Ayuda · Trabajadores',
    intro:
      'Esta pantalla sirve para ordenar gastos de personal (nóminas y pagos recurrentes). Bien mantenida, el día a día queda más limpio y coherente.',
    steps: [
      'Crea un trabajador cuando tengas pagos recurrentes de personal (nóminas, dietas fijas, etc.).',
      'Introduce nombre y DNI: aporta trazabilidad y evita confusiones con nombres parecidos.',
      'Define categoría por defecto (normalmente Nóminas) para agilizar la asignación en Movimientos.',
      'Mantén el estado Activo/Inactivo cuando una persona entra o sale (no hace falta borrar).',
      'Al asignar un movimiento, revisa que contacto + categoría reflejen lo que es (nómina vs otros pagos).',
    ],
    tips: [
      'Objetivo: coherencia. No es una herramienta de RRHH, es clasificación operativa.',
      'Inactivo > eliminar: mantienes histórico y evitas perder contexto.',
      'Si hay pagos mixtos, no fuerces la categoría por defecto: ajusta puntualmente.',
    ],
    extra: {
      order: {
        title: 'Orden recomendado',
        items: [
          'Crear solo recurrentes.',
          'Poner DNI.',
          'Categoría por defecto.',
          'Estado activo/inactivo.',
        ],
      },
      pitfalls: {
        title: 'Errores habituales',
        items: [
          'Mezclar trabajadores con proveedores (cada tipo cumple una función).',
          'Borrar trabajadores y perder histórico.',
          'Aplicar siempre la categoría por defecto aunque no corresponda.',
        ],
      },
      whenNot: {
        title: 'Cuándo no hace falta complicarlo',
        items: [
          'No hace falta crear trabajadores para pagos puntuales irrelevantes.',
          'No hace falta rellenar campos extra si no los vas a usar.',
        ],
      },
      manual: {
        label: 'Manual de usuario · Proveedores y Trabajadores',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Ordenar nóminas y gastos de personal (8 minutos)',
      },
    },
    keywords: ['trabajadores', 'nóminas', 'personal', 'dni', 'categoría por defecto', 'activo', 'inactivo'],
  },
  '/dashboard/informes': {
    title: 'Ayuda · Informes',
    intro:
      'Esta pantalla sirve para generar los outputs para la gestoría: Modelo 182, Modelo 347 y certificados. Aquí no se corrigen datos; aquí se verifican y se exportan.',
    steps: [
      'Elige el año fiscal y trabaja siempre con un solo año cada vez.',
      'Modelo 182: resuelve primero las alertas de donantes (sobre todo DNI/CIF y Código Postal).',
      'Revisa devoluciones asignadas: afectan directamente al total del 182 y de los certificados.',
      'Genera el Modelo 182 y envíalo a la gestoría.',
      'Modelo 347: solo aparecerán proveedores que superen el umbral anual; comprueba el CIF antes de exportar.',
      'Genera certificados individuales o en lote cuando corresponda.',
    ],
    tips: [
      'Si el 182 no cuadra, casi siempre es por devoluciones o por datos incompletos de donantes.',
      'Valida 2–3 casos representativos antes de enviar certificados masivos.',
      'Trabaja siempre con un solo año abierto para evitar confusiones.',
    ],
    extra: {
      order: {
        title: 'Orden recomendado cuando toca hacer informes',
        items: [
          'Seleccionar el año fiscal.',
          'Resolver alertas de donantes (DNI/CP).',
          'Revisar devoluciones.',
          'Generar Modelo 182.',
          'Generar Modelo 347.',
          'Generar certificados.',
        ],
      },
      pitfalls: {
        title: 'Errores habituales',
        items: [
          'Generar el 182 con donantes sin DNI o Código Postal.',
          'Olvidar devoluciones pendientes e inflar los totales.',
          'Mezclar años (corregir datos de un año mientras exportas otro).',
          'Generar certificados masivos sin validar ningún caso antes.',
        ],
      },
      checks: {
        title: 'Checks finales antes de enviar a gestoría',
        items: [
          '182: ninguna alerta crítica pendiente.',
          '182: totales coherentes con lo esperado.',
          '347: proveedores con CIF correcto.',
          'Certificados: firma y cargo configurados.',
        ],
      },
      manual: {
        label: 'Manual de usuario · Informes fiscales',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Preparar Modelo 182 y certificados sin sorpresas (15 minutos)',
      },
    },
    keywords: [
      'modelo 182',
      'modelo 347',
      'certificados',
      'gestoría',
      'año fiscal',
      'devoluciones',
      'alertas',
      'exportar',
    ],
  },
  '/dashboard/configuracion': {
    title: 'Ayuda · Configuración',
    intro:
      'Aquí dejas la organización "a punto": datos fiscales, logo y firma. Si esto está bien, certificados e informes salen consistentes.',
    steps: [
      'Completa los datos fiscales (nombre, CIF, dirección): es lo que aparece en los outputs.',
      'Sube el logo y configura firma + cargo: es lo que da validez a los certificados.',
      'Revisa categorías con criterio: añade lo que falta y evita cambios agresivos.',
      'Gestiona miembros y roles: edición solo para quien realmente la necesita.',
    ],
    tips: [
      'Prioridad real: fiscal + firma. El resto es secundario.',
      'Mejor añadir categorías que renombrarlas si ya hay histórico.',
      'Roles de lectura evitan errores accidentales.',
    ],
    extra: {
      order: {
        title: 'Orden recomendado (10 minutos)',
        items: [
          'Datos fiscales.',
          'Logo.',
          'Firma y cargo.',
          'Categorías y roles.',
        ],
      },
      pitfalls: {
        title: 'Errores habituales',
        items: [
          'Dejar firma/cargo a medias y generar certificados.',
          'Renombrar categorías ya en uso y perder coherencia.',
          'Dar permisos de edición a quien solo debe consultar.',
        ],
      },
      whenNot: {
        title: 'Cuándo no hace falta tocar nada',
        items: [
          'Si solo quieres trabajar Movimientos, no hace falta "pulir" Configuración cada día.',
          'No hace falta tener todo perfecto para empezar (excepto fiscal/firma).',
        ],
      },
      manual: {
        label: 'Manual de usuario · Configuración inicial',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Configurar Summa Social bien desde el primer día (8 minutos)',
      },
    },
    keywords: ['configuración', 'cif', 'dirección', 'logo', 'firma', 'cargo', 'categorías', 'miembros', 'roles'],
  },
  '/dashboard/project-module/expenses': {
    title: 'Ayuda · Asignación de gastos (Proyectos)',
    intro:
      'Esta bandeja es el inbox de gastos asignables: aquí decides a qué proyecto y a qué partida va cada gasto, de forma rápida y reversible.',
    steps: [
      'Entiende lo que ves: cada fila es un gasto (bancario o de terreno) con estado 0% / parcial / 100%.',
      'Empieza por los pendientes: filtra por "No asignadas" (0%) para priorizar lo que aún no está imputado.',
      'Quick Assign 100%: usa la acción rápida para asignar todo el gasto a un proyecto y (si aplica) a una partida concreta.',
      'Split (asignación múltiple): si un gasto se reparte entre proyectos o partidas, usa la asignación múltiple y reparte importes hasta que cuadren.',
      'Revisa el estado: el porcentaje debe reflejar la realidad (100% cuando está totalmente imputado; parcial cuando solo una parte).',
      'Desasignar: si te equivocas, deshaz la asignación y vuelve a 0% (o ajusta la distribución).',
      'Asignación masiva: selecciona varios gastos y aplica una asignación en bloque para los casos repetitivos (mismo proyecto/partida).',
      'Cierre de revisión: antes de dar un proyecto por bueno, verifica que los gastos relevantes están al 100% y que los splits no dejan importes "colgados".',
    ],
    tips: [
      'Cuando un proyecto está sobreejecutado en una partida, el split parcial es la forma realista de cuadrar sin inventar gastos.',
      'Si un gasto no encaja en ningún proyecto, es mejor dejarlo a 0% que forzar una asignación incorrecta.',
      'Los gastos de terreno suelen subirse primero y asignarse después: prioriza la coherencia de la imputación, no la velocidad de entrada.',
    ],
    extra: {
      manual: {
        label: 'Manual de usuario · Asignación de gastos',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Asignar gastos a proyectos de forma ágil (10 minutos)',
      },
    },
    keywords: [
      'asignación',
      'proyecto',
      'partida',
      'quick assign',
      'split',
      '100%',
      'parcial',
      'desasignar',
      'masivo',
      'terreno',
    ],
  },
  '/dashboard/project-module/projects': {
    title: 'Ayuda · Gestión de proyectos',
    intro:
      'Aquí creas y gestionas los proyectos del módulo de Proyectos, que luego usarás para asignarles gastos.',
    steps: [
      'Crea un proyecto cuando necesites agrupar gastos bajo un mismo paraguas (p. ej., una subvención, un programa o un periodo de trabajo concreto).',
      'Pon un nombre claro y reconocible: es el que verás en la bandeja de asignación de gastos.',
      'Añade un código o referencia si trabajas con justificaciones externas (opcional pero recomendable).',
      'Revisa el estado del proyecto: activo mientras se asignan gastos; cerrado cuando ya no debe usarse.',
      'Si el proyecto tiene presupuesto, introdúcelo o gestiona las partidas desde su pantalla económica.',
      'El proyecto cobra sentido cuando le asignas gastos desde "Asignación de gastos".',
      'Evita crear proyectos duplicados por pequeñas variaciones: mejor pocos proyectos bien definidos.',
      'Cuando el proyecto termina, ciérralo para mantener el orden y evitar asignaciones accidentales.',
    ],
    tips: [
      'Si dudas si un gasto debe ir a un proyecto, déjalo sin asignar hasta tener criterio.',
      'Un proyecto bien definido hace que la pantalla de asignación sea más rápida y con menos errores.',
      'Cerrar proyectos antiguos reduce ruido y evita selecciones equivocadas.',
    ],
    extra: {
      manual: {
        label: 'Manual de usuario · Gestión de proyectos',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Crear y gestionar proyectos de forma eficiente (8 minutos)',
      },
    },
    keywords: ['proyecto', 'crear', 'editar', 'cerrar', 'código', 'presupuesto', 'partidas', 'asignación'],
  },
};

const HELP_FR: HelpData = {
  '/dashboard': {
    title: 'Aide · Tableau de bord',
    intro:
      'Cet écran est la photo rapide : il vous dit comment va l\'organisation aujourd\'hui. Tout ce que vous voyez ici sont des données dérivées des autres écrans.',
    steps: [
      'Consultez le solde général : il indique le solde actuel du compte.',
      'Regardez les éléments en attente : combien de mouvements sans contact, sans catégorie ou avec retour en attente.',
      'Jugez s\'il faut agir ou non : le tableau de bord signale, il n\'oblige pas.',
      'Accédez à l\'écran concerné si vous voulez traiter quelque chose.',
    ],
    tips: [
      'Le tableau de bord ne se modifie pas : c\'est le reflet d\'autres écrans.',
      'Pas besoin d\'avoir 0 en attente pour être "bien" : faites preuve de discernement.',
      'Les filtres rapides vous amènent au bon endroit si vous voulez approfondir.',
    ],
    extra: {
      order: {
        title: 'Ordre recommandé (2 minutes)',
        items: [
          'Consulter le solde.',
          'Évaluer les en attente.',
          'Si quelque chose demande attention, entrer dans l\'écran concerné.',
        ],
      },
      pitfalls: {
        title: 'Erreurs fréquentes',
        items: [
          'Essayer de modifier ici (impossible : lecture seule).',
          'S\'obséder à avoir zéro en attente sans critère.',
          'Ignorer les avertissements de déséquilibre importants.',
        ],
      },
      whenNot: {
        title: 'Quand il n\'est pas nécessaire de s\'inquiéter',
        items: [
          'Quelques éléments en attente ne signifient pas le chaos : priorisez ce qui compte.',
          'Si vous venez de synchroniser, il est normal d\'avoir des choses à classer.',
        ],
      },
      manual: {
        label: 'Manuel utilisateur · Comprendre le tableau de bord',
      },
      video: {
        label: 'Vidéo (bientôt)',
        note: 'Lire le tableau de bord en 2 minutes et décider s\'il faut agir',
      },
    },
    keywords: ['tableau de bord', 'solde', 'en attente', 'résumé', 'contact', 'catégorie', 'retour'],
  },
  '/dashboard/movimientos': {
    title: 'Aide · Mouvements',
    intro:
      'Cet écran est le centre de contrôle du quotidien : vous y vérifiez les entrées/sorties bancaires, repérez les éléments en attente et évitez que les erreurs ne s\'amplifient.',
    steps: [
      'Commencez par les éléments en attente : filtrez "Sans contact", "Sans catégorie" et "Retours en attente" si disponibles.',
      'Assignez d\'abord le contact (donateur, fournisseur ou salarié) : cela donne du contexte au mouvement.',
      'Assignez ensuite la catégorie lorsque le contact est clair.',
      'Vérifiez les encaissements groupés (remises) : scindez-les avant de continuer si nécessaire.',
      'Ajoutez des justificatifs seulement quand ils apportent de la valeur (factures, preuves pertinentes).',
    ],
    tips: [
      'Ordre recommandé : contact → catégorie → document. Changer l\'ordre crée souvent des doutes ensuite.',
      'Si un mouvement vous pose question, laissez-le en attente et continuez avec le reste.',
      'Une revue régulière des éléments en attente évite les accumulations difficiles à traiter.',
    ],
    extra: {
      order: {
        title: 'Ordre de travail recommandé',
        items: [
          'Filtrer les éléments en attente (ce qui n\'est pas résolu).',
          'Assigner les contacts.',
          'Assigner les catégories.',
          'Vérifier remises et retours.',
          'Ajouter des documents quand cela apporte de la valeur.',
        ],
      },
      pitfalls: {
        title: 'Erreurs fréquentes',
        items: [
          'Assigner une catégorie sans avoir défini le contact.',
          'Forcer une affectation juste pour "tout nettoyer".',
          'Scinder les remises trop tard, après avoir déjà modifié d\'autres champs.',
          'Générer des rapports sans avoir vérifié les retours.',
        ],
      },
      whenNot: {
        title: 'Quand il n\'est pas nécessaire d\'agir',
        items: [
          'Inutile d\'assigner un projet si vous ne faites que le suivi du quotidien.',
          'Inutile d\'ajouter un document pour de petits mouvements évidents.',
          'Inutile de tout résoudre immédiatement : laisser des éléments en attente avec critère, c\'est aussi du contrôle.',
        ],
      },
      returns: {
        title: 'Retours (contrôle rapide)',
        items: [
          'Priorité : affecter le bon donateur. Sans donateur, la déduction fiscale ne s\'applique pas correctement.',
          'Pour les remises de retours, le mouvement parent n\'a pas de contact : le donateur est sur les lignes filles.',
          'S\'il reste des retours en attente, résolvez-les avant d\'exporter 182/certificats (évite des totaux gonflés).',
          'En cas de doute, laissez en attente et continuez, mais ne l\'oubliez pas avant la clôture.',
        ],
      },
      remittances: {
        title: 'Remises (cotisations et Stripe)',
        items: [
          'Remise = un mouvement qui regroupe plusieurs cotisations. Scindez-la avant d\'assigner contact/catégorie à la main.',
          'Après scission, travaillez sur les lignes filles (ce sont elles qui comptent par donateur).',
          'Stripe : utilisez « Scinder la remise Stripe » et traitez les affectations en attente (matching par email).',
          'Si une remise est déjà traitée, ne la retravaillez pas : ouvrez le détail via le badge/modal.',
        ],
      },
      contacts: {
        title: 'Contacts (critère rapide)',
        items: [
          'Affectez d\'abord le contact : cela donne du contexte et rend la catégorie plus fiable.',
          'Si c\'est un salaire → Salarié. Si c\'est une facture d\'un tiers → Fournisseur. Si c\'est un encaissement de cotisation/don → Donateur.',
          'Si le contact n\'est pas clair, laissez en attente et cherchez des indices dans le libellé bancaire ou le document.',
          'Évitez de créer des contacts pour de petits cas ponctuels : créez surtout les récurrents ou significatifs.',
        ],
      },
      categories: {
        title: 'Catégories (critère rapide)',
        items: [
          'Affectez la catégorie après le contact : le contact suggère souvent la bonne catégorie (catégorie par défaut).',
          'En cas de doute, choisissez la catégorie la plus stable et cohérente avec l\'historique (cohérence > fausse précision).',
          'Ne forcez pas une catégorie « pour nettoyer » : un élément en attente vaut mieux qu\'une catégorie erronée.',
          'Pour de gros volumes, filtrez les éléments en attente et appliquez un critère répétable avant le détail.',
        ],
      },
      documents: {
        title: 'Documents (critère rapide)',
        items: [
          'Inutile d\'ajouter un document à chaque mouvement : réservez-le aux factures, justificatifs importants ou exigences de subvention.',
          'Si vous ajoutez depuis la modale du mouvement, le document est lié automatiquement.',
          'Un nom de fichier clair (date + concept) aide à le retrouver sans chercher.',
          'Pour la justification de projets, le document peut être obligatoire : vérifiez avant de clôturer.',
        ],
      },
      bankAccounts: {
        title: 'Multi-compte bancaire (critère rapide)',
        items: [
          'Chaque compte se synchronise séparément : si vous en avez plusieurs, filtrez par compte lors de la revue des éléments en attente.',
          'Les soldes du tableau de bord totalisent tous les comptes : n\'interprétez pas comme un problème un solde global différent de celui de la banque.',
          'Les virements internes apparaissent comme sortie d\'un compte et entrée dans l\'autre : affectez la même catégorie (ex. Virements internes) et ne les comptez pas deux fois comme dépense/recette réelle.',
          'Lors de la synchronisation d\'un nouveau compte, vérifiez les données initiales (solde d\'ouverture, date début) avant de continuer.',
        ],
      },
      ai: {
        title: 'Catégorisation IA (quand l\'utiliser)',
        items: [
          'Idéal : beaucoup de mouvements sans catégorie et des motifs répétitifs.',
          'Règle d\'or : l\'IA suggère, vous validez. N\'assumez pas qu\'elle a toujours raison.',
          'Si le contact est clair, affectez d\'abord le contact : la catégorie sera souvent plus juste.',
          'Après l\'IA, vérifiez un échantillon (5–10) avant de valider globalement.',
        ],
      },
      bulk: {
        title: 'Actions en masse (nettoyage rapide)',
        items: [
          'Filtrez d\'abord (en attente) puis sélectionnez en bloc : évitez de toucher ce qui est déjà correct.',
          'Appliquez des changements répétables (même catégorie) à des groupes cohérents, pas à "tout le mois".',
          'En cas de doute, travaillez par petits lots : plus simple à corriger et à vérifier.',
          'Après une action en masse, vérifiez 3–5 lignes au hasard pour confirmer.',
        ],
      },
      importing: {
        title: 'Importer un extrait (sans surprises)',
        items: [
          'Téléchargez l\'extrait bancaire en CSV/XLSX et chargez-le tel quel.',
          'Évitez d\'ouvrir puis enregistrer le CSV avec Excel s\'il modifie les formats : cela peut casser séparateurs et décimales.',
          'Avant d\'importer, vérifiez l\'aperçu : dates, montants, libellés.',
          'Si vous voyez des doublons ou des montants étranges, arrêtez et vérifiez le fichier avant de continuer.',
        ],
      },
      filters: {
        title: 'Filtres (travailler vite)',
        items: [
          'Règle : filtrer avant d\'éditer. Trouvez d\'abord les éléments en attente, puis agissez.',
          'Filtres clés : Sans contact, Sans catégorie, Retours en attente.',
          'Pour une tâche précise, combinez filtre + recherche (nom, montant, mot-clé).',
          'Avec beaucoup de volume, travaillez par petits lots (par semaine ou par type) puis validez.',
        ],
      },
      manual: {
        label: 'Manuel utilisateur · Gestion des mouvements',
      },
      video: {
        label: 'Vidéo (bientôt)',
        note: 'Garder les mouvements sous contrôle en 10 minutes',
      },
    },
    keywords: [
      'contrôle',
      'en attente',
      'contact',
      'catégorie',
      'remise',
      'retours',
      'document',
      'quotidien',
      'ia',
      'masse',
      'importer',
      'filtres',
    ],
  },
  '/dashboard/donants': {
    title: 'Aide · Donateurs',
    intro:
      'Cet écran est la base fiscale de l\'entité : si DNI/CIF et Code postal sont corrects, le Modèle 182 et les certificats sortent propres.',
    steps: [
      'Priorisez DNI/CIF et Code postal : c\'est ce qui bloque ou dégrade le plus souvent le 182.',
      'Évitez les doublons : en cas d\'import, mettez à jour l\'existant plutôt que de créer du nouveau.',
      'Maintenez Actif/Inactif à jour pour une liste propre sans perdre l\'historique.',
      'Définissez une catégorie par défaut si cela aide à catégoriser de façon cohérente.',
      'Avant certificats ou 182, validez 2–3 donateurs représentatifs (avec et sans retours).',
    ],
    tips: [
      'Ordre opérationnel : DNI/CP → statut → (si pertinent) catégorie par défaut.',
      'Un retour mal affecté fausse le total net du certificat.',
      'Tous les donateurs n\'ont pas besoin d\'une fiche parfaite : minimum fiscal suffit.',
    ],
    extra: {
      order: {
        title: 'Ordre recommandé',
        items: [
          'Compléter DNI/CIF et Code postal.',
          'Vérifier le statut Actif/Inactif.',
          'Éviter les doublons (mettre à jour).',
          'Valider les retours s\'il y en a.',
        ],
      },
      pitfalls: {
        title: 'Erreurs fréquentes',
        items: [
          'Laisser DNI ou Code postal vide en pensant que le 182 sortira correctement.',
          'Créer des doublons par manque de critère lors des imports.',
          'Ignorer les retours et gonfler les totaux nets.',
        ],
      },
      whenNot: {
        title: 'Quand il n\'est pas nécessaire de complexifier',
        items: [
          'Inutile de tout renseigner si cela n\'apporte pas de valeur (priorité au fiscal).',
          'Inutile de générer des certificats en masse tant que des données fiscales manquent.',
        ],
      },
      returns: {
        title: 'Retours (impact fiscal)',
        items: [
          'Un retour affecté au donateur se déduit du total net (certificat et Modèle 182).',
          'Si le retour n\'a pas de donateur affecté, il ne se déduit pour personne : le total est gonflé.',
          'Si un retour est affecté au mauvais donateur, il fausse deux donateurs à la fois.',
          'Avant de clôturer l\'année, vérifiez les retours en attente et les donateurs aux montants étranges.',
        ],
      },
      quality: {
        title: 'Qualité fiscale (check rapide)',
        items: [
          'DNI/CIF et Code postal complets : minimum pour 182.',
          'Éviter les doublons : un donateur par DNI (mettre à jour, ne pas dupliquer).',
          'Cohérence du statut : inactif quand il faut, actif s\'il contribue encore.',
          'Échantillon de validation : 2–3 donateurs représentatifs avant les exports en masse.',
        ],
      },
      manual: {
        label: 'Manuel utilisateur · Gestion des donateurs',
      },
      video: {
        label: 'Vidéo (bientôt)',
        note: 'Préparer les donateurs pour le Modèle 182 (10 minutes)',
      },
    },
    keywords: ['donateurs', 'adhérents', 'dni', 'cif', 'code postal', 'modèle 182', 'certificats', 'inactif', 'retours', 'qualité'],
  },
  '/dashboard/proveidors': {
    title: 'Aide · Fournisseurs',
    intro:
      'Cet écran organise les tiers qui vous facturent. Si le CIF et l\'identification sont corrects, le Modèle 347 sort sans nettoyage de dernière minute.',
    steps: [
      'Créez des fournisseurs pour les dépenses récurrentes ou significatives (pas pour tout).',
      'Renseignez nom + CIF : c\'est le champ critique pour le Modèle 347.',
      'Définissez une catégorie par défaut si c\'est presque toujours le même type de dépense.',
      'Utilisez actif/inactif pour nettoyer la liste sans perdre l\'historique.',
    ],
    tips: [
      'CIF correct > toute autre donnée.',
      'Si le nom commercial change mais pas le CIF, mettez à jour le même fournisseur.',
      'La catégorie par défaut accélère les Mouvements, mais vérifiez-la en cas d\'exception.',
    ],
    extra: {
      order: {
        title: 'Ordre recommandé',
        items: [
          'Créer seulement les récurrents.',
          'Valider le CIF.',
          'Définir la catégorie par défaut.',
          'Marquer inactifs ceux qui ne sont plus utilisés.',
        ],
      },
      pitfalls: {
        title: 'Erreurs fréquentes',
        items: [
          'Créer des doublons du même fournisseur avec le même CIF.',
          'Laisser le CIF vide en pensant que le 347 sortira correctement.',
          'Mélanger fournisseurs et salariés (chaque type a une fonction).',
        ],
      },
      whenNot: {
        title: 'Quand ce n\'est pas nécessaire',
        items: [
          'Inutile de créer un fournisseur pour de petites dépenses ponctuelles.',
          'Inutile de remplir des champs supplémentaires si vous ne les utilisez pas.',
        ],
      },
      manual: {
        label: 'Manuel utilisateur · Fournisseurs et salariés',
      },
      video: {
        label: 'Vidéo (bientôt)',
        note: 'Préparer les fournisseurs pour le Modèle 347 (8 minutes)',
      },
    },
    keywords: ['fournisseur', 'cif', 'modèle 347', 'tiers', 'catégorie par défaut', 'inactif', 'doublons'],
  },
  '/dashboard/treballadors': {
    title: 'Aide · Salariés',
    intro:
      'Cet écran sert à organiser les dépenses de personnel (salaires et paiements récurrents). Bien tenu, le quotidien est plus propre et cohérent.',
    steps: [
      'Créez un salarié lorsque vous avez des paiements récurrents (salaires, indemnités fixes, etc.).',
      'Renseignez nom et DNI : cela apporte de la traçabilité et évite les confusions.',
      'Définissez une catégorie par défaut (souvent Salaires) pour accélérer l\'affectation dans Mouvements.',
      'Maintenez le statut Actif/Inactif lors des entrées/sorties (inutile de supprimer).',
      'Lors de l\'affectation d\'un mouvement, vérifiez que contact + catégorie reflètent la réalité (salaire vs autre paiement).',
    ],
    tips: [
      'Objectif : cohérence. Ce n\'est pas un outil RH, c\'est une classification opérationnelle.',
      'Inactif > supprimer : vous gardez l\'historique et le contexte.',
      'Si les paiements sont mixtes, ne forcez pas la catégorie par défaut : ajustez au cas par cas.',
    ],
    extra: {
      order: {
        title: 'Ordre recommandé',
        items: [
          'Créer seulement les récurrents.',
          'Renseigner le DNI.',
          'Catégorie par défaut.',
          'Statut actif/inactif.',
        ],
      },
      pitfalls: {
        title: 'Erreurs fréquentes',
        items: [
          'Mélanger salariés et fournisseurs (chaque type a une fonction).',
          'Supprimer des salariés et perdre l\'historique.',
          'Appliquer toujours la catégorie par défaut même si ce n\'est pas pertinent.',
        ],
      },
      whenNot: {
        title: 'Quand il n\'est pas nécessaire de complexifier',
        items: [
          'Inutile de créer des salariés pour des paiements ponctuels sans importance.',
          'Inutile de remplir des champs supplémentaires si vous ne les utilisez pas.',
        ],
      },
      manual: {
        label: 'Manuel utilisateur · Fournisseurs et salariés',
      },
      video: {
        label: 'Vidéo (bientôt)',
        note: 'Organiser salaires et dépenses de personnel (8 minutes)',
      },
    },
    keywords: ['salariés', 'salaires', 'personnel', 'dni', 'catégorie par défaut', 'actif', 'inactif'],
  },
  '/dashboard/informes': {
    title: 'Aide · Rapports',
    intro:
      'Cet écran sert à générer les exports pour le cabinet : Modèle 182, Modèle 347 et certificats. Ici, on ne corrige pas les données ; on vérifie et on exporte.',
    steps: [
      'Choisissez l\'année fiscale et travaillez toujours sur une seule année à la fois.',
      'Modèle 182 : commencez par résoudre les alertes des donateurs (surtout DNI/CIF et Code postal).',
      'Vérifiez les retours affectés : ils impactent directement le total du 182 et des certificats.',
      'Générez le Modèle 182 et envoyez-le au cabinet.',
      'Modèle 347 : seuls les fournisseurs au-dessus du seuil annuel apparaissent ; vérifiez le CIF avant l\'export.',
      'Générez les certificats à l\'unité ou en lot selon le besoin.',
    ],
    tips: [
      'Si le 182 ne "colle" pas, c\'est presque toujours lié aux retours ou à des données donateurs incomplètes.',
      'Validez 2–3 cas représentatifs avant d\'envoyer des certificats en masse.',
      'Gardez une seule année "ouverte" à la fois pour éviter les confusions.',
    ],
    extra: {
      order: {
        title: 'Ordre recommandé quand il faut faire les rapports',
        items: [
          'Sélectionner l\'année fiscale.',
          'Résoudre les alertes donateurs (DNI/CP).',
          'Vérifier les retours.',
          'Générer le Modèle 182.',
          'Générer le Modèle 347.',
          'Générer les certificats.',
        ],
      },
      pitfalls: {
        title: 'Erreurs fréquentes',
        items: [
          'Générer le 182 avec des donateurs sans DNI ou Code postal.',
          'Oublier des retours en attente et gonfler les totaux.',
          'Mélanger les années (corriger une année tout en exportant une autre).',
          'Générer des certificats en masse sans valider un cas au préalable.',
        ],
      },
      checks: {
        title: 'Vérifications finales avant d\'envoyer au cabinet',
        items: [
          '182 : aucune alerte critique en attente.',
          '182 : totaux cohérents avec ce qui est attendu.',
          '347 : fournisseurs avec CIF correct.',
          'Certificats : signature et fonction configurées.',
        ],
      },
      manual: {
        label: 'Manuel utilisateur · Rapports fiscaux',
      },
      video: {
        label: 'Vidéo (bientôt)',
        note: 'Préparer le Modèle 182 et les certificats sans surprises (15 minutes)',
      },
    },
    keywords: [
      'modèle 182',
      'modèle 347',
      'certificats',
      'cabinet',
      'année fiscale',
      'retours',
      'alertes',
      'exporter',
    ],
  },
  '/dashboard/configuracion': {
    title: 'Aide · Paramètres',
    intro:
      'Ici, vous mettez l\'organisation "au propre" : données fiscales, logo et signature. Si tout est bon, certificats et rapports restent cohérents.',
    steps: [
      'Renseignez les données fiscales (nom, CIF, adresse) : elles apparaissent sur les exports.',
      'Ajoutez le logo et configurez signature + fonction : c\'est ce qui donne de la validité aux certificats.',
      'Vérifiez les catégories avec critère : ajoutez ce qui manque et évitez les changements agressifs.',
      'Gérez membres et rôles : l\'édition uniquement pour ceux qui en ont besoin.',
    ],
    tips: [
      'Priorité : fiscal + signature. Le reste est secondaire.',
      'Mieux vaut ajouter des catégories que les renommer si l\'historique existe.',
      'Les rôles lecture évitent les erreurs accidentelles.',
    ],
    extra: {
      order: {
        title: 'Ordre recommandé (10 minutes)',
        items: [
          'Données fiscales.',
          'Logo.',
          'Signature et fonction.',
          'Catégories et rôles.',
        ],
      },
      pitfalls: {
        title: 'Erreurs fréquentes',
        items: [
          'Laisser signature/fonction incomplètes et générer des certificats.',
          'Renommer des catégories déjà utilisées et perdre la cohérence.',
          'Donner des droits d\'édition à quelqu\'un qui doit seulement consulter.',
        ],
      },
      whenNot: {
        title: 'Quand il n\'est pas nécessaire d\'y toucher',
        items: [
          'Si vous ne faites que le suivi des Mouvements, inutile de retoucher les Paramètres chaque jour.',
          'Inutile d\'avoir tout parfait pour démarrer (sauf fiscal/signature).',
        ],
      },
      manual: {
        label: 'Manuel utilisateur · Configuration initiale',
      },
      video: {
        label: 'Vidéo (bientôt)',
        note: 'Bien configurer Summa Social dès le départ (8 minutes)',
      },
    },
    keywords: ['paramètres', 'cif', 'adresse', 'logo', 'signature', 'fonction', 'catégories', 'membres', 'rôles'],
  },
  '/dashboard/project-module/expenses': {
    title: 'Aide · Affectation des dépenses (Projets)',
    intro:
      'Cette boîte de réception regroupe les dépenses affectables : vous décidez ici à quel projet et à quelle ligne budgétaire rattacher chaque dépense, de façon rapide et réversible.',
    steps: [
      'Comprendre l\'écran : chaque ligne est une dépense (banque ou terrain) avec un statut 0% / partiel / 100%.',
      'Commencez par les en attente : filtrez "Non affectées" (0%) pour prioriser ce qui n\'est pas encore imputé.',
      'Quick Assign 100% : utilisez l\'action rapide pour affecter 100% de la dépense à un projet et (si besoin) à une ligne budgétaire.',
      'Split (affectation multiple) : si une dépense doit être répartie entre projets ou lignes, utilisez l\'affectation multiple et répartissez les montants jusqu\'à équilibre.',
      'Vérifiez le statut : le pourcentage doit refléter la réalité (100% si totalement imputée ; partiel si seulement une partie).',
      'Désaffecter : en cas d\'erreur, annulez l\'affectation pour revenir à 0% (ou ajustez la répartition).',
      'Affectation en masse : sélectionnez plusieurs dépenses et appliquez une affectation en bloc pour les cas répétitifs (même projet/ligne).',
      'Fin de revue : avant de valider un projet, vérifiez que les dépenses clés sont à 100% et que les splits ne laissent pas de montants "orphelins".',
    ],
    tips: [
      'Quand une ligne est sur-exécutée, le split partiel est la manière réaliste de rééquilibrer sans inventer des dépenses.',
      'Si une dépense ne correspond à aucun projet, mieux vaut la laisser à 0% que forcer une affectation incorrecte.',
      'Les dépenses terrain sont souvent saisies d\'abord puis affectées ensuite : privilégiez la cohérence de l\'imputation plutôt que la vitesse.',
    ],
    extra: {
      manual: {
        label: 'Manuel utilisateur · Affectation des dépenses',
      },
      video: {
        label: 'Vidéo (bientôt)',
        note: 'Affecter des dépenses aux projets de façon agile (10 minutes)',
      },
    },
    keywords: [
      'affectation',
      'projet',
      'ligne budgétaire',
      'quick assign',
      'split',
      '100%',
      'partiel',
      'désaffecter',
      'en masse',
      'terrain',
    ],
  },
  '/dashboard/project-module/projects': {
    title: 'Aide · Gestion des projets',
    intro:
      'Ici, vous créez et gérez les projets du module Projets, que vous utiliserez ensuite pour y affecter des dépenses.',
    steps: [
      'Créez un projet lorsque vous devez regrouper des dépenses sous un même ensemble (ex. une subvention, un programme ou une période de travail).',
      'Choisissez un nom clair et identifiable : c\'est celui affiché dans la boîte d\'affectation des dépenses.',
      'Ajoutez un code ou une référence si vous travaillez avec des justificatifs externes (optionnel mais recommandé).',
      'Vérifiez le statut du projet : actif tant que des dépenses y sont affectées ; fermé lorsqu\'il ne doit plus être utilisé.',
      'Si le projet a un budget, saisissez-le ou gérez les lignes budgétaires depuis son écran économique.',
      'Le projet prend son sens lorsque vous y affectez des dépenses depuis « Affectation des dépenses ».',
      'Évitez les projets en double pour de petites variantes : mieux vaut peu de projets bien définis.',
      'Quand le projet est terminé, fermez-le pour garder de l\'ordre et éviter des affectations accidentelles.',
    ],
    tips: [
      'Si vous hésitez pour une dépense, laissez-la non affectée jusqu\'à décision.',
      'Un projet bien défini rend l\'affectation plus rapide et réduit les erreurs.',
      'Fermer les anciens projets réduit le bruit et évite les mauvais choix.',
    ],
    extra: {
      manual: {
        label: 'Manuel utilisateur · Gestion des projets',
      },
      video: {
        label: 'Vidéo (bientôt)',
        note: 'Créer et gérer des projets de façon efficace (8 minutes)',
      },
    },
    keywords: ['projet', 'créer', 'éditer', 'fermer', 'code', 'budget', 'lignes budgétaires', 'affectation'],
  },
};

// UI strings (per idioma)
const UI_STRINGS_CA: JsonMessages = {
  'help.ui.searchPlaceholder': "Cerca dins l'ajuda…",
  'help.ui.viewGuide': 'Veure guia',
  'help.ui.viewManual': 'Manual complet',
  'help.ui.copyLink': 'Copiar enllaç',
  'help.ui.suggest': 'Suggerir una millora',
  'help.ui.noHelp': 'Aquesta pantalla encara no té ajuda.',
  'help.ui.noSteps': 'Encara no hi ha passos definits per aquesta pantalla.',
  'help.ui.noResults': 'No s\'han trobat resultats per "{query}".',
  'help.ui.linkCopied': 'Enllaç copiat',
  'help.ui.linkCopiedDesc': 'Ara pots compartir aquest enllaç amb algú altre.',
  'help.ui.steps': 'Passos',
  'help.ui.tips': 'Consells',
  'help.ui.tooltipHelp': "Ajuda d'aquesta pantalla",
};

const UI_STRINGS_ES: JsonMessages = {
  'help.ui.searchPlaceholder': 'Buscar en la ayuda…',
  'help.ui.viewGuide': 'Ver guía',
  'help.ui.viewManual': 'Manual completo',
  'help.ui.copyLink': 'Copiar enlace',
  'help.ui.suggest': 'Sugerir una mejora',
  'help.ui.noHelp': 'Esta pantalla aún no tiene ayuda.',
  'help.ui.noSteps': 'Aún no hay pasos definidos para esta pantalla.',
  'help.ui.noResults': 'No se han encontrado resultados para "{query}".',
  'help.ui.linkCopied': 'Enlace copiado',
  'help.ui.linkCopiedDesc': 'Ahora puedes compartir este enlace con otra persona.',
  'help.ui.steps': 'Pasos',
  'help.ui.tips': 'Consejos',
  'help.ui.tooltipHelp': 'Ayuda de esta pantalla',
};

const UI_STRINGS_FR: JsonMessages = {
  'help.ui.searchPlaceholder': "Rechercher dans l'aide…",
  'help.ui.viewGuide': 'Voir le guide',
  'help.ui.viewManual': 'Manuel complet',
  'help.ui.copyLink': 'Copier le lien',
  'help.ui.suggest': 'Suggérer une amélioration',
  'help.ui.noHelp': "Cet écran n'a pas encore d'aide.",
  'help.ui.noSteps': "Aucune étape n'est encore définie pour cet écran.",
  'help.ui.noResults': 'Aucun résultat pour "{query}".',
  'help.ui.linkCopied': 'Lien copié',
  'help.ui.linkCopiedDesc': 'Vous pouvez maintenant partager ce lien.',
  'help.ui.steps': 'Étapes',
  'help.ui.tips': 'Conseils',
  'help.ui.tooltipHelp': 'Aide de cet écran',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const LOCALES_DIR = path.join(__dirname, '../../src/i18n/locales');

function main() {
  console.log('🔧 Afegint claus help.* als JSON...\n');

  const languages = [
    { code: 'ca', data: HELP_CA, ui: UI_STRINGS_CA },
    { code: 'es', data: HELP_ES, ui: UI_STRINGS_ES },
    { code: 'fr', data: HELP_FR, ui: UI_STRINGS_FR },
    { code: 'pt', data: HELP_CA, ui: UI_STRINGS_CA }, // PT fa fallback a CA
  ];

  for (const { code, data, ui } of languages) {
    const filePath = path.join(LOCALES_DIR, `${code}.json`);

    // Carregar JSON existent
    let existing: JsonMessages = {};
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      existing = JSON.parse(content) as JsonMessages;
    }

    // Generar noves claus d'ajuda
    let newKeys: JsonMessages = {};
    for (const [route, content] of Object.entries(data)) {
      const flattened = flattenHelpContent(route, content);
      newKeys = { ...newKeys, ...flattened };
    }

    // Afegir UI strings
    newKeys = { ...newKeys, ...ui };

    // Merge: help.* + help.ui.* sobreescriuen existents
    const merged: JsonMessages = { ...existing };
    for (const [key, value] of Object.entries(newKeys)) {
      merged[key] = value;
    }

    // Ordenar claus
    const sorted = Object.keys(merged)
      .sort()
      .reduce((acc, key) => {
        acc[key] = merged[key];
        return acc;
      }, {} as JsonMessages);

    // Escriure
    fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');

    const helpKeys = Object.keys(newKeys).length;
    console.log(`✓ ${code}.json: ${helpKeys} claus help.* afegides`);
  }

  console.log('\n✅ Fet! Les claus d\'ajuda s\'han afegit als JSON.');
}

main();
