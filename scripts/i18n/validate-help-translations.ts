/**
 * Validador de traduccions d'ajuda (HelpSheet)
 *
 * Comprova que tots els idiomes tenen les claus d'ajuda correctes
 * respecte al català (CA) com a schema base.
 *
 * Execució: npx tsx scripts/i18n/validate-help-translations.ts
 *
 * Exit codes:
 * - 0: Tot correcte
 * - 1: Errors crítics (falten claus obligatòries, arrays trencats)
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Tipus
// ─────────────────────────────────────────────────────────────────────────────

type JsonMessages = Record<string, string>;

type ValidationError = {
  type: 'critical' | 'warning';
  message: string;
};

type ValidationResult = {
  language: string;
  errors: ValidationError[];
  warnings: ValidationError[];
  isValid: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Configuració
// ─────────────────────────────────────────────────────────────────────────────

const LOCALES_DIR = path.join(__dirname, '../../src/i18n/locales');
const BASE_LANGUAGE = 'ca';
const LANGUAGES_TO_VALIDATE = ['es', 'fr', 'pt'];

// RouteKeys normalitzades (de /dashboard/xxx a xxx)
const ROUTE_KEYS = [
  'dashboard',
  'movimientos',
  'donants',
  'proveidors',
  'treballadors',
  'informes',
  'configuracion',
  'project_expenses',
  'project_projects',
];

// Claus obligatòries per cada ruta
const REQUIRED_KEYS_PER_ROUTE = [
  'title', // Sempre obligatori
];

// UI strings obligatòries
const REQUIRED_UI_KEYS = [
  'help.ui.searchPlaceholder',
  'help.ui.viewGuide',
  'help.ui.viewManual',
  'help.ui.copyLink',
  'help.ui.suggest',
  'help.ui.noHelp',
  'help.ui.noSteps',
  'help.ui.noResults',
  'help.ui.linkCopied',
  'help.ui.linkCopiedDesc',
  'help.ui.steps',
  'help.ui.tips',
  'help.ui.tooltipHelp',
];

// Arrays que han de tenir mínim 1 element si existeixen al base
const ARRAY_FIELDS = [
  'steps',
  'tips',
  'keywords',
  'extra.order.items',
  'extra.pitfalls.items',
  'extra.whenNot.items',
  'extra.checks.items',
  'extra.returns.items',
  'extra.remittances.items',
  'extra.contacts.items',
  'extra.categories.items',
  'extra.documents.items',
  'extra.bankAccounts.items',
  'extra.ai.items',
  'extra.bulk.items',
  'extra.importing.items',
  'extra.filters.items',
  'extra.quality.items',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadJson(language: string): JsonMessages {
  const filePath = path.join(LOCALES_DIR, `${language}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as JsonMessages;
}

/**
 * Extreu les claus d'un array del JSON (help.xxx.steps.0, .1, .2...)
 */
function getArrayKeys(messages: JsonMessages, prefix: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 30; i++) {
    const key = `${prefix}.${i}`;
    if (key in messages) {
      keys.push(key);
    } else {
      break;
    }
  }
  return keys;
}

/**
 * Comprova si un array té índexos "trencats" (0,1,3 sense 2)
 */
function hasGapsInArray(messages: JsonMessages, prefix: string): boolean {
  let lastIndex = -1;
  for (let i = 0; i < 30; i++) {
    const key = `${prefix}.${i}`;
    if (key in messages) {
      if (lastIndex !== i - 1 && lastIndex !== -1) {
        // Hi ha un gap
        return true;
      }
      lastIndex = i;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validació
// ─────────────────────────────────────────────────────────────────────────────

function validateLanguage(baseMessages: JsonMessages, targetMessages: JsonMessages, language: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. UI strings obligatòries
  for (const key of REQUIRED_UI_KEYS) {
    if (!(key in targetMessages)) {
      errors.push({
        type: 'critical',
        message: `Falta clau UI obligatòria: ${key}`,
      });
    } else if (!targetMessages[key] || targetMessages[key].trim() === '') {
      errors.push({
        type: 'critical',
        message: `Clau UI buida: ${key}`,
      });
    }
  }

  // 2. Per cada ruta, validar claus obligatòries
  for (const routeKey of ROUTE_KEYS) {
    for (const field of REQUIRED_KEYS_PER_ROUTE) {
      const key = `help.${routeKey}.${field}`;
      if (!(key in targetMessages)) {
        errors.push({
          type: 'critical',
          message: `Falta clau obligatòria: ${key}`,
        });
      } else if (!targetMessages[key] || targetMessages[key].trim() === '') {
        errors.push({
          type: 'critical',
          message: `Clau buida: ${key}`,
        });
      }
    }
  }

  // 3. Per cada ruta, validar arrays
  for (const routeKey of ROUTE_KEYS) {
    for (const arrayField of ARRAY_FIELDS) {
      const prefix = `help.${routeKey}.${arrayField}`;
      const baseArrayKeys = getArrayKeys(baseMessages, prefix);
      const targetArrayKeys = getArrayKeys(targetMessages, prefix);

      // Si el base té l'array, el target també l'ha de tenir
      if (baseArrayKeys.length > 0) {
        if (targetArrayKeys.length === 0) {
          // L'array existeix al base però no al target
          warnings.push({
            type: 'warning',
            message: `Array ${prefix} existeix al base (${baseArrayKeys.length} elements) però no al target`,
          });
        } else if (targetArrayKeys.length !== baseArrayKeys.length) {
          // Longitud diferent
          warnings.push({
            type: 'warning',
            message: `Array ${prefix} té longitud diferent: base=${baseArrayKeys.length}, target=${targetArrayKeys.length}`,
          });
        }

        // Comprovar gaps
        if (hasGapsInArray(targetMessages, prefix)) {
          errors.push({
            type: 'critical',
            message: `Array ${prefix} té índexos trencats (gaps)`,
          });
        }
      }
    }
  }

  // 4. Validar extra section titles
  const extraSections = [
    'order',
    'pitfalls',
    'whenNot',
    'checks',
    'returns',
    'remittances',
    'contacts',
    'categories',
    'documents',
    'bankAccounts',
    'ai',
    'bulk',
    'importing',
    'filters',
    'quality',
  ];

  for (const routeKey of ROUTE_KEYS) {
    for (const section of extraSections) {
      const titleKey = `help.${routeKey}.extra.${section}.title`;
      const itemsPrefix = `help.${routeKey}.extra.${section}.items`;

      // Si el base té items, ha de tenir title
      const baseItems = getArrayKeys(baseMessages, itemsPrefix);
      if (baseItems.length > 0) {
        if (!(titleKey in targetMessages)) {
          warnings.push({
            type: 'warning',
            message: `Falta títol per secció extra: ${titleKey}`,
          });
        }
      }
    }
  }

  // 5. Comprovar que no hi ha claus help.* al target que no existeixin al base
  const baseHelpKeys = Object.keys(baseMessages).filter(k => k.startsWith('help.'));
  const targetHelpKeys = Object.keys(targetMessages).filter(k => k.startsWith('help.'));
  const extraKeys = targetHelpKeys.filter(k => !baseHelpKeys.includes(k));

  if (extraKeys.length > 0) {
    warnings.push({
      type: 'warning',
      message: `Claus extra (no existeixen al base): ${extraKeys.slice(0, 5).join(', ')}${extraKeys.length > 5 ? '...' : ''}`,
    });
  }

  return {
    language,
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  console.log('🔍 Validant traduccions d\'ajuda (help.*)...\n');

  let hasErrors = false;

  // Carregar base (CA)
  let baseMessages: JsonMessages;
  try {
    baseMessages = loadJson(BASE_LANGUAGE);
    const helpKeys = Object.keys(baseMessages).filter(k => k.startsWith('help.')).length;
    console.log(`✓ Base (${BASE_LANGUAGE}): ${helpKeys} claus help.*\n`);
  } catch (error) {
    console.error(`❌ Error carregant base (${BASE_LANGUAGE}):`, error);
    process.exit(1);
  }

  // Validar cada idioma
  for (const language of LANGUAGES_TO_VALIDATE) {
    let targetMessages: JsonMessages;
    try {
      targetMessages = loadJson(language);
    } catch (error) {
      console.error(`❌ Error carregant ${language}:`, error);
      hasErrors = true;
      continue;
    }

    const result = validateLanguage(baseMessages, targetMessages, language);

    // Output
    const icon = result.isValid ? '✓' : '❌';
    console.log(`${icon} ${language.toUpperCase()}`);

    if (result.errors.length > 0) {
      hasErrors = true;
      console.log('  Errors crítics:');
      for (const error of result.errors) {
        console.log(`    ❌ ${error.message}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log('  Warnings:');
      for (const warning of result.warnings) {
        console.log(`    ⚠️  ${warning.message}`);
      }
    }

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log('  Tot correcte');
    }

    console.log('');
  }

  // Resum final
  console.log('─'.repeat(50));
  if (hasErrors) {
    console.log('❌ Validació fallida. Corregeix els errors crítics abans de publicar.');
    process.exit(1);
  } else {
    console.log('✓ Validació correcta. Les traduccions d\'ajuda són consistents.');
    process.exit(0);
  }
}

main();
