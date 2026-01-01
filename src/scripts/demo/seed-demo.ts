/**
 * Seed Demo Data
 *
 * Funció principal per regenerar totes les dades demo.
 *
 * Fluxe:
 * 1. Purgar dades existents amb isDemoData: true
 * 2. Crear/actualitzar org demo
 * 3. Generar i escriure noves dades
 *
 * Volums:
 * - Donants: 120
 * - Proveïdors: 35
 * - Treballadors: 12
 * - Mesos moviments: 18
 * - Projectes: 4
 * - Partides/projecte: 10
 * - Despeses off-bank: 160
 * - Assignacions projecte: 80
 * - PDFs Storage: 30
 */

import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { Timestamp } from 'firebase-admin/firestore';
import { DEMO_DATA_MARKER, DEMO_ID_PREFIX } from '@/lib/demo/isDemoOrg';
import {
  generateDonors,
  generateSuppliers,
  generateWorkers,
  generateCategories,
  generateTransactions,
  generateProjects,
  generateExpenses,
  generateDummyPDF,
} from './demo-generators';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_ORG_ID = 'demo-org';
const DEMO_ORG_SLUG = 'demo';

const VOLUMES = {
  donors: 120,
  suppliers: 35,
  workers: 12,
  months: 18,
  projects: 4,
  budgetLinesPerProject: 10,
  offBankExpenses: 160,
  projectAssignments: 80,
  pdfs: 30,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function purgeCollection(
  db: Firestore,
  collectionPath: string
): Promise<number> {
  const snapshot = await db
    .collection(collectionPath)
    .where(DEMO_DATA_MARKER, '==', true)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return snapshot.size;
}

async function purgeStoragePrefix(bucket: Bucket, prefix: string): Promise<number> {
  try {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      await file.delete();
    }
    return files.length;
  } catch (error) {
    console.warn(`[seed-demo] Warning purging storage ${prefix}:`, error);
    return 0;
  }
}

async function writeBatch<T extends { id: string }>(
  db: Firestore,
  collectionPath: string,
  items: T[]
): Promise<void> {
  // Firestore batch limit is 500
  const BATCH_SIZE = 450;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = items.slice(i, i + BATCH_SIZE);

    for (const item of chunk) {
      const { id, ...data } = item;
      const ref = db.collection(collectionPath).doc(id);
      batch.set(ref, data);
    }

    await batch.commit();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main seed function
// ─────────────────────────────────────────────────────────────────────────────

export interface SeedCounts {
  donors: number;
  suppliers: number;
  workers: number;
  categories: number;
  transactions: number;
  projects: number;
  projectAssignments: number;
  budgetLines: number;
  expenses: number;
  pdfs: number;
}

export async function runDemoSeed(
  db: Firestore,
  bucket: Bucket
): Promise<SeedCounts> {
  console.log('[seed-demo] Iniciant seed demo...');
  console.log('[seed-demo] Volums:', VOLUMES);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Purgar dades existents
  // ─────────────────────────────────────────────────────────────────────────
  console.log('[seed-demo] Purgant dades existents...');

  const orgPath = `organizations/${DEMO_ORG_ID}`;

  await Promise.all([
    purgeCollection(db, `${orgPath}/contacts`),
    purgeCollection(db, `${orgPath}/categories`),
    purgeCollection(db, `${orgPath}/transactions`),
    purgeCollection(db, `${orgPath}/projects`),
    purgeCollection(db, `${orgPath}/projectModule/budgetLines/items`),
    purgeCollection(db, `${orgPath}/projectModule/expenses/items`),
    purgeStoragePrefix(bucket, `organizations/${DEMO_ORG_ID}/`),
  ]);

  console.log('[seed-demo] Purga completada');

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Crear/actualitzar org demo
  // ─────────────────────────────────────────────────────────────────────────
  console.log('[seed-demo] Configurant org demo...');

  await db.doc(orgPath).set(
    {
      id: DEMO_ORG_ID,
      name: 'Entitat Demo',
      slug: DEMO_ORG_SLUG,
      taxId: 'G12345678',
      status: 'active',
      isDemo: true,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      address: 'Carrer de la Demo, 1',
      city: 'Barcelona',
      province: 'Barcelona',
      zipCode: '08001',
      email: 'demo@summa-social.demo',
      phone: '931234567',
      language: 'ca',
    },
    { merge: true }
  );

  // Slug mapping
  await db.doc(`slugs/${DEMO_ORG_SLUG}`).set({
    organizationId: DEMO_ORG_ID,
    createdAt: Timestamp.now(),
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Generar dades
  // ─────────────────────────────────────────────────────────────────────────
  console.log('[seed-demo] Generant dades...');

  // Contactes
  const donors = generateDonors(VOLUMES.donors);
  const suppliers = generateSuppliers(VOLUMES.suppliers);
  const workers = generateWorkers(VOLUMES.workers);
  const allContacts = [...donors, ...suppliers, ...workers];

  // Categories
  const categories = generateCategories();

  // Transaccions (18 mesos fins ara)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - VOLUMES.months);
  const transactions = generateTransactions(startDate, endDate, donors, suppliers, categories);

  // Projectes i partides
  const { projects, budgetLines } = generateProjects(VOLUMES.projects);

  // Despeses off-bank
  const expenses = generateExpenses(VOLUMES.offBankExpenses, suppliers, projects, budgetLines);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Escriure dades
  // ─────────────────────────────────────────────────────────────────────────
  console.log('[seed-demo] Escrivint dades a Firestore...');

  await writeBatch(db, `${orgPath}/contacts`, allContacts);
  console.log(`[seed-demo]   - Contactes: ${allContacts.length}`);

  await writeBatch(db, `${orgPath}/categories`, categories);
  console.log(`[seed-demo]   - Categories: ${categories.length}`);

  await writeBatch(db, `${orgPath}/transactions`, transactions);
  console.log(`[seed-demo]   - Transaccions: ${transactions.length}`);

  await writeBatch(db, `${orgPath}/projects`, projects);
  console.log(`[seed-demo]   - Projectes: ${projects.length}`);

  await writeBatch(db, `${orgPath}/projectModule/budgetLines/items`, budgetLines);
  console.log(`[seed-demo]   - Partides: ${budgetLines.length}`);

  await writeBatch(db, `${orgPath}/projectModule/expenses/items`, expenses);
  console.log(`[seed-demo]   - Despeses: ${expenses.length}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Pujar PDFs dummy
  // ─────────────────────────────────────────────────────────────────────────
  console.log('[seed-demo] Pujant PDFs dummy...');

  for (let i = 0; i < VOLUMES.pdfs; i++) {
    const pdfBuffer = generateDummyPDF(i);
    const fileName = `organizations/${DEMO_ORG_ID}/pendingDocuments/${DEMO_ID_PREFIX}doc_${i.toString().padStart(3, '0')}.pdf`;
    const file = bucket.file(fileName);
    await file.save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: {
        [DEMO_DATA_MARKER]: 'true',
      },
    });
  }
  console.log(`[seed-demo]   - PDFs: ${VOLUMES.pdfs}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Retornar comptadors
  // ─────────────────────────────────────────────────────────────────────────
  // Comptador d'assignacions projecte (despeses amb projectId)
  const projectAssignmentsCount = expenses.filter(e => e.projectId).length;

  const counts: SeedCounts = {
    donors: donors.length,
    suppliers: suppliers.length,
    workers: workers.length,
    categories: categories.length,
    transactions: transactions.length,
    projects: projects.length,
    projectAssignments: projectAssignmentsCount,
    budgetLines: budgetLines.length,
    expenses: expenses.length,
    pdfs: VOLUMES.pdfs,
  };

  console.log('[seed-demo] Seed completat!');
  console.log('[seed-demo] Comptadors:', counts);

  return counts;
}
