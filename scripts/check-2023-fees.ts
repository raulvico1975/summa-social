/**
 * Script per verificar si existeixen transaccions de comissions del 2023
 * Executa amb: node --import tsx scripts/check-2023-fees.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Inicialitzar Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = path.join(process.cwd(), 'summa-social-firebase-adminsdk.json');

  initializeApp({
    credential: cert(serviceAccountPath)
  });
}

const db = getFirestore();

async function checkFeesFor2023() {
  const orgId = 'SkQjWvCRDJhSf1OeJAw9';

  console.log('🔍 Cercant transaccions de comissions del 2023...\n');

  // Buscar transaccions amb import negatiu (comissions) al maig 2023
  const snapshot = await db
    .collection('organizations')
    .doc(orgId)
    .collection('transactions')
    .where('date', '>=', '2023-05-01')
    .where('date', '<=', '2023-05-31')
    .where('amount', '<', 0)
    .get();

  console.log(`Total transaccions negatives (possibles comissions) al maig 2023: ${snapshot.size}\n`);

  if (snapshot.size === 0) {
    console.log('❌ No s\'han trobat transaccions de comissions al maig 2023');
    console.log('   Això confirma que el sistema antic NO registrava les comissions de Stripe\n');
  } else {
    console.log('✅ Transaccions trobades:\n');
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  Data: ${data.date}`);
      console.log(`  Import: ${data.amount} €`);
      console.log(`  Concepte: ${data.concept || '(sense concepte)'}`);
      console.log(`  Categoria: ${data.categoryName || '(sense categoria)'}`);
      console.log('');
    });
  }

  // Buscar donacions del maig 2023 per comparar
  console.log('📊 Cercant donacions del maig 2023 per comparar...\n');

  const donationsSnapshot = await db
    .collection('organizations')
    .doc(orgId)
    .collection('transactions')
    .where('date', '>=', '2023-05-01')
    .where('date', '<=', '2023-05-31')
    .where('amount', '>', 0)
    .get();

  console.log(`Total donacions positives al maig 2023: ${donationsSnapshot.size}\n`);

  // Mostrar primer 3 exemples
  let count = 0;
  donationsSnapshot.forEach(doc => {
    if (count < 3) {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  Data: ${data.date}`);
      console.log(`  Import: ${data.amount} €`);
      console.log(`  Concepte: ${data.concept || '(sense concepte)'}`);
      console.log('');
      count++;
    }
  });

  if (donationsSnapshot.size > 3) {
    console.log(`... i ${donationsSnapshot.size - 3} més\n`);
  }
}

checkFeesFor2023()
  .then(() => {
    console.log('✅ Verificació completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
