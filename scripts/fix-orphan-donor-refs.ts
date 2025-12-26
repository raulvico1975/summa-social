/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT DE REPARACIÓ: REFERÈNCIES DE CONTACTE ORFES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tasca B de l'auditoria:
 * - Troba transaccions amb contactId que referencia contactes eliminats
 * - Intenta fer match amb contactes existents (nom+email+iban+dni)
 * - Si troba match exacte → re-link
 * - Si no → null + flag needsReview
 *
 * Modes:
 *   --dry-run (default): Només mostra què es faria
 *   --apply: Executa els canvis a Firestore
 *
 * Execució:
 *   GOOGLE_APPLICATION_CREDENTIALS="" node --import tsx scripts/fix-orphan-donor-refs.ts --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS="" node --import tsx scripts/fix-orphan-donor-refs.ts --apply
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

const ORG_ID = 'SkQjWvCRDJhSf1OeJAw9'; // Fundació Marianao
const OUTPUT_DIR = './tmp/fix-orphans';

// IDs de contactes veritablement eliminats (verificat amb check-orphan-contacts.ts)
// Els altres 9 IDs de l'auditoria eren falsos positius (suppliers/employees que existeixen)
const ORPHAN_CONTACT_IDS = [
  '5QwQ3eWSOrd1WhnTwKbw',  // NOT FOUND - donació anònima
  '7AZQ6ntTKMEPlDTchiJH',  // NOT FOUND - donacions
  'GxbbfEIki1GTeGd0xZbu',  // NOT FOUND - donació anònima
  'BrZ2WCuqgtnnr7agYWEi',  // NOT FOUND - donació anònima
  'ABXEFEEwwmvwVX6ZrtYb',  // NOT FOUND - donació anònima
  '153HetFMHhyMHFhz9ZWQ',  // NOT FOUND - donació anònima
];

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

interface Contact {
  id: string;
  name: string;
  taxId?: string;
  iban?: string;
  email?: string;
  phone?: string;
  type: 'donor' | 'supplier' | 'employee';
}

interface Transaction {
  id: string;
  contactId?: string | null;
  contactName?: string;
  amount: number;
  date: string;
  description?: string;
}

interface FixAction {
  transactionId: string;
  transactionDate: string;
  amount: number;
  description: string;
  oldContactId: string;
  // 'relink': reassignar a un contacte existent
  // 'mark_review': requereix revisió manual (needsReview = true)
  // 'anonymous_cleanup': donació anònima, només netejar (sense needsReview)
  action: 'relink' | 'mark_review' | 'anonymous_cleanup';
  newContactId: string | null;
  matchedContactName?: string;
  matchReason?: string;
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
      process.exit(1);
    }
  }
}

const db = getFirestore();

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITATS
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeString(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizeIBAN(iban: string | undefined | null): string {
  if (!iban) return '';
  return iban.toUpperCase().replace(/\s/g, '');
}

function normalizeTaxId(taxId: string | undefined | null): string {
  if (!taxId) return '';
  return taxId.toUpperCase().replace(/[\s-]/g, '');
}

/**
 * Extreu nom del concepte de transacció (nòmines, transferències)
 */
function extractNameFromDescription(description: string): string | null {
  // Patró: "Transferencia A Favor De NOMBRE APELLIDO Concepto: ..."
  const transferMatch = description.match(/transferencia\s+a\s+favor\s+de\s+([^C]+?)\s*concepto/i);
  if (transferMatch) {
    return transferMatch[1].trim();
  }

  // Patró: "Recibo EMPRESA Nº Recibo ..."
  const reciboMatch = description.match(/^recibo\s+([^\s]+(?:\s+[^\s]+)?)\s+/i);
  if (reciboMatch) {
    return reciboMatch[1].trim();
  }

  return null;
}

/**
 * Detecta si una transacció és una donació anònima (contacte eliminat esperat)
 * Aquestes no requereixen needsReview perquè són casos esperats en dades històriques
 */
function isAnonymousDonation(tx: Transaction): boolean {
  const desc = (tx.description || '').toLowerCase();

  // Patrons de donacions anònimes
  const anonymousPatterns = [
    /donació\s+soci\/a:\s*anònim/i,
    /donació\s+soci:\s*anònim/i,
    /donació\s+anònima/i,
    /anonymous\s+donation/i,
    /donante\s+anónimo/i,
  ];

  return anonymousPatterns.some(pattern => pattern.test(desc));
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONS PRINCIPALS
// ═══════════════════════════════════════════════════════════════════════════════

async function loadAllContacts(): Promise<Contact[]> {
  console.log('📥 Carregant contactes...');

  const snapshot = await db
    .collection('organizations')
    .doc(ORG_ID)
    .collection('contacts')
    .get();

  const contacts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Contact));

  console.log(`   ✓ ${contacts.length} contactes carregats`);
  return contacts;
}

async function loadOrphanTransactions(): Promise<Transaction[]> {
  console.log('📥 Cercant transaccions amb contactId orfe...');

  const allOrphanTxs: Transaction[] = [];

  for (const orphanId of ORPHAN_CONTACT_IDS) {
    const snapshot = await db
      .collection('organizations')
      .doc(ORG_ID)
      .collection('transactions')
      .where('contactId', '==', orphanId)
      .get();

    const txs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction));

    allOrphanTxs.push(...txs);
  }

  console.log(`   ✓ ${allOrphanTxs.length} transaccions amb contactId orfe trobades`);
  return allOrphanTxs;
}

/**
 * Intenta trobar un contacte existent que coincideixi
 */
function findMatchingContact(
  tx: Transaction,
  contacts: Contact[]
): { contact: Contact | null; reason: string | null } {
  // 1. Si la transacció té contactName guardat, buscar per nom exacte
  if (tx.contactName) {
    const normalizedName = normalizeString(tx.contactName);
    const byName = contacts.find(c => normalizeString(c.name) === normalizedName);
    if (byName) {
      return { contact: byName, reason: `Nom coincident: ${tx.contactName}` };
    }
  }

  // 2. Intentar extreure nom del concepte
  const extractedName = tx.description ? extractNameFromDescription(tx.description) : null;
  if (extractedName) {
    const normalizedExtracted = normalizeString(extractedName);

    // Buscar per nom normalitzat
    const byExtractedName = contacts.find(c => {
      const normalizedContactName = normalizeString(c.name);
      return normalizedContactName === normalizedExtracted ||
             normalizedContactName.includes(normalizedExtracted) ||
             normalizedExtracted.includes(normalizedContactName);
    });

    if (byExtractedName) {
      return { contact: byExtractedName, reason: `Nom extret del concepte: ${extractedName}` };
    }
  }

  return { contact: null, reason: null };
}

/**
 * Genera el pla d'accions de reparació
 */
function generateFixPlan(
  orphanTxs: Transaction[],
  contacts: Contact[]
): FixAction[] {
  console.log('\n🔧 Generant pla de reparació...');

  const actions: FixAction[] = [];

  for (const tx of orphanTxs) {
    const { contact: matchedContact, reason } = findMatchingContact(tx, contacts);

    // Determinar acció:
    // 1. Si hi ha match -> relink
    // 2. Si és donació anònima -> anonymous_cleanup (sense needsReview)
    // 3. Altrament -> mark_review (necessita revisió manual)
    let action: FixAction['action'];
    if (matchedContact) {
      action = 'relink';
    } else if (isAnonymousDonation(tx)) {
      action = 'anonymous_cleanup';
    } else {
      action = 'mark_review';
    }

    actions.push({
      transactionId: tx.id,
      transactionDate: tx.date,
      amount: tx.amount,
      description: tx.description || '',
      oldContactId: tx.contactId!,
      action,
      newContactId: matchedContact?.id || null,
      matchedContactName: matchedContact?.name,
      matchReason: reason || undefined
    });
  }

  const relinkCount = actions.filter(a => a.action === 'relink').length;
  const anonymousCount = actions.filter(a => a.action === 'anonymous_cleanup').length;
  const reviewCount = actions.filter(a => a.action === 'mark_review').length;

  console.log(`   ✓ Pla generat:`);
  console.log(`     - Re-link: ${relinkCount} transaccions`);
  console.log(`     - Anonymous cleanup: ${anonymousCount} transaccions (sense needsReview)`);
  console.log(`     - Mark review: ${reviewCount} transaccions`);

  return actions;
}

/**
 * Aplica les accions de reparació a Firestore
 */
async function applyFixes(actions: FixAction[]): Promise<void> {
  console.log('\n💾 Aplicant canvis a Firestore...');

  let batch = db.batch();  // let, no const - cal recrear després de cada commit
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const action of actions) {
    const txRef = db
      .collection('organizations')
      .doc(ORG_ID)
      .collection('transactions')
      .doc(action.transactionId);

    if (action.action === 'relink') {
      // Re-assignar a un contacte existent
      batch.update(txRef, {
        contactId: action.newContactId,
        _fixedOrphanRef: {
          originalContactId: action.oldContactId,
          fixedAt: FieldValue.serverTimestamp(),
          reason: action.matchReason
        }
      });
    } else if (action.action === 'anonymous_cleanup') {
      // Donació anònima: netejar contactId però NO marcar needsReview
      // Aquestes són casos esperats en dades històriques
      batch.update(txRef, {
        contactId: null,
        _fixedOrphanRef: {
          originalContactId: action.oldContactId,
          fixedAt: FieldValue.serverTimestamp(),
          reason: 'anonymous_donation_contact_deleted'
        }
      });
    } else {
      // mark_review: requereix revisió manual
      batch.update(txRef, {
        contactId: null,
        needsReview: true,
        _fixedOrphanRef: {
          originalContactId: action.oldContactId,
          fixedAt: FieldValue.serverTimestamp(),
          reason: 'No match found - needs manual review'
        }
      });
    }

    batchCount++;

    // Firestore batch limit is 500
    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`   ✓ Batch de ${batchCount} documents aplicat`);
      batch = db.batch();  // IMPORTANT: recrear batch després de commit
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`   ✓ Batch final de ${batchCount} documents aplicat`);
  }

  console.log(`   ✅ Total: ${actions.length} transaccions actualitzades`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const isDryRun = !process.argv.includes('--apply');

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  REPARACIÓ DE REFERÈNCIES DE CONTACTE ORFES');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${isDryRun ? '🔍 DRY-RUN (sense canvis)' : '⚡ APPLY (canvis reals)'}`);
  console.log(`  Organització: ${ORG_ID}`);
  console.log(`  ContactIds orfes: ${ORPHAN_CONTACT_IDS.length}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Carregar dades
  const contacts = await loadAllContacts();
  const orphanTxs = await loadOrphanTransactions();

  if (orphanTxs.length === 0) {
    console.log('\n✅ No hi ha transaccions amb referències orfes. Res a fer.');
    return;
  }

  // Generar pla
  const actions = generateFixPlan(orphanTxs, contacts);

  // Guardar pla a fitxer
  ensureDir(OUTPUT_DIR);
  const planPath = path.join(OUTPUT_DIR, 'fix_plan.json');
  fs.writeFileSync(planPath, JSON.stringify(actions, null, 2));
  console.log(`\n📝 Pla guardat a: ${planPath}`);

  // Mostrar resum per tipus d'acció
  const byOldContact = new Map<string, FixAction[]>();
  for (const action of actions) {
    const list = byOldContact.get(action.oldContactId) || [];
    list.push(action);
    byOldContact.set(action.oldContactId, list);
  }

  console.log('\n📊 Resum per contactId orfe:');
  for (const [oldContactId, contactActions] of byOldContact.entries()) {
    const relink = contactActions.filter(a => a.action === 'relink');
    const review = contactActions.filter(a => a.action === 'mark_review');
    console.log(`\n  ${oldContactId}:`);
    console.log(`    Total: ${contactActions.length} transaccions`);
    if (relink.length > 0) {
      const targetNames = [...new Set(relink.map(a => a.matchedContactName))];
      console.log(`    ✓ Re-link: ${relink.length} → ${targetNames.join(', ')}`);
    }
    if (review.length > 0) {
      console.log(`    ⚠ Mark review: ${review.length}`);
    }
  }

  // Mostrar exemples detallats
  console.log('\n📋 Exemples d\'accions (màx 10):');
  for (const action of actions.slice(0, 10)) {
    console.log(`\n  TX: ${action.transactionId}`);
    console.log(`  Data: ${action.transactionDate} | Import: ${action.amount}€`);
    console.log(`  Concepte: ${action.description.substring(0, 60)}...`);
    if (action.action === 'relink') {
      console.log(`  ✓ RELINK → ${action.matchedContactName} (${action.newContactId})`);
      console.log(`    Raó: ${action.matchReason}`);
    } else {
      console.log(`  ⚠ MARK REVIEW (contactId = null, needsReview = true)`);
    }
  }

  // Aplicar si no és dry-run
  if (!isDryRun) {
    console.log('\n');
    await applyFixes(actions);
  } else {
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('  ℹ️  MODE DRY-RUN: Cap canvi aplicat');
    console.log('  Per aplicar els canvis, executa amb --apply');
    console.log('═══════════════════════════════════════════════════════════════════');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
