// scripts/backfill-project-expenses-documents.ts
// Script per forçar la re-exportació de transaccions amb document al feed de projectExpenses.
//
// Motiu: El camp era 'documentUrl' però havia de ser 'document'.
// Ara que la Cloud Function està corregida, cal "tocar" les transaccions
// perquè es dispari el trigger onWrite i s'actualitzi el feed d'exports.
//
// Execució:
//   GOOGLE_APPLICATION_CREDENTIALS="" npx tsx scripts/backfill-project-expenses-documents.ts

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Inicialitzar Firebase Admin
// Usa l'autenticació per defecte (gcloud auth application-default login)
if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'summa-social',
  });
}

const db = getFirestore();

async function backfillDocuments() {
  console.log('=== Backfill Project Expenses Documents ===\n');

  // Obtenir totes les organitzacions
  const orgsSnapshot = await db.collection('organizations').get();
  console.log(`Trobades ${orgsSnapshot.size} organitzacions\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const orgDoc of orgsSnapshot.docs) {
    const orgId = orgDoc.id;
    const orgName = orgDoc.data().name || orgId;
    console.log(`\n📁 Processant org: ${orgName} (${orgId})`);

    // Buscar transaccions que tenen document (no null, no undefined, no buit)
    const txRef = db.collection(`organizations/${orgId}/transactions`);
    const txSnapshot = await txRef.get();

    let orgUpdated = 0;
    let orgSkipped = 0;

    for (const txDoc of txSnapshot.docs) {
      const txData = txDoc.data();
      const documentUrl = txData.document;

      // Només processar si té document
      if (!documentUrl || typeof documentUrl !== 'string' || documentUrl.trim() === '') {
        continue;
      }

      // Verificar si l'export ja té el document correcte
      const exportRef = db.doc(`organizations/${orgId}/exports/projectExpenses/items/${txDoc.id}`);
      const exportDoc = await exportRef.get();

      if (exportDoc.exists) {
        const exportData = exportDoc.data();
        const existingFileUrl = exportData?.documents?.[0]?.fileUrl;

        // Si ja té la URL correcta, saltar
        if (existingFileUrl === documentUrl) {
          orgSkipped++;
          continue;
        }
      }

      // "Tocar" la transacció per triggerejar el onWrite
      // Actualitzem updatedAt sense canviar res més
      console.log(`  📄 Actualitzant tx ${txDoc.id.slice(0, 8)}... (doc: ${documentUrl.slice(0, 50)}...)`);

      await txRef.doc(txDoc.id).update({
        updatedAt: FieldValue.serverTimestamp(),
      });

      orgUpdated++;
    }

    console.log(`  ✅ ${orgUpdated} actualitzades, ${orgSkipped} ja correctes`);
    totalUpdated += orgUpdated;
    totalSkipped += orgSkipped;
  }

  console.log(`\n=== RESUM ===`);
  console.log(`Total actualitzades: ${totalUpdated}`);
  console.log(`Total ja correctes: ${totalSkipped}`);
  console.log('\nEls canvis es propagaran al feed de projectExpenses via Cloud Function.');
}

backfillDocuments()
  .then(() => {
    console.log('\n✅ Backfill completat!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
