/**
 * Script per fusionar contactes duplicats amb múltiples rols
 *
 * Casos detectats per l'auditoria:
 * - Mario Nafría: employee (CoJqOT5LNgdIgxxWbUPL) + donor (DbSGannVO1jcf9CMa1Ee)
 * - Romana Pérez-caballero: employee (B4qXIL8mRTRmJTZHkKk7) + donor (UxDlGeTnXRRi2M3NSSSD)
 *
 * Estratègia:
 * 1. El contacte "primary" és el que té més dades completes
 * 2. Es fusionen els camps buits amb els del "secondary"
 * 3. Es copia `roles` amb tots els rols
 * 4. Es re-linken totes les transaccions del secondary al primary
 * 5. S'arxiva el secondary (soft-delete)
 *
 * Execució:
 *   GOOGLE_APPLICATION_CREDENTIALS="" node --import tsx scripts/merge-contact-duplicates.ts --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS="" node --import tsx scripts/merge-contact-duplicates.ts --apply
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const ORG_ID = 'SkQjWvCRDJhSf1OeJAw9';
const OUTPUT_DIR = './tmp/merge-duplicates';

// Duplicats a fusionar (primary = més complet, secondary = s'arxiva)
const DUPLICATES_TO_MERGE = [
  {
    description: 'Mario Nafría - employee + donor',
    primaryId: 'DbSGannVO1jcf9CMa1Ee',   // donor (té més dades: IBAN, email)
    secondaryId: 'CoJqOT5LNgdIgxxWbUPL', // employee
    mergeRoles: { donor: true, employee: true },
  },
  {
    description: 'Romana Pérez-caballero - employee + donor',
    primaryId: 'UxDlGeTnXRRi2M3NSSSD',   // donor (té més dades: IBAN, email)
    secondaryId: 'B4qXIL8mRTRmJTZHkKk7', // employee
    mergeRoles: { donor: true, employee: true },
  },
];

interface MergeResult {
  description: string;
  primaryId: string;
  secondaryId: string;
  transactionsRelinked: number;
  primaryUpdated: boolean;
  secondaryArchived: boolean;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  const isDryRun = !process.argv.includes('--apply');

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  FUSIÓ DE CONTACTES DUPLICATS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${isDryRun ? '🔍 DRY-RUN (sense canvis)' : '⚡ APPLY (canvis reals)'}`);
  console.log(`  Organització: ${ORG_ID}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const results: MergeResult[] = [];

  for (const merge of DUPLICATES_TO_MERGE) {
    console.log(`\n📋 Processant: ${merge.description}`);
    console.log(`   Primary: ${merge.primaryId}`);
    console.log(`   Secondary: ${merge.secondaryId}`);

    // 1. Carregar els dos contactes
    const primaryRef = db
      .collection('organizations')
      .doc(ORG_ID)
      .collection('contacts')
      .doc(merge.primaryId);

    const secondaryRef = db
      .collection('organizations')
      .doc(ORG_ID)
      .collection('contacts')
      .doc(merge.secondaryId);

    const [primaryDoc, secondaryDoc] = await Promise.all([
      primaryRef.get(),
      secondaryRef.get(),
    ]);

    if (!primaryDoc.exists) {
      console.log(`   ❌ Primary no existeix: ${merge.primaryId}`);
      continue;
    }

    if (!secondaryDoc.exists) {
      console.log(`   ⚠️ Secondary no existeix (ja arxivat?): ${merge.secondaryId}`);
      continue;
    }

    const primaryData = primaryDoc.data()!;
    const secondaryData = secondaryDoc.data()!;

    console.log(`   Primary: ${primaryData.name} (${primaryData.type})`);
    console.log(`   Secondary: ${secondaryData.name} (${secondaryData.type})`);

    // 2. Buscar transaccions que referencien el secondary
    const txSnapshot = await db
      .collection('organizations')
      .doc(ORG_ID)
      .collection('transactions')
      .where('contactId', '==', merge.secondaryId)
      .get();

    console.log(`   Transaccions a re-linkar: ${txSnapshot.size}`);

    // 3. Preparar dades fusionades per al primary
    // Mantenim les dades del primary, però afegim camps que li falten del secondary
    const mergedData: Record<string, any> = {
      roles: merge.mergeRoles,
      updatedAt: new Date().toISOString(),
      _mergedFrom: {
        contactId: merge.secondaryId,
        mergedAt: FieldValue.serverTimestamp(),
        reason: merge.description,
      },
    };

    // Fusionar camps buits
    const fieldsToMerge = ['iban', 'email', 'phone', 'address', 'city', 'province', 'startDate'];
    for (const field of fieldsToMerge) {
      if (!primaryData[field] && secondaryData[field]) {
        mergedData[field] = secondaryData[field];
        console.log(`   + Copiant ${field} del secondary`);
      }
    }

    if (!isDryRun) {
      const batch = db.batch();

      // 4. Actualitzar primary amb dades fusionades
      batch.update(primaryRef, mergedData);

      // 5. Re-linkar transaccions
      for (const txDoc of txSnapshot.docs) {
        batch.update(txDoc.ref, {
          contactId: merge.primaryId,
          _relinkedFrom: {
            originalContactId: merge.secondaryId,
            relinkedAt: FieldValue.serverTimestamp(),
            reason: 'duplicate_merge',
          },
        });
      }

      // 6. Arxivar (soft-delete) el secondary
      batch.update(secondaryRef, {
        archivedAt: new Date().toISOString(),
        _archivedReason: 'Merged into ' + merge.primaryId,
      });

      await batch.commit();
      console.log(`   ✅ Fusió completada`);
    }

    results.push({
      description: merge.description,
      primaryId: merge.primaryId,
      secondaryId: merge.secondaryId,
      transactionsRelinked: txSnapshot.size,
      primaryUpdated: true,
      secondaryArchived: true,
    });
  }

  // Guardar resultats
  ensureDir(OUTPUT_DIR);
  const resultsPath = path.join(OUTPUT_DIR, 'merge_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📝 Resultats guardats a: ${resultsPath}`);

  // Resum
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  RESUM');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Fusions processades: ${results.length}`);
  console.log(`  Transaccions re-linkades: ${results.reduce((sum, r) => sum + r.transactionsRelinked, 0)}`);

  if (isDryRun) {
    console.log('\n  ℹ️  MODE DRY-RUN: Cap canvi aplicat');
    console.log('  Per aplicar els canvis, executa amb --apply');
  } else {
    console.log('\n  ✅ Canvis aplicats correctament');
  }

  console.log('═══════════════════════════════════════════════════════════════════');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
