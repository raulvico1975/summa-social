/**
 * Generadors de dades demo
 *
 * Cada funció genera un array d'objectes llestos per escriure a Firestore.
 * Tots els IDs tenen prefix 'demo_' per facilitar identificació i purga.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { DEMO_ID_PREFIX, DEMO_DATA_MARKER } from '@/lib/demo/isDemoOrg';
import {
  FIRST_NAMES,
  LAST_NAMES,
  COMPANY_PREFIXES,
  COMPANY_SUFFIXES,
  COMPANY_TYPES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  EXPENSE_DESCRIPTIONS,
  INCOME_DESCRIPTIONS,
  PROJECT_NAMES,
  BUDGET_LINE_TYPES,
  STREET_NAMES,
  CITIES,
  createSeededRandom,
  pickRandom,
  generateNIF,
  generateCIF,
  generateIBAN,
  generatePhone,
  generateEmail,
} from './demo-data';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DemoContact {
  id: string;
  name: string;
  type: 'donor' | 'supplier' | 'employee'; // Tipus per filtrar a la UI
  roles: { donor?: boolean; supplier?: boolean; employee?: boolean };
  taxId: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  iban?: string;
  // Camps específics per donants
  donorType?: 'individual' | 'company';
  membershipType?: 'one-time' | 'recurring';
  monthlyAmount?: number;
  memberSince?: string;
  status?: 'active' | 'inactive';
  // Camps específics per treballadors
  startDate?: string;
  createdAt: string;
  updatedAt: string;
  [DEMO_DATA_MARKER]: true;
}

interface DemoCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  createdAt: Timestamp;
  [DEMO_DATA_MARKER]: true;
}

interface DemoTransaction {
  id: string;
  date: string;
  description: string;
  amount: number; // En EUR (no cents)
  category?: string; // Nom o ID categoria
  contactId?: string;
  contactType?: 'donor' | 'supplier' | 'employee';
  note?: string;
  document?: string; // URL del document
  source?: string;
  transactionType?: string;
  createdAt: string;
  [DEMO_DATA_MARKER]: true;
}

interface DemoProject {
  id: string;
  name: string;
  code?: string;
  status: 'active' | 'closed';
  startDate?: string;
  endDate?: string;
  budgetEUR?: number; // Budget en EUR
  allowedDeviationPct?: number;
  orgId: string;
  createdBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  [DEMO_DATA_MARKER]: true;
}

interface DemoBudgetLine {
  id: string;
  projectId: string;
  name: string;
  code: string | null;
  budgetedAmountEUR: number;
  order: number | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  [DEMO_DATA_MARKER]: true;
}

// DEPRECATED: usem ProjectExpenseExport i OffBankExpense directament
interface DemoExpense {
  id: string;
  date: string;
  description: string;
  amountEUR: number;
  supplierId?: string;
  projectId?: string;
  budgetLineId?: string;
  documentUrl?: string;
  createdAt: Timestamp;
  [DEMO_DATA_MARKER]: true;
}

/**
 * Feed item per a project-module (bank expenses)
 * Path: /organizations/{orgId}/exports/projectExpenses/items/{txId}
 */
interface DemoProjectExpenseExport {
  id: string;
  orgId: string;
  schemaVersion: 1;
  source: 'summa';
  sourceUpdatedAt: Timestamp | null;
  date: string;
  amountEUR: number; // negatiu
  currency: 'EUR';
  categoryId: string | null;
  categoryName: string | null;
  counterpartyId: string | null;
  counterpartyName: string | null;
  counterpartyType: 'donor' | 'supplier' | 'employee' | null;
  internalTagId: string | null;
  internalTagName: string | null;
  description: string | null;
  documents: Array<{
    source: 'summa';
    storagePath: string | null;
    fileUrl: string | null;
    name: string | null;
  }>;
  isEligibleForProjects: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
  [DEMO_DATA_MARKER]: true;
}

/**
 * Off-bank expense (terreny)
 * Path: /organizations/{orgId}/projectModule/_/offBankExpenses/{expenseId}
 */
interface DemoOffBankExpense {
  id: string;
  orgId: string;
  source: 'offBank';
  date: string;
  concept: string;
  amountEUR: number; // positiu, convertit a EUR
  // Camps moneda estrangera
  originalCurrency?: string; // XOF, HNL, DOP, etc.
  originalAmount?: number;   // Import en moneda local
  fxRate?: number;           // Tipus de canvi usat (1 EUR = X local)
  counterpartyName: string | null;
  categoryName: string | null;
  attachments: Array<{
    url: string;
    name: string;
    contentType: string;
    size: number;
    uploadedAt: string;
  }> | null;
  needsReview: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  [DEMO_DATA_MARKER]: true;
}

/**
 * ExpenseLink per assignacions parcials
 * Path: /organizations/{orgId}/projectModule/_/expenseLinks/{txId}
 */
interface DemoExpenseLink {
  id: string;
  orgId: string;
  assignments: Array<{
    projectId: string;
    projectName: string;
    amountEUR: number;
    budgetLineId?: string | null;
    budgetLineName?: string | null;
  }>;
  projectIds: string[];
  note: string | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  [DEMO_DATA_MARKER]: true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generadors
// ─────────────────────────────────────────────────────────────────────────────

const SEED = 42; // Seed fixe per reproducibilitat

/**
 * Genera donants (persones i empreses)
 */
export function generateDonors(count: number): DemoContact[] {
  const random = createSeededRandom(SEED);
  const nowStr = new Date().toISOString();
  const donors: DemoContact[] = [];

  for (let i = 0; i < count; i++) {
    const isCompany = random() < 0.2; // 20% empreses
    const city = pickRandom(CITIES, random);
    const isRecurring = random() < 0.6; // 60% recurrents

    let name: string;
    let taxId: string;
    let email: string;

    if (isCompany) {
      const prefix = pickRandom(COMPANY_PREFIXES, random);
      const suffix = pickRandom(COMPANY_SUFFIXES, random);
      name = `${prefix} ${suffix}`;
      taxId = generateCIF(random);
      email = `info@${suffix.toLowerCase().replace(/\s/g, '')}.demo`;
    } else {
      const firstName = pickRandom(FIRST_NAMES, random);
      const lastName1 = pickRandom(LAST_NAMES, random);
      const lastName2 = pickRandom(LAST_NAMES, random);
      name = `${firstName} ${lastName1} ${lastName2}`;
      taxId = generateNIF(random);
      email = generateEmail(firstName, lastName1, random);
    }

    // Data de membre: entre 1 i 3 anys enrere
    const memberSince = new Date();
    memberSince.setFullYear(memberSince.getFullYear() - Math.floor(random() * 3) - 1);

    donors.push({
      id: `${DEMO_ID_PREFIX}donor_${i.toString().padStart(3, '0')}`,
      name,
      type: 'donor',
      roles: { donor: true },
      taxId,
      email,
      phone: generatePhone(random),
      address: `${pickRandom(STREET_NAMES, random)}, ${Math.floor(random() * 200) + 1}`,
      city: city.name,
      province: city.province,
      zipCode: `${city.zip}${Math.floor(random() * 1000).toString().padStart(3, '0')}`,
      iban: isRecurring ? generateIBAN(random) : undefined,
      donorType: isCompany ? 'company' : 'individual',
      membershipType: isRecurring ? 'recurring' : 'one-time',
      monthlyAmount: isRecurring ? Math.floor(random() * 95) + 5 : undefined, // 5-100€
      memberSince: memberSince.toISOString().split('T')[0],
      status: 'active',
      createdAt: nowStr,
      updatedAt: nowStr,
      [DEMO_DATA_MARKER]: true,
    });
  }

  return donors;
}

/**
 * Genera proveïdors (empreses)
 */
export function generateSuppliers(count: number): DemoContact[] {
  const random = createSeededRandom(SEED + 1000);
  const nowStr = new Date().toISOString();
  const suppliers: DemoContact[] = [];

  for (let i = 0; i < count; i++) {
    const prefix = pickRandom(COMPANY_PREFIXES, random);
    const suffix = pickRandom(COMPANY_SUFFIXES, random);
    const companyType = pickRandom(COMPANY_TYPES, random);
    const city = pickRandom(CITIES, random);

    suppliers.push({
      id: `${DEMO_ID_PREFIX}supplier_${i.toString().padStart(3, '0')}`,
      name: `${prefix} ${suffix} ${companyType}`,
      type: 'supplier',
      roles: { supplier: true },
      taxId: generateCIF(random),
      email: `info@${suffix.toLowerCase().replace(/\s/g, '')}.demo`,
      phone: generatePhone(random),
      address: `${pickRandom(STREET_NAMES, random)}, ${Math.floor(random() * 200) + 1}`,
      city: city.name,
      province: city.province,
      zipCode: `${city.zip}${Math.floor(random() * 1000).toString().padStart(3, '0')}`,
      iban: generateIBAN(random),
      createdAt: nowStr,
      updatedAt: nowStr,
      [DEMO_DATA_MARKER]: true,
    });
  }

  return suppliers;
}

/**
 * Genera treballadors (persones)
 */
export function generateWorkers(count: number): DemoContact[] {
  const random = createSeededRandom(SEED + 2000);
  const nowStr = new Date().toISOString();
  const workers: DemoContact[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = pickRandom(FIRST_NAMES, random);
    const lastName1 = pickRandom(LAST_NAMES, random);
    const lastName2 = pickRandom(LAST_NAMES, random);

    // Data d'inici: entre 6 mesos i 5 anys enrere
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Math.floor(random() * 54) - 6);

    workers.push({
      id: `${DEMO_ID_PREFIX}employee_${i.toString().padStart(3, '0')}`,
      name: `${firstName} ${lastName1} ${lastName2}`,
      type: 'employee',
      roles: { employee: true },
      taxId: generateNIF(random),
      email: generateEmail(firstName, lastName1, random),
      phone: generatePhone(random),
      iban: generateIBAN(random),
      startDate: startDate.toISOString().split('T')[0],
      createdAt: nowStr,
      updatedAt: nowStr,
      [DEMO_DATA_MARKER]: true,
    });
  }

  return workers;
}

/**
 * Genera categories
 */
export function generateCategories(): DemoCategory[] {
  const now = Timestamp.now();
  const categories: DemoCategory[] = [];

  EXPENSE_CATEGORIES.forEach((cat, i) => {
    categories.push({
      id: `${DEMO_ID_PREFIX}cat_exp_${i.toString().padStart(2, '0')}`,
      name: cat.name,
      type: 'expense',
      createdAt: now,
      [DEMO_DATA_MARKER]: true,
    });
  });

  INCOME_CATEGORIES.forEach((cat, i) => {
    categories.push({
      id: `${DEMO_ID_PREFIX}cat_inc_${i.toString().padStart(2, '0')}`,
      name: cat.name,
      type: 'income',
      createdAt: now,
      [DEMO_DATA_MARKER]: true,
    });
  });

  return categories;
}

/**
 * Genera exactament 100 transaccions bank amb distribució controlada:
 * - 90% amb categoria
 * - 80% amb contacte
 * - 20 PDFs adjunts
 * - Balanç sempre positiu
 * - Distribució temporal: 2 anys, tots els mesos, 20-30 recents
 *
 * @param pdfBaseUrl URL base per documents dummy (opcional)
 */
export function generateTransactions(
  startDate: Date,
  endDate: Date,
  donors: DemoContact[],
  suppliers: DemoContact[],
  categories: DemoCategory[],
  pdfBaseUrl?: string
): DemoTransaction[] {
  const random = createSeededRandom(SEED + 3000);
  const nowStr = new Date().toISOString();
  const transactions: DemoTransaction[] = [];

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const TOTAL_TX = 100;
  const PDF_COUNT = 20;
  const RECENT_COUNT = 25; // Moviments recents (últims 30 dies)

  // Calcular distribució temporal
  const today = new Date();
  const monthsSpan = Math.max(1, Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  ));

  // Distribuir 100 tx en 24 mesos (~4 per mes) + 25 recents
  const txPerMonth = Math.floor((TOTAL_TX - RECENT_COUNT) / monthsSpan);

  // Pre-assignar índexs per PDFs (20 primers tx de despeses)
  const pdfIndices = new Set<number>();
  for (let i = 0; i < PDF_COUNT; i++) {
    pdfIndices.add(i);
  }

  let txIndex = 0;
  let runningBalance = 10000; // Balanç inicial per garantir positiu

  // Generar transaccions per mes (75 repartides)
  const current = new Date(startDate);
  while (current <= endDate && txIndex < TOTAL_TX - RECENT_COUNT) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // ~4 tx per mes (ajustat al final)
    const txThisMonth = Math.min(txPerMonth + (random() < 0.3 ? 1 : 0), TOTAL_TX - RECENT_COUNT - txIndex);

    for (let i = 0; i < txThisMonth && txIndex < TOTAL_TX - RECENT_COUNT; i++) {
      const day = Math.floor(random() * daysInMonth) + 1;
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];

      const tx = createTransaction(
        txIndex,
        dateStr,
        random,
        donors,
        suppliers,
        expenseCategories,
        incomeCategories,
        pdfIndices.has(txIndex) ? pdfBaseUrl : undefined,
        nowStr
      );

      // Assegurar balanç positiu
      if (runningBalance + tx.amount < 500) {
        // Forçar ingrés
        tx.amount = Math.abs(tx.amount);
        tx.description = pickRandom(INCOME_DESCRIPTIONS, random);
        if (tx.contactType === 'supplier') {
          tx.contactId = donors.length > 0 ? pickRandom(donors, random).id : undefined;
          tx.contactType = tx.contactId ? 'donor' : undefined;
        }
      }
      runningBalance += tx.amount;

      transactions.push(tx);
      txIndex++;
    }

    current.setMonth(current.getMonth() + 1);
  }

  // Generar 25 transaccions recents (últims 30 dies)
  for (let i = 0; i < RECENT_COUNT && txIndex < TOTAL_TX; i++) {
    const daysAgo = Math.floor(random() * 30);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().split('T')[0];

    const tx = createTransaction(
      txIndex,
      dateStr,
      random,
      donors,
      suppliers,
      expenseCategories,
      incomeCategories,
      pdfIndices.has(txIndex) ? pdfBaseUrl : undefined,
      nowStr
    );

    // Assegurar balanç positiu
    if (runningBalance + tx.amount < 500) {
      tx.amount = Math.abs(tx.amount);
      tx.description = pickRandom(INCOME_DESCRIPTIONS, random);
    }
    runningBalance += tx.amount;

    transactions.push(tx);
    txIndex++;
  }

  // Ordenar per data descendent
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  return transactions;
}

/**
 * Helper per crear una transacció amb les regles de cobertura:
 * - 90% categoria
 * - 80% contacte
 * - 60% despeses, 40% ingressos
 */
function createTransaction(
  index: number,
  dateStr: string,
  random: () => number,
  donors: DemoContact[],
  suppliers: DemoContact[],
  expenseCategories: DemoCategory[],
  incomeCategories: DemoCategory[],
  pdfBaseUrl: string | undefined,
  nowStr: string
): DemoTransaction {
  // 60% despeses, 40% ingressos (ajustat per balanç positiu)
  const isExpense = random() < 0.6;
  // 90% amb categoria
  const hasCategory = random() < 0.9;
  // 80% amb contacte
  const hasContact = random() < 0.8;

  const docIndex = Math.floor(random() * 20);

  if (isExpense) {
    const supplier = hasContact && suppliers.length > 0 ? pickRandom(suppliers, random) : null;
    const category = hasCategory && expenseCategories.length > 0 ? pickRandom(expenseCategories, random) : null;
    const amountEur = Math.floor(random() * 2990) + 10; // 10€ - 3000€

    return {
      id: `${DEMO_ID_PREFIX}tx_${index.toString().padStart(5, '0')}`,
      date: dateStr,
      description: pickRandom(EXPENSE_DESCRIPTIONS, random),
      amount: -amountEur,
      category: category?.id,
      contactId: supplier?.id,
      contactType: supplier ? 'supplier' : undefined,
      document: pdfBaseUrl ? `${pdfBaseUrl}/${DEMO_ID_PREFIX}doc_${docIndex.toString().padStart(3, '0')}.pdf` : undefined,
      source: 'bank',
      transactionType: 'normal',
      createdAt: nowStr,
      [DEMO_DATA_MARKER]: true,
    };
  } else {
    const donor = hasContact && donors.length > 0 ? pickRandom(donors, random) : null;
    const category = hasCategory && incomeCategories.length > 0 ? pickRandom(incomeCategories, random) : null;
    const amountEur = Math.floor(random() * 1990) + 10; // 10€ - 2000€

    return {
      id: `${DEMO_ID_PREFIX}tx_${index.toString().padStart(5, '0')}`,
      date: dateStr,
      description: pickRandom(INCOME_DESCRIPTIONS, random),
      amount: amountEur,
      category: category?.id,
      contactId: donor?.id,
      contactType: donor ? 'donor' : undefined,
      document: pdfBaseUrl ? `${pdfBaseUrl}/${DEMO_ID_PREFIX}doc_${docIndex.toString().padStart(3, '0')}.pdf` : undefined,
      source: 'bank',
      transactionType: 'normal',
      createdAt: nowStr,
      [DEMO_DATA_MARKER]: true,
    };
  }
}

/**
 * Genera projectes amb partides
 * @param count Nombre de projectes
 * @param orgId ID de l'organització
 */
export function generateProjects(count: number, orgId: string): {
  projects: DemoProject[];
  budgetLines: DemoBudgetLine[];
} {
  const random = createSeededRandom(SEED + 4000);
  const now = Timestamp.now();
  const projects: DemoProject[] = [];
  const budgetLines: DemoBudgetLine[] = [];

  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  for (let i = 0; i < count; i++) {
    const projectId = `${DEMO_ID_PREFIX}project_${i.toString().padStart(2, '0')}`;
    const startDate = new Date(oneYearAgo);
    startDate.setMonth(startDate.getMonth() + i * 3);

    // End date: 1-2 anys després de start
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1 + Math.floor(random()));

    // 10 partides per projecte, calcular budget total
    let totalBudget = 0;
    for (let j = 0; j < 10; j++) {
      const lineType = BUDGET_LINE_TYPES[j];
      const budgetAmount = Math.floor(random() * 9000) + 1000; // 1000€ - 10000€
      totalBudget += budgetAmount;

      budgetLines.push({
        id: `${DEMO_ID_PREFIX}budget_${i}_${j.toString().padStart(2, '0')}`,
        projectId,
        name: lineType.name,
        code: lineType.code,
        budgetedAmountEUR: budgetAmount,
        order: j,
        createdBy: 'system',
        createdAt: now,
        updatedAt: now,
        [DEMO_DATA_MARKER]: true,
      });
    }

    projects.push({
      id: projectId,
      name: PROJECT_NAMES[i] || `Projecte Demo ${i + 1}`,
      code: `P${(i + 1).toString().padStart(3, '0')}`,
      status: 'active',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      budgetEUR: totalBudget,
      allowedDeviationPct: 10,
      orgId,
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
      [DEMO_DATA_MARKER]: true,
    });
  }

  return { projects, budgetLines };
}

/**
 * Genera despeses off-bank (expenseLinks)
 */
export function generateExpenses(
  count: number,
  suppliers: DemoContact[],
  projects: DemoProject[],
  budgetLines: DemoBudgetLine[],
  pdfBaseUrl?: string
): DemoExpense[] {
  const random = createSeededRandom(SEED + 5000);
  const now = Timestamp.now();
  const expenses: DemoExpense[] = [];

  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(random() * 365);
    const date = new Date(oneYearAgo);
    date.setDate(date.getDate() + dayOffset);

    const supplier = pickRandom(suppliers, random);
    const amountEur = Math.floor(random() * 2990) + 10; // 10€ - 3000€

    // 50% amb projecte assignat
    let projectId: string | undefined;
    let budgetLineId: string | undefined;

    if (random() < 0.5 && projects.length > 0) {
      const project = pickRandom(projects, random);
      projectId = project.id;
      const projectLines = budgetLines.filter((bl) => bl.projectId === project.id);
      if (projectLines.length > 0) {
        budgetLineId = pickRandom(projectLines, random).id;
      }
    }

    // 20% amb document adjunt
    const hasDocument = random() < 0.2 && pdfBaseUrl;
    const docIndex = Math.floor(random() * 30); // 30 PDFs disponibles

    expenses.push({
      id: `${DEMO_ID_PREFIX}expense_${i.toString().padStart(4, '0')}`,
      date: date.toISOString().split('T')[0],
      description: pickRandom(EXPENSE_DESCRIPTIONS, random),
      amountEUR: -amountEur, // Negatiu per despeses
      supplierId: supplier.id,
      projectId,
      budgetLineId,
      documentUrl: hasDocument ? `${pdfBaseUrl}/${DEMO_ID_PREFIX}doc_${docIndex.toString().padStart(3, '0')}.pdf` : undefined,
      createdAt: now,
      [DEMO_DATA_MARKER]: true,
    });
  }

  return expenses;
}

/**
 * Genera PDF dummy (Buffer)
 */
export function generateDummyPDF(index: number): Buffer {
  // PDF mínim vàlid
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Demo Document ${index}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000206 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`;

  return Buffer.from(pdfContent);
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERADORS PER PROJECT-MODULE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera feed de despeses bank per project-module
 * Path: /organizations/{orgId}/exports/projectExpenses/items/{txId}
 *
 * Mirall exacte de les transaccions amb amount < 0 (despeses bank)
 * Totes les despeses bank són elegibles per a projectes
 */
export function generateProjectExpensesFeed(
  transactions: DemoTransaction[],
  categories: DemoCategory[],
  contacts: DemoContact[],
  orgId: string,
  _pdfBaseUrl?: string
): DemoProjectExpenseExport[] {
  const now = Timestamp.now();
  const feed: DemoProjectExpenseExport[] = [];

  // Filtrar només despeses (amount < 0)
  const expenses = transactions.filter((tx) => tx.amount < 0);

  for (const tx of expenses) {
    // Trobar categoria i contacte
    const category = categories.find((c) => c.id === tx.category);
    const contact = contacts.find((c) => c.id === tx.contactId);

    // Usar el document de la transacció original si existeix
    const hasDoc = !!tx.document;

    feed.push({
      id: tx.id,
      orgId,
      schemaVersion: 1,
      source: 'summa',
      sourceUpdatedAt: now,
      date: tx.date,
      amountEUR: tx.amount, // ja negatiu
      currency: 'EUR',
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      counterpartyId: contact?.id ?? null,
      counterpartyName: contact?.name ?? null,
      counterpartyType: contact?.type ?? null,
      internalTagId: null,
      internalTagName: null,
      description: tx.description,
      documents: hasDoc && tx.document
        ? [
            {
              source: 'summa',
              storagePath: tx.document,
              fileUrl: null,
              name: `Factura-${tx.id}.pdf`,
            },
          ]
        : [],
      isEligibleForProjects: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      [DEMO_DATA_MARKER]: true,
    });
  }

  return feed;
}

/**
 * Tipus de canvi fixos per demo (aproximats a valors reals)
 * 1 EUR = X unitats de moneda local
 */
const FX_RATES: Record<string, number> = {
  XOF: 655.957, // Franco CFA (Senegal, Mali, etc.) - fix al EUR
  HNL: 27.5,    // Lempira hondurenya
  DOP: 65.0,    // Peso dominicà
};

/**
 * Genera 30 despeses off-bank de terreny amb multi-moneda
 * - 10 en XOF (Àfrica Occidental)
 * - 10 en HNL (Hondures)
 * - 10 en DOP (República Dominicana)
 *
 * Path: /organizations/{orgId}/projectModule/_/offBankExpenses/{expenseId}
 */
export function generateOffBankExpenses(
  orgId: string,
  pdfBaseUrl?: string
): DemoOffBankExpense[] {
  const now = Timestamp.now();
  const random = createSeededRandom(SEED + 7000);
  const offBank: DemoOffBankExpense[] = [];

  // Conceptes per zona
  const conceptsXOF = [
    'Material oficina Dakar',
    'Transport equip Saint-Louis',
    'Allotjament formadors Thiès',
    'Menjars reunió Tambacounda',
    'Impressió documents Ziguinchor',
    'Lloguer sala Kaolack',
    'Eines agrícoles Fatick',
    'Combustible vehicle Kolda',
    'Reparació generador Matam',
    'Subministraments mèdics Kédougou',
  ];

  const conceptsHNL = [
    'Material oficina Tegucigalpa',
    'Transport equip San Pedro Sula',
    'Allotjament formadors La Ceiba',
    'Menjars reunió Comayagua',
    'Impressió documents Choluteca',
    'Lloguer sala Juticalpa',
    'Eines agrícoles Danlí',
    'Combustible vehicle Tocoa',
    'Reparació generador Olanchito',
    'Subministraments mèdics Gracias',
  ];

  const conceptsDOP = [
    'Material oficina Santo Domingo',
    'Transport equip Santiago',
    'Allotjament formadors Puerto Plata',
    'Menjars reunió La Romana',
    'Impressió documents San Cristóbal',
    'Lloguer sala Higüey',
    'Eines agrícoles Barahona',
    'Combustible vehicle Moca',
    'Reparació generador San Juan',
    'Subministraments mèdics La Vega',
  ];

  const counterpartiesXOF = [
    'Boutique Diallo', 'Transport Sène', 'Hôtel du Fleuve', 'Restaurant Thiossane',
    'Imprimerie Ndiaye', 'Centre Culturel Blaise Senghor', 'Quincaillerie Mbaye',
    'Station Petrosen', 'Garage Mécanique Ba', 'Pharmacie du Quartier',
  ];

  const counterpartiesHNL = [
    'Librería Central', 'Transporte Rápido', 'Hotel Maya', 'Comedor Lempira',
    'Imprenta Moderna', 'Centro Comunitario', 'Ferretería El Martillo',
    'Gasolinera UNO', 'Taller Automotriz', 'Farmacia San José',
  ];

  const counterpartiesDOP = [
    'Papelería Dominicana', 'Metro Servicios', 'Hotel Colonial', 'Comedor Típico',
    'Imprenta Nacional', 'Centro Cultural', 'Ferretería El Constructor',
    'Estación Shell', 'Taller del Caribe', 'Farmacia Carol',
  ];

  const categoryNames = [
    'Material oficina', 'Transport', 'Allotjament', 'Alimentació',
    'Comunicació', 'Lloguer espais', 'Equipament', 'Combustible',
    'Manteniment', 'Subministraments',
  ];

  const today = new Date();
  let idx = 0;

  // Helper per crear off-bank amb moneda
  const createOffBank = (
    currency: string,
    concepts: string[],
    counterparties: string[],
    offset: number
  ) => {
    const fxRate = FX_RATES[currency];
    for (let i = 0; i < 10; i++) {
      // Dates: distribuïdes en últims 60 dies
      const date = new Date(today);
      date.setDate(date.getDate() - (offset * 20 + i * 2 + Math.floor(random() * 3)));

      // Import en moneda local: 5.000 - 500.000 XOF / 500 - 20.000 HNL / 1.000 - 50.000 DOP
      let originalAmount: number;
      if (currency === 'XOF') {
        originalAmount = Math.floor(random() * 495000) + 5000;
      } else if (currency === 'HNL') {
        originalAmount = Math.floor(random() * 19500) + 500;
      } else {
        originalAmount = Math.floor(random() * 49000) + 1000;
      }

      // Convertir a EUR
      const amountEUR = Math.round((originalAmount / fxRate) * 100) / 100;

      // 30% amb needsReview (cada 3)
      const needsReview = i % 3 === 0;

      // 20% amb attachment (índexs 2, 7)
      const hasAttachment = (i === 2 || i === 7) && pdfBaseUrl;
      const docIndex = Math.floor(random() * 20);

      offBank.push({
        id: `${DEMO_ID_PREFIX}offbank_${idx.toString().padStart(3, '0')}`,
        orgId,
        source: 'offBank',
        date: date.toISOString().split('T')[0],
        concept: concepts[i],
        amountEUR,
        // Camps moneda estrangera
        originalCurrency: currency,
        originalAmount,
        fxRate,
        counterpartyName: counterparties[i],
        categoryName: categoryNames[i],
        attachments: hasAttachment
          ? [
              {
                url: `${pdfBaseUrl}/${DEMO_ID_PREFIX}doc_${docIndex.toString().padStart(3, '0')}.pdf`,
                name: `Tiquet-${currency}-${i + 1}.pdf`,
                contentType: 'application/pdf',
                size: 12345 + idx * 100,
                uploadedAt: date.toISOString().split('T')[0],
              },
            ]
          : null,
        needsReview,
        createdBy: 'demo-user',
        createdAt: now,
        updatedAt: now,
        [DEMO_DATA_MARKER]: true,
      });

      idx++;
    }
  };

  // Generar 10 de cada moneda
  createOffBank('XOF', conceptsXOF, counterpartiesXOF, 0);
  createOffBank('HNL', conceptsHNL, counterpartiesHNL, 1);
  createOffBank('DOP', conceptsDOP, counterpartiesDOP, 2);

  return offBank;
}

/**
 * Genera expenseLinks amb patrons específics:
 * - 10 fully assigned a demo_project_02 (per mostrar budget execution)
 * - 10 mixed (assignació parcial a múltiples projectes)
 * - Resta: unassigned (no generar link)
 *
 * Path: /organizations/{orgId}/projectModule/_/expenseLinks/{txId}
 */
export function generateExpenseLinks(
  feedItems: DemoProjectExpenseExport[],
  projects: DemoProject[],
  orgId: string
): DemoExpenseLink[] {
  const now = Timestamp.now();
  const random = createSeededRandom(SEED + 8000);
  const links: DemoExpenseLink[] = [];

  if (projects.length === 0 || feedItems.length === 0) return links;

  // Trobar demo_project_02 (o el segon projecte)
  const targetProject = projects.find((p) => p.id.includes('project_01')) || projects[1] || projects[0];
  const otherProjects = projects.filter((p) => p.id !== targetProject.id);

  // Ordenar feed per data (més recent primer) i agafar els que assignarem
  const sortedFeed = [...feedItems].sort((a, b) => b.date.localeCompare(a.date));

  // 10 full assigned a demo_project_02 (índexs 0-9, els més recents)
  const fullAssigned = sortedFeed.slice(0, 10);
  for (const expense of fullAssigned) {
    links.push({
      id: expense.id,
      orgId,
      assignments: [
        {
          projectId: targetProject.id,
          projectName: targetProject.name,
          amountEUR: expense.amountEUR, // 100% assignat
          budgetLineId: null,
          budgetLineName: null,
        },
      ],
      projectIds: [targetProject.id],
      note: null,
      createdBy: 'demo-user',
      createdAt: now,
      updatedAt: now,
      [DEMO_DATA_MARKER]: true,
    });
  }

  // 10 mixed (assignació parcial, índexs 10-19)
  const mixedAssigned = sortedFeed.slice(10, 20);
  for (let i = 0; i < mixedAssigned.length; i++) {
    const expense = mixedAssigned[i];

    // Dividir entre 2 projectes: 60% al target, 40% a un altre
    const project2 = otherProjects.length > 0
      ? otherProjects[i % otherProjects.length]
      : targetProject;

    const amount1 = Math.round(expense.amountEUR * 0.6 * 100) / 100;
    const amount2 = Math.round((expense.amountEUR - amount1) * 100) / 100;

    const assignments = [
      {
        projectId: targetProject.id,
        projectName: targetProject.name,
        amountEUR: amount1,
        budgetLineId: null,
        budgetLineName: null,
      },
    ];

    // Afegir segon projecte si és diferent
    if (project2.id !== targetProject.id) {
      assignments.push({
        projectId: project2.id,
        projectName: project2.name,
        amountEUR: amount2,
        budgetLineId: null,
        budgetLineName: null,
      });
    }

    const projectIds = [...new Set(assignments.map((a) => a.projectId))];

    links.push({
      id: expense.id,
      orgId,
      assignments,
      projectIds,
      note: i % 3 === 0 ? 'Despesa compartida entre projectes' : null,
      createdBy: 'demo-user',
      createdAt: now,
      updatedAt: now,
      [DEMO_DATA_MARKER]: true,
    });
  }

  // La resta (índexs 20+) queden unassigned - no generem link

  return links;
}
