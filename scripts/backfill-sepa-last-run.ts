/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT DE BACKFILL: SEPA PAIN.008 LAST RUN TRACKING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️  ONE-OFF — Executat el 2026-02-10. NO tornar a executar.
 *
 * Run afectat: qqdzr2WA2CBRqV869Jjh (sepaCollectionRuns, collectionDate 2026-02-05)
 * Resultat: 305 contactes actualitzats amb sepaPain008LastRunAt/Id.
 * A partir d'ara el wizard ja escriu el tracking automàticament.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Escriu sepaPain008LastRunAt i sepaPain008LastRunId als contactes que van
 * ser inclosos al run qqdzr2WA2CBRqV869Jjh (sepaCollectionRuns), que es va
 * fer ABANS d'afegir el tracking automàtic.
 *
 * Guardrails:
 *   - No sobreescriu sepaPain008LastRunAt existent
 *   - No toca cap altre camp del contacte
 *   - No crea documents a sepaPain008Runs
 *   - Dry-run per defecte (cal --apply explícit)
 *   - Requereix --project summa-social (aborta si no coincideix)
 *
 * Modes:
 *   --dry-run (default): Només mostra què es faria
 *   --apply: Executa els canvis a Firestore
 *
 * Execució:
 *   GCLOUD_PROJECT=summa-social node --import tsx scripts/backfill-sepa-last-run.ts --dry-run --project summa-social
 *   GCLOUD_PROJECT=summa-social node --import tsx scripts/backfill-sepa-last-run.ts --apply --project summa-social
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

const EXPECTED_PROJECT = 'summa-social';
const ORG_ID = 'SkQjWvCRDJhSf1OeJAw9';
const RUN_ID = 'qqdzr2WA2CBRqV869Jjh';
const RUN_PATH = `organizations/${ORG_ID}/sepaCollectionRuns/${RUN_ID}`;
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
  console.log(`\n═══ BACKFILL SEPA LAST RUN ═══`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no escriu res)' : 'APPLY (escriptura real)'}`);
  console.log(`Run: ${RUN_PATH}\n`);

  // 1. Llegir el run
  const runSnap = await db.doc(RUN_PATH).get();
  if (!runSnap.exists) {
    throw new Error(`Run no trobat: ${RUN_PATH}`);
  }

  const run = runSnap.data()!;

  // Validar camps
  const collectionDate = run.collectionDate;
  if (!collectionDate || typeof collectionDate !== 'string') {
    throw new Error(`collectionDate invàlid: ${collectionDate}`);
  }

  const included = run.included;
  if (!Array.isArray(included)) {
    throw new Error(`included no és un array`);
  }

  console.log(`collectionDate: ${collectionDate}`);
  console.log(`includedCount: ${included.length}`);

  // 2. Extreure contactIds únics
  const contactIds = [...new Set(
    included
      .map((item: any) => item.contactId as string)
      .filter(Boolean)
  )];

  console.log(`uniqueContactIdsCount: ${contactIds.length}`);

  // 3. Processar cada contacte
  let missingContacts = 0;
  let skippedAlreadyHad = 0;
  let wouldUpdate = 0;
  let updated = 0;
  const exampleIds: string[] = [];

  for (const contactId of contactIds) {
    const contactRef = db.doc(`organizations/${ORG_ID}/contacts/${contactId}`);
    const contactSnap = await contactRef.get();

    if (!contactSnap.exists) {
      missingContacts++;
      continue;
    }

    const data = contactSnap.data()!;
    if (data.sepaPain008LastRunAt) {
      skippedAlreadyHad++;
      continue;
    }

    wouldUpdate++;
    if (exampleIds.length < 3) {
      exampleIds.push(contactId);
    }
  }

  console.log(`\n═══ RECOMPTE ═══`);
  console.log(`missingContacts: ${missingContacts}`);
  console.log(`skippedAlreadyHad: ${skippedAlreadyHad}`);
  console.log(`wouldUpdate: ${wouldUpdate}`);

  if (exampleIds.length > 0) {
    console.log(`\nExemples de contactIds a actualitzar:`);
    exampleIds.forEach(id => console.log(`  - ${id}`));
  }

  // 4. Aplicar (només si --apply)
  if (!dryRun && wouldUpdate > 0) {
    console.log(`\n═══ APLICANT CANVIS ═══`);

    // Re-iterar per fer els updates en batches
    const toUpdate: string[] = [];

    for (const contactId of contactIds) {
      const contactRef = db.doc(`organizations/${ORG_ID}/contacts/${contactId}`);
      const contactSnap = await contactRef.get();

      if (!contactSnap.exists) continue;
      if (contactSnap.data()!.sepaPain008LastRunAt) continue;

      toUpdate.push(contactId);
    }

    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const chunk = toUpdate.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const contactId of chunk) {
        const contactRef = db.doc(`organizations/${ORG_ID}/contacts/${contactId}`);
        batch.update(contactRef, {
          sepaPain008LastRunAt: collectionDate,
          sepaPain008LastRunId: RUN_ID,
        });
      }

      await batch.commit();
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} contactes actualitzats`);
    }

    updated = toUpdate.length;
  }

  console.log(`\n═══ RESULTAT FINAL ═══`);
  console.log({
    collectionDate,
    includedCount: included.length,
    uniqueContactIdsCount: contactIds.length,
    missingContacts,
    skippedAlreadyHad,
    wouldUpdate,
    updated,
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
