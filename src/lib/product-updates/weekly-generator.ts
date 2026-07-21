import type { WeeklyRelevantCommit } from './generate-weekly-update';
import type { WeeklyWindow } from './weekly-window';

export interface WeeklyGeneratedContent {
  title: string;
  description: string;
  contentLong: string;
  web: {
    excerpt: string;
    content: string;
  };
  locales: {
    es: {
      title: string;
      description: string;
      contentLong: string;
      web: {
        title: string;
        excerpt: string;
        content: string;
      };
    };
  };
}

const NON_VISIBLE_MESSAGE_PATTERNS = [
  /^refactor\b/i,
  /^test\b/i,
  /^docs?\b/i,
  /^chore\(deploy\):\s*update deploy logs/i,
  /^chore\(deploy\):\s*registra/i,
  /^security\b/i,
];

const NON_VISIBLE_FILE_PATTERNS = [
  /^docs\//,
  /^scripts\//,
  /^tests\//,
  /^src\/lib\/__tests__\//,
  /^src\/lib\/blog\/__tests__\//,
  /^functions\/lib\//,
];

const VISIBLE_FILE_PATTERNS = [
  /^src\/app\/public\//,
  /^src\/app\/\[orgSlug\]\//,
  /^src\/app\/api\//,
  /^src\/components\/(?!admin\/)/,
  /^src\/hooks\//,
  /^src\/help\//,
  /^src\/lib\/support\//,
  /^src\/lib\/product-updates\//,
  /^src\/lib\/blog\//,
  /^src\/i18n\//,
  /^public\/media\//,
];

const AREA_LABELS: Record<string, { ca: string; es: string; locationCa: string; locationEs: string }> = {
  dashboard: {
    ca: 'Dashboard',
    es: 'Dashboard',
    locationCa: 'al resum i als indicadors del dashboard',
    locationEs: 'en el resumen y los indicadores del dashboard',
  },
  moviments: {
    ca: 'Moviments',
    es: 'Movimientos',
    locationCa: 'a la revisió i classificació de moviments',
    locationEs: 'en la revisión y clasificación de movimientos',
  },
  remeses: {
    ca: 'Remeses',
    es: 'Remesas',
    locationCa: 'a la preparació i revisió de remeses',
    locationEs: 'en la preparación y revisión de remesas',
  },
  projectes: {
    ca: 'Projectes',
    es: 'Proyectos',
    locationCa: 'a la gestió de projectes',
    locationEs: 'en la gestión de proyectos',
  },
  donants: {
    ca: 'Donants',
    es: 'Donantes',
    locationCa: 'a les fitxes i revisions de donants',
    locationEs: 'en las fichas y revisiones de donantes',
  },
  configuracio: {
    ca: 'Configuració',
    es: 'Configuración',
    locationCa: 'a la configuració i els permisos',
    locationEs: 'en la configuración y los permisos',
  },
  integracions: {
    ca: 'Integracions',
    es: 'Integraciones',
    locationCa: 'als fluxos connectats amb serveis externs',
    locationEs: 'en los flujos conectados con servicios externos',
  },
  admin: {
    ca: 'Administració',
    es: 'Administración',
    locationCa: 'a les eines internes de gestió',
    locationEs: 'en las herramientas internas de gestión',
  },
  informes: {
    ca: 'Informes',
    es: 'Informes',
    locationCa: 'a les exportacions i informes',
    locationEs: 'en las exportaciones e informes',
  },
  suport: {
    ca: 'Ajuda',
    es: 'Ayuda',
    locationCa: 'al bot d’ajuda i als continguts d’ajuda',
    locationEs: 'en el bot de ayuda y los contenidos de ayuda',
  },
  general: {
    ca: 'App',
    es: 'App',
    locationCa: 'als fluxos principals de Summa Social',
    locationEs: 'en los flujos principales de Summa Social',
  },
};

type EditorialChange = {
  key: string;
  ca: string;
  es: string;
  locationCa: string;
  locationEs: string;
  actionCa: string;
  actionEs: string;
};

function headline(message: string): string {
  return message.split('\n')[0]?.trim() ?? '';
}

function isVisibleProductFile(file: string): boolean {
  if (NON_VISIBLE_FILE_PATTERNS.some((pattern) => pattern.test(file))) {
    return false;
  }
  return VISIBLE_FILE_PATTERNS.some((pattern) => pattern.test(file));
}

export function filterVisibleProductCommits(
  commits: WeeklyRelevantCommit[]
): WeeklyRelevantCommit[] {
  return commits.filter((commit) => {
    const firstLine = headline(commit.message);
    if (NON_VISIBLE_MESSAGE_PATTERNS.some((pattern) => pattern.test(firstLine))) {
      return false;
    }

    return commit.files.some(isVisibleProductFile);
  });
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1).trimEnd()}…`;
}

function formatDateForCopy(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function cleanCommitMessage(message: string): string {
  return message
    .split('\n')[0]
    .replace(/^(\w+)(\([^)]+\))?:\s*/u, '')
    .replace(/\s+\[[^\]]+\]\s*$/u, '')
    .trim()
    .replace(/\.$/, '');
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hasCommitFile(commit: WeeklyRelevantCommit, pattern: RegExp): boolean {
  return commit.files.some((file) => pattern.test(file));
}

function productLanguageChange(commit: WeeklyRelevantCommit): EditorialChange | null {
  const rawMessage = normalizeForMatch(headline(commit.message));
  const message = normalizeForMatch(cleanCommitMessage(commit.message));

  if (rawMessage.includes('invit') && (message.includes('validacio') || message.includes('enllac'))) {
    return {
      key: 'invitation-validation-links',
      ca: 'Ara les invitacions validen millor l’accés i els enllaços abans de continuar',
      es: 'Ahora las invitaciones validan mejor el acceso y los enlaces antes de continuar',
      locationCa: 'al registre, l’accés i la incorporació de persones usuàries',
      locationEs: 'en el registro, el acceso y la incorporación de personas usuarias',
      actionCa: 'Revisa l’enllaç rebut i demana una invitació nova si ja no és vàlid',
      actionEs: 'Revisa el enlace recibido y solicita una invitación nueva si ya no es válido',
    };
  }

  if (message.includes('contact') && (message.includes('guardar') || message.includes('guardat'))) {
    return {
      key: 'contact-save-reliability',
      ca: 'Ara pots guardar contactes amb menys errors quan encara falta alguna dada fiscal',
      es: 'Ahora puedes guardar contactos con menos errores cuando todavía falta algún dato fiscal',
      locationCa: 'a les fitxes de contactes i proveïdors',
      locationEs: 'en las fichas de contactos y proveedores',
      actionCa: 'Continua guardant el contacte i completa les dades fiscals quan les tinguis disponibles',
      actionEs: 'Sigue guardando el contacto y completa los datos fiscales cuando estén disponibles',
    };
  }

  if (message.includes('assignacio natural de moviments')) {
    return {
      key: 'support-bot-movement-routing',
      ca: 'El bot d’ajuda respon millor les preguntes naturals sobre assignació de moviments',
      es: 'El bot de ayuda responde mejor a las preguntas naturales sobre asignación de movimientos',
      locationCa: 'al bot d’ajuda quan consultes com revisar o assignar moviments',
      locationEs: 'en el bot de ayuda cuando consultas cómo revisar o asignar movimientos',
      actionCa: 'Escriu la consulta amb les teves paraules i revisa el pas recomanat',
      actionEs: 'Escribe la consulta con tus palabras y revisa el paso recomendado',
    };
  }

  if (
    rawMessage.includes('support-bot')
    && (message.includes('ajuda natural') || message.includes('context d entitat'))
  ) {
    return {
      key: 'support-bot-context-language',
      ca: 'El bot d’ajuda entén millor l’idioma, l’entitat visible i el context de cada pregunta',
      es: 'El bot de ayuda entiende mejor el idioma, la entidad visible y el contexto de cada pregunta',
      locationCa: 'al bot d’ajuda en català i castellà',
      locationEs: 'en el bot de ayuda en catalán y castellano',
      actionCa: 'Pregunta amb naturalitat des de l’entitat amb què estàs treballant',
      actionEs: 'Pregunta con naturalidad desde la entidad con la que estás trabajando',
    };
  }

  if (
    hasCommitFile(commit, /src\/lib\/importers\/bank\/selectBankStatementSheet\.ts$/)
    || hasCommitFile(commit, /src\/components\/transaction-importer\.tsx$/)
  ) {
    return {
      key: 'bank-statement-sheet-selection',
      ca: 'Ara l’importador bancari selecciona millor el full que conté l’extracte vàlid',
      es: 'Ahora el importador bancario selecciona mejor la hoja que contiene el extracto válido',
      locationCa: 'a la importació de moviments des de fitxers Excel',
      locationEs: 'en la importación de movimientos desde archivos Excel',
      actionCa: 'Revisa el resum de la importació abans de confirmar els moviments',
      actionEs: 'Revisa el resumen de la importación antes de confirmar los movimientos',
    };
  }

  if (message.includes('exigeix permis per arxivar projectes')) {
    return {
      key: 'project-archive-permission',
      ca: 'L’arxivament de projectes exigeix el permís corresponent',
      es: 'El archivado de proyectos exige el permiso correspondiente',
      locationCa: 'a la gestió de projectes',
      locationEs: 'en la gestión de proyectos',
      actionCa: 'Si no veus l’opció d’arxivar, demana-ho a una persona administradora de l’entitat',
      actionEs: 'Si no ves la opción de archivar, pídeselo a una persona administradora de la entidad',
    };
  }

  if (message.includes('exigeix permis per arxivar categories')) {
    return {
      key: 'category-archive-permission',
      ca: 'L’arxivament de categories queda protegit pel mateix criteri de permisos',
      es: 'El archivado de categorías queda protegido por el mismo criterio de permisos',
      locationCa: 'a la configuració de categories',
      locationEs: 'en la configuración de categorías',
      actionCa: 'Si gestiones categories, revisa els permisos abans de delegar aquesta acció',
      actionEs: 'Si gestionas categorías, revisa los permisos antes de delegar esta acción',
    };
  }

  if (message.includes('amplia comprensio natural del bot')) {
    return {
      key: 'support-bot-understanding',
      ca: 'El bot d’ajuda entén millor preguntes formulades amb llenguatge natural',
      es: 'El bot de ayuda entiende mejor preguntas formuladas con lenguaje natural',
      locationCa: 'al bot d’ajuda i als continguts d’ajuda',
      locationEs: 'en el bot de ayuda y los contenidos de ayuda',
      actionCa: 'Escriu la pregunta amb les teves paraules; no cal buscar el nom exacte del tema',
      actionEs: 'Escribe la pregunta con tus palabras; no hace falta buscar el nombre exacto del tema',
    };
  }

  if (message.includes('millora encaminament de preguntes naturals')) {
    return {
      key: 'support-bot-routing',
      ca: 'El bot encamina millor les preguntes naturals cap al contingut d’ajuda adequat',
      es: 'El bot dirige mejor las preguntas naturales hacia el contenido de ayuda adecuado',
      locationCa: 'al bot d’ajuda i als continguts d’ajuda',
      locationEs: 'en el bot de ayuda y los contenidos de ayuda',
      actionCa: 'Prova consultes més directes quan necessitis trobar una resposta ràpida',
      actionEs: 'Prueba consultas más directas cuando necesites encontrar una respuesta rápida',
    };
  }

  if (message.includes('adapta lifecycle route al contracte de next')) {
    return {
      key: 'project-lifecycle-stability',
      ca: 'Les accions sobre l’estat dels projectes responen de manera més consistent',
      es: 'Las acciones sobre el estado de los proyectos responden de forma más consistente',
      locationCa: 'a la gestió de projectes',
      locationEs: 'en la gestión de proyectos',
      actionCa: 'Continua fent servir les accions de projecte habituals i revisa els avisos si apareixen',
      actionEs: 'Sigue usando las acciones de proyecto habituales y revisa los avisos si aparecen',
    };
  }

  if (message.includes('afegeix textos de lifecycle de projectes')) {
    return {
      key: 'project-lifecycle-copy',
      ca: 'Els missatges del cicle de vida dels projectes apareixen amb textos més complets',
      es: 'Los mensajes del ciclo de vida de los proyectos aparecen con textos más completos',
      locationCa: 'a la gestió de projectes',
      locationEs: 'en la gestión de proyectos',
      actionCa: 'Llegeix els missatges abans de confirmar canvis d’estat importants',
      actionEs: 'Lee los mensajes antes de confirmar cambios de estado importantes',
    };
  }

  if (message.includes('tanca projectes i elimina nomes projectes buits')) {
    return {
      key: 'project-close-empty-delete',
      ca: 'Ara pots tancar projectes i només eliminar els que encara no tenen dades associades',
      es: 'Ahora puedes cerrar proyectos y eliminar solo los que todavía no tienen datos asociados',
      locationCa: 'a la gestió de projectes',
      locationEs: 'en la gestión de proyectos',
      actionCa: 'Tanca projectes finalitzats i reserva l’eliminació per a projectes creats per error',
      actionEs: 'Cierra proyectos finalizados y reserva la eliminación para proyectos creados por error',
    };
  }

  if (message.includes('nou resum del dashboard')) {
    return {
      key: 'dashboard-summary',
      ca: 'El resum del dashboard mostra millor l’estat de l’activitat recent',
      es: 'El resumen del dashboard muestra mejor el estado de la actividad reciente',
      locationCa: 'al resum i als indicadors del dashboard',
      locationEs: 'en el resumen y los indicadores del dashboard',
      actionCa: 'Consulta el dashboard abans de revisar els detalls de cada àrea',
      actionEs: 'Consulta el dashboard antes de revisar los detalles de cada área',
    };
  }

  if (message.includes('millor context en projectes')) {
    return {
      key: 'project-context',
      ca: 'La informació de projectes dona més context abans de prendre decisions',
      es: 'La información de proyectos ofrece más contexto antes de tomar decisiones',
      locationCa: 'a la gestió de projectes',
      locationEs: 'en la gestión de proyectos',
      actionCa: 'Revisa el context del projecte abans de confirmar canvis',
      actionEs: 'Revisa el contexto del proyecto antes de confirmar cambios',
    };
  }

  const cleaned = cleanCommitMessage(commit.message);
  if (/handler|route|contracte de next|deploy|refactor/i.test(cleaned)) {
    return null;
  }

  return {
    key: normalizeForMatch(cleaned),
    ca: cleaned,
    es: '',
    locationCa: AREA_LABELS[commit.areas[0] ?? 'general']?.locationCa ?? AREA_LABELS.general.locationCa,
    locationEs: AREA_LABELS[commit.areas[0] ?? 'general']?.locationEs ?? AREA_LABELS.general.locationEs,
    actionCa: 'Revisa els avisos del flux habitual quan apareguin',
    actionEs: 'Revisa los avisos del flujo habitual cuando aparezcan',
  };
}

function primaryArea(commits: WeeklyRelevantCommit[]): string {
  const counts = new Map<string, number>();
  for (const commit of commits) {
    const area = commit.areas[0] ?? 'general';
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'general';
}

function editorialChanges(commits: WeeklyRelevantCommit[]): EditorialChange[] {
  const seen = new Set<string>();
  const changes: EditorialChange[] = [];

  for (const commit of commits) {
    const change = productLanguageChange(commit);
    if (!change || seen.has(change.key)) continue;
    if (!change.es) continue;
    seen.add(change.key);
    changes.push(change);
  }

  return changes.slice(0, 4);
}

function buildCaContent(args: {
  label: string;
  changes: EditorialChange[];
  week: WeeklyWindow;
  intro?: string;
}): string {
  const actionLines = Array.from(new Set(args.changes.map((change) => change.actionCa))).slice(0, 3);
  const locationLines = Array.from(new Set(args.changes.map((change) => change.locationCa))).slice(0, 3);

  return [
    args.intro ?? `Aquesta setmana hem millorat ${args.label.toLowerCase()} amb canvis desplegats entre el ${formatDateForCopy(args.week.weekStartLabel)} i el ${formatDateForCopy(args.week.weekEndLabel)}.`,
    '',
    'Què canvia:',
    ...args.changes.map((change) => `- ${change.ca}.`),
    '',
    'On ho notaràs:',
    ...locationLines.map((location) => `- ${location}.`),
    '',
    'Què has de fer:',
    ...actionLines.map((action) => `- ${action}.`),
    '',
    'Límit:',
    '- No modifica dades ja guardades.',
    '- Només reforça com s’executen aquestes accions dins del flux habitual.',
  ].join('\n');
}

function buildEsContent(args: {
  label: string;
  changes: EditorialChange[];
  week: WeeklyWindow;
  intro?: string;
}): string {
  const actionLines = Array.from(new Set(args.changes.map((change) => change.actionEs))).slice(0, 3);
  const locationLines = Array.from(new Set(args.changes.map((change) => change.locationEs))).slice(0, 3);

  return [
    args.intro ?? `Esta semana hemos mejorado ${args.label.toLowerCase()} con cambios desplegados entre el ${formatDateForCopy(args.week.weekStartLabel)} y el ${formatDateForCopy(args.week.weekEndLabel)}.`,
    '',
    'Qué cambia:',
    ...args.changes.map((change) => `- ${change.es}.`),
    '',
    'Dónde lo notarás:',
    ...locationLines.map((location) => `- ${location}.`),
    '',
    'Qué tienes que hacer:',
    ...actionLines.map((action) => `- ${action}.`),
    '',
    'Límite:',
    '- No modifica datos ya guardados.',
    '- Solo refuerza cómo se ejecutan estas acciones dentro del flujo habitual.',
  ].join('\n');
}

export function generateWeeklyProductUpdateContent(args: {
  window: WeeklyWindow;
  commits: WeeklyRelevantCommit[];
}): WeeklyGeneratedContent {
  const area = primaryArea(args.commits);
  const areaCopy = AREA_LABELS[area] ?? AREA_LABELS.general;
  const changes = editorialChanges(args.commits);
  if (changes.length === 0) {
    throw new Error('needs_editorial_review');
  }
  const firstChange = changes[0];
  const hasArchivePermissions = changes.some((change) =>
    change.key === 'project-archive-permission' || change.key === 'category-archive-permission'
  );
  const hasSupportBot = changes.some((change) =>
    change.key === 'support-bot-understanding'
    || change.key === 'support-bot-routing'
    || change.key === 'support-bot-movement-routing'
    || change.key === 'support-bot-context-language'
  );
  const hasInvitationsAndContacts = changes.some((change) => change.key === 'invitation-validation-links')
    && changes.some((change) => change.key === 'contact-save-reliability');
  const hasBankImport = changes.some((change) => change.key === 'bank-statement-sheet-selection');
  const weekStartCopy = formatDateForCopy(args.window.weekStartLabel);
  const weekEndCopy = formatDateForCopy(args.window.weekEndLabel);
  const title = hasInvitationsAndContacts
    ? 'Contactes i invitacions: guardat i accessos més fiables'
    : hasSupportBot && hasBankImport
    ? 'Ajuda i importació bancària: més precisió'
    : hasArchivePermissions && hasSupportBot
    ? 'Projectes, categories i ajuda: més control i millor orientació'
    : hasArchivePermissions
    ? 'Projectes i categories: arxivament amb permisos més estrictes'
    : truncate(`${areaCopy.ca}: ${firstChange.ca}`, 60);
  const esTitle = hasInvitationsAndContacts
    ? 'Contactos e invitaciones: guardado y accesos más fiables'
    : hasSupportBot && hasBankImport
    ? 'Ayuda e importación bancaria: más precisión'
    : hasArchivePermissions && hasSupportBot
    ? 'Proyectos, categorías y ayuda: más control y mejor orientación'
    : hasArchivePermissions
    ? 'Proyectos y categorías: archivado con permisos más estrictos'
    : truncate(`${areaCopy.es}: ${firstChange.es}`, 60);
  const description = hasInvitationsAndContacts
    ? 'Guardar contactes és més fiable i les invitacions validen millor els accessos i els enllaços.'
    : hasSupportBot && hasBankImport
    ? 'El bot resol millor preguntes naturals i l’importador identifica millor el full de l’extracte.'
    : hasArchivePermissions && hasSupportBot
    ? 'Ara l’arxivament queda més protegit i el bot d’ajuda entén millor preguntes naturals.'
    : hasArchivePermissions
    ? 'Ara l’arxivament de projectes i categories queda limitat als usuaris amb permís adequat.'
    : truncate(`Ara ${firstChange.locationCa} veuràs ${firstChange.ca.toLowerCase()}.`, 140);
  const esDescription = hasInvitationsAndContacts
    ? 'Guardar contactos es más fiable y las invitaciones validan mejor los accesos y los enlaces.'
    : hasSupportBot && hasBankImport
    ? 'El bot resuelve mejor preguntas naturales y el importador identifica mejor la hoja del extracto.'
    : hasArchivePermissions && hasSupportBot
    ? 'Ahora el archivado queda más protegido y el bot de ayuda entiende mejor preguntas naturales.'
    : hasArchivePermissions
    ? 'Ahora el archivado de proyectos y categorías queda limitado a usuarios con el permiso adecuado.'
    : truncate(`Ahora ${firstChange.locationEs} verás ${firstChange.es.toLowerCase()}.`, 140);
  const contentLong = buildCaContent({
    label: areaCopy.ca,
    changes,
    week: args.window,
    intro: hasInvitationsAndContacts
      ? `Aquesta setmana hem reforçat el guardat de contactes i el flux d’invitacions amb canvis desplegats entre el ${weekStartCopy} i el ${weekEndCopy}.`
      : hasSupportBot && hasBankImport
      ? `Aquesta setmana hem millorat el bot d’ajuda i la selecció de fulls en la importació bancària amb canvis desplegats entre el ${weekStartCopy} i el ${weekEndCopy}.`
      : hasArchivePermissions && hasSupportBot
      ? `Aquesta setmana hem reforçat controls de projectes i categories i hem millorat el bot d’ajuda amb canvis desplegats entre el ${weekStartCopy} i el ${weekEndCopy}.`
      : undefined,
  });
  const esContent = buildEsContent({
    label: areaCopy.es,
    changes,
    week: args.window,
    intro: hasInvitationsAndContacts
      ? `Esta semana hemos reforzado el guardado de contactos y el flujo de invitaciones con cambios desplegados entre el ${weekStartCopy} y el ${weekEndCopy}.`
      : hasSupportBot && hasBankImport
      ? `Esta semana hemos mejorado el bot de ayuda y la selección de hojas en la importación bancaria con cambios desplegados entre el ${weekStartCopy} y el ${weekEndCopy}.`
      : hasArchivePermissions && hasSupportBot
      ? `Esta semana hemos reforzado controles de proyectos y categorías y hemos mejorado el bot de ayuda con cambios desplegados entre el ${weekStartCopy} y el ${weekEndCopy}.`
      : undefined,
  });
  const excerpt = hasInvitationsAndContacts
    ? 'Guardat de contactes més fiable i invitacions amb validacions d’accés més clares.'
    : hasSupportBot && hasBankImport
    ? 'Millor orientació al bot d’ajuda i selecció més precisa del full de l’extracte.'
    : hasArchivePermissions && hasSupportBot
    ? 'Més control en arxivament i millor comprensió del bot d’ajuda.'
    : hasArchivePermissions
    ? 'Arxivament de projectes i categories amb permisos més estrictes.'
    : truncate(`Canvis ${firstChange.locationCa}: ${firstChange.ca}.`, 160);
  const esExcerpt = hasInvitationsAndContacts
    ? 'Guardado de contactos más fiable e invitaciones con validaciones de acceso más claras.'
    : hasSupportBot && hasBankImport
    ? 'Mejor orientación en el bot de ayuda y selección más precisa de la hoja del extracto.'
    : hasArchivePermissions && hasSupportBot
    ? 'Más control en archivado y mejor comprensión del bot de ayuda.'
    : hasArchivePermissions
    ? 'Archivado de proyectos y categorías con permisos más estrictos.'
    : truncate(`Cambios ${firstChange.locationEs}: ${firstChange.es}.`, 160);

  return {
    title,
    description,
    contentLong,
    web: {
      excerpt,
      content: contentLong,
    },
    locales: {
      es: {
        title: esTitle,
        description: esDescription,
        contentLong: esContent,
        web: {
          title: esTitle,
          excerpt: esExcerpt,
          content: esContent,
        },
      },
    },
  };
}
