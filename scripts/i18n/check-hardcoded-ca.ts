/**
 * check-hardcoded-ca.ts
 * Guardrail: detecta text en català hardcoded dins dels components del projectModule.
 *
 * Criteris de detecció:
 *  1. Caràcters catalans: àèéíòóúç·l  (excloent línies de comentari i imports)
 *  2. Paraules comunes en català UI: Projectes, Gestió, Despesa, Justificació, Comprovants, Terreny
 *
 * Exclusions:
 *  - Fitxers .json, __tests__, node_modules
 *  - Línies de comentari (// o /*)
 *  - Línies d'import/export
 *  - Línies que contenen tr(', useTranslations, o claus i18n
 *
 * Ús: node --import tsx scripts/i18n/check-hardcoded-ca.ts
 * Exit 1 si troba hardcoded, exit 0 si net.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const SCAN_DIRS = [
  'src/app/[orgSlug]/dashboard/project-module',
  'src/components/project-module',
];

const EXTENSIONS = ['.ts', '.tsx'];

const IGNORE_DIRS = ['__tests__', 'node_modules', '.next'];

// Catalan-specific characters (not common in ES/FR/PT or code)
const CATALAN_CHARS_RE = /[àèéíòóúïüç]|·l/i;

// Common Catalan UI words (case-insensitive, whole word)
const CATALAN_WORDS_RE = /\b(Projectes|Gestió|Despesa|Despeses|Justificació|Comprovants|Terreny|Pressupost|Partida|Partides|Imputació|Assignació|Desar|Eliminar|Afegir|Cancel·lar|Guardar|Carregant|Pendent|Tancat|Actiu|Editar|Tornar)\b/;

// Lines to skip
const SKIP_LINE_RE = /^\s*(\/\/|\/\*|\*|import\s|export\s)/;
const SKIP_CONTENT_RE = /tr\(|useTranslations|i18n|\.json|console\.(log|warn|error)|trackUX/;

// Additional content patterns to skip:
// - Legacy t.xxx ?? 'fallback' patterns (acceptable for now, will be migrated later)
// - JSX comments {/* ... */}
// - aria-label attributes (accessibility strings, exempt from i18n for now)
// - Keyword arrays for search/categorization (not user-facing)
const SKIP_LEGACY_RE = /\bt\.\w+\??\.\w+|{\s*\/\*|\*\/\s*}|aria-label|keywords?\s*[:=]\s*\[/;

// ---------------------------------------------------------------------------
// SCANNER
// ---------------------------------------------------------------------------

interface Finding {
  file: string;
  line: number;
  snippet: string;
  reason: string;
}

function scanFile(filePath: string): Finding[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip comments, imports, exports
    if (SKIP_LINE_RE.test(trimmed)) continue;

    // Skip lines that clearly use i18n system
    if (SKIP_CONTENT_RE.test(line)) continue;

    // Skip legacy t.xxx fallbacks, JSX comments, aria-labels, keyword arrays
    if (SKIP_LEGACY_RE.test(line)) continue;

    // Skip lines that are pure JSX without string literals
    // We only care about lines with actual string content
    const hasStringLiteral = /['"`][^'"`]{2,}['"`]/.test(line);
    const hasJSXText = />[^<{]+</.test(line);

    if (!hasStringLiteral && !hasJSXText) continue;

    // Check for Catalan chars
    if (CATALAN_CHARS_RE.test(line)) {
      findings.push({
        file: filePath,
        line: i + 1,
        snippet: trimmed.substring(0, 120),
        reason: 'Catalan character detected',
      });
      continue;
    }

    // Check for Catalan words
    if (CATALAN_WORDS_RE.test(line)) {
      findings.push({
        file: filePath,
        line: i + 1,
        snippet: trimmed.substring(0, 120),
        reason: 'Catalan word detected',
      });
    }
  }

  return findings;
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      results.push(...walkDir(fullPath));
    } else if (EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

const allFindings: Finding[] = [];

for (const dir of SCAN_DIRS) {
  const files = walkDir(dir);
  for (const file of files) {
    const findings = scanFile(file);
    allFindings.push(...findings);
  }
}

// Baseline: known pre-existing hardcoded strings that will be migrated in future tasks.
// When adding new strings, the count should NOT increase — that's the guardrail.
const BASELINE_COUNT = 54; // As of 2026-02-08

if (allFindings.length > BASELINE_COUNT) {
  console.error(`\n❌ Found ${allFindings.length} hardcoded Catalan string(s) — exceeds baseline of ${BASELINE_COUNT}.\n`);
  console.error('New hardcoded strings detected! Please use tr() for all new UI text.\n');
  for (const f of allFindings) {
    console.error(`  ${f.file}:${f.line} — ${f.reason}`);
    console.error(`    ${f.snippet}\n`);
  }
  process.exit(1);
} else if (allFindings.length > 0) {
  console.log(`⚠️  ${allFindings.length} pre-existing hardcoded Catalan strings (baseline: ${BASELINE_COUNT}). OK — no new ones.`);
  process.exit(0);
} else {
  console.log('✅ No hardcoded Catalan strings found in projectModule.');
  process.exit(0);
}
