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
  type: 'person' | 'company';
  taxId: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  iban?: string;
  isDonor?: boolean;
  isSupplier?: boolean;
  isWorker?: boolean;
  createdAt: Timestamp;
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
  amountCents: number;
  categoryId?: string;
  contactId?: string;
  bankAccountId?: string;
  createdAt: Timestamp;
  [DEMO_DATA_MARKER]: true;
}

interface DemoProject {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'closed';
  startDate: string;
  endDate?: string;
  totalBudgetCents: number;
  createdAt: Timestamp;
  [DEMO_DATA_MARKER]: true;
}

interface DemoBudgetLine {
  id: string;
  projectId: string;
  name: string;
  code: string;
  budgetCents: number;
  createdAt: Timestamp;
  [DEMO_DATA_MARKER]: true;
}

interface DemoExpense {
  id: string;
  date: string;
  description: string;
  amountCents: number;
  supplierId?: string;
  projectId?: string;
  budgetLineId?: string;
  hasAttachment?: boolean;
  createdAt: Timestamp;
  [DEMO_DATA_MARKER]: true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generadors
// ─────────────────────────────────────────────────────────────────────────────

const SEED = 42; // Seed fixe per reproducibilitat

/**
 * Genera donants (persones)
 */
export function generateDonors(count: number): DemoContact[] {
  const random = createSeededRandom(SEED);
  const now = Timestamp.now();
  const donors: DemoContact[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = pickRandom(FIRST_NAMES, random);
    const lastName1 = pickRandom(LAST_NAMES, random);
    const lastName2 = pickRandom(LAST_NAMES, random);
    const city = pickRandom(CITIES, random);

    donors.push({
      id: `${DEMO_ID_PREFIX}donor_${i.toString().padStart(3, '0')}`,
      name: `${firstName} ${lastName1} ${lastName2}`,
      type: 'person',
      taxId: generateNIF(random),
      email: generateEmail(firstName, lastName1, random),
      phone: generatePhone(random),
      address: `${pickRandom(STREET_NAMES, random)}, ${Math.floor(random() * 200) + 1}`,
      city: city.name,
      province: city.province,
      zipCode: `${city.zip}${Math.floor(random() * 1000).toString().padStart(3, '0')}`,
      iban: generateIBAN(random),
      isDonor: true,
      createdAt: now,
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
  const now = Timestamp.now();
  const suppliers: DemoContact[] = [];

  for (let i = 0; i < count; i++) {
    const prefix = pickRandom(COMPANY_PREFIXES, random);
    const suffix = pickRandom(COMPANY_SUFFIXES, random);
    const type = pickRandom(COMPANY_TYPES, random);
    const city = pickRandom(CITIES, random);

    suppliers.push({
      id: `${DEMO_ID_PREFIX}supplier_${i.toString().padStart(3, '0')}`,
      name: `${prefix} ${suffix} ${type}`,
      type: 'company',
      taxId: generateCIF(random),
      email: `info@${suffix.toLowerCase()}.demo`,
      phone: generatePhone(random),
      address: `${pickRandom(STREET_NAMES, random)}, ${Math.floor(random() * 200) + 1}`,
      city: city.name,
      province: city.province,
      zipCode: `${city.zip}${Math.floor(random() * 1000).toString().padStart(3, '0')}`,
      iban: generateIBAN(random),
      isSupplier: true,
      createdAt: now,
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
  const now = Timestamp.now();
  const workers: DemoContact[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = pickRandom(FIRST_NAMES, random);
    const lastName1 = pickRandom(LAST_NAMES, random);
    const lastName2 = pickRandom(LAST_NAMES, random);

    workers.push({
      id: `${DEMO_ID_PREFIX}worker_${i.toString().padStart(3, '0')}`,
      name: `${firstName} ${lastName1} ${lastName2}`,
      type: 'person',
      taxId: generateNIF(random),
      email: generateEmail(firstName, lastName1, random),
      phone: generatePhone(random),
      iban: generateIBAN(random),
      isWorker: true,
      createdAt: now,
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
 * Genera transaccions per un rang de dates
 */
export function generateTransactions(
  startDate: Date,
  endDate: Date,
  donors: DemoContact[],
  suppliers: DemoContact[],
  categories: DemoCategory[]
): DemoTransaction[] {
  const random = createSeededRandom(SEED + 3000);
  const now = Timestamp.now();
  const transactions: DemoTransaction[] = [];

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  // Iterar per cada mes
  const current = new Date(startDate);
  let txIndex = 0;

  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 30-50 transaccions per mes
    const txCount = Math.floor(random() * 21) + 30;

    for (let i = 0; i < txCount; i++) {
      const day = Math.floor(random() * daysInMonth) + 1;
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];

      // 70% despeses, 30% ingressos
      const isExpense = random() < 0.7;

      if (isExpense) {
        const supplier = pickRandom(suppliers, random);
        const category = pickRandom(expenseCategories, random);
        const amount = Math.floor(random() * 500000) + 1000; // 10€ - 5000€

        transactions.push({
          id: `${DEMO_ID_PREFIX}tx_${txIndex.toString().padStart(5, '0')}`,
          date: dateStr,
          description: pickRandom(EXPENSE_DESCRIPTIONS, random),
          amountCents: -amount,
          categoryId: category.id,
          contactId: supplier.id,
          createdAt: now,
          [DEMO_DATA_MARKER]: true,
        });
      } else {
        const donor = pickRandom(donors, random);
        const category = pickRandom(incomeCategories, random);
        const amount = Math.floor(random() * 100000) + 500; // 5€ - 1000€

        transactions.push({
          id: `${DEMO_ID_PREFIX}tx_${txIndex.toString().padStart(5, '0')}`,
          date: dateStr,
          description: pickRandom(INCOME_DESCRIPTIONS, random),
          amountCents: amount,
          categoryId: category.id,
          contactId: donor.id,
          createdAt: now,
          [DEMO_DATA_MARKER]: true,
        });
      }

      txIndex++;
    }

    // Següent mes
    current.setMonth(current.getMonth() + 1);
  }

  return transactions;
}

/**
 * Genera projectes amb partides
 */
export function generateProjects(count: number): {
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

    projects.push({
      id: projectId,
      name: PROJECT_NAMES[i] || `Projecte Demo ${i + 1}`,
      code: `P${(i + 1).toString().padStart(3, '0')}`,
      status: i < count - 1 ? 'active' : 'active',
      startDate: startDate.toISOString().split('T')[0],
      totalBudgetCents: 0, // Es calcularà després
      createdAt: now,
      [DEMO_DATA_MARKER]: true,
    });

    // 10 partides per projecte
    let projectTotal = 0;
    for (let j = 0; j < 10; j++) {
      const lineType = BUDGET_LINE_TYPES[j];
      const budgetAmount = Math.floor(random() * 1000000) + 100000; // 1000€ - 10000€
      projectTotal += budgetAmount;

      budgetLines.push({
        id: `${DEMO_ID_PREFIX}budget_${i}_${j.toString().padStart(2, '0')}`,
        projectId,
        name: lineType.name,
        code: lineType.code,
        budgetCents: budgetAmount,
        createdAt: now,
        [DEMO_DATA_MARKER]: true,
      });
    }

    // Actualitzar total projecte
    projects[i].totalBudgetCents = projectTotal;
  }

  return { projects, budgetLines };
}

/**
 * Genera despeses off-bank
 */
export function generateExpenses(
  count: number,
  suppliers: DemoContact[],
  projects: DemoProject[],
  budgetLines: DemoBudgetLine[]
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
    const amount = Math.floor(random() * 300000) + 1000; // 10€ - 3000€

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

    expenses.push({
      id: `${DEMO_ID_PREFIX}expense_${i.toString().padStart(4, '0')}`,
      date: date.toISOString().split('T')[0],
      description: pickRandom(EXPENSE_DESCRIPTIONS, random),
      amountCents: amount,
      supplierId: supplier.id,
      projectId,
      budgetLineId,
      hasAttachment: random() < 0.2, // 20% amb adjunt
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
