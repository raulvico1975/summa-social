/**
 * FASE 0: Migració category nameKey → docId
 *
 * Problema:
 *   - Transaccions legacy tenen `category: "salaries"` (nameKey).
 *   - El codi espera `category: <docId>` per categories custom de l'org.
 *   - L'API d'arxivat compta `where('category', '==', docId)` → troba 0 transaccions
 *     quan en realitat n'hi ha moltes amb el nameKey.
 *
 * Solució:
 *   - Per cada categoria de l'org, buscar transaccions amb `category == nameKey`
 *   - Actualitzar-les a `category == docId`
 *
 * Ús:
 *   # Dry-run (no escriu res, només compta)
 *   node --import tsx scripts/migrate-category-namekey-to-docid.ts --org <ORG_ID> --dry-run
 *
 *   # Apply (escriu els canvis)
 *   node --import tsx scripts/migrate-category-namekey-to-docid.ts --org <ORG_ID> --apply
 *
 * Requereix:
 *   - ADC (gcloud auth application-default login)
 *   - Projecte correcte seleccionat
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓ
// ═══════════════════════════════════════════════════════════════════════════

const BATCH_SIZE = 450;

// nameKeys coneguts (predefinits del sistema)
const KNOWN_NAMEKEYS = new Set([
  'donations', 'subsidies', 'memberFees', 'sponsorships', 'productSales',
  'inheritances', 'events', 'otherIncome', 'rent', 'officeSupplies',
  'utilities', 'salaries', 'travel', 'marketing', 'professionalServices',
  'insurance', 'projectMaterials', 'training', 'bankFees', 'missionTransfers',
  'otherExpenses', 'Revisar',
  // Afegir altres nameKeys si n'hi ha
  'lottery', 'volunteers', 'loteria', 'voluntaris', 'voluntariat',
]);

// ═══════════════════════════════════════════════════════════════════════════
// ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

interface Args {
  orgId: string;
  apply: boolean;
  dryRun: boolean;
  projectId: string;
}

function readProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;

  const rcPath = path.join(process.cwd(), '.firebaserc');
  if (fs.existsSync(rcPath)) {
    const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
    const projects = rc?.projects || {};
    if (projects.prod) return projects.prod;
    const first = Object.values(projects)[0];
    if (typeof first === 'string' && first.length) return first;
  }

  throw new Error('No projectId. Defineix FIREBASE_PROJECT_ID o configura .firebaserc amb projects.prod.');
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (k: string) => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const orgId = get('--org');
  const apply = argv.includes('--apply');
  const dryRun = argv.includes('--dry-run') || !apply;

  if (!orgId) {
    console.error('Ús: --org <ORG_ID> [--dry-run | --apply]');
    console.error('');
    console.error('Exemples:');
    console.error('  node --import tsx scripts/migrate-category-namekey-to-docid.ts --org SkQjWvCRDJhSf1OeJAw9 --dry-run');
    console.error('  node --import tsx scripts/migrate-category-namekey-to-docid.ts --org SkQjWvCRDJhSf1OeJAw9 --apply');
    process.exit(1);
  }

  const projectId = readProjectId();
  return { orgId, apply, dryRun, projectId };
}

function initAdmin(projectId: string): void {
  if (getApps().length) return;
  initializeApp({ credential: applicationDefault(), projectId });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function looksLikeDocId(s: string): boolean {
  // DocIds de Firestore són típicament 20+ chars alfanumèrics amb almenys un dígit
  return /^[A-Za-z0-9]{20,}$/.test(s) && /\d/.test(s);
}

interface CategoryDoc {
  id: string;
  name: string;
  type: 'income' | 'expense';
  archivedAt?: unknown;
}

interface MigrationResult {
  nameKey: string;
  docId: string;
  willUpdate: number;
  examples: Array<{
    txId: string;
    date: string;
    amount: number;
    categoryBefore: string;
    categoryAfter: string;
    description: string;
  }>;
}

interface OrphanResult {
  category: string;
  count: number;
  examples: Array<{
    txId: string;
    date: string;
    amount: number;
    description: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const args = parseArgs();
  initAdmin(args.projectId);
  const db = getFirestore();

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('FASE 0: Migració category nameKey → docId');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('projectId:', args.projectId);
  console.log('orgId:', args.orgId);
  console.log('mode:', args.dryRun ? 'DRY-RUN' : 'APPLY');
  console.log('');

  // 1. Carregar totes les categories de l'org
  console.log('📂 Carregant categories de l\'organització...');
  const categoriesSnap = await db
    .collection('organizations')
    .doc(args.orgId)
    .collection('categories')
    .get();

  if (categoriesSnap.empty) {
    console.log('⚠️  No hi ha categories a l\'organització. Abort.');
    return;
  }

  const categories: CategoryDoc[] = categoriesSnap.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name as string,
    type: doc.data().type as 'income' | 'expense',
    archivedAt: doc.data().archivedAt,
  }));

  console.log(`   Trobades ${categories.length} categories (incloent arxivades)`);

  // Crear mapa nameKey → docId
  const nameKeyToDocId = new Map<string, string>();
  for (const cat of categories) {
    if (cat.name && !looksLikeDocId(cat.name)) {
      // Si ja hi ha un altre docId per aquest nameKey, advertir
      if (nameKeyToDocId.has(cat.name)) {
        console.warn(`   ⚠️  Duplicat: nameKey "${cat.name}" té múltiples docIds: ${nameKeyToDocId.get(cat.name)}, ${cat.id}`);
      }
      nameKeyToDocId.set(cat.name, cat.id);
    }
  }

  console.log(`   Mapa nameKey → docId: ${nameKeyToDocId.size} entrades`);
  console.log('');

  // 2. Per cada nameKey conegut, buscar transaccions que l'utilitzin
  console.log('🔍 Cercant transaccions amb category = nameKey...');
  console.log('');

  const txRef = db.collection('organizations').doc(args.orgId).collection('transactions');
  const migrations: MigrationResult[] = [];
  const orphans: OrphanResult[] = [];
  let totalWillUpdate = 0;
  let totalSkipped = 0;

  // Buscar per cada nameKey del mapa (categories de l'org)
  for (const [nameKey, docId] of nameKeyToDocId) {
    const snap = await txRef.where('category', '==', nameKey).get();

    if (snap.empty) {
      totalSkipped++;
      continue;
    }

    // Filtrar només transaccions actives (archivedAt == null o undefined)
    const activeDocs = snap.docs.filter(doc => {
      const data = doc.data();
      return data.archivedAt == null;
    });

    if (activeDocs.length === 0) {
      totalSkipped++;
      continue;
    }

    const examples = activeDocs.slice(0, 5).map(doc => {
      const data = doc.data();
      return {
        txId: doc.id,
        date: data.date as string,
        amount: data.amount as number,
        categoryBefore: nameKey,
        categoryAfter: docId,
        description: ((data.description ?? '') as string).slice(0, 60),
      };
    });

    migrations.push({
      nameKey,
      docId,
      willUpdate: activeDocs.length,
      examples,
    });

    totalWillUpdate += activeDocs.length;
  }

  // 3. Buscar transaccions òrfenes (nameKeys que no tenen categoria a l'org)
  console.log('🔍 Cercant transaccions òrfenes (nameKey sense categoria a l\'org)...');

  // Obtenir tots els nameKeys únics de les transaccions
  // Això és més costós, però necessari per detectar orfes
  const allTxSnap = await txRef.get();
  const nameKeySet = new Set<string>();

  for (const doc of allTxSnap.docs) {
    const cat = doc.data().category as string | null;
    if (cat && KNOWN_NAMEKEYS.has(cat) && !nameKeyToDocId.has(cat)) {
      nameKeySet.add(cat);
    }
  }

  for (const orphanNameKey of nameKeySet) {
    const snap = await txRef.where('category', '==', orphanNameKey).get();
    const activeDocs = snap.docs.filter(doc => doc.data().archivedAt == null);

    if (activeDocs.length > 0) {
      orphans.push({
        category: orphanNameKey,
        count: activeDocs.length,
        examples: activeDocs.slice(0, 3).map(doc => {
          const data = doc.data();
          return {
            txId: doc.id,
            date: data.date as string,
            amount: data.amount as number,
            description: ((data.description ?? '') as string).slice(0, 60),
          };
        }),
      });
    }
  }

  // 4. Resum
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('RESUM');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`willUpdate:     ${totalWillUpdate} transaccions`);
  console.log(`skip:           ${totalSkipped} categories sense transaccions amb nameKey`);
  console.log(`orphans:        ${orphans.reduce((sum, o) => sum + o.count, 0)} transaccions en ${orphans.length} nameKeys sense categoria`);
  console.log('');

  if (migrations.length > 0) {
    console.log('MIGRACIONS A APLICAR:');
    for (const m of migrations) {
      console.log(`  ${m.nameKey} → ${m.docId}: ${m.willUpdate} transaccions`);
      for (const ex of m.examples) {
        console.log(`    - [${ex.txId}] ${ex.date} | ${ex.amount}€ | ${ex.description}`);
      }
    }
    console.log('');
  }

  if (orphans.length > 0) {
    console.log('⚠️  ORFES (nameKey sense categoria a l\'org, NO es migraran):');
    for (const o of orphans) {
      console.log(`  ${o.category}: ${o.count} transaccions`);
      for (const ex of o.examples) {
        console.log(`    - [${ex.txId}] ${ex.date} | ${ex.amount}€ | ${ex.description}`);
      }
    }
    console.log('');
    console.log('  Per arreglar orfes, cal crear les categories a l\'org i tornar a executar.');
    console.log('');
  }

  // 5. Apply si no és dry-run
  if (args.dryRun) {
    console.log('✅ DRY-RUN complet. No s\'ha escrit res.');
    return;
  }

  if (totalWillUpdate === 0) {
    console.log('✅ No hi ha transaccions per migrar.');
    return;
  }

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('APLICANT CANVIS...');
  console.log('═══════════════════════════════════════════════════════════════════');

  let totalUpdated = 0;

  for (const m of migrations) {
    console.log(`\n📝 Migrant ${m.nameKey} → ${m.docId}...`);

    const snap = await txRef.where('category', '==', m.nameKey).get();
    const activeDocs = snap.docs.filter(doc => doc.data().archivedAt == null);

    for (let i = 0; i < activeDocs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = activeDocs.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        batch.update(doc.ref, { category: m.docId });
      }

      await batch.commit();
      totalUpdated += chunk.length;
      console.log(`   ✍️  Actualitzades ${Math.min(i + BATCH_SIZE, activeDocs.length)}/${activeDocs.length}`);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`✅ APPLY complet. Total actualitzades: ${totalUpdated}`);
  console.log('═══════════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Error:', err.message || err);
  process.exit(1);
});
