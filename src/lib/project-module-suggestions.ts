// src/lib/project-module-suggestions.ts
// Utilitats per generar propostes automàtiques de despeses per quadrar partides

import type { UnifiedExpense, BudgetLine } from './project-module-types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

export interface ScoredExpense {
  expense: UnifiedExpense;
  score: number;
  hasDocument: boolean;
  assignedToOtherProject: string | null;
}

export interface SuggestionProposal {
  id: string;
  expenses: ScoredExpense[];
  sumEUR: number;
  deltaEUR: number; // |sumEUR - deficit|
  label: 'perfect' | 'close' | 'approx';
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPS HEURÍSTICS PER MATCHING
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORY_FAMILIES: Record<string, string[]> = {
  viatges: [
    'transport', 'vol', 'vols', 'dietes', 'dieta', 'allotjament', 'hotel',
    'desplaçament', 'taxi', 'tren', 'avió', 'bitllet', 'vehicle', 'gasolina',
    'km', 'quilòmetre', 'viatjar', 'viatge', 'missió', 'terreny',
  ],
  personal: [
    'nòmina', 'nòmines', 'salari', 'salaris', 'rrhh', 'sou', 'sous',
    'seguretat social', 'ss', 'retribució', 'remuneració', 'personal',
    'contracte', 'treballador', 'empleat',
  ],
  serveis: [
    'consultoria', 'assessorament', 'assessoria', 'serveis', 'honoraris',
    'professional', 'extern', 'subcontracte', 'lloguer', 'alquiler',
  ],
  material: [
    'subministrament', 'subministraments', 'fungible', 'material', 'oficina',
    'papereria', 'impressió', 'equip', 'equipament', 'ordinador', 'software',
  ],
  formacio: [
    'formació', 'curs', 'cursos', 'capacitació', 'taller', 'seminari',
    'workshop', 'educació', 'aprenentatge',
  ],
  comunicacio: [
    'comunicació', 'màrqueting', 'publicitat', 'difusió', 'xarxes', 'web',
    'disseny', 'gràfic', 'impremta', 'fulletó', 'cartell',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula un score de "ressonància" entre una despesa i una partida.
 * Com més alt el score, més probable que la despesa encaixi a la partida.
 */
export function scoreExpenseForLine(
  expense: UnifiedExpense,
  line: BudgetLine,
  options?: {
    deficit?: number;
    hasDocument?: boolean;
    assignedToOtherProject?: boolean;
  }
): number {
  let score = 0;

  // Textos a cercar
  const expenseTexts = [
    expense.categoryName?.toLowerCase() ?? '',
    expense.counterpartyName?.toLowerCase() ?? '',
    expense.description?.toLowerCase() ?? '',
  ].join(' ');

  const lineTexts = [
    line.name.toLowerCase(),
    line.code?.toLowerCase() ?? '',
  ].join(' ');

  // +3 per coincidència de categoria amb família
  for (const [family, keywords] of Object.entries(CATEGORY_FAMILIES)) {
    const lineHasFamily = keywords.some(kw => lineTexts.includes(kw)) || lineTexts.includes(family);
    const expenseHasFamily = keywords.some(kw => expenseTexts.includes(kw));

    if (lineHasFamily && expenseHasFamily) {
      score += 3;
      break; // Només una família
    }
  }

  // +2 per coincidència de counterpartyName amb keywords de la partida
  const lineWords = lineTexts.split(/\s+/).filter(w => w.length > 2);
  for (const word of lineWords) {
    if (expense.counterpartyName?.toLowerCase().includes(word)) {
      score += 2;
      break;
    }
  }

  // +2 per coincidència de description amb keywords de la partida
  for (const word of lineWords) {
    if (expense.description?.toLowerCase().includes(word)) {
      score += 2;
      break;
    }
  }

  // +1 si import ≤ deficit (encaixa bé)
  if (options?.deficit && Math.abs(expense.amountEUR) <= options.deficit) {
    score += 1;
  }

  // −3 si assignada a altre projecte (risc de desquadrar)
  if (options?.assignedToOtherProject) {
    score -= 3;
  }

  // −2 si sense document (potser no justificable)
  if (options?.hasDocument === false) {
    score -= 2;
  }

  return score;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBINACIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Troba les millors combinacions de despeses que sumin prop del dèficit.
 * Retorna 3-6 propostes ordenades per qualitat.
 */
export function findBestCombinations(
  scoredExpenses: ScoredExpense[],
  deficit: number,
  toleranceEUR: number = Math.max(2, deficit * 0.02)
): SuggestionProposal[] {
  // Agafar top 30 per score (limitar espai de cerca)
  const candidates = [...scoredExpenses]
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  if (candidates.length === 0) return [];

  const proposals: SuggestionProposal[] = [];
  const seenSums = new Set<string>(); // Evitar duplicats per suma similar

  // Provar combinacions de mida 1 → 4
  for (let size = 1; size <= Math.min(4, candidates.length); size++) {
    const combinations = getCombinations(candidates, size);

    for (const combo of combinations) {
      const sum = combo.reduce((acc, exp) => acc + Math.abs(exp.expense.amountEUR), 0);
      const delta = Math.abs(sum - deficit);

      // Key per evitar duplicats molt similars
      const sumKey = sum.toFixed(0);
      if (seenSums.has(sumKey)) continue;

      // Classificar
      let label: 'perfect' | 'close' | 'approx';
      if (delta <= 0.50) {
        label = 'perfect';
      } else if (delta <= toleranceEUR) {
        label = 'close';
      } else {
        label = 'approx';
      }

      // Només afegir si és raonable
      if (label === 'perfect' || label === 'close' || proposals.length < 6) {
        seenSums.add(sumKey);
        proposals.push({
          id: `proposal-${combo.map(e => e.expense.txId).join('-')}`,
          expenses: combo,
          sumEUR: sum,
          deltaEUR: delta,
          label,
        });
      }
    }
  }

  // Ordenar: perfect > close > approx, després per delta ascendent
  const labelOrder = { perfect: 0, close: 1, approx: 2 };
  proposals.sort((a, b) => {
    if (labelOrder[a.label] !== labelOrder[b.label]) {
      return labelOrder[a.label] - labelOrder[b.label];
    }
    return a.deltaEUR - b.deltaEUR;
  });

  // Retornar 3-6 propostes
  return proposals.slice(0, 6);
}

/**
 * Genera totes les combinacions de mida `size` d'un array.
 * Limitat per rendiment.
 */
function getCombinations<T>(arr: T[], size: number): T[][] {
  if (size === 1) {
    return arr.map(item => [item]);
  }

  const result: T[][] = [];
  const maxIterations = 1000; // Límit de seguretat
  let iterations = 0;

  function backtrack(start: number, current: T[]) {
    if (iterations >= maxIterations) return;

    if (current.length === size) {
      result.push([...current]);
      iterations++;
      return;
    }

    for (let i = start; i < arr.length; i++) {
      if (iterations >= maxIterations) break;
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formata un import en format moneda EUR
 */
export function formatAmountEUR(amount: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
