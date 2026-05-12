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
    locationCa: 'a la llista i el detall de projectes',
    locationEs: 'en la lista y el detalle de proyectos',
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
    locationCa: 'al bot i als continguts d’ajuda',
    locationEs: 'en el bot y los contenidos de ayuda',
  },
  general: {
    ca: 'App',
    es: 'App',
    locationCa: 'als fluxos principals de Summa Social',
    locationEs: 'en los flujos principales de Summa Social',
  },
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

function cleanCommitMessage(message: string): string {
  return message
    .split('\n')[0]
    .replace(/^(\w+)(\([^)]+\))?:\s*/u, '')
    .replace(/\s+\[[^\]]+\]\s*$/u, '')
    .trim()
    .replace(/\.$/, '');
}

function primaryArea(commits: WeeklyRelevantCommit[]): string {
  const counts = new Map<string, number>();
  for (const commit of commits) {
    const area = commit.areas[0] ?? 'general';
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'general';
}

function visibleChanges(commits: WeeklyRelevantCommit[]): string[] {
  const changes = commits
    .map((commit) => cleanCommitMessage(commit.message))
    .filter(Boolean)
    .filter((message) => !/^update deploy logs$/i.test(message))
    .slice(0, 3);

  return changes.length > 0 ? changes : ['ajustos visibles en fluxos operatius revisats aquesta setmana'];
}

function buildCaContent(args: {
  label: string;
  location: string;
  changes: string[];
  week: WeeklyWindow;
}): string {
  const primaryChange = args.changes[0];
  const secondaryChange = args.changes[1] ?? 'missatges i comprovacions més clars abans de continuar';

  return [
    `Aquesta setmana hem millorat ${args.label.toLowerCase()} amb canvis desplegats entre el ${args.week.weekStartLabel} i el ${args.week.weekEndLabel}.`,
    '',
    'Que canvia:',
    `- ${primaryChange}.`,
    `- ${secondaryChange}.`,
    '',
    'On ho notaràs:',
    `- ${args.location}.`,
    '',
    'Que has de fer:',
    '- No cal configurar res; usa el flux habitual i revisa els avisos quan apareguin.',
    '',
    'Límit:',
    '- No modifica dades ja guardades ni substitueix la revisió de l’equip.',
  ].join('\n');
}

function buildEsContent(args: {
  label: string;
  location: string;
  changes: string[];
  week: WeeklyWindow;
}): string {
  const primaryChange = args.changes[0];
  const secondaryChange = args.changes[1] ?? 'mensajes y comprobaciones más claros antes de continuar';

  return [
    `Esta semana hemos mejorado ${args.label.toLowerCase()} con cambios desplegados entre el ${args.week.weekStartLabel} y el ${args.week.weekEndLabel}.`,
    '',
    'Qué cambia:',
    `- ${primaryChange}.`,
    `- ${secondaryChange}.`,
    '',
    'Dónde lo notarás:',
    `- ${args.location}.`,
    '',
    'Qué tienes que hacer:',
    '- No hace falta configurar nada; usa el flujo habitual y revisa los avisos cuando aparezcan.',
    '',
    'Límite:',
    '- No modifica datos ya guardados ni sustituye la revisión del equipo.',
  ].join('\n');
}

export function generateWeeklyProductUpdateContent(args: {
  window: WeeklyWindow;
  commits: WeeklyRelevantCommit[];
}): WeeklyGeneratedContent {
  const area = primaryArea(args.commits);
  const areaCopy = AREA_LABELS[area] ?? AREA_LABELS.general;
  const changes = visibleChanges(args.commits);
  const firstChange = changes[0];
  const title = truncate(`${areaCopy.ca}: ${firstChange}`, 60);
  const esTitle = truncate(`${areaCopy.es}: ${firstChange}`, 60);
  const description = truncate(`Ara ${areaCopy.locationCa} veuràs ${firstChange}.`, 140);
  const esDescription = truncate(`Ahora ${areaCopy.locationEs} verás ${firstChange}.`, 140);
  const contentLong = buildCaContent({
    label: areaCopy.ca,
    location: areaCopy.locationCa,
    changes,
    week: args.window,
  });
  const esContent = buildEsContent({
    label: areaCopy.es,
    location: areaCopy.locationEs,
    changes,
    week: args.window,
  });
  const excerpt = truncate(`Canvis a ${areaCopy.locationCa}: ${firstChange}.`, 160);
  const esExcerpt = truncate(`Cambios ${areaCopy.locationEs}: ${firstChange}.`, 160);

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
