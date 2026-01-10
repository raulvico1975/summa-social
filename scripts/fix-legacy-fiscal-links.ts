/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT DE SANEJAMENT: RETURNS I REMITTANCE IN SENSE contactId
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Busca transaccions fiscalment rellevants que tenen emisorId però no contactId:
 * 1. transactionType === 'return' AND contactId == null AND emisorId != null
 * 2. source === 'remittance' AND amount > 0 AND contactId == null AND emisorId != null
 *
 * Per cada transacció:
 * - Verifica que el contacte amb emisorId existeix
 * - Assigna: contactId = emisorId, contactType = 'donor', contactName
 *
 * Modes:
 *   --dry-run (default): Només mostra què es faria
 *   --apply: Executa els canvis a Firestore
 *   --org=<orgId>: Només una organització específica
 *   --limit=<n>: Màxim de transaccions a processar (default 500)
 *
 * Execució:
 *   node --import tsx scripts/fix-legacy-fiscal-links.ts --dry-run
 *   node --import tsx scripts/fix-legacy-fiscal-links.ts --dry-run --org=SkQjWvCRDJhSf1OeJAw9
 *   node --import tsx scripts/fix-legacy-fiscal-links.ts --apply --org=SkQjWvCRDJhSf1OeJAw9
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '500', 10);
const SPECIFIC_ORG = args.find(a => a.startsWith('--org='))?.split('=')[1] || null;

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

interface Transaction {
  id: string;
  transactionType?: string;
  source?: string;
  amount: number;
  date: string;
  description?: string;
  contactId?: string | null;
  contactName?: string | null;
  contactType?: string;
  emisorId?: string | null;
  emisorName?: string | null;
}

interface Contact {
  id: string;
  name: string;
  type?: string;
}

interface FixCandidate {
  orgId: string;
  txId: string;
  txDate: string;
  amount: number;
  description: string;
  type: 'return' | 'remittance_in';
  emisorId: string;
  emisorName: string | null;
  contactExists: boolean;
  contactName?: string;
}

interface FixResult {
  orgId: string;
  returnsFixed: number;
  remittanceInFixed: number;
  skippedNoContact: number;
  candidates: FixCandidate[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALITZACIÓ FIREBASE
// ═══════════════════════════════════════════════════════════════════════════════

if (getApps().length === 0) {
  const envCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const localServiceAccountPath = path.join(process.cwd(), 'summa-social-firebase-adminsdk.json');

  if (envCredentials && fs.existsSync(envCredentials)) {
    console.log('🔑 Usant credencials de GOOGLE_APPLICATION_CREDENTIALS');
    initializeApp({
      credential: cert(envCredentials)
    });
  } else if (fs.existsSync(localServiceAccountPath)) {
    console.log('🔑 Usant credencials locals: summa-social-firebase-adminsdk.json');
    initializeApp({
      credential: cert(localServiceAccountPath)
    });
  } else {
    console.log('🔑 Intentant Application Default Credentials...');
    try {
      initializeApp();
    } catch {
      console.error('❌ No es troben credencials de Firebase.');
      console.error('   Opció 1: Configura GOOGLE_APPLICATION_CREDENTIALS');
      console.error('   Opció 2: Col·loca summa-social-firebase-adminsdk.json a l\'arrel');
      process.exit(1);
    }
  }
}

const db = getFirestore();

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONS PRINCIPALS
// ═══════════════════════════════════════════════════════════════════════════════

async function getOrganizations(): Promise<Array<{ id: string; name: string }>> {
  if (SPECIFIC_ORG) {
    const orgDoc = await db.collection('organizations').doc(SPECIFIC_ORG).get();
    if (!orgDoc.exists) {
      console.error(`❌ Organització ${SPECIFIC_ORG} no existeix`);
      process.exit(1);
    }
    return [{ id: SPECIFIC_ORG, name: orgDoc.data()?.name || SPECIFIC_ORG }];
  }

  const snapshot = await db.collection('organizations').get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name || doc.id
  }));
}

async function loadContactsMap(orgId: string): Promise<Map<string, Contact>> {
  const snapshot = await db
    .collection('organizations')
    .doc(orgId)
    .collection('contacts')
    .get();

  const map = new Map<string, Contact>();
  for (const doc of snapshot.docs) {
    map.set(doc.id, {
      id: doc.id,
      name: doc.data().name || '',
      type: doc.data().type || 'donor'
    });
  }
  return map;
}

async function findCandidates(orgId: string, contactsMap: Map<string, Contact>): Promise<FixCandidate[]> {
  const candidates: FixCandidate[] = [];

  const txSnapshot = await db
    .collection('organizations')
    .doc(orgId)
    .collection('transactions')
    .get();

  for (const doc of txSnapshot.docs) {
    const tx = { id: doc.id, ...doc.data() } as Transaction;

    // Saltar si ja té contactId
    if (tx.contactId) continue;

    // Saltar si no té emisorId (no podem fer res)
    if (!tx.emisorId) continue;

    // Cas 1: Returns sense contactId
    if (tx.transactionType === 'return') {
      const contact = contactsMap.get(tx.emisorId);
      candidates.push({
        orgId,
        txId: tx.id,
        txDate: tx.date,
        amount: tx.amount,
        description: tx.description || '',
        type: 'return',
        emisorId: tx.emisorId,
        emisorName: tx.emisorName || null,
        contactExists: !!contact,
        contactName: contact?.name
      });
    }

    // Cas 2: Remittance IN (amount > 0) sense contactId
    if (tx.source === 'remittance' && tx.amount > 0) {
      const contact = contactsMap.get(tx.emisorId);
      candidates.push({
        orgId,
        txId: tx.id,
        txDate: tx.date,
        amount: tx.amount,
        description: tx.description || '',
        type: 'remittance_in',
        emisorId: tx.emisorId,
        emisorName: tx.emisorName || null,
        contactExists: !!contact,
        contactName: contact?.name
      });
    }
  }

  return candidates;
}

async function applyFixes(candidates: FixCandidate[]): Promise<{ fixed: number; skipped: number }> {
  let fixed = 0;
  let skipped = 0;

  // Agrupar per orgId per eficiència
  const byOrg = new Map<string, FixCandidate[]>();
  for (const c of candidates) {
    if (!byOrg.has(c.orgId)) byOrg.set(c.orgId, []);
    byOrg.get(c.orgId)!.push(c);
  }

  for (const [orgId, orgCandidates] of byOrg) {
    // Processar en chunks de 500 (límit Firestore batch)
    const CHUNK_SIZE = 400;
    for (let i = 0; i < orgCandidates.length; i += CHUNK_SIZE) {
      const chunk = orgCandidates.slice(i, i + CHUNK_SIZE);
      const batch = db.batch();

      for (const c of chunk) {
        if (!c.contactExists) {
          skipped++;
          continue;
        }

        const txRef = db
          .collection('organizations')
          .doc(orgId)
          .collection('transactions')
          .doc(c.txId);

        batch.update(txRef, {
          contactId: c.emisorId,
          contactType: 'donor',
          contactName: c.contactName || c.emisorName || 'Donant',
        });

        fixed++;
      }

      if (fixed > 0 || skipped > 0) {
        await batch.commit();
        console.log(`   💾 Batch commit: ${Math.min(i + CHUNK_SIZE, orgCandidates.length)}/${orgCandidates.length}`);
      }
    }
  }

  return { fixed, skipped };
}

function generateReport(results: FixResult[], startTime: Date): string {
  const date = new Date().toISOString().split('T')[0];
  const totalReturns = results.reduce((s, r) => s + r.returnsFixed, 0);
  const totalRemittanceIn = results.reduce((s, r) => s + r.remittanceInFixed, 0);
  const totalSkipped = results.reduce((s, r) => s + r.skippedNoContact, 0);
  const totalCandidates = results.reduce((s, r) => s + r.candidates.length, 0);

  let md = `# Informe Sanejament Fiscal Legacy\n\n`;
  md += `**Data:** ${date}\n`;
  md += `**Mode:** ${DRY_RUN ? 'DRY-RUN (no s\'han aplicat canvis)' : 'APPLY (canvis aplicats)'}\n`;
  md += `**Durada:** ${((Date.now() - startTime.getTime()) / 1000).toFixed(1)}s\n\n`;

  md += `## Resum\n\n`;
  md += `| Mètrica | Total |\n`;
  md += `|---------|-------|\n`;
  md += `| Organitzacions analitzades | ${results.length} |\n`;
  md += `| Transaccions candidates | ${totalCandidates} |\n`;
  md += `| Returns a arreglar | ${totalReturns} |\n`;
  md += `| Remittance IN a arreglar | ${totalRemittanceIn} |\n`;
  md += `| Saltades (contacte no existeix) | ${totalSkipped} |\n\n`;

  md += `## Detall per Organització\n\n`;
  for (const r of results) {
    if (r.candidates.length === 0) continue;

    md += `### ${r.orgId}\n\n`;
    md += `- Returns: ${r.returnsFixed}\n`;
    md += `- Remittance IN: ${r.remittanceInFixed}\n`;
    md += `- Saltades: ${r.skippedNoContact}\n\n`;

    // Mostrar fins a 50 exemples
    const examples = r.candidates.slice(0, 50);
    if (examples.length > 0) {
      md += `**Exemples (${examples.length}/${r.candidates.length}):**\n\n`;
      md += `| Tipus | ID | Data | Amount | emisorId | Contacte? |\n`;
      md += `|-------|----|----- |--------|----------|-----------|\n`;
      for (const c of examples) {
        const exists = c.contactExists ? '✅' : '❌';
        md += `| ${c.type} | ${c.txId.slice(0, 8)}... | ${c.txDate} | ${c.amount.toFixed(2)} | ${c.emisorId.slice(0, 8)}... | ${exists} |\n`;
      }
      md += `\n`;
    }
  }

  return md;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const startTime = new Date();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' SANEJAMENT FISCAL LEGACY: contactId des d\'emisorId');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY-RUN (no s\'aplicaran canvis)' : '⚡ APPLY (s\'aplicaran canvis!)'}`);
  console.log(`Límit: ${LIMIT} transaccions`);
  if (SPECIFIC_ORG) console.log(`Org: ${SPECIFIC_ORG}`);
  console.log('');

  const orgs = await getOrganizations();
  console.log(`📊 ${orgs.length} organització(ns) a analitzar\n`);

  const results: FixResult[] = [];
  let totalProcessed = 0;

  for (const org of orgs) {
    if (totalProcessed >= LIMIT) {
      console.log(`\n⚠️ Límit de ${LIMIT} transaccions assolit, parant...`);
      break;
    }

    console.log(`\n📁 ${org.name} (${org.id})`);

    // Carregar contactes
    const contactsMap = await loadContactsMap(org.id);
    console.log(`   📥 ${contactsMap.size} contactes carregats`);

    // Trobar candidates
    let candidates = await findCandidates(org.id, contactsMap);

    // Aplicar límit global
    const remainingLimit = LIMIT - totalProcessed;
    if (candidates.length > remainingLimit) {
      candidates = candidates.slice(0, remainingLimit);
    }

    const returnsToFix = candidates.filter(c => c.type === 'return' && c.contactExists);
    const remittanceInToFix = candidates.filter(c => c.type === 'remittance_in' && c.contactExists);
    const noContact = candidates.filter(c => !c.contactExists);

    console.log(`   🔍 Trobades: ${candidates.length} candidates`);
    console.log(`      - Returns: ${returnsToFix.length}`);
    console.log(`      - Remittance IN: ${remittanceInToFix.length}`);
    console.log(`      - Sense contacte: ${noContact.length}`);

    // Aplicar si no és dry-run
    if (!DRY_RUN && candidates.filter(c => c.contactExists).length > 0) {
      console.log(`   ⚡ Aplicant canvis...`);
      const { fixed, skipped } = await applyFixes(candidates);
      console.log(`   ✅ ${fixed} arreglades, ${skipped} saltades`);
    }

    results.push({
      orgId: org.id,
      returnsFixed: returnsToFix.length,
      remittanceInFixed: remittanceInToFix.length,
      skippedNoContact: noContact.length,
      candidates
    });

    totalProcessed += candidates.length;
  }

  // Generar informe
  const report = generateReport(results, startTime);

  // Crear directori si no existeix
  const deployDir = path.join(process.cwd(), 'docs', 'deploys');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const reportPath = path.join(deployDir, `legacy-fix-log-${date}.md`);
  fs.writeFileSync(reportPath, report);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' RESUM FINAL');
  console.log('═══════════════════════════════════════════════════════════════');

  const totalReturns = results.reduce((s, r) => s + r.returnsFixed, 0);
  const totalRemittanceIn = results.reduce((s, r) => s + r.remittanceInFixed, 0);
  const totalSkipped = results.reduce((s, r) => s + r.skippedNoContact, 0);

  console.log(`\n📊 Totals:`);
  console.log(`   - Returns a arreglar: ${totalReturns}`);
  console.log(`   - Remittance IN a arreglar: ${totalRemittanceIn}`);
  console.log(`   - Saltades (sense contacte): ${totalSkipped}`);
  console.log(`\n📄 Informe guardat a: ${reportPath}`);

  if (DRY_RUN) {
    console.log(`\n💡 Per aplicar els canvis, executa:`);
    console.log(`   node --import tsx scripts/fix-legacy-fiscal-links.ts --apply${SPECIFIC_ORG ? ` --org=${SPECIFIC_ORG}` : ''}`);
  }
}

main().catch(console.error);
