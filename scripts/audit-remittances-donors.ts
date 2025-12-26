/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT D'AUDITORIA: DONANTS, REMESES I INTEGRITAT REFERENCIAL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Objectiu: Generar un informe exhaustiu de:
 * 1. Donants amb dades incompletes
 * 2. Candidats de match probable (duplicats potencials)
 * 3. Referències orfes (integritat trencada)
 *
 * Execució:
 *   node --import tsx scripts/audit-remittances-donors.ts
 *
 * Outputs:
 *   ./tmp/audit/audit_donors_incomplete.json
 *   ./tmp/audit/audit_donors_incomplete.csv
 *   ./tmp/audit/audit_orphans.json
 *   ./tmp/audit/audit_summary.json
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

const ORG_ID = 'SkQjWvCRDJhSf1OeJAw9'; // Fundació Marianao
const OUTPUT_DIR = './tmp/audit';

// Patrons de noms genèrics (regex)
const GENERIC_NAME_PATTERNS = [
  /^donant$/i,
  /^donante$/i,
  /^anonim/i,
  /^anonymous/i,
  /^unknown/i,
  /^sense nom/i,
  /^sin nombre/i,
  /^n\/a$/i,
  /^-$/,
  /^\.+$/,
  /^desconegut/i,
  /^desconocido/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

interface Donor {
  id: string;
  name: string;
  taxId: string;
  zipCode: string;
  iban?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  donorType?: string;
  membershipType?: string;
  status?: string;
  createdAt?: string;
  type: 'donor';
}

interface Transaction {
  id: string;
  contactId?: string | null;
  parentTransactionId?: string | null;
  isRemittance?: boolean;
  remittanceType?: string;
  remittanceItemCount?: number;
  linkedTransactionId?: string | null;
  linkedTransactionIds?: string[];
  transactionType?: string;
  amount: number;
  date: string;
  description?: string;
}

interface IncompleteDonor {
  donorId: string;
  displayName: string;
  missingFields: string[];
  isGenericName: boolean;
  createdAt: string | null;
  // Referències
  donationCount: number;
  returnCount: number;
  remittanceItemCount: number;
  totalAmount: number;
  // Candidats de match
  matchCandidates: MatchCandidate[];
}

interface MatchCandidate {
  donorId: string;
  displayName: string;
  score: number;
  reasons: string[];
}

interface OrphanRecord {
  type: 'orphan_donor_ref' | 'orphan_parent_tx' | 'orphan_linked_tx' | 'orphan_remittance_item';
  entityId: string;
  missingRefId: string;
  details: Record<string, unknown>;
}

interface AuditSummary {
  timestamp: string;
  organizationId: string;
  totalDonors: number;
  totalContacts: number;
  totalTransactions: number;
  incompleteDonors: number;
  orphanRecords: number;
  donorsWithMatches: number;
  // KPIs explícits
  kpiOrphanContactRefs: number;  // Check A: transaccions amb contactId inexistent (ha de ser 0)
  kpiPotentialDuplicates: number;  // Check B: contactes amb possibles duplicats
}

interface DuplicateGroup {
  matchType: 'nif' | 'iban' | 'email';
  normalizedValue: string;
  contacts: Array<{
    id: string;
    name: string;
    type: string;
    taxId?: string;
    iban?: string;
    email?: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALITZACIÓ FIREBASE
// ═══════════════════════════════════════════════════════════════════════════════

if (getApps().length === 0) {
  // Opcions de credencials (en ordre de prioritat):
  // 1. Variable d'entorn GOOGLE_APPLICATION_CREDENTIALS
  // 2. Fitxer summa-social-firebase-adminsdk.json al directori arrel
  // 3. Application Default Credentials (gcloud auth)

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
    // Intentar Application Default Credentials
    console.log('🔑 Intentant Application Default Credentials...');
    try {
      initializeApp();
    } catch {
      console.error('❌ No es troben credencials de Firebase.');
      console.error('   Opcions:');
      console.error('   1. Descarrega summa-social-firebase-adminsdk.json des de Firebase Console');
      console.error('   2. Configura GOOGLE_APPLICATION_CREDENTIALS');
      console.error('   3. Executa: gcloud auth application-default login');
      process.exit(1);
    }
  }
}

const db = getFirestore();

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalitza un string per comparació (sense accents, minúscules, sense espais extra)
 */
function normalizeString(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // eliminar accents
    .replace(/[^a-z0-9]/g, '')       // només alfanumèric
    .trim();
}

/**
 * Normalitza IBAN (majúscules, sense espais)
 */
function normalizeIBAN(iban: string | undefined | null): string {
  if (!iban) return '';
  return iban.toUpperCase().replace(/\s/g, '');
}

/**
 * Normalitza NIF/CIF (majúscules, sense espais ni guions)
 */
function normalizeTaxId(taxId: string | undefined | null): string {
  if (!taxId) return '';
  return taxId.toUpperCase().replace(/[\s-]/g, '');
}

/**
 * Comprova si un nom és genèric/placeholder
 */
function isGenericName(name: string): boolean {
  if (!name || name.trim().length < 2) return true;
  return GENERIC_NAME_PATTERNS.some(pattern => pattern.test(name.trim()));
}

/**
 * Determina quins camps falten a un donant
 */
function getMissingFields(donor: Donor): string[] {
  const missing: string[] = [];

  if (!donor.taxId || donor.taxId.trim().length < 8) {
    missing.push('taxId');
  }
  if (!donor.zipCode || donor.zipCode.trim().length < 4) {
    missing.push('zipCode');
  }
  if (!donor.iban || donor.iban.trim().length < 15) {
    missing.push('iban');
  }
  if (!donor.address || donor.address.trim().length < 5) {
    missing.push('address');
  }
  if (!donor.email && !donor.phone) {
    missing.push('contactInfo');
  }

  return missing;
}

/**
 * Determina si un donant es considera "incomplet" per l'auditoria
 */
function isDonorIncomplete(donor: Donor): boolean {
  const missing = getMissingFields(donor);

  // Incomplet si:
  // 1. Nom genèric
  // 2. Falta NIF I falta IBAN
  // 3. Falten més de 2 camps crítics

  if (isGenericName(donor.name)) return true;
  if (!donor.taxId && !donor.iban) return true;
  if (missing.includes('taxId') && missing.includes('iban')) return true;

  return false;
}

/**
 * Calcula score de similitud entre dos donants
 */
function calculateMatchScore(donor1: Donor, donor2: Donor): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // +5 si coincideix NIF normalitzat (match fort)
  const nif1 = normalizeTaxId(donor1.taxId);
  const nif2 = normalizeTaxId(donor2.taxId);
  if (nif1 && nif2 && nif1 === nif2) {
    score += 5;
    reasons.push(`NIF coincident: ${donor1.taxId}`);
  }

  // +5 si coincideix IBAN normalitzat (match fort)
  const iban1 = normalizeIBAN(donor1.iban);
  const iban2 = normalizeIBAN(donor2.iban);
  if (iban1 && iban2 && iban1 === iban2) {
    score += 5;
    reasons.push(`IBAN coincident: ${donor1.iban?.slice(0, 8)}...`);
  }

  // +2 si coincideix nom normalitzat (match moderat)
  const name1 = normalizeString(donor1.name);
  const name2 = normalizeString(donor2.name);
  if (name1 && name2 && name1.length > 5 && name1 === name2) {
    score += 2;
    reasons.push(`Nom coincident: ${donor1.name}`);
  }

  // +1 si comparteix email
  if (donor1.email && donor2.email &&
      donor1.email.toLowerCase().trim() === donor2.email.toLowerCase().trim()) {
    score += 1;
    reasons.push(`Email coincident: ${donor1.email}`);
  }

  // +1 si comparteix telèfon (normalitzat)
  const phone1 = donor1.phone?.replace(/\D/g, '');
  const phone2 = donor2.phone?.replace(/\D/g, '');
  if (phone1 && phone2 && phone1.length >= 9 && phone1 === phone2) {
    score += 1;
    reasons.push(`Telèfon coincident: ${donor1.phone}`);
  }

  return { score, reasons };
}

/**
 * Crea directori si no existeix
 */
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Converteix array d'objectes a CSV
 */
function toCSV(data: Record<string, unknown>[], headers?: string[]): string {
  if (data.length === 0) return '';

  const keys = headers || Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header
  csvRows.push(keys.join(','));

  // Rows
  for (const row of data) {
    const values = keys.map(key => {
      const val = row[key];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') {
        // Escapar cometes i envolta amb cometes si conté comes
        const escaped = val.replace(/"/g, '""');
        return val.includes(',') || val.includes('"') ? `"${escaped}"` : escaped;
      }
      if (Array.isArray(val)) return `"${val.join('; ')}"`;
      return String(val);
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONS PRINCIPALS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Carrega TOTS els contactes (donors, suppliers, employees).
 * IMPORTANT: No filtrem per type perquè transaccions poden referenciar qualsevol tipus.
 */
async function loadAllContacts(): Promise<Donor[]> {
  console.log('📥 Carregant TOTS els contactes (donors, suppliers, employees)...');

  const snapshot = await db
    .collection('organizations')
    .doc(ORG_ID)
    .collection('contacts')
    .get();

  // IMPORTANT: spread ABANS de id per assegurar que doc.id sempre guanya
  const contacts = snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,  // Sempre és doc.id, mai sobreescrit
  } as Donor));

  console.log(`   ✓ ${contacts.length} contactes carregats`);
  return contacts;
}

/**
 * Carrega només donants per l'anàlisi d'incomplets/duplicats
 */
async function loadDonorsOnly(): Promise<Donor[]> {
  console.log('📥 Carregant donants (per anàlisi d\'incomplets)...');

  const snapshot = await db
    .collection('organizations')
    .doc(ORG_ID)
    .collection('contacts')
    .where('type', '==', 'donor')
    .get();

  // IMPORTANT: spread ABANS de id per assegurar que doc.id sempre guanya
  const donors = snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,  // Sempre és doc.id, mai sobreescrit
  } as Donor));

  console.log(`   ✓ ${donors.length} donants carregats`);
  return donors;
}

async function loadAllTransactions(): Promise<Transaction[]> {
  console.log('📥 Carregant transaccions...');

  const snapshot = await db
    .collection('organizations')
    .doc(ORG_ID)
    .collection('transactions')
    .get();

  // IMPORTANT: spread ABANS de id per assegurar que doc.id sempre guanya
  const transactions = snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,  // Sempre és doc.id, mai sobreescrit
  } as Transaction));

  console.log(`   ✓ ${transactions.length} transaccions carregades`);
  return transactions;
}

/**
 * AUDITORIA 1: Donants incomplets
 */
function auditIncompleteDonors(
  donors: Donor[],
  transactions: Transaction[]
): IncompleteDonor[] {
  console.log('\n🔍 Analitzant donants incomplets...');

  // Mapa de donorId -> transaccions relacionades
  const txByDonor = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (tx.contactId) {
      const existing = txByDonor.get(tx.contactId) || [];
      existing.push(tx);
      txByDonor.set(tx.contactId, existing);
    }
  }

  // Mapa de transaccions per ID (per comptar items de remesa)
  const txById = new Map(transactions.map(tx => [tx.id, tx]));

  const incompleteDonors: IncompleteDonor[] = [];

  for (const donor of donors) {
    if (!isDonorIncomplete(donor)) continue;

    const donorTxs = txByDonor.get(donor.id) || [];

    // Comptar tipus de transaccions
    let donationCount = 0;
    let returnCount = 0;
    let totalAmount = 0;

    for (const tx of donorTxs) {
      if (tx.transactionType === 'return' || tx.transactionType === 'return_fee') {
        returnCount++;
      } else if (tx.amount > 0) {
        donationCount++;
        totalAmount += tx.amount;
      }
    }

    // Comptar aparicions en items de remesa (transaccions filles)
    const remittanceItemCount = transactions.filter(
      tx => tx.parentTransactionId && tx.contactId === donor.id
    ).length;

    // Buscar candidats de match
    const matchCandidates: MatchCandidate[] = [];
    for (const otherDonor of donors) {
      if (otherDonor.id === donor.id) continue;

      const { score, reasons } = calculateMatchScore(donor, otherDonor);
      if (score >= 2) { // Mínim 2 punts per considerar-ho
        matchCandidates.push({
          donorId: otherDonor.id,
          displayName: otherDonor.name,
          score,
          reasons
        });
      }
    }

    // Ordenar per score descendent i agafar top 5
    matchCandidates.sort((a, b) => b.score - a.score);
    const topMatches = matchCandidates.slice(0, 5);

    incompleteDonors.push({
      donorId: donor.id,
      displayName: donor.name,
      missingFields: getMissingFields(donor),
      isGenericName: isGenericName(donor.name),
      createdAt: donor.createdAt || null,
      donationCount,
      returnCount,
      remittanceItemCount,
      totalAmount,
      matchCandidates: topMatches
    });
  }

  console.log(`   ✓ ${incompleteDonors.length} donants incomplets identificats`);
  return incompleteDonors;
}

/**
 * AUDITORIA 2: Referències orfes
 * IMPORTANT: Usa TOTS els contactes (no només donors) per detectar orfes reals
 */
function auditOrphanReferences(
  allContacts: Donor[],  // Tots els contactes (donors, suppliers, employees)
  transactions: Transaction[]
): OrphanRecord[] {
  console.log('\n🔍 Cercant referències orfes...');

  // Set de TOTS els contactIds existents (donors + suppliers + employees)
  const allContactIds = new Set(allContacts.map(c => c.id));
  const txIds = new Set(transactions.map(t => t.id));

  const orphans: OrphanRecord[] = [];

  for (const tx of transactions) {
    // 1. Transacció que referencia contactId realment inexistent
    // (comprova contra TOTS els contactes, no només donors)
    if (tx.contactId && !allContactIds.has(tx.contactId)) {
      orphans.push({
        type: 'orphan_donor_ref',
        entityId: tx.id,
        missingRefId: tx.contactId,
        details: {
          transactionDate: tx.date,
          amount: tx.amount,
          description: tx.description
        }
      });
    }

    // 2. Transacció filla amb parentTransactionId inexistent
    if (tx.parentTransactionId && !txIds.has(tx.parentTransactionId)) {
      orphans.push({
        type: 'orphan_parent_tx',
        entityId: tx.id,
        missingRefId: tx.parentTransactionId,
        details: {
          transactionDate: tx.date,
          amount: tx.amount,
          contactId: tx.contactId
        }
      });
    }

    // 3. Devolució amb linkedTransactionId inexistent
    if (tx.linkedTransactionId && !txIds.has(tx.linkedTransactionId)) {
      orphans.push({
        type: 'orphan_linked_tx',
        entityId: tx.id,
        missingRefId: tx.linkedTransactionId,
        details: {
          transactionType: tx.transactionType,
          transactionDate: tx.date,
          amount: tx.amount
        }
      });
    }

    // 4. Devolucions amb linkedTransactionIds inexistents
    if (tx.linkedTransactionIds && tx.linkedTransactionIds.length > 0) {
      for (const linkedId of tx.linkedTransactionIds) {
        if (!txIds.has(linkedId)) {
          orphans.push({
            type: 'orphan_linked_tx',
            entityId: tx.id,
            missingRefId: linkedId,
            details: {
              transactionType: tx.transactionType,
              transactionDate: tx.date,
              amount: tx.amount,
              note: 'Part of linkedTransactionIds array'
            }
          });
        }
      }
    }
  }

  // 5. Remeses amb comptadors inconsistents
  const remittances = transactions.filter(tx => tx.isRemittance);
  for (const remittance of remittances) {
    const children = transactions.filter(tx => tx.parentTransactionId === remittance.id);
    const expectedCount = remittance.remittanceItemCount || 0;

    if (expectedCount > 0 && children.length !== expectedCount) {
      // No és orfe però és inconsistent - ho afegim com a warning
      orphans.push({
        type: 'orphan_remittance_item',
        entityId: remittance.id,
        missingRefId: `expected_${expectedCount}_got_${children.length}`,
        details: {
          expectedCount,
          actualCount: children.length,
          remittanceDate: remittance.date,
          amount: remittance.amount
        }
      });
    }
  }

  console.log(`   ✓ ${orphans.length} referències orfes detectades`);
  return orphans;
}

/**
 * CHECK B: Detecta duplicats potencials per NIF, IBAN o email
 * Agrupa contactes que comparteixen el mateix identificador fort
 */
function detectPotentialDuplicates(allContacts: Donor[]): DuplicateGroup[] {
  console.log('\n🔍 Cercant duplicats potencials (NIF/IBAN/email)...');

  const duplicates: DuplicateGroup[] = [];

  // Mapa per NIF normalitzat
  const byNif = new Map<string, Donor[]>();
  // Mapa per IBAN normalitzat
  const byIban = new Map<string, Donor[]>();
  // Mapa per email normalitzat
  const byEmail = new Map<string, Donor[]>();

  for (const contact of allContacts) {
    // Agrupar per NIF
    const nif = normalizeTaxId(contact.taxId);
    if (nif && nif.length >= 8) {
      const existing = byNif.get(nif) || [];
      existing.push(contact);
      byNif.set(nif, existing);
    }

    // Agrupar per IBAN
    const iban = normalizeIBAN(contact.iban);
    if (iban && iban.length >= 20) {
      const existing = byIban.get(iban) || [];
      existing.push(contact);
      byIban.set(iban, existing);
    }

    // Agrupar per email
    const email = contact.email?.toLowerCase().trim();
    if (email && email.includes('@')) {
      const existing = byEmail.get(email) || [];
      existing.push(contact);
      byEmail.set(email, existing);
    }
  }

  // Convertir grups amb més d'1 contacte
  for (const [nif, contacts] of byNif) {
    if (contacts.length > 1) {
      duplicates.push({
        matchType: 'nif',
        normalizedValue: nif,
        contacts: contacts.map(c => ({
          id: c.id,
          name: c.name,
          type: (c as any).type || 'unknown',
          taxId: c.taxId,
          iban: c.iban,
          email: c.email,
        }))
      });
    }
  }

  for (const [iban, contacts] of byIban) {
    if (contacts.length > 1) {
      duplicates.push({
        matchType: 'iban',
        normalizedValue: iban.slice(0, 12) + '...',  // Truncar per privacitat
        contacts: contacts.map(c => ({
          id: c.id,
          name: c.name,
          type: (c as any).type || 'unknown',
          taxId: c.taxId,
          iban: c.iban,
          email: c.email,
        }))
      });
    }
  }

  for (const [email, contacts] of byEmail) {
    if (contacts.length > 1) {
      duplicates.push({
        matchType: 'email',
        normalizedValue: email,
        contacts: contacts.map(c => ({
          id: c.id,
          name: c.name,
          type: (c as any).type || 'unknown',
          taxId: c.taxId,
          iban: c.iban,
          email: c.email,
        }))
      });
    }
  }

  console.log(`   ✓ ${duplicates.length} grups de duplicats potencials detectats`);
  return duplicates;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERACIÓ D'OUTPUTS
// ═══════════════════════════════════════════════════════════════════════════════

function generateOutputs(
  incompleteDonors: IncompleteDonor[],
  orphans: OrphanRecord[],
  duplicates: DuplicateGroup[],
  totalDonors: number,
  totalContacts: number,
  totalTransactions: number
) {
  console.log('\n📝 Generant outputs...');

  ensureDir(OUTPUT_DIR);

  // 1. JSON complet de donants incomplets
  const incompletePath = path.join(OUTPUT_DIR, 'audit_donors_incomplete.json');
  fs.writeFileSync(incompletePath, JSON.stringify(incompleteDonors, null, 2));
  console.log(`   ✓ ${incompletePath}`);

  // 2. CSV de donants incomplets (format pla per revisió ràpida)
  const csvData = incompleteDonors.map(d => ({
    donorId: d.donorId,
    displayName: d.displayName,
    missingFields: d.missingFields.join('; '),
    isGenericName: d.isGenericName ? 'SÍ' : 'NO',
    donationCount: d.donationCount,
    returnCount: d.returnCount,
    remittanceItemCount: d.remittanceItemCount,
    totalAmount: d.totalAmount.toFixed(2),
    matchCount: d.matchCandidates.length,
    topMatchId: d.matchCandidates[0]?.donorId || '',
    topMatchName: d.matchCandidates[0]?.displayName || '',
    topMatchScore: d.matchCandidates[0]?.score || 0,
    topMatchReasons: d.matchCandidates[0]?.reasons.join(' | ') || ''
  }));

  const csvPath = path.join(OUTPUT_DIR, 'audit_donors_incomplete.csv');
  fs.writeFileSync(csvPath, toCSV(csvData));
  console.log(`   ✓ ${csvPath}`);

  // 3. JSON d'orfes
  const orphansPath = path.join(OUTPUT_DIR, 'audit_orphans.json');
  fs.writeFileSync(orphansPath, JSON.stringify(orphans, null, 2));
  console.log(`   ✓ ${orphansPath}`);

  // 4. JSON de duplicats potencials (Check B)
  const duplicatesPath = path.join(OUTPUT_DIR, 'audit_duplicates.json');
  fs.writeFileSync(duplicatesPath, JSON.stringify(duplicates, null, 2));
  console.log(`   ✓ ${duplicatesPath}`);

  // 5. KPIs explícits
  // Check A: només orphan_donor_ref (transaccions amb contactId inexistent)
  const orphanContactRefs = orphans.filter(o => o.type === 'orphan_donor_ref').length;

  // Check B: contactes únics en grups de duplicats
  const contactsInDuplicates = new Set<string>();
  for (const group of duplicates) {
    for (const contact of group.contacts) {
      contactsInDuplicates.add(contact.id);
    }
  }

  // 6. Resum amb KPIs
  const summary: AuditSummary = {
    timestamp: new Date().toISOString(),
    organizationId: ORG_ID,
    totalDonors,
    totalContacts,
    totalTransactions,
    incompleteDonors: incompleteDonors.length,
    orphanRecords: orphans.length,
    donorsWithMatches: incompleteDonors.filter(d => d.matchCandidates.length > 0).length,
    // KPIs
    kpiOrphanContactRefs: orphanContactRefs,  // Ha de ser 0
    kpiPotentialDuplicates: contactsInDuplicates.size,  // Llista d'acció
  };

  const summaryPath = path.join(OUTPUT_DIR, 'audit_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`   ✓ ${summaryPath}`);

  return summary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  AUDITORIA DE DONANTS, REMESES I INTEGRITAT REFERENCIAL');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Organització: ${ORG_ID}`);
  console.log(`  Data: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Carregar dades
  // - allContacts: TOTS (donors + suppliers + employees) per detectar orfes reals
  // - donors: només type='donor' per anàlisi d'incomplets
  const allContacts = await loadAllContacts();
  const donors = await loadDonorsOnly();
  const transactions = await loadAllTransactions();

  // Executar auditories
  // - incompleteDonors: només analitza donors
  // - orphans: usa TOTS els contactes per evitar falsos positius
  // - duplicates: detecta contactes amb NIF/IBAN/email duplicats
  const incompleteDonors = auditIncompleteDonors(donors, transactions);
  const orphans = auditOrphanReferences(allContacts, transactions);
  const duplicates = detectPotentialDuplicates(allContacts);

  // Generar outputs
  const summary = generateOutputs(
    incompleteDonors,
    orphans,
    duplicates,
    donors.length,
    allContacts.length,
    transactions.length
  );

  // Mostrar resum per pantalla
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  RESUM DE L\'AUDITORIA');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Total contactes:            ${summary.totalContacts}`);
  console.log(`  Total donants:              ${summary.totalDonors}`);
  console.log(`  Total transaccions:         ${summary.totalTransactions}`);
  console.log(`  Donants incomplets:         ${summary.incompleteDonors}`);
  console.log(`  Donants amb match probable: ${summary.donorsWithMatches}`);
  console.log(`  Referències orfes:          ${summary.orphanRecords}`);
  console.log('═══════════════════════════════════════════════════════════════════');

  // KPIs explícits
  console.log('\n  📊 KPIs DE QUALITAT');
  console.log('───────────────────────────────────────────────────────────────────');
  const checkA = summary.kpiOrphanContactRefs === 0 ? '✅' : '❌';
  console.log(`  ${checkA} Check A - contactId orfes:    ${summary.kpiOrphanContactRefs} (ha de ser 0)`);
  console.log(`  📋 Check B - duplicats potencials: ${summary.kpiPotentialDuplicates} contactes en ${duplicates.length} grups`);
  console.log('───────────────────────────────────────────────────────────────────');

  // Detall de tipus d'orfes
  if (orphans.length > 0) {
    const orphansByType = orphans.reduce((acc, o) => {
      acc[o.type] = (acc[o.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n  Detall d\'orfes per tipus:');
    for (const [type, count] of Object.entries(orphansByType)) {
      console.log(`    - ${type}: ${count}`);
    }
  }

  // Top 5 donants incomplets amb més referències
  if (incompleteDonors.length > 0) {
    console.log('\n  Top 5 donants incomplets amb més referències:');
    const sorted = [...incompleteDonors].sort(
      (a, b) => (b.donationCount + b.remittanceItemCount) - (a.donationCount + a.remittanceItemCount)
    );
    for (const d of sorted.slice(0, 5)) {
      const refs = d.donationCount + d.remittanceItemCount;
      const matchInfo = d.matchCandidates.length > 0
        ? ` → match probable: ${d.matchCandidates[0].displayName} (score: ${d.matchCandidates[0].score})`
        : '';
      console.log(`    - ${d.displayName} (${refs} refs, ${d.totalAmount.toFixed(2)}€)${matchInfo}`);
    }
  }

  // Detall de duplicats per tipus
  if (duplicates.length > 0) {
    const byType = duplicates.reduce((acc, d) => {
      acc[d.matchType] = (acc[d.matchType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n  Duplicats potencials per tipus:');
    for (const [type, count] of Object.entries(byType)) {
      console.log(`    - ${type.toUpperCase()}: ${count} grups`);
    }

    // Mostrar casos amb múltiples rols (tipus diferents)
    const multiRoleGroups = duplicates.filter(group => {
      const types = new Set(group.contacts.map(c => c.type));
      return types.size > 1;
    });

    if (multiRoleGroups.length > 0) {
      console.log('\n  ⚠️  Duplicats amb múltiples rols (requereixen atenció):');
      for (const group of multiRoleGroups.slice(0, 5)) {
        const types = [...new Set(group.contacts.map(c => c.type))].join('+');
        const names = group.contacts.map(c => c.name).join(' / ');
        console.log(`    - [${group.matchType}] ${names} (${types})`);
      }
    }
  }

  console.log('\n✅ Auditoria completada. Revisa els fitxers a:', OUTPUT_DIR);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error durant l\'auditoria:', error);
    process.exit(1);
  });
