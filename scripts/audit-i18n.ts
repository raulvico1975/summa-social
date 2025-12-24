/**
 * Script d'auditoria i18n
 *
 * Execució: npx tsx scripts/audit-i18n.ts
 *
 * Outputs:
 * 1. Claus que existeixen a CA i NO a ES
 * 2. Claus on FR == CA (no traduïdes)
 * 3. Claus on FR comença per "[CA]" (pendents marcats)
 */

import { ca } from '../src/i18n/ca';
import { es } from '../src/i18n/es';
import { fr } from '../src/i18n/fr';

type NestedObject = { [key: string]: string | NestedObject | ((...args: unknown[]) => string) };

function flattenObject(obj: NestedObject, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result.set(fullKey, value);
    } else if (typeof value === 'function') {
      // Per funcions, guardem un placeholder
      result.set(fullKey, '[FUNCTION]');
    } else if (typeof value === 'object' && value !== null) {
      const nested = flattenObject(value as NestedObject, fullKey);
      for (const [nestedKey, nestedValue] of nested) {
        result.set(nestedKey, nestedValue);
      }
    }
  }

  return result;
}

function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    AUDITORIA i18n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const caFlat = flattenObject(ca as unknown as NestedObject);
  const esFlat = flattenObject(es as unknown as NestedObject);
  const frFlat = flattenObject(fr as unknown as NestedObject);

  // ─────────────────────────────────────────────────────────────────
  // OUTPUT 1: Claus a CA que NO existeixen a ES
  // ─────────────────────────────────────────────────────────────────
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ OUTPUT 1: Claus a CA que NO existeixen a ES                 │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const missingInEs: string[] = [];
  for (const key of caFlat.keys()) {
    if (!esFlat.has(key)) {
      missingInEs.push(key);
    }
  }

  if (missingInEs.length === 0) {
    console.log('  ✅ Totes les claus de CA existeixen a ES\n');
  } else {
    console.log(`  ⚠️  ${missingInEs.length} claus falten a ES:\n`);
    for (const key of missingInEs.slice(0, 50)) {
      console.log(`    - ${key}`);
    }
    if (missingInEs.length > 50) {
      console.log(`    ... i ${missingInEs.length - 50} més`);
    }
    console.log();
  }

  // ─────────────────────────────────────────────────────────────────
  // OUTPUT 2: Claus on FR == CA (no traduïdes)
  // ─────────────────────────────────────────────────────────────────
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ OUTPUT 2: Claus on FR == CA (no traduïdes)                  │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const frEqualsCa: string[] = [];
  const frTranslated: string[] = [];

  for (const [key, caValue] of caFlat) {
    const frValue = frFlat.get(key);
    if (frValue === undefined) continue;

    // Ignorem funcions
    if (caValue === '[FUNCTION]' || frValue === '[FUNCTION]') continue;

    // Ignorem valors que comencen per [CA] (ja marcats)
    if (frValue.startsWith('[CA]')) continue;

    if (frValue === caValue) {
      frEqualsCa.push(key);
    } else {
      frTranslated.push(key);
    }
  }

  const totalStrings = caFlat.size;
  const translatedCount = frTranslated.length;
  const untranslatedCount = frEqualsCa.length;
  const percentage = ((translatedCount / (translatedCount + untranslatedCount)) * 100).toFixed(1);

  console.log(`  📊 Estadístiques FR:`);
  console.log(`     Total claus: ${totalStrings}`);
  console.log(`     Traduïdes: ${translatedCount}`);
  console.log(`     No traduïdes (FR == CA): ${untranslatedCount}`);
  console.log(`     Percentatge traduït: ${percentage}%\n`);

  // Agrupar per prefix
  const prefixCounts = new Map<string, number>();
  for (const key of frEqualsCa) {
    const prefix = key.split('.')[0];
    prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
  }

  console.log(`  📋 Claus no traduïdes per secció:`);
  const sortedPrefixes = [...prefixCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [prefix, count] of sortedPrefixes) {
    console.log(`     ${prefix}: ${count}`);
  }
  console.log();

  // Mostrar detall de les primeres 30
  console.log(`  📝 Detall (primeres 30):`);
  for (const key of frEqualsCa.slice(0, 30)) {
    const value = caFlat.get(key) || '';
    const shortValue = value.length > 40 ? value.substring(0, 40) + '...' : value;
    console.log(`     ${key}: "${shortValue}"`);
  }
  if (frEqualsCa.length > 30) {
    console.log(`     ... i ${frEqualsCa.length - 30} més`);
  }
  console.log();

  // ─────────────────────────────────────────────────────────────────
  // OUTPUT 3: Claus on FR comença per "[CA]"
  // ─────────────────────────────────────────────────────────────────
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ OUTPUT 3: Claus on FR comença per "[CA]" (pendents marcats) │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const markedPending: string[] = [];
  for (const [key, frValue] of frFlat) {
    if (typeof frValue === 'string' && frValue.startsWith('[CA]')) {
      markedPending.push(key);
    }
  }

  if (markedPending.length === 0) {
    console.log('  ✅ Cap clau marcada amb [CA]\n');
  } else {
    console.log(`  ⚠️  ${markedPending.length} claus marcades com a pendents:\n`);
    for (const key of markedPending.slice(0, 50)) {
      console.log(`    - ${key}`);
    }
    if (markedPending.length > 50) {
      console.log(`    ... i ${markedPending.length - 50} més`);
    }
    console.log();
  }

  // ─────────────────────────────────────────────────────────────────
  // RESUM FINAL
  // ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         RESUM');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  ES: ${missingInEs.length === 0 ? '✅ Complet' : `⚠️ ${missingInEs.length} claus falten`}`);
  console.log(`  FR: ${percentage}% traduït (${untranslatedCount} pendents, ${markedPending.length} marcats [CA])`);
  console.log();
}

main();
