#!/usr/bin/env node
/**
 * Audit i18n coverage: ca.json vs es.json
 *
 * Genera:
 * - docs/i18n/i18n-coverage-es.md (informe complet)
 * - docs/i18n/es.missing.keys.txt (claus que falten a ES)
 *
 * Ús: node scripts/i18n/audit-es-coverage.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// Paths
const CA_PATH = join(ROOT, 'src/i18n/locales/ca.json');
const ES_PATH = join(ROOT, 'src/i18n/locales/es.json');
const OUTPUT_DIR = join(ROOT, 'docs/i18n');
const REPORT_PATH = join(OUTPUT_DIR, 'i18n-coverage-es.md');
const MISSING_KEYS_PATH = join(OUTPUT_DIR, 'es.missing.keys.txt');

/**
 * Flatten nested object to dot-notation keys
 * Arrays are treated as terminal values (not indexed)
 */
function flatten(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result[newKey] = '';
    } else if (typeof value === 'string') {
      result[newKey] = value;
    } else if (Array.isArray(value)) {
      // Arrays tractats com a valor terminal
      result[newKey] = JSON.stringify(value);
    } else if (typeof value === 'object') {
      Object.assign(result, flatten(value, newKey));
    }
  }

  return result;
}

/**
 * Load and validate JSON file
 */
function loadJson(path, name) {
  if (!existsSync(path)) {
    console.error(`ERROR: No s'ha trobat ${name} a ${path}`);
    process.exit(1);
  }

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`ERROR: No s'ha pogut parsejar ${name}: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Find empty string values
 */
function findEmptyValues(flatObj) {
  return Object.entries(flatObj)
    .filter(([_, value]) => typeof value === 'string' && value.trim().length === 0)
    .map(([key]) => key);
}

/**
 * Main
 */
function main() {
  console.log('Auditant cobertura i18n ES vs CA...\n');

  // Load JSONs
  const caJson = loadJson(CA_PATH, 'ca.json');
  const esJson = loadJson(ES_PATH, 'es.json');

  // Flatten
  const caFlat = flatten(caJson);
  const esFlat = flatten(esJson);

  const caKeys = new Set(Object.keys(caFlat));
  const esKeys = new Set(Object.keys(esFlat));

  // Calculate differences
  const missingInEs = [...caKeys].filter(k => !esKeys.has(k)).sort();
  const extraInEs = [...esKeys].filter(k => !caKeys.has(k)).sort();
  const emptyInEs = findEmptyValues(esFlat).sort();

  // Stats
  const stats = {
    caTotal: caKeys.size,
    esTotal: esKeys.size,
    missing: missingInEs.length,
    extra: extraInEs.length,
    empty: emptyInEs.length,
    coverage: ((esKeys.size - extraInEs.length) / caKeys.size * 100).toFixed(1)
  };

  console.log('RESUM:');
  console.log(`  Claus CA: ${stats.caTotal}`);
  console.log(`  Claus ES: ${stats.esTotal}`);
  console.log(`  Missing (CA - ES): ${stats.missing}`);
  console.log(`  Extra (ES - CA): ${stats.extra}`);
  console.log(`  Empty a ES: ${stats.empty}`);
  console.log(`  Cobertura: ${stats.coverage}%\n`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Creat directori: ${OUTPUT_DIR}`);
  }

  // Generate markdown report
  const now = new Date().toISOString().split('T')[0];
  let report = `# Informe de cobertura i18n: ES vs CA

Generat: ${now}

## Resum

| Mètrica | Valor |
|---------|-------|
| Claus a CA (base) | ${stats.caTotal} |
| Claus a ES | ${stats.esTotal} |
| Claus missing a ES | ${stats.missing} |
| Claus extra a ES | ${stats.extra} |
| Claus buides a ES | ${stats.empty} |
| Cobertura | ${stats.coverage}% |

## Claus missing a ES (${stats.missing})

Claus presents a \`ca.json\` però absents a \`es.json\`.

`;

  if (missingInEs.length > 0) {
    report += '```\n' + missingInEs.join('\n') + '\n```\n\n';
  } else {
    report += '_Cap clau missing. Paritat completa._\n\n';
  }

  report += `## Claus extra a ES (${stats.extra})

Claus presents a \`es.json\` però absents a \`ca.json\`.

`;

  if (extraInEs.length > 0) {
    report += '```\n' + extraInEs.join('\n') + '\n```\n\n';
  } else {
    report += '_Cap clau extra._\n\n';
  }

  report += `## Claus buides a ES (${stats.empty})

Claus amb valor \`""\` o només espais.

`;

  if (emptyInEs.length > 0) {
    report += '```\n' + emptyInEs.join('\n') + '\n```\n\n';
  } else {
    report += '_Cap clau buida._\n\n';
  }

  // Write report
  writeFileSync(REPORT_PATH, report, 'utf-8');
  console.log(`Informe generat: ${REPORT_PATH}`);

  // Write missing keys file
  writeFileSync(MISSING_KEYS_PATH, missingInEs.join('\n'), 'utf-8');
  console.log(`Claus missing: ${MISSING_KEYS_PATH}`);

  // Exit with error if there are missing keys (useful for CI)
  if (missingInEs.length > 0) {
    console.log(`\nATENCIÓ: Hi ha ${missingInEs.length} claus pendents de traduir.`);
  }
}

main();
