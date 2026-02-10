#!/usr/bin/env node
/**
 * Hard-block validator: totes les claus de ca.json han d'existir a es/fr/pt.
 *
 * Unidireccional: CA → altres. Claus extra als altres idiomes NO bloquegen.
 * Zero dependències externes.
 *
 * Ús: node scripts/i18n/validate-locales.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const LOCALES_DIR = join(ROOT, 'src/i18n/locales');

const MAX_PRINT = 200;

const TARGETS = ['es', 'fr', 'pt'];

function loadJson(path, name) {
  if (!existsSync(path)) {
    console.error(`ERROR: No s'ha trobat ${name} a ${path}`);
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (err) {
    console.error(`ERROR: JSON invàlid a ${name}: ${err.message}`);
    process.exit(1);
  }
}

function main() {
  const ca = loadJson(join(LOCALES_DIR, 'ca.json'), 'ca.json');
  const baseKeys = Object.keys(ca);

  let hasErrors = false;

  for (const lang of TARGETS) {
    const langObj = loadJson(join(LOCALES_DIR, `${lang}.json`), `${lang}.json`);
    const missing = baseKeys.filter(k => !(k in langObj));

    if (missing.length > 0) {
      hasErrors = true;
      console.error(`\n✗ ${lang.toUpperCase()}: ${missing.length} clau(s) absent(s)`);
      const shown = missing.slice(0, MAX_PRINT);
      for (const k of shown) {
        console.error(`  - ${k}`);
      }
      if (missing.length > MAX_PRINT) {
        console.error(`  … +${missing.length - MAX_PRINT} més`);
      }
    }
  }

  if (hasErrors) {
    console.error('\n✗ i18n BLOCKED: falten claus. Afegeix-les abans de commitejar.\n');
    process.exit(1);
  }

  console.log('✓ i18n OK: all CA keys present in ES/FR/PT');
}

main();
