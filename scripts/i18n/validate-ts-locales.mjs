#!/usr/bin/env node
/**
 * Hard-block validator: les claus de src/i18n/ca.ts han d'existir a es.ts i fr.ts.
 *
 * Compara l'estructura dels objectes exportats (`ca`, `es`, `fr`) i detecta
 * claus absents als idiomes derivats. Les funcions i literals es tracten com
 * a valors terminals; només importa la paritat estructural.
 *
 * Ús:
 *   node --import tsx scripts/i18n/validate-ts-locales.mjs
 */

import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MAX_PRINT = 200;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenShape(value, prefix = '', output = {}) {
  if (!isPlainObject(value)) {
    if (prefix) output[prefix] = true;
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(child)) {
      flattenShape(child, nextKey, output);
    } else {
      output[nextKey] = true;
    }
  }

  return output;
}

async function importLocaleModule(relativePath) {
  const moduleUrl = pathToFileURL(join(ROOT, relativePath)).href;
  return import(moduleUrl);
}

async function main() {
  const [{ ca }, { es }, { fr }] = await Promise.all([
    importLocaleModule('src/i18n/ca.ts'),
    importLocaleModule('src/i18n/es.ts'),
    importLocaleModule('src/i18n/fr.ts'),
  ]);

  const baseKeys = Object.keys(flattenShape(ca));
  const targets = [
    ['ES', es],
    ['FR', fr],
  ];

  let hasErrors = false;

  for (const [label, locale] of targets) {
    const localeKeys = new Set(Object.keys(flattenShape(locale)));
    const missing = baseKeys.filter((key) => !localeKeys.has(key));

    if (missing.length > 0) {
      hasErrors = true;
      console.error(`\n✗ ${label}: ${missing.length} clau(s) absents respecte CA`);
      for (const key of missing.slice(0, MAX_PRINT)) {
        console.error(`  - ${key}`);
      }
      if (missing.length > MAX_PRINT) {
        console.error(`  … +${missing.length - MAX_PRINT} més`);
      }
    }
  }

  if (hasErrors) {
    console.error('\n✗ i18n BLOCKED: falten claus a la capa TS.\n');
    process.exit(1);
  }

  console.log(`✓ i18n TS OK: all ${baseKeys.length} CA keys present in ES/FR`);
}

await main();
