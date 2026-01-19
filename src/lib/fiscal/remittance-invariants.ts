/**
 * Invariants per remeses IN i devolucions
 *
 * Aquests invariants garanteixen la consistència de les dades fiscals
 * i són BLOQUEJANTS: si fallen, l'operació s'aborta.
 *
 * Invariants implementats:
 * - R-SUM-1: Suma de filles ≈ amount del pare (±0.02€)
 * - R-COUNT-1: transactionIds.length === filles actives reals
 * - R-IDEMP-1: Si inputHash coincideix, operació és idempotent
 */

import { createHash } from 'crypto';

// =============================================================================
// TIPUS
// =============================================================================

export interface HashableItem {
  contactId: string;
  amountCents: number;
  iban?: string | null;
  taxId?: string | null;
  sourceRowIndex?: number;
}

export interface RemittanceInvariantContext {
  orgId: string;
  remittanceId: string;
  operation: 'process' | 'undo' | 'repair';
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Tolerància per arrodoniments bancaris (±0.02€ = 2 cèntims) */
export const SUM_TOLERANCE_CENTS = 2;

// =============================================================================
// INPUT HASH (SHA-256, server-side)
// =============================================================================

/**
 * Hash canònic per idempotència.
 * NOMÉS el servidor l'usa per decisions d'idempotència.
 *
 * El hash inclou:
 * - parentTxId
 * - Per cada item: contactId, amountCents, iban, taxId, sourceRowIndex
 *
 * Els items es normalitzen i s'ordenen per garantir determinisme.
 */
export function computeInputHashServer(
  parentTxId: string,
  items: HashableItem[]
): string {
  // Normalitzar cada item per determinisme
  const normalized = items.map((i) => ({
    c: i.contactId,
    a: i.amountCents,
    i: (i.iban ?? '').replace(/\s+/g, '').toUpperCase(),
    t: (i.taxId ?? '').replace(/\s+/g, '').toUpperCase(),
    r: i.sourceRowIndex ?? 0,
  }));

  // Ordenar per concatenació de camps per garantir ordre estable
  normalized.sort((x, y) =>
    `${x.c}${x.a}${x.i}${x.t}${x.r}`.localeCompare(
      `${y.c}${y.a}${y.i}${y.t}${y.r}`
    )
  );

  const raw = JSON.stringify({ parentTxId, normalized });
  return createHash('sha256').update(raw).digest('hex');
}

// =============================================================================
// ERROR D'INVARIANT
// =============================================================================

export type InvariantCode = 'R-SUM-1' | 'R-COUNT-1' | 'R-IDEMP-1';

/**
 * Error específic per invariants trencats.
 * Conté el codi de l'invariant i detalls per debugging.
 */
export class RemittanceInvariantError extends Error {
  public readonly code: InvariantCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: InvariantCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'RemittanceInvariantError';
    this.code = code;
    this.details = details;
  }
}

// =============================================================================
// INVARIANTS (BLOQUEJANTS)
// =============================================================================

/**
 * R-SUM-1: Suma de filles ≈ amount del pare (±0.02€)
 *
 * Tolerància per arrodoniments bancaris típics.
 * Si falla → ABORT operació, no deixar dades a mig.
 *
 * @throws RemittanceInvariantError si la suma no quadra
 */
export function assertSumInvariant(
  parentAmountCents: number,
  childrenSumCents: number
): void {
  const parentAbs = Math.abs(parentAmountCents);
  const childrenAbs = Math.abs(childrenSumCents);
  const deltaCents = Math.abs(parentAbs - childrenAbs);

  if (deltaCents > SUM_TOLERANCE_CENTS) {
    throw new RemittanceInvariantError(
      'R-SUM-1',
      `Suma filles (${childrenAbs} cèntims) no quadra amb pare (${parentAbs} cèntims). Delta: ${deltaCents} cèntims, tolerància: ${SUM_TOLERANCE_CENTS}`,
      {
        parentAmountCents: parentAbs,
        childrenSumCents: childrenAbs,
        deltaCents,
        tolerance: SUM_TOLERANCE_CENTS,
      }
    );
  }
}

/**
 * R-COUNT-1: transactionIds.length === filles actives reals
 *
 * Garanteix que el document de remesa i les filles estan sincronitzats.
 * Si falla → ABORT operació i rollback.
 *
 * @throws RemittanceInvariantError si els comptadors no quadren
 */
export function assertCountInvariant(
  transactionIds: string[],
  activeChildCount: number
): void {
  if (transactionIds.length !== activeChildCount) {
    throw new RemittanceInvariantError(
      'R-COUNT-1',
      `transactionIds (${transactionIds.length}) ≠ filles actives (${activeChildCount})`,
      {
        transactionIdsLength: transactionIds.length,
        activeChildCount,
      }
    );
  }
}

/**
 * R-IDEMP-1: Comprovar si una operació és idempotent
 *
 * Retorna si cal processar o si ja s'ha processat amb el mateix hash.
 *
 * @returns shouldProcess: true si cal processar, false si és idempotent
 */
export function checkIdempotence(
  existingHash: string | null | undefined,
  newHash: string,
  existingStatus?: string
): { shouldProcess: boolean; reason: string } {
  // Si no hi ha hash existent, cal processar
  if (!existingHash) {
    return { shouldProcess: true, reason: 'No existeix hash anterior' };
  }

  // Si l'status és 'undone', cal reprocessar encara que el hash coincideixi
  if (existingStatus === 'undone') {
    return { shouldProcess: true, reason: 'Remesa prèviament desfeta' };
  }

  // Si el hash coincideix, és idempotent
  if (existingHash === newHash) {
    return {
      shouldProcess: false,
      reason: `Remesa ja processada amb hash ${newHash.slice(0, 8)}...`,
    };
  }

  // Hash diferent: cal reprocessar (això és un repair implícit)
  return {
    shouldProcess: true,
    reason: 'Hash diferent, cal reprocessar',
  };
}

// =============================================================================
// UTILITATS
// =============================================================================

/**
 * Suma els amountCents d'una llista d'items
 */
export function sumCents(items: Array<{ amountCents: number }>): number {
  return items.reduce((acc, item) => acc + item.amountCents, 0);
}

/**
 * Converteix euros a cèntims (arrodonint)
 */
export function toCents(amountEuros: number): number {
  return Math.round(amountEuros * 100);
}

/**
 * Converteix cèntims a euros
 */
export function toEuros(amountCents: number): number {
  return amountCents / 100;
}
