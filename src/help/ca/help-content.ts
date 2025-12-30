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
      'Aquí gestiones els proveïdors de l\'organització per poder assignar correctament les despeses i preparar el Model 347.',
    steps: [
      'Crea un proveïdor quan tinguis despeses recurrents o rellevants amb una empresa o professional.',
      'Introdueix el nom i el CIF: és imprescindible perquè el Model 347 es generi correctament.',
      'Assigna una categoria per defecte si el proveïdor sempre factura el mateix tipus de despesa (p. ex. nòmines, lloguer, serveis).',
      'Revisa o completa dades de contacte si et són útils (email, telèfon), tot i que no són obligatòries.',
      'Quan assignes un proveïdor a un moviment, la categoria per defecte pot aplicar-se automàticament.',
      'Utilitza l\'estat actiu/inactiu per mantenir la llista neta sense perdre l\'històric.',
      'Abans de generar el Model 347, revisa que els CIF estiguin correctes i que els imports quadrin.',
    ],
    tips: [
      'No cal crear un proveïdor per a despeses puntuals petites: prioritza els recurrents o significatius.',
      'Si un proveïdor canvia de nom comercial però manté el CIF, actualitza\'l en lloc de crear-ne un de nou.',
      'Un bon manteniment de proveïdors simplifica molt el Model 347.',
    ],
    keywords: ['proveïdor', 'cif', 'model 347', 'categoria per defecte', 'despesa', 'empresa', 'professional'],
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
    keywords: ['projecte', 'crear', 'editar', 'tancar', 'codi', 'pressupost', 'partides', 'assignació'],
  },
};

export const HELP_FALLBACK_CA: HelpContent = {
  title: 'Ajuda',
  intro: 'Aquesta pantalla encara no té ajuda.',
  steps: [],
};
