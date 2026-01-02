/**
 * Export all i18n TypeScript objects to flat JSON files
 * Run with: npm run i18n:export
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { flatten } from './flatten.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import translations - these are the TypeScript source files
import { ca } from '../../src/i18n/ca.js';
import { es } from '../../src/i18n/es.js';
import { fr } from '../../src/i18n/fr.js';

const LOCALES_DIR = join(__dirname, '../../src/i18n/locales');

// Ensure locales directory exists
mkdirSync(LOCALES_DIR, { recursive: true });

const languages = [
  { code: 'ca', data: ca },
  { code: 'es', data: es },
  { code: 'fr', data: fr },
] as const;

console.log('[i18n] Starting export...\n');

// First pass: export and collect keys
const allKeys: Record<string, Set<string>> = {};

for (const { code, data } of languages) {
  console.log(`[i18n] Processing ${code}...`);

  const flattened = flatten(data as Record<string, unknown>);
  const keyCount = Object.keys(flattened).length;
  allKeys[code] = new Set(Object.keys(flattened));

  const outputPath = join(LOCALES_DIR, `${code}.json`);
  writeFileSync(outputPath, JSON.stringify(flattened, null, 2), 'utf-8');

  console.log(`  ✓ ${code}.json written with ${keyCount} keys`);
}

// Check for pt.json (JSON-only language)
const ptPath = join(LOCALES_DIR, 'pt.json');
if (existsSync(ptPath)) {
  try {
    const ptData = JSON.parse(readFileSync(ptPath, 'utf-8'));
    allKeys['pt'] = new Set(Object.keys(ptData));
    console.log(`  ✓ pt.json found with ${allKeys['pt'].size} keys`);
  } catch {
    console.log(`  ⚠ pt.json exists but could not be parsed`);
  }
}

// Report: compare all languages against base (ca)
console.log('\n[i18n] Key comparison report:\n');

const baseKeys = allKeys['ca'];
const baseCount = baseKeys.size;
console.log(`  Base (ca): ${baseCount} keys\n`);

for (const [code, keys] of Object.entries(allKeys)) {
  if (code === 'ca') continue;

  const missing = [...baseKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !baseKeys.has(k));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`  ${code}: ✓ Perfect match (${keys.size} keys)`);
  } else {
    console.log(`  ${code}: ${keys.size} keys`);
    if (missing.length > 0) {
      console.log(`    ⚠ Missing ${missing.length} keys vs ca`);
      if (missing.length <= 5) {
        missing.forEach((k) => console.log(`      - ${k}`));
      } else {
        missing.slice(0, 3).forEach((k) => console.log(`      - ${k}`));
        console.log(`      ... and ${missing.length - 3} more`);
      }
    }
    if (extra.length > 0) {
      console.log(`    ℹ ${extra.length} extra keys (not in ca)`);
      if (extra.length <= 3) {
        extra.forEach((k) => console.log(`      + ${k}`));
      }
    }
  }
}

console.log('\n[i18n] Export complete!');
console.log(`  Output: ${LOCALES_DIR}`);
