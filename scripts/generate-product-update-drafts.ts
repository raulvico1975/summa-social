/**
 * Script per generar esborranys de novetats del producte a partir de commits.
 *
 * Execució: npx tsx scripts/generate-product-update-drafts.ts
 *           npm run updates:drafts
 *
 * Output: ./docs/product-updates/product-updates-drafts.json
 *
 * Filtres:
 * - Només commits amb prefixos: feat:, fix:, perf:, refactor:
 * - Agrupa per àrees deduïdes dels paths modificats
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Tipus
// ─────────────────────────────────────────────────────────────────────────────

type DraftItem = {
  id: string;
  title: string;
  description: string;
  link: string | null;
  evidence: string[];
};

type DraftsOutput = {
  generatedAt: string;
  range: string;
  drafts: DraftItem[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Configuració
// ─────────────────────────────────────────────────────────────────────────────

const COMMIT_LIMIT = 50;

// Prefixos rellevants (conventional commits)
const RELEVANT_PREFIXES = ['feat', 'fix', 'perf', 'refactor'];

// Mapa d'àrees per path patterns
const AREA_PATTERNS: { pattern: RegExp; area: string; label: string }[] = [
  { pattern: /dashboard\/movimientos|transactions-table/i, area: 'moviments', label: 'Moviments' },
  { pattern: /dashboard\/donants|donors/i, area: 'donants', label: 'Donants' },
  { pattern: /dashboard\/proveidors|suppliers/i, area: 'proveidors', label: 'Proveïdors' },
  { pattern: /project-module|budget/i, area: 'projectes', label: 'Mòdul Projectes' },
  { pattern: /reports|fiscal|model-182|model-347/i, area: 'informes', label: 'Informes' },
  { pattern: /configuracion|settings/i, area: 'configuracio', label: 'Configuració' },
  { pattern: /pending-documents|prebank/i, area: 'prebank', label: 'Documents pendents' },
  { pattern: /help|manual/i, area: 'ajuda', label: 'Ajuda' },
  { pattern: /a11y|accessibility/i, area: 'accessibilitat', label: 'Accessibilitat' },
  { pattern: /i18n|translations/i, area: 'i18n', label: 'Traduccions' },
  { pattern: /ui|components/i, area: 'ui', label: 'Interfície' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getRecentCommits(): string[] {
  try {
    const output = execSync(`git log -${COMMIT_LIMIT} --pretty=format:"%s"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error obtenint commits:', error);
    return [];
  }
}

function getCommitFiles(commit: string): string[] {
  try {
    // Buscar el hash del commit pel missatge
    const hash = execSync(`git log --all --grep="${commit.replace(/"/g, '\\"')}" --pretty=format:"%H" -1`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (!hash) return [];

    const output = execSync(`git diff-tree --no-commit-id --name-only -r ${hash}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function isRelevantCommit(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return RELEVANT_PREFIXES.some(prefix =>
    lowerMessage.startsWith(`${prefix}:`) ||
    lowerMessage.startsWith(`${prefix}(`)
  );
}

function extractPrefix(message: string): string {
  const match = message.match(/^(\w+)(\([^)]+\))?:/);
  return match ? match[1] : 'other';
}

function detectArea(files: string[]): { area: string; label: string } | null {
  for (const file of files) {
    for (const { pattern, area, label } of AREA_PATTERNS) {
      if (pattern.test(file)) {
        return { area, label };
      }
    }
  }
  return null;
}

function cleanCommitMessage(message: string): string {
  // Treure prefix, scope i emojis
  return message
    .replace(/^(\w+)(\([^)]+\))?:\s*/, '')
    .replace(/^\p{Emoji}\s*/gu, '')
    .trim();
}

function generateTitle(prefix: string, area: string): string {
  const prefixLabels: Record<string, string> = {
    feat: 'Noves funcionalitats',
    fix: 'Correccions',
    perf: 'Millores de rendiment',
    refactor: 'Millores internes',
  };

  const areaLabels: Record<string, string> = {
    moviments: 'en moviments',
    donants: 'en donants',
    proveidors: 'en proveïdors',
    projectes: 'en mòdul projectes',
    informes: 'en informes',
    configuracio: 'en configuració',
    prebank: 'en documents pendents',
    ajuda: 'en ajuda',
    accessibilitat: "d'accessibilitat",
    i18n: 'de traduccions',
    ui: "d'interfície",
    general: 'generals',
  };

  return `${prefixLabels[prefix] || 'Canvis'} ${areaLabels[area] || ''}`.trim();
}

function generateDescription(commits: string[]): string {
  // Agafar els 2-3 commits més representatius
  const cleaned = commits.slice(0, 3).map(cleanCommitMessage);

  if (cleaned.length === 1) {
    return cleaned[0];
  }

  // Resumir si són molts
  if (commits.length > 3) {
    return `${cleaned[0]} i ${commits.length - 1} millores més.`;
  }

  return cleaned.join('. ') + '.';
}

function generateDraftId(area: string, index: number): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `draft-${today}-${area}-${index}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         GENERADOR D\'ESBORRANYS DE NOVETATS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Obtenir commits recents
  const commits = getRecentCommits();
  console.log(`📋 Commits analitzats: ${commits.length}`);

  // 2. Filtrar commits rellevants
  const relevantCommits = commits.filter(isRelevantCommit);
  console.log(`✅ Commits rellevants: ${relevantCommits.length}`);

  if (relevantCommits.length === 0) {
    console.log('\n⚠️  Cap commit rellevant trobat. Sortint.');
    return;
  }

  // 3. Agrupar per àrea
  const groupedByArea: Record<string, { label: string; commits: string[] }> = {};

  for (const commit of relevantCommits) {
    const files = getCommitFiles(commit);
    const areaInfo = detectArea(files);
    const area = areaInfo?.area || 'general';
    const label = areaInfo?.label || 'General';

    if (!groupedByArea[area]) {
      groupedByArea[area] = { label, commits: [] };
    }
    groupedByArea[area].commits.push(commit);
  }

  console.log(`📂 Àrees detectades: ${Object.keys(groupedByArea).join(', ')}`);

  // 4. Generar drafts
  const drafts: DraftItem[] = [];
  let index = 1;

  for (const [area, { label, commits: areaCommits }] of Object.entries(groupedByArea)) {
    // Agrupar per prefix dins l'àrea
    const byPrefix: Record<string, string[]> = {};
    for (const commit of areaCommits) {
      const prefix = extractPrefix(commit);
      if (!byPrefix[prefix]) byPrefix[prefix] = [];
      byPrefix[prefix].push(commit);
    }

    // Crear un draft per cada prefix significatiu
    for (const [prefix, prefixCommits] of Object.entries(byPrefix)) {
      if (!RELEVANT_PREFIXES.includes(prefix)) continue;

      drafts.push({
        id: generateDraftId(area, index++),
        title: generateTitle(prefix, area),
        description: generateDescription(prefixCommits),
        link: null,
        evidence: prefixCommits,
      });
    }
  }

  console.log(`\n📝 Esborranys generats: ${drafts.length}`);

  // 5. Escriure output
  const output: DraftsOutput = {
    generatedAt: new Date().toISOString(),
    range: `last${COMMIT_LIMIT}`,
    drafts,
  };

  // Escriure a docs/product-updates/ (font única)
  const docsDir = join(process.cwd(), 'docs', 'product-updates');
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true });
  }
  const docsOutputPath = join(docsDir, 'product-updates-drafts.json');
  writeFileSync(docsOutputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ Fitxer generat: ${docsOutputPath}`);

  // 6. Mostrar resum
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                         RESUM');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const draft of drafts) {
    console.log(`  📌 ${draft.title}`);
    console.log(`     ${draft.description.slice(0, 80)}${draft.description.length > 80 ? '...' : ''}`);
    console.log(`     (${draft.evidence.length} commits)`);
    console.log();
  }

  console.log('Per importar els esborranys, ves a /admin i usa "Importar esborranys".');
}

main();
