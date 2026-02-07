// src/lib/project-module/normalize-assignments.ts
// Normalització i validació d'assignacions de despeses a projectes.
// Dues funcions:
//   - normalizeAssignments(): amb context de despesa (FX vs EUR) i mode
//   - validateAssignments(): validació estructural sense context (per hook)

import type { ExpenseAssignment } from '@/lib/project-module-types';

// ─── Tipus ───────────────────────────────────────────────────────────────────

export interface NormalizeContext {
  /** true si la despesa té originalAmount + originalCurrency != EUR */
  isFx: boolean;
  /** Math.abs(expense.amountEUR) — import total de la despesa en EUR */
  totalAmountEURAbs: number;
}

/**
 * - 'preservePartial': manté percentatges existents, la resta queda lliure (ex: eliminar assignació)
 * - 'force100': força 100% si queda 1 sola assignació (ex: assign100, bulkAssign)
 */
export type NormalizeMode = 'preservePartial' | 'force100';

export interface NormalizeResult {
  assignments: ExpenseAssignment[];
  isValid: boolean;
  errors: string[];
}

export interface ValidateResult {
  isValid: boolean;
  errors: string[];
}

// ─── normalizeAssignments ────────────────────────────────────────────────────

export function normalizeAssignments(
  assignments: ExpenseAssignment[],
  ctx: NormalizeContext,
  mode: NormalizeMode,
): NormalizeResult {
  const errors: string[] = [];

  // 1. Filtrar assignacions amb projectId buit
  let cleaned = assignments.filter(a => a.projectId && a.projectId.trim() !== '');

  // 2. Deduplicar per projectId (mantenir primera)
  const seen = new Set<string>();
  const deduped: ExpenseAssignment[] = [];
  for (const a of cleaned) {
    if (seen.has(a.projectId)) {
      errors.push(`Duplicat projectId: ${a.projectId}`);
      continue;
    }
    seen.add(a.projectId);
    deduped.push(a);
  }
  cleaned = deduped;

  // Si no queda res, retornar buit (vàlid — vol dir "desassignar")
  if (cleaned.length === 0) {
    return { assignments: [], isValid: true, errors: [] };
  }

  // 3. Si queda 1 sola assignació i mode 'force100' → promoure a 100%
  if (cleaned.length === 1 && mode === 'force100') {
    const a = cleaned[0];

    if (ctx.isFx) {
      // FX: forçar localPct = 100
      const oldPct = a.localPct;
      let newAmountEUR = a.amountEUR;

      // Recàlcul proporcional NOMÉS amb guardrails forts
      if (
        a.amountEUR != null &&
        oldPct != null &&
        oldPct > 0 &&
        oldPct <= 100 &&
        oldPct !== 100 &&
        Number.isFinite(a.amountEUR) &&
        Math.abs(a.amountEUR) > 0
      ) {
        newAmountEUR = a.amountEUR * (100 / oldPct);
        // Assegurar signe negatiu
        if (newAmountEUR > 0) newAmountEUR = -newAmountEUR;
      }
      // Si amountEUR és null → deixar null (TC pendent)

      cleaned = [{ ...a, localPct: 100, amountEUR: newAmountEUR }];
    } else {
      // EUR: forçar amountEUR al total
      cleaned = [{ ...a, amountEUR: -ctx.totalAmountEURAbs }];
    }
  }
  // mode 'preservePartial': NO tocar res — manté percentatge i amountEUR existents

  // 4. Validacions

  // 4a. localPct dins [0, 100]
  for (const a of cleaned) {
    if (a.localPct != null && (a.localPct < 0 || a.localPct > 100)) {
      errors.push(`localPct fora de rang: ${a.localPct} (${a.projectName})`);
    }
  }

  // 4b. FX: suma localPct <= 100.01
  if (ctx.isFx) {
    const totalPct = cleaned.reduce((s, a) => s + (a.localPct ?? 0), 0);
    if (totalPct > 100.01) {
      errors.push(`Suma localPct (${totalPct.toFixed(2)}) supera 100%`);
    }
  }

  // 4c. amountEUR: null o <= 0
  for (const a of cleaned) {
    if (a.amountEUR != null && a.amountEUR > 0) {
      errors.push(`amountEUR positiu: ${a.amountEUR} (${a.projectName})`);
    }
  }

  return {
    assignments: cleaned,
    isValid: errors.length === 0,
    errors,
  };
}

// ─── validateAssignments ─────────────────────────────────────────────────────

export function validateAssignments(assignments: ExpenseAssignment[]): ValidateResult {
  const errors: string[] = [];

  const seen = new Set<string>();
  for (const a of assignments) {
    // projectId no buit
    if (!a.projectId || a.projectId.trim() === '') {
      errors.push('projectId buit');
    }

    // No duplicats
    if (seen.has(a.projectId)) {
      errors.push(`projectId duplicat: ${a.projectId}`);
    }
    seen.add(a.projectId);

    // amountEUR: null o <= 0
    if (a.amountEUR != null && a.amountEUR > 0) {
      errors.push(`amountEUR positiu: ${a.amountEUR}`);
    }

    // localPct si existeix: [0, 100]
    if (a.localPct != null && (a.localPct < 0 || a.localPct > 100)) {
      errors.push(`localPct fora de rang: ${a.localPct}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
