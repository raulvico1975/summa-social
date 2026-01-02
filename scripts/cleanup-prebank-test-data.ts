/**
 * Neteja total del mòdul pre-banc (PROVES).
 * - pendingDocuments
 * - prebankRemittances (+ XML a Storage)
 * - expenseReports (+ PDFs a Storage)
 * - transactions amb needsReview: true (documents pendents de /movimientos/pendents)
 *
 * ÚS:
 *   GOOGLE_APPLICATION_CREDENTIALS="" npx tsx scripts/cleanup-prebank-test-data.ts <ORG_ID>
 *
 * SEGURETAT:
 * - Ordre correcte: prebankRemittances → pendingDocuments → expenseReports → transactions
 * - Storage és best-effort (warnings no bloquegen)
 */

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin
const projectId = 'summa-social';
const storageBucket = 'summa-social.firebasestorage.app';

initializeApp({
  credential: applicationDefault(),
  projectId,
  storageBucket,
});

const db = getFirestore();
const bucket = getStorage().bucket();

const orgId = process.argv[2];
if (!orgId) {
  console.error('❌ Cal passar ORG_ID com a argument');
  console.error('   Exemple: GOOGLE_APPLICATION_CREDENTIALS="" npx tsx scripts/cleanup-prebank-test-data.ts PrNPBg7YFnk16f9gXdXw');
  process.exit(1);
}

async function deleteStoragePrefix(prefix: string): Promise<number> {
  try {
    const [files] = await bucket.getFiles({ prefix });
    if (files.length === 0) return 0;

    for (const file of files) {
      await file.delete();
      console.log(`  📁 Deleted: ${file.name}`);
    }
    return files.length;
  } catch (e) {
    console.warn(`  ⚠️ Storage delete warning for prefix "${prefix}":`, e instanceof Error ? e.message : e);
    return 0;
  }
}

async function main() {
  console.log('');
  console.log('🧹 Iniciant neteja pre-banc per org:', orgId);
  console.log('─'.repeat(50));

  let totalDocs = 0;
  let totalFiles = 0;

  // 1) Esborrar PREBANK REMITTANCES (primer!)
  console.log('\n📦 1/4 Esborrant prebankRemittances...');
  const prebankPath = `organizations/${orgId}/prebankRemittances`;
  const prebankSnap = await db.collection(prebankPath).get();

  for (const doc of prebankSnap.docs) {
    const rid = doc.id;
    const filesDeleted = await deleteStoragePrefix(`organizations/${orgId}/prebankRemittances/${rid}/`);
    totalFiles += filesDeleted;
    await doc.ref.delete();
    console.log(`  🗑️ prebankRemittance: ${rid} (${filesDeleted} files)`);
    totalDocs++;
  }
  console.log(`  ✓ ${prebankSnap.size} prebankRemittances esborrades`);

  // 2) Esborrar PENDING DOCUMENTS
  console.log('\n📄 2/4 Esborrant pendingDocuments...');
  const pendingPath = `organizations/${orgId}/pendingDocuments`;
  const pendingSnap = await db.collection(pendingPath).get();

  for (const doc of pendingSnap.docs) {
    const did = doc.id;
    const filesDeleted = await deleteStoragePrefix(`organizations/${orgId}/pendingDocuments/${did}/`);
    totalFiles += filesDeleted;
    await doc.ref.delete();
    console.log(`  🗑️ pendingDocument: ${did} (${filesDeleted} files)`);
    totalDocs++;
  }
  console.log(`  ✓ ${pendingSnap.size} pendingDocuments esborrats`);

  // 3) Esborrar EXPENSE REPORTS (Liquidacions)
  console.log('\n📊 3/4 Esborrant expenseReports (liquidacions)...');
  const reportsPath = `organizations/${orgId}/expenseReports`;
  const reportsSnap = await db.collection(reportsPath).get();

  for (const doc of reportsSnap.docs) {
    const rid = doc.id;
    const filesDeleted = await deleteStoragePrefix(`organizations/${orgId}/expenseReports/${rid}/`);
    totalFiles += filesDeleted;
    await doc.ref.delete();
    console.log(`  🗑️ expenseReport: ${rid} (${filesDeleted} files)`);
    totalDocs++;
  }
  console.log(`  ✓ ${reportsSnap.size} expenseReports esborrats`);

  // 4) Esborrar TRANSACTIONS amb needsReview: true (documents pendents)
  console.log('\n📋 4/4 Esborrant transactions amb needsReview: true...');
  const txPath = `organizations/${orgId}/transactions`;
  const txSnap = await db.collection(txPath).where('needsReview', '==', true).get();

  for (const doc of txSnap.docs) {
    const txId = doc.id;
    const data = doc.data();
    // Esborrar document adjunt si n'hi ha
    if (data.documentUrl) {
      const filesDeleted = await deleteStoragePrefix(`organizations/${orgId}/transactions/${txId}/`);
      totalFiles += filesDeleted;
    }
    await doc.ref.delete();
    console.log(`  🗑️ transaction (needsReview): ${txId}`);
    totalDocs++;
  }
  console.log(`  ✓ ${txSnap.size} transactions amb needsReview esborrades`);

  // Resum
  console.log('\n' + '─'.repeat(50));
  console.log('✅ Neteja completada!');
  console.log(`   📄 Documents Firestore: ${totalDocs}`);
  console.log(`   📁 Fitxers Storage: ${totalFiles}`);
  console.log('');
  console.log('💡 Fes hard refresh a l\'app per veure els canvis.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Error durant la neteja:', err);
    process.exit(1);
  });
