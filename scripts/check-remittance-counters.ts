/**
 * Script per verificar i recalcular comptadors de remeses
 *
 * Modes:
 *   --dry-run (default): Només mostra què es faria
 *   --apply: Executa els canvis a Firestore
 *
 * Execució:
 *   GOOGLE_APPLICATION_CREDENTIALS="" node --import tsx scripts/check-remittance-counters.ts --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS="" node --import tsx scripts/check-remittance-counters.ts --apply
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

initializeApp();
const db = getFirestore();

const ORG_ID = 'SkQjWvCRDJhSf1OeJAw9';
const OUTPUT_DIR = './tmp/fix-remittance-counters';

interface RemittanceCheck {
  remittanceId: string;
  date: string;
  amount: number;
  expectedCount: number;
  actualCount: number;
  difference: number;
  action: 'update_counter' | 'already_correct';
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  const isDryRun = !process.argv.includes('--apply');

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  VERIFICACIÓ I RECALCULACIÓ DE COMPTADORS DE REMESES');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${isDryRun ? '🔍 DRY-RUN (sense canvis)' : '⚡ APPLY (canvis reals)'}`);
  console.log(`  Organització: ${ORG_ID}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Carregar totes les remeses
  console.log('📥 Carregant remeses...');
  const remittancesSnapshot = await db
    .collection('organizations')
    .doc(ORG_ID)
    .collection('transactions')
    .where('isRemittance', '==', true)
    .get();

  console.log(`   ✓ ${remittancesSnapshot.size} remeses trobades\n`);

  // 2. Carregar totes les transaccions filles (amb parentTransactionId)
  console.log('📥 Carregant transaccions filles...');
  const allTransactionsSnapshot = await db
    .collection('organizations')
    .doc(ORG_ID)
    .collection('transactions')
    .get();

  // Agrupar per parentTransactionId
  const childrenByParent = new Map<string, number>();
  allTransactionsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.parentTransactionId) {
      const count = childrenByParent.get(data.parentTransactionId) || 0;
      childrenByParent.set(data.parentTransactionId, count + 1);
    }
  });
  console.log(`   ✓ ${childrenByParent.size} parents amb fills\n`);

  // 3. Verificar cada remesa
  console.log('🔍 Verificant comptadors...\n');
  const checks: RemittanceCheck[] = [];
  let inconsistentCount = 0;

  for (const doc of remittancesSnapshot.docs) {
    const data = doc.data();
    const expectedCount = data.remittanceItemCount || 0;
    const actualCount = childrenByParent.get(doc.id) || 0;

    if (expectedCount !== actualCount) {
      inconsistentCount++;
      checks.push({
        remittanceId: doc.id,
        date: data.date,
        amount: data.amount,
        expectedCount,
        actualCount,
        difference: expectedCount - actualCount,
        action: 'update_counter'
      });
    }
  }

  console.log(`📊 Resultat:`);
  console.log(`   - Total remeses: ${remittancesSnapshot.size}`);
  console.log(`   - Amb comptador incorrecte: ${inconsistentCount}`);
  console.log(`   - Correctes: ${remittancesSnapshot.size - inconsistentCount}`);

  if (checks.length === 0) {
    console.log('\n✅ Tots els comptadors són correctes. Res a fer.');
    return;
  }

  // 4. Mostrar detalls
  console.log('\n📋 Remeses amb comptador incorrecte:\n');
  for (const check of checks) {
    console.log(`  ID: ${check.remittanceId}`);
    console.log(`  Data: ${check.date} | Import: ${check.amount}€`);
    console.log(`  Expected: ${check.expectedCount} | Actual: ${check.actualCount} | Diff: ${check.difference}`);
    console.log('');
  }

  // 5. Guardar pla
  ensureDir(OUTPUT_DIR);
  const planPath = path.join(OUTPUT_DIR, 'fix_plan.json');
  fs.writeFileSync(planPath, JSON.stringify(checks, null, 2));
  console.log(`📝 Pla guardat a: ${planPath}\n`);

  // 6. Aplicar si no és dry-run
  if (!isDryRun) {
    console.log('💾 Aplicant correccions...');

    const batch = db.batch();
    for (const check of checks) {
      const txRef = db
        .collection('organizations')
        .doc(ORG_ID)
        .collection('transactions')
        .doc(check.remittanceId);

      batch.update(txRef, {
        remittanceItemCount: check.actualCount,
        _counterFixedAt: FieldValue.serverTimestamp(),
        _counterFixedFrom: check.expectedCount
      });
    }

    await batch.commit();
    console.log(`   ✅ ${checks.length} remeses actualitzades\n`);
  } else {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  ℹ️  MODE DRY-RUN: Cap canvi aplicat');
    console.log('  Per aplicar els canvis, executa amb --apply');
    console.log('═══════════════════════════════════════════════════════════════════');
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
