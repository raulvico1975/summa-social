/**
 * Validador de traduccions de guies
 *
 * Comprova que tots els idiomes tenen les claus de guies correctes
 * respecte al català (CA) com a schema base.
 *
 * Execució: npx tsx scripts/i18n/validate-guides-translations.ts
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

// Claus page-level obligatòries (no poden faltar)
const REQUIRED_PAGE_KEYS = [
  'guides.pageTitle',
  'guides.pageSubtitle',
  'guides.viewManual',
  'guides.viewHelp',
  'guides.recommendedOrder',
  'guides.labels.lookFirst',
  'guides.labels.doNext',
  'guides.labels.avoid',
  'guides.labels.notResolved',
  'guides.labels.costlyError',
  'guides.labels.checkBeforeExport',
  'guides.labels.dontFixYet',
];

// Guies amb camps obligatoris (title i intro/whatIs)
const GUIDE_IDS = [
  'firstDay',
  'firstMonth',
  'monthClose',
  'movements',
  'importMovements',
  'bulkCategory',
  'changePeriod',
  'selectBankAccount',
  'attachDocument',
  'returns',
  'remittances',
  'splitRemittance',
  'stripeDonations',
  'travelReceipts',
  'donors',
  'reports',
  'projects',
  'monthlyFlow',
  'yearEndFiscal',
  'accessSecurity',
  'initialLoad',
  'changeLanguage',
  'importDonors',
  'generateDonorCertificate',
  'model182',
  'model347',
  'certificatesBatch',
  'donorSetInactive',
  'donorReactivate',
  'editMovement',
  'movementFilters',
  'bulkAICategorize',
  'remittanceViewDetail',
  'resetPassword',
  'updateExistingDonors',
  'remittanceLowMembers',
  'saveRemittanceMapping',
  'toggleRemittanceItems',
  'dangerDeleteLastRemittance',
];

// Arrays que han de tenir mínim 1 element si existeixen al base
const ARRAY_FIELDS = [
  'lookFirst',
  'doNext',
  'then',
  'avoid',
  'notResolved',
  'checkBeforeExport',
  'dontFixYet',
  'steps',
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
 * Extreu les claus d'un array del JSON (guides.movements.lookFirst.0, .1, .2...)
 */
function getArrayKeys(messages: JsonMessages, prefix: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 20; i++) {
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
  for (let i = 0; i < 20; i++) {
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

  // 1. Claus page-level obligatòries
  for (const key of REQUIRED_PAGE_KEYS) {
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

  // 2. CTA per cada guia
  for (const guideId of GUIDE_IDS) {
    const ctaKey = `guides.cta.${guideId}`;
    if (!(ctaKey in targetMessages)) {
      errors.push({
        type: 'critical',
        message: `Falta CTA: ${ctaKey}`,
      });
    }
  }

  // 3. Cada guia: title i (intro o whatIs) obligatoris
  for (const guideId of GUIDE_IDS) {
    const titleKey = `guides.${guideId}.title`;
    const introKey = `guides.${guideId}.intro`;
    const whatIsKey = `guides.${guideId}.whatIs`;

    if (!(titleKey in targetMessages)) {
      errors.push({
        type: 'critical',
        message: `Falta títol de guia: ${titleKey}`,
      });
    } else if (!targetMessages[titleKey] || targetMessages[titleKey].trim() === '') {
      errors.push({
        type: 'critical',
        message: `Títol buit: ${titleKey}`,
      });
    }

    // intro o whatIs (un dels dos)
    const hasIntro = introKey in targetMessages && targetMessages[introKey]?.trim();
    const hasWhatIs = whatIsKey in targetMessages && targetMessages[whatIsKey]?.trim();

    if (!hasIntro && !hasWhatIs) {
      errors.push({
        type: 'critical',
        message: `Falta intro o whatIs de guia: ${guideId}`,
      });
    }
  }

  // 4. Arrays: comprovar longitud i gaps
  for (const guideId of GUIDE_IDS) {
    for (const arrayField of ARRAY_FIELDS) {
      const prefix = `guides.${guideId}.${arrayField}`;
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

  // 5. costlyError: si existeix al base, ha d'existir al target
  for (const guideId of GUIDE_IDS) {
    const costlyErrorKey = `guides.${guideId}.costlyError`;
    if (costlyErrorKey in baseMessages) {
      if (!(costlyErrorKey in targetMessages)) {
        warnings.push({
          type: 'warning',
          message: `Falta costlyError: ${costlyErrorKey}`,
        });
      } else if (!targetMessages[costlyErrorKey] || targetMessages[costlyErrorKey].trim() === '') {
        warnings.push({
          type: 'warning',
          message: `costlyError buit: ${costlyErrorKey}`,
        });
      }
    }
  }

  // 6. HARD RULE: Cada guia ha de tenir com a mínim un array de contingut amb ≥1 element
  // Formats acceptats:
  // - stepsFormat: steps[]
  // - checklistFormat: lookFirst[] (i opcionalment then[])
  // - expertFormat: notResolved[]
  // Això garanteix que el Hub pot renderitzar contingut útil
  for (const guideId of GUIDE_IDS) {
    const stepsPrefix = `guides.${guideId}.steps`;
    const lookFirstPrefix = `guides.${guideId}.lookFirst`;
    const thenPrefix = `guides.${guideId}.then`;
    const notResolvedPrefix = `guides.${guideId}.notResolved`;

    const hasSteps = getArrayKeys(targetMessages, stepsPrefix).length > 0;
    const hasLookFirst = getArrayKeys(targetMessages, lookFirstPrefix).length > 0;
    const hasThen = getArrayKeys(targetMessages, thenPrefix).length > 0;
    const hasNotResolved = getArrayKeys(targetMessages, notResolvedPrefix).length > 0;

    if (!hasSteps && !hasLookFirst && !hasThen && !hasNotResolved) {
      errors.push({
        type: 'critical',
        message: `Guia ${guideId} no té cap array de contingut (steps, lookFirst, then, o notResolved). El Hub no pot renderitzar res útil.`,
      });
    }
  }

  // 7. Validar summary: ≤140 chars i ha d'existir per cada guia
  const MAX_SUMMARY_LENGTH = 140;
  for (const guideId of GUIDE_IDS) {
    const summaryKey = `guides.${guideId}.summary`;

    if (!(summaryKey in targetMessages)) {
      errors.push({
        type: 'critical',
        message: `Falta summary de guia: ${summaryKey}`,
      });
    } else {
      const summary = targetMessages[summaryKey];
      if (!summary || summary.trim() === '') {
        errors.push({
          type: 'critical',
          message: `Summary buit: ${summaryKey}`,
        });
      } else if (summary.length > MAX_SUMMARY_LENGTH) {
        errors.push({
          type: 'critical',
          message: `Summary massa llarg (${summary.length} chars, max ${MAX_SUMMARY_LENGTH}): ${summaryKey}`,
        });
      }
    }
  }

  // 8. Comprovar que no hi ha claus guides.* al target que no existeixin al base
  const baseGuideKeys = Object.keys(baseMessages).filter(k => k.startsWith('guides.'));
  const targetGuideKeys = Object.keys(targetMessages).filter(k => k.startsWith('guides.'));
  const extraKeys = targetGuideKeys.filter(k => !baseGuideKeys.includes(k));

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
  console.log('🔍 Validant traduccions de guies...\n');

  let hasErrors = false;

  // Carregar base (CA)
  let baseMessages: JsonMessages;
  try {
    baseMessages = loadJson(BASE_LANGUAGE);
    console.log(`✓ Base (${BASE_LANGUAGE}): ${Object.keys(baseMessages).filter(k => k.startsWith('guides.')).length} claus de guies\n`);
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
    console.log('✓ Validació correcta. Les traduccions de guies són consistents.');
    process.exit(0);
  }
}

main();
