/**
 * check-keys-scope.ts
 * Guardrail: verifica que totes les claus d'un scope (prefix) existeixen
 * en tots els idiomes (ca, es, fr, pt).
 *
 * Mode:
 *   --scope projectModule   → verifica totes les claus que comencen per "projectModule."
 *
 * Errors (exit 1):
 *   - Clau present a ca.json però absent a es/fr/pt
 *
 * Warnings (exit 0):
 *   - Valor idèntic al català (possible falta de traducció)
 *   - Excepcions: allowlist de valors tècnics que naturalment són iguals
 *
 * Ús: node --import tsx scripts/i18n/check-keys-scope.ts --scope projectModule
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const LOCALES_DIR = 'src/i18n/locales';
const LANGUAGES = ['ca', 'es', 'fr', 'pt'];
const BASE_LANG = 'ca';

// Values that are naturally identical across languages
const EQUAL_ALLOWLIST = [
  /^[A-Z]{3}$/, // Currency codes: EUR, XOF, USD
  /^[A-Z]{2,4}\s*[-–]\s*.+/, // "XOF - Franc CFA" etc.
  /^%$/, // Percentage symbol
  /^\d/, // Numeric strings
  /^IBAN$/, /^SEPA$/, /^BIC$/, /^NIF$/,
  /^Total \({currency}\)$/, // Template pattern
  /^F-\d/, // Invoice number placeholders
  /^B\d/, // Tax ID placeholders
  /^J-\d/, // Document number placeholders
  /^0,00$/, // Numeric placeholders
];

// ---------------------------------------------------------------------------
// ARGS
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const scopeIdx = args.indexOf('--scope');
if (scopeIdx === -1 || !args[scopeIdx + 1]) {
  console.error('Usage: node --import tsx scripts/i18n/check-keys-scope.ts --scope <prefix>');
  console.error('Example: --scope projectModule');
  process.exit(2);
}
const scope = args[scopeIdx + 1];
const prefix = scope + '.';

// ---------------------------------------------------------------------------
// LOAD
// ---------------------------------------------------------------------------

type Messages = Record<string, string>;
const locales: Record<string, Messages> = {};

for (const lang of LANGUAGES) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  locales[lang] = JSON.parse(content);
}

// ---------------------------------------------------------------------------
// CHECK
// ---------------------------------------------------------------------------

const baseKeys = Object.keys(locales[BASE_LANG]).filter(k => k.startsWith(prefix));
const errors: string[] = [];
const warnings: string[] = [];

for (const key of baseKeys) {
  const baseValue = locales[BASE_LANG][key];

  for (const lang of LANGUAGES) {
    if (lang === BASE_LANG) continue;

    const value = locales[lang][key];

    // Missing key = ERROR
    if (value === undefined) {
      errors.push(`MISSING: ${key} not found in ${lang}.json`);
      continue;
    }

    // Same as Catalan = WARNING (unless in allowlist)
    if (value === baseValue) {
      const isAllowed = EQUAL_ALLOWLIST.some(re => re.test(baseValue));
      if (!isAllowed) {
        warnings.push(`EQUAL: ${key} in ${lang}.json = ca.json ("${baseValue.substring(0, 60)}")`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------

console.log(`\n[check-keys-scope] Scope: "${scope}" — ${baseKeys.length} keys in ${BASE_LANG}.json\n`);

if (warnings.length > 0) {
  console.log(`⚠️  ${warnings.length} warning(s) (value identical to Catalan):\n`);
  for (const w of warnings) {
    console.log(`  ${w}`);
  }
  console.log('');
}

if (errors.length > 0) {
  console.error(`❌ ${errors.length} error(s):\n`);
  for (const e of errors) {
    console.error(`  ${e}`);
  }
  console.error('');
  process.exit(1);
} else {
  console.log(`✅ All ${baseKeys.length} keys present in all languages.`);
  process.exit(0);
}
