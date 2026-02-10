/**
 * Donor Dynamics - Helpers per calcular dinàmica de donants per període
 *
 * API nullable: cap throw, cap data inventada. Si el rang no és computable,
 * retorna null i la UI mostra "no hi ha dades suficients".
 */

import type { Transaction, Donor } from '@/lib/data';
import type { DateFilterValue } from '@/components/date-filter';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

export type DonorWithMeta = {
  donor: Donor;
  firstDateInPeriod?: string;
  lastDateBeforePeriod?: string;
  sumCurrent?: number;
  sumPrevious?: number;
  delta?: number;
  deltaPercent?: number;
  returnsSum?: number;
  netAmount?: number;
};

export type CompanySummary = {
  count: number;
  totalNet: number;
};

export type DonorDynamicsResult = {
  newDonors: DonorWithMeta[];
  inactiveDonors: DonorWithMeta[];
  withReturns: DonorWithMeta[];
  leavers: DonorWithMeta[];
  companies: CompanySummary;
  topDonors: DonorWithMeta[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS INTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Filtra transaccions elegibles per dinàmica de donants:
 * - contactId present
 * - no arxivada (archivedAt buit)
 * - no pare de remesa (isRemittance=true sense isRemittanceItem)
 */
function isEligibleDonorTx(tx: Transaction): boolean {
  if (!tx.contactId) return false;
  if (tx.archivedAt) return false;
  if (tx.isRemittance === true && !tx.isRemittanceItem) return false;
  return true;
}

/**
 * Comprova si una data (YYYY-MM-DD) està dins un rang inclusiu
 */
export function isInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

// ═══════════════════════════════════════════════════════════════════════════════
// getDateRange - Retorna {from, to} o null si no computable
// ═══════════════════════════════════════════════════════════════════════════════

export function getDateRange(
  filter: DateFilterValue,
  transactions?: Transaction[]
): { from: string; to: string } | null {

  if (filter.type === 'all') {
    if (!transactions || transactions.length === 0) return null;
    const eligibleTxs = transactions.filter(isEligibleDonorTx);
    if (eligibleTxs.length === 0) return null;
    // Min/max en una passada (strings YYYY-MM-DD)
    let from = eligibleTxs[0].date;
    let to = eligibleTxs[0].date;
    for (const tx of eligibleTxs) {
      if (tx.date < from) from = tx.date;
      if (tx.date > to) to = tx.date;
    }
    return { from, to };
  }

  if (filter.type === 'year') {
    if (!filter.year) return null;
    return { from: `${filter.year}-01-01`, to: `${filter.year}-12-31` };
  }

  if (filter.type === 'quarter') {
    if (!filter.year || !filter.quarter) return null;
    const startMonth = (filter.quarter - 1) * 3 + 1;
    const endMonth = filter.quarter * 3;
    const lastDay = new Date(filter.year, endMonth, 0).getDate();
    return {
      from: `${filter.year}-${String(startMonth).padStart(2, '0')}-01`,
      to: `${filter.year}-${String(endMonth).padStart(2, '0')}-${lastDay}`
    };
  }

  if (filter.type === 'month') {
    if (!filter.year || !filter.month) return null;
    const lastDay = new Date(filter.year, filter.month, 0).getDate();
    return {
      from: `${filter.year}-${String(filter.month).padStart(2, '0')}-01`,
      to: `${filter.year}-${String(filter.month).padStart(2, '0')}-${lastDay}`
    };
  }

  if (filter.type === 'custom') {
    // Si falta from o to: retorna null (no inventar dates)
    if (!filter.customRange?.from || !filter.customRange?.to) return null;
    const from = filter.customRange.from.toISOString().slice(0, 10);
    const to = filter.customRange.to.toISOString().slice(0, 10);
    return { from, to };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// getPreviousPeriod - Retorna DateFilterValue | null
// ═══════════════════════════════════════════════════════════════════════════════

export function getPreviousPeriod(
  filter: DateFilterValue
): DateFilterValue | null {

  if (filter.type === 'all') return null; // No té "anterior" ben definit

  if (filter.type === 'year' && filter.year) {
    return { type: 'year', year: filter.year - 1 };
  }

  if (filter.type === 'quarter' && filter.year && filter.quarter) {
    if (filter.quarter === 1) {
      return { type: 'quarter', year: filter.year - 1, quarter: 4 };
    }
    return { type: 'quarter', year: filter.year, quarter: (filter.quarter - 1) as 1 | 2 | 3 | 4 };
  }

  if (filter.type === 'month' && filter.year && filter.month) {
    if (filter.month === 1) {
      return { type: 'month', year: filter.year - 1, month: 12 };
    }
    return { type: 'month', year: filter.year, month: filter.month - 1 };
  }

  if (filter.type === 'custom' && filter.customRange?.from && filter.customRange?.to) {
    // Mateix nombre de dies enrere
    const fromDate = filter.customRange.from;
    const toDate = filter.customRange.to;
    const durationMs = toDate.getTime() - fromDate.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const prevTo = new Date(fromDate.getTime() - oneDayMs); // Dia anterior a from
    const prevFrom = new Date(prevTo.getTime() - durationMs);
    return {
      type: 'custom',
      customRange: { from: prevFrom, to: prevTo }
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// computeDonorDynamics - Càlcul principal (tolerant, sense throw)
// ═══════════════════════════════════════════════════════════════════════════════

export function computeDonorDynamics(
  donors: Donor[],
  transactions: Transaction[],
  currentPeriod: DateFilterValue
): DonorDynamicsResult {
  const emptyResult: DonorDynamicsResult = {
    newDonors: [],
    inactiveDonors: [],
    withReturns: [],
    leavers: [],
    companies: { count: 0, totalNet: 0 },
    topDonors: []
  };

  // Obtenir rang actual
  const currRange = getDateRange(currentPeriod, transactions);
  if (!currRange) return emptyResult;

  // Filtrar transaccions elegibles
  const eligibleTxs = transactions.filter(isEligibleDonorTx);
  if (eligibleTxs.length === 0) return emptyResult;

  // Construir Map<donorId, Transaction[]>
  const txByDonorId = new Map<string, Transaction[]>();
  for (const tx of eligibleTxs) {
    const donorId = tx.contactId!;
    if (!txByDonorId.has(donorId)) {
      txByDonorId.set(donorId, []);
    }
    txByDonorId.get(donorId)!.push(tx);
  }

  // Crear Map<donorId, Donor> per lookup ràpid
  const donorById = new Map<string, Donor>();
  for (const donor of donors) {
    donorById.set(donor.id, donor);
  }

  // Resultats
  const newDonors: DonorWithMeta[] = [];
  const inactiveDonors: DonorWithMeta[] = [];
  const withReturns: DonorWithMeta[] = [];

  // Per Top 15 i Empreses: acumulem net per donant
  const donorNets: DonorWithMeta[] = [];
  let companiesCount = 0;
  let companiesTotalNet = 0;

  // Processar cada donant amb transaccions
  for (const [donorId, txs] of txByDonorId) {
    const donor = donorById.get(donorId);
    if (!donor) continue; // Donant no trobat (possiblement eliminat)

    // Classificar transaccions
    const beforeTxs = txs.filter(tx => tx.date < currRange.from);
    const currTxs = txs.filter(tx => isInRange(tx.date, currRange.from, currRange.to));

    // Calcular mètriques
    const hasAnyBefore = beforeTxs.length > 0;
    const hasAnyInCurr = currTxs.length > 0;

    // Suma donacions (amount > 0) dins rang actual
    const sumCurr = currTxs
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Suma devolucions dins rang actual
    const returnsInCurr = currTxs.filter(tx => tx.transactionType === 'return');
    const returnsSum = returnsInCurr.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    // Import net dins període (donacions - devolucions)
    const netAmount = sumCurr - returnsSum;

    // Dates per ordenació
    const firstDateInPeriod = currTxs.length > 0
      ? currTxs.reduce((min, tx) => tx.date < min ? tx.date : min, currTxs[0].date)
      : undefined;
    const lastDateBeforePeriod = beforeTxs.length > 0
      ? beforeTxs.reduce((max, tx) => tx.date > max ? tx.date : max, beforeTxs[0].date)
      : undefined;

    // ═══════════════════════════════════════════════════════════════════════
    // Aplicar definicions
    // ═══════════════════════════════════════════════════════════════════════

    // ALTES: primer moviment dins període (no tenia històric abans)
    if (hasAnyInCurr && !hasAnyBefore) {
      newDonors.push({
        donor,
        firstDateInPeriod,
        sumCurrent: sumCurr
      });
    }

    // SENSE MOVIMENTS: tenia històric però zero dins període actual
    if (hasAnyBefore && !hasAnyInCurr) {
      inactiveDonors.push({
        donor,
        lastDateBeforePeriod
      });
    }

    // AMB DEVOLUCIONS: té almenys una devolució dins el període
    if (returnsInCurr.length > 0) {
      withReturns.push({
        donor,
        returnsSum,
        sumCurrent: sumCurr
      });
    }

    // EMPRESES COL·LABORADORES: company amb almenys 1 moviment elegible dins període
    if (hasAnyInCurr && donor.donorType === 'company') {
      companiesCount++;
      companiesTotalNet += netAmount;
    }

    // TOP DONANTS: acumular net per tots els donants amb activitat al període
    if (hasAnyInCurr) {
      donorNets.push({
        donor,
        netAmount,
        sumCurrent: sumCurr,
        returnsSum: returnsSum > 0 ? returnsSum : undefined
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BAIXES: donants amb status === 'inactive' i inactiveSince dins el període
  // ═══════════════════════════════════════════════════════════════════════════
  const leavers: DonorWithMeta[] = [];
  for (const donor of donors) {
    if (
      donor.status === 'inactive' &&
      donor.inactiveSince &&
      isInRange(donor.inactiveSince.slice(0, 10), currRange.from, currRange.to)
    ) {
      leavers.push({ donor });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Ordenació
  // ═══════════════════════════════════════════════════════════════════════════

  // Altes: per data primer moviment dins període (desc)
  newDonors.sort((a, b) => (b.firstDateInPeriod || '').localeCompare(a.firstDateInPeriod || ''));

  // Sense moviments: per data últim moviment abans del període (desc)
  inactiveDonors.sort((a, b) => (b.lastDateBeforePeriod || '').localeCompare(a.lastDateBeforePeriod || ''));

  // Devolucions: per suma absoluta returns (desc)
  withReturns.sort((a, b) => (b.returnsSum || 0) - (a.returnsSum || 0));

  // Baixes: per data inactiveSince (desc, més recent primer)
  leavers.sort((a, b) =>
    (b.donor.inactiveSince || '').localeCompare(a.donor.inactiveSince || '')
  );

  // Top 15: per netAmount desc, desempat per name asc
  donorNets.sort((a, b) => {
    const diff = (b.netAmount || 0) - (a.netAmount || 0);
    if (diff !== 0) return diff;
    return a.donor.name.localeCompare(b.donor.name);
  });
  const topDonors = donorNets.slice(0, 15);

  return {
    newDonors,
    inactiveDonors,
    withReturns,
    leavers,
    companies: { count: companiesCount, totalNet: companiesTotalNet },
    topDonors
  };
}
