/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT DE BACKFILL: PERIODICITAT MENSUAL — FLORES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️  ONE-OFF — Per executar un sol cop sobre Flores.
 *
 * Força periodicityQuota="monthly" a tots els contactes de Flores que siguin
 * donants recurrents (type=donor, membershipType=recurring), excepte els que
 * tinguin periodicityQuota="manual".
 *
 * Inclou: inactive, archivedAt (no filtra per status).
 * Exclou: periodicityQuota === 'manual', periodicityQuota === 'monthly' (ja ok).
 *
 * Guardrails:
 *   - Dry-run per defecte (cal --apply explícit)
 *   - Requereix --project summa-social (aborta si no coincideix)
 *   - Només escriu periodicityQuota, cap altre camp
 *
 * Execució:
 *   GCLOUD_PROJECT=summa-social node --import tsx scripts/backfill-flores-periodicity-monthly.ts --dry-run --project summa-social
 *   GCLOUD_PROJECT=summa-social node --import tsx scripts/backfill-flores-periodicity-monthly.ts --apply --project summa-social
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

const EXPECTED_PROJECT = 'summa-social';
const ORG_ID = 'SkQjWvCRDJhSf1OeJAw9';
const BATCH_SIZE = 400;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDACIÓ DE PROJECTE
// ═══════════════════════════════════════════════════════════════════════════════

function getProjectFlag(): string | null {
  const idx = process.argv.indexOf('--project');
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

const projectFlag = getProjectFlag();
const envProject = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

if (projectFlag !== EXPECTED_PROJECT) {
  console.error(`ERROR: Cal passar --project ${EXPECTED_PROJECT}`);
  console.error(`  Rebut: --project ${projectFlag ?? '(no especificat)'}`);
  process.exit(1);
}

if (envProject && envProject !== EXPECTED_PROJECT) {
  console.error(`ERROR: GCLOUD_PROJECT="${envProject}" no coincideix amb "${EXPECTED_PROJECT}"`);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALITZACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

if (getApps().length === 0) {
  initializeApp({ projectId: EXPECTED_PROJECT });
}

const db = getFirestore();
console.log(`Firebase projectId: ${EXPECTED_PROJECT}`);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main(dryRun: boolean) {
  console.log(`\n═══ BACKFILL PERIODICITAT MENSUAL — FLORES ═══`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no escriu res)' : 'APPLY (escriptura real)'}`);
  console.log(`Org: ${ORG_ID}\n`);

  // 1. Query: type=donor + membershipType=recurring
  const contactsRef = db.collection(`organizations/${ORG_ID}/contacts`);
  const snapshot = await contactsRef
    .where('type', '==', 'donor')
    .where('membershipType', '==', 'recurring')
    .get();

  const totalRecurringDonors = snapshot.size;
  console.log(`totalRecurringDonors: ${totalRecurringDonors}`);

  // 2. Classificar
  let alreadyMonthly = 0;
  let manualSkipped = 0;
  let wouldUpdate = 0;
  const breakdown: Record<string, number> = {};
  const exampleIds: string[] = [];
  const toUpdate: string[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const p: string | null = data.periodicityQuota ?? null;
    const key = p === null ? 'null' : p;

    if (p === 'monthly') {
      alreadyMonthly++;
      continue;
    }

    if (p === 'manual') {
      manualSkipped++;
      continue;
    }

    // Candidat a update
    wouldUpdate++;
    breakdown[key] = (breakdown[key] || 0) + 1;
    toUpdate.push(doc.id);
    if (exampleIds.length < 3) {
      exampleIds.push(doc.id);
    }
  }

  console.log(`\n═══ RECOMPTE ═══`);
  console.log(`alreadyMonthly: ${alreadyMonthly}`);
  console.log(`manualSkipped: ${manualSkipped}`);
  console.log(`wouldUpdate: ${wouldUpdate}`);

  if (Object.keys(breakdown).length > 0) {
    console.log(`\nBreakdown (valor actual → monthly):`);
    for (const [val, count] of Object.entries(breakdown)) {
      console.log(`  ${val}: ${count}`);
    }
  }

  if (exampleIds.length > 0) {
    console.log(`\nExemples de contactIds a actualitzar:`);
    exampleIds.forEach(id => console.log(`  - ${id}`));
  }

  // 3. Aplicar (només si --apply)
  let updated = 0;

  if (!dryRun && toUpdate.length > 0) {
    console.log(`\n═══ APLICANT CANVIS ═══`);

    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const chunk = toUpdate.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const contactId of chunk) {
        const contactRef = db.doc(`organizations/${ORG_ID}/contacts/${contactId}`);
        batch.update(contactRef, {
          periodicityQuota: 'monthly',
        });
      }

      await batch.commit();
      updated += chunk.length;
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} contactes actualitzats`);
    }
  }

  console.log(`\n═══ RESULTAT FINAL ═══`);
  console.log({
    totalRecurringDonors,
    alreadyMonthly,
    manualSkipped,
    wouldUpdate,
    updated,
    breakdown,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUCIÓ
// ═══════════════════════════════════════════════════════════════════════════════

const dryRun = !process.argv.includes('--apply');
main(dryRun).then(() => {
  console.log('\nFet.');
  process.exit(0);
}).catch(err => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
