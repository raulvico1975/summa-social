#!/usr/bin/env node
/**
 * Auditoria heurística de literals visibles a UI.
 *
 * Busca text hardcoded en contextos d'alt risc:
 * - toasts
 * - titles/descriptions de dialogs
 * - placeholders i aria-label/title
 * - text directe dins JSX bàsic
 *
 * Genera:
 * - docs/i18n/ui-literals-report.md
 *
 * No bloqueja el procés; serveix com a radar per mantenir la UI neta.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const SEARCH_DIRS = [join(ROOT, 'src/app'), join(ROOT, 'src/components')];
const OUTPUT_DIR = join(ROOT, 'docs/i18n');
const REPORT_PATH = join(OUTPUT_DIR, 'ui-literals-report.md');

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '__tests__']);
const FILE_EXTS = new Set(['.ts', '.tsx']);

const PATTERNS = [
  {
    label: 'Toast literal',
    regex: /toast\(\{[\s\S]{0,240}?(title|description):\s*['"`]([^'"`]+)['"`]/g,
  },
  {
    label: 'Dialog literal',
    regex: /<(DialogTitle|DialogDescription|AlertDialogTitle|AlertDialogDescription|AlertTitle)\b[^>]*>([^<{][^<]+)</g,
  },
  {
    label: 'Prop literal',
    regex: /\b(placeholder|title|aria-label|label)\s*=\s*['"`]([^'"`]+)['"`]/g,
  },
  {
    label: 'JSX literal',
    regex: />([A-Za-zÀ-ÿ][^<{]{2,})</g,
  },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (FILE_EXTS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function getLineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

function normalizeSnippet(snippet) {
  return snippet.replace(/\s+/g, ' ').trim();
}

function collectMatches(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const findings = [];

  for (const pattern of PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const rawText = match[2] ?? match[1] ?? '';
      const snippet = normalizeSnippet(rawText);
      if (!snippet) continue;
      if (snippet.startsWith('t.') || snippet.startsWith('tr(') || snippet.startsWith('{')) continue;
      findings.push({
        type: pattern.label,
        line: getLineNumber(content, match.index),
        snippet,
      });
    }
  }

  return findings;
}

function main() {
  const files = SEARCH_DIRS.flatMap((dir) => walk(dir));
  const findingsByFile = files
    .map((filePath) => [filePath, collectMatches(filePath)])
    .filter(([, findings]) => findings.length > 0);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  let report = '# Auditoria UI literals\n\n';
  report += `Generat: ${new Date().toISOString().split('T')[0]}\n\n`;
  report += `Fitxers amb troballes: ${findingsByFile.length}\n\n`;

  for (const [filePath, findings] of findingsByFile) {
    report += `## ${filePath.replace(`${ROOT}/`, '')}\n\n`;
    for (const finding of findings.slice(0, 30)) {
      report += `- L${finding.line} · ${finding.type}: \`${finding.snippet}\`\n`;
    }
    if (findings.length > 30) {
      report += `- … +${findings.length - 30} troballes més\n`;
    }
    report += '\n';
  }

  writeFileSync(REPORT_PATH, report, 'utf8');
  console.log(`✓ UI literals audit generated: ${REPORT_PATH}`);
}

main();
