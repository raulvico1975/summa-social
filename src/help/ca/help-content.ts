import type { HelpContent, HelpRouteKey } from '../help-types';

export const HELP_CONTENT_CA: Record<HelpRouteKey, HelpContent> = {
  '/dashboard': {
    title: 'Ajuda · Dashboard',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
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
      manual: {
        label: 'Manual d\'usuari · Gestió de Moviments',
        href: '/dashboard/manual#5-gestio-de-moviments',
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
    ],
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
        href: '/dashboard/manual#4-gestio-de-proveidors-i-treballadors',
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
      'Aquí gestiones els treballadors de l\'organització per assignar nòmines i altres despeses de personal.',
    steps: [
      'Crea un treballador quan tinguis nòmines o pagaments recurrents de personal.',
      'Introdueix el nom i el DNI: facilita el control intern i la traçabilitat de despeses.',
      'Assigna una categoria per defecte (habitualment nòmines) per agilitzar l\'assignació als moviments.',
      'Mantén l\'estat actiu/inactiu al dia quan una persona entra o surt de l\'organització.',
      'Quan assignes un treballador a un moviment, revisa que la categoria aplicada sigui coherent.',
      'Utilitza aquesta pantalla com a referència interna; no substitueix una eina de recursos humans.',
    ],
    tips: [
      'Si un treballador ja no té moviments nous, marca\'l com a inactiu en lloc d\'esborrar-lo.',
      'Centralitzar nòmines sota treballadors fa més llegible la despesa de personal.',
      'No barregis treballadors i proveïdors: cada tipus de contacte té una funció diferent.',
    ],
    keywords: ['treballador', 'nòmina', 'personal', 'dni', 'categoria per defecte', 'despesa'],
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
        href: '/dashboard/manual#7-informes-fiscals',
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
        href: '/dashboard/manual#2-configuracio-inicial',
      },
      video: {
        label: 'Vídeo (properament)',
        note: 'Configurar Summa Social bé des del primer dia (8 minuts)',
      },
    },
    keywords: ['configuració', 'cif', 'adreça', 'logo', 'signatura', 'càrrec', 'categories', 'membres', 'rols'],
  },
  '/dashboard/projectes': {
    title: 'Ajuda · Projectes',
    intro: 'Aquesta ajuda està pendent d\'emplenar.',
    steps: [],
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
        href: '/dashboard/manual#6-assignacio-de-despeses',
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
        href: '/dashboard/manual#6-gestio-de-projectes',
      },
      video: {
        label: 'Vídeo (properament)',
        note: 'Crear i gestionar projectes de forma eficient (8 minuts)',
      },
    },
    keywords: ['projecte', 'crear', 'editar', 'tancar', 'codi', 'pressupost', 'partides', 'assignació'],
  },
};

export const HELP_FALLBACK_CA: HelpContent = {
  title: 'Ajuda',
  intro: 'Aquesta pantalla encara no té ajuda.',
  steps: [],
};
