// ═══════════════════════════════════════════════════════════════════════════════
// MODEL 347 — Lògica pura d'agregació
// ═══════════════════════════════════════════════════════════════════════════════
// Funcions deterministes sense dependències de Firebase.
// Tota la lògica de filtratge, agrupació i càlcul trimestral.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Transaction, Supplier, Category } from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const THRESHOLD_347 = 3005.06;

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

export type Direction = 'expense' | 'income';

export interface QuarterTotals {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
}

export interface CandidateTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;           // valor absolut
  quarter: 1 | 2 | 3 | 4;
  categoryId: string | null;
  categoryName: string | null;
}

export interface SupplierAggregate {
  contactId: string;
  name: string;
  taxId: string;
  zipCode: string;
  province?: string;
  direction: Direction;
  quarters: QuarterTotals;
  transactions: CandidateTransaction[];
}

export interface Model347Result {
  expenses: SupplierAggregate[];   // Clave A AEAT (adquisicions)
  income: SupplierAggregate[];     // Clave B AEAT (entregues)
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retorna el trimestre (1–4) per una data ISO string.
 * Mes 0–2 → Q1, 3–5 → Q2, 6–8 → Q3, 9–11 → Q4
 */
export function getQuarter(dateStr: string): 1 | 2 | 3 | 4 {
  const month = new Date(dateStr).getMonth();
  if (month <= 2) return 1;
  if (month <= 5) return 2;
  if (month <= 8) return 3;
  return 4;
}

/**
 * Calcula totals trimestrals a partir d'una llista de transaccions candidates.
 * Només compta les transaccions NO excloses.
 */
function computeQuarters(
  transactions: CandidateTransaction[],
  excludedTxIds: Set<string>
): QuarterTotals {
  let q1 = 0, q2 = 0, q3 = 0, q4 = 0;

  for (const tx of transactions) {
    if (excludedTxIds.has(tx.id)) continue;
    switch (tx.quarter) {
      case 1: q1 += tx.amount; break;
      case 2: q2 += tx.amount; break;
      case 3: q3 += tx.amount; break;
      case 4: q4 += tx.amount; break;
    }
  }

  return { q1, q2, q3, q4, total: q1 + q2 + q3 + q4 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓ PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula l'agregació del Model 347 per proveïdor i direcció.
 *
 * @param transactions  Transaccions ja filtrades per !archivedAt (responsabilitat del caller)
 * @param suppliers     Llista de proveïdors
 * @param categories    Llista de categories (per mapa id→name)
 * @param year          Any fiscal
 * @param excludedTxIds Set de transaction IDs exclosos manualment per l'usuari
 * @param threshold     Llindar mínim (default: 3005.06)
 */
export function computeModel347(
  transactions: Transaction[],
  suppliers: Supplier[],
  categories: Category[],
  year: number,
  excludedTxIds: Set<string>,
  threshold: number = THRESHOLD_347
): Model347Result {
  // Mapes de lookup
  const supplierMap = new Map(suppliers.map(s => [s.id, s]));
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  // Acumulador: key = `contactId:direction`
  const buckets = new Map<string, {
    supplier: Supplier;
    direction: Direction;
    transactions: CandidateTransaction[];
  }>();

  for (const tx of transactions) {
    // Filtre d'any
    if (new Date(tx.date).getFullYear() !== year) continue;

    // Filtre d'abast: NOMÉS proveïdors
    if (tx.contactType !== 'supplier') continue;
    if (!tx.contactId) continue;

    const supplier = supplierMap.get(tx.contactId);
    if (!supplier) continue;

    // Determinar direcció
    if (tx.amount === 0) continue;
    const direction: Direction = tx.amount < 0 ? 'expense' : 'income';

    const key = `${tx.contactId}:${direction}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        supplier,
        direction,
        transactions: [],
      });
    }

    buckets.get(key)!.transactions.push({
      id: tx.id,
      date: tx.date,
      description: tx.description || '',
      amount: Math.abs(tx.amount),
      quarter: getQuarter(tx.date),
      categoryId: tx.category ?? null,
      categoryName: tx.category ? (categoryMap.get(tx.category) ?? null) : null,
    });
  }

  // Construir agregats
  const expenses: SupplierAggregate[] = [];
  const income: SupplierAggregate[] = [];

  for (const [, bucket] of buckets) {
    const quarters = computeQuarters(bucket.transactions, excludedTxIds);

    // Aplicar llindar
    if (quarters.total <= threshold) continue;

    const aggregate: SupplierAggregate = {
      contactId: bucket.supplier.id,
      name: bucket.supplier.name,
      taxId: bucket.supplier.taxId || '',
      zipCode: bucket.supplier.zipCode || '',
      province: bucket.supplier.province,
      direction: bucket.direction,
      quarters,
      transactions: bucket.transactions.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    };

    if (bucket.direction === 'expense') {
      expenses.push(aggregate);
    } else {
      income.push(aggregate);
    }
  }

  // Ordenar descendent per total
  expenses.sort((a, b) => b.quarters.total - a.quarters.total);
  income.sort((a, b) => b.quarters.total - a.quarters.total);

  return { expenses, income };
}
