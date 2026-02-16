// ═══════════════════════════════════════════════════════════════════════════════
// MODEL 347 AEAT — Export fitxer oficial per a Seu Electrònica
// ═══════════════════════════════════════════════════════════════════════════════
// Format de longitud fixa (500 caràcters per línia) segons especificacions AEAT
// Referència: "Modelo 347 — Ejercicio 2025 y siguientes — Diseños lógicos"
// Codificació: ISO-8859-1 (Latin-1)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  sanitizeAlpha,
  formatNIF,
  formatPhone,
  formatAmount,
  padZeros,
  encodeLatin1,
} from '@/lib/model182-aeat';
import type { Organization } from '@/lib/data';
import type { SupplierAggregate } from './model347';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

export type AEAT347SupplierIssueCode =
  | 'TAXID_EMPTY'
  | 'TAXID_INVALID_CHARS'
  | 'TAXID_INVALID_LENGTH';

export interface AEAT347ExcludedSupplier {
  name: string;
  taxIdRaw: string;
  issueCodes: AEAT347SupplierIssueCode[];
  issueMeta?: { taxIdLength?: number };
}

export interface AEAT347ExportResult {
  content: string;
  errors: string[];
  excluded: AEAT347ExcludedSupplier[];
  includedCount: number;
  excludedCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const RECORD_LENGTH = 500;
const CRLF = '\r\n';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Signe AEAT: "N" si negatiu, " " si positiu o zero.
 * Per Model 347, els imports normals són sempre positius (abs),
 * però mantenim el suport per si cal ajustar.
 */
function formatSign(amount: number): string {
  return amount < 0 ? 'N' : ' ';
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECORD BUILDER 347 — 500 posicions
// ═══════════════════════════════════════════════════════════════════════════════

class RecordBuilder347 {
  private buffer: string[];

  constructor() {
    this.buffer = new Array(RECORD_LENGTH).fill(' ');
  }

  /**
   * Escriu un valor a partir d'una posició (1-indexed com l'especificació AEAT)
   */
  setRange(startPos: number, value: string): this {
    const startIdx = startPos - 1;
    const endIdx = startIdx + value.length - 1;

    if (startPos < 1) {
      throw new Error(`RecordBuilder347: startPos ha de ser >= 1, rebut ${startPos}`);
    }
    if (endIdx >= RECORD_LENGTH) {
      throw new Error(
        `RecordBuilder347: valor (${value.length} chars) a pos ${startPos} excedeix ${RECORD_LENGTH}`
      );
    }

    for (let i = 0; i < value.length; i++) {
      this.buffer[startIdx + i] = value[i];
    }
    return this;
  }

  build(): string {
    return this.buffer.join('');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERADORS DE REGISTRES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera registre Tipus 1 (Declarant) — 500 chars
 */
function generateType1Record(
  org: Organization,
  year: number,
  declaradosCount: number,
  totalAmount: number,
  orgNIF: string,
  justificante13: string
): string {
  const builder = new RecordBuilder347();

  builder
    .setRange(1, '1')                                          // Tipus registre
    .setRange(2, '347')                                        // Model
    .setRange(5, padZeros(year, 4))                            // Exercici
    .setRange(9, orgNIF)                                       // NIF declarant
    .setRange(18, sanitizeAlpha(org.name, 40))                 // Denominació
    .setRange(58, 'T')                                         // Tipus suport (Telemàtic)
    .setRange(59, formatPhone(org.phone))                      // Telèfon contacte
    .setRange(68, sanitizeAlpha(org.signatoryName, 40))        // Nom contacte
    .setRange(108, justificante13)                             // Nº justificant
    // 121-122: Complementària/Substitutiva (blancs)
    .setRange(123, '0000000000000')                            // Justificant anterior
    .setRange(136, padZeros(declaradosCount, 9))               // Total declarats
    .setRange(145, formatSign(totalAmount))                    // Signe import total
    .setRange(146, formatAmount(Math.abs(totalAmount), 15))    // Import total
    .setRange(161, '000000000')                                // Total immobles
    .setRange(170, ' ')                                        // Signe arrendaments
    .setRange(171, '000000000000000')                          // Import arrendaments
    // 186-390: Blancs (ja inicialitzats)
    // 391-399: NIF representant (blancs)
    // 400-487: Blancs
    // 488-500: Segell electrònic (blancs)
    ;

  return builder.build();
}

/**
 * Genera registre Tipus 2 (Declarat) — 500 chars
 *
 * NOTA: Camps que Summa no pot omplir (província, país, metàl·lic, immobles)
 * s'omplen amb zeros o blancs segons el disseny de registre oficial.
 */
function generateType2Record(
  orgNIF: string,
  year: number,
  supplierNIF: string,
  supplierName: string,
  claveOperacion: 'A' | 'B',
  q1: number,
  q2: number,
  q3: number,
  q4: number,
  total: number
): string {
  const builder = new RecordBuilder347();

  builder
    .setRange(1, '2')                                          // Tipus registre
    .setRange(2, '347')                                        // Model
    .setRange(5, padZeros(year, 4))                            // Exercici
    .setRange(9, orgNIF)                                       // NIF declarant
    .setRange(18, supplierNIF)                                 // NIF declarat
    // 27-35: NIF representant (blancs)
    .setRange(36, sanitizeAlpha(supplierName, 40))             // Nom declarat
    .setRange(76, 'D')                                         // Tipus full (D = declarat)
    .setRange(77, '00')                                        // Codi província (no disponible)
    // 79-80: País (blancs — operacions nacionals)
    // 81: Blanc
    .setRange(82, claveOperacion)                              // Clau operació: A o B
    .setRange(83, formatSign(total))                           // Signe import anual
    .setRange(84, formatAmount(Math.abs(total), 15))           // Import anual
    // 99: Op. assegurança (blanc)
    // 100: Arrend. local (blanc)
    .setRange(101, '000000000000000')                          // Import metàl·lic
    .setRange(116, ' ')                                        // Signe immobles
    .setRange(117, '000000000000000')                          // Import immobles
    .setRange(132, '0000')                                     // Exercici import
    // ── Trimestres ──
    .setRange(136, formatSign(q1))                             // Signe Q1
    .setRange(137, formatAmount(Math.abs(q1), 15))             // Import Q1
    .setRange(152, ' ')                                        // Signe immob Q1
    .setRange(153, '000000000000000')                          // Import immob Q1
    .setRange(168, formatSign(q2))                             // Signe Q2
    .setRange(169, formatAmount(Math.abs(q2), 15))             // Import Q2
    .setRange(184, ' ')                                        // Signe immob Q2
    .setRange(185, '000000000000000')                          // Import immob Q2
    .setRange(200, formatSign(q3))                             // Signe Q3
    .setRange(201, formatAmount(Math.abs(q3), 15))             // Import Q3
    .setRange(216, ' ')                                        // Signe immob Q3
    .setRange(217, '000000000000000')                          // Import immob Q3
    .setRange(232, formatSign(q4))                             // Signe Q4
    .setRange(233, formatAmount(Math.abs(q4), 15))             // Import Q4
    .setRange(248, ' ')                                        // Signe immob Q4
    .setRange(249, '000000000000000')                          // Import immob Q4
    // 264-280: NIF operador comunitari (blancs)
    // 281: Op. criteri caixa (blanc)
    // 282: Op. inv. subjecte passiu (blanc)
    // 283: Op. béns vinculats (blanc)
    .setRange(284, ' ')                                        // Signe criteri caixa
    .setRange(285, '000000000000000')                          // Import criteri caixa
    .setRange(300, '000000')                                   // N. convocatòria BDNS (2025+)
    // 306-500: Blancs/reservat (ja inicialitzats)
    ;

  return builder.build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓ PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera el fitxer Model 347 en format AEAT (presentació mitjançant fitxer)
 *
 * Comportament:
 * - Errors d'organització → bloquejants
 * - Errors de proveïdors (NIF invàlid) → exclusions no bloquejants
 * - Si 0 proveïdors vàlids → error
 */
export function generateModel347AEATFile(
  organization: Organization,
  expenses: SupplierAggregate[],
  income: SupplierAggregate[],
  year: number
): AEAT347ExportResult {
  const errors: string[] = [];
  const excluded: AEAT347ExcludedSupplier[] = [];

  // ───────────────────────────────────────────────────────────────────────────
  // VALIDACIÓ ORGANITZACIÓ (BLOQUEJANT)
  // ───────────────────────────────────────────────────────────────────────────

  const orgNIFResult = formatNIF(organization.taxId);
  if (orgNIFResult.error) {
    errors.push(`CIF de l'organització invàlid: ${orgNIFResult.error}`);
  }

  if (!organization.name?.trim()) {
    errors.push("Falta denominació de l'organització");
  }

  if (!organization.signatoryName?.trim()) {
    errors.push('Falta persona de contacte (Configuració > Signant)');
  }

  if (errors.length > 0) {
    return { content: '', errors, excluded: [], includedCount: 0, excludedCount: 0 };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VALIDACIÓ PROVEÏDORS (NO BLOQUEJANT)
  // ───────────────────────────────────────────────────────────────────────────

  const allAggregates = [
    ...expenses.map(a => ({ ...a, clave: 'A' as const })),
    ...income.map(a => ({ ...a, clave: 'B' as const })),
  ];

  const validatedRecords: {
    aggregate: SupplierAggregate;
    nif: string;
    clave: 'A' | 'B';
  }[] = [];

  // Dedup exclusions per NIF (un proveïdor pot aparèixer amb clave A i B)
  const excludedContactIds = new Set<string>();

  for (const item of allAggregates) {
    const nifResult = formatNIF(item.taxId || undefined);

    if (nifResult.error) {
      // Només afegir a exclosos una vegada per contactId
      if (!excludedContactIds.has(item.contactId)) {
        excludedContactIds.add(item.contactId);

        const issueCodes: AEAT347SupplierIssueCode[] = [];
        const issueMeta: { taxIdLength?: number } = {};

        if (!item.taxId || !item.taxId.trim()) {
          issueCodes.push('TAXID_EMPTY');
        } else {
          const clean = item.taxId.replace(/[\s\-.]/g, '');
          if (!/^[A-Za-z0-9]+$/.test(clean)) {
            issueCodes.push('TAXID_INVALID_CHARS');
          } else if (clean.length !== 9) {
            issueCodes.push('TAXID_INVALID_LENGTH');
            issueMeta.taxIdLength = clean.length;
          }
        }

        excluded.push({
          name: item.name || 'Sense nom',
          taxIdRaw: item.taxId ?? '',
          issueCodes,
          ...(Object.keys(issueMeta).length > 0 ? { issueMeta } : {}),
        });
      }
      continue;
    }

    validatedRecords.push({
      aggregate: item,
      nif: nifResult.value,
      clave: item.clave,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SI 0 PROVEÏDORS VÀLIDS → ERROR
  // ───────────────────────────────────────────────────────────────────────────

  if (validatedRecords.length === 0) {
    return {
      content: '',
      errors: ['Cap proveïdor vàlid per exportar'],
      excluded,
      includedCount: 0,
      excludedCount: excluded.length,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GENERAR FITXER
  // ───────────────────────────────────────────────────────────────────────────

  const lines: string[] = [];

  // Totals per al registre tipus 1
  const totalAmount = validatedRecords.reduce(
    (sum, r) => sum + r.aggregate.quarters.total,
    0
  );

  // Justificant: 347 + any (4 dígits) + 6 dígits aleatoris = 13 caràcters
  const rand6 = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  const justificante13 = `347${padZeros(year, 4)}${rand6}`;

  // Registre Tipus 1 (Declarant)
  lines.push(
    generateType1Record(
      organization,
      year,
      validatedRecords.length,
      totalAmount,
      orgNIFResult.value,
      justificante13
    )
  );

  // Registres Tipus 2 (Declarats)
  for (const { aggregate, nif, clave } of validatedRecords) {
    lines.push(
      generateType2Record(
        orgNIFResult.value,
        year,
        nif,
        aggregate.name,
        clave,
        aggregate.quarters.q1,
        aggregate.quarters.q2,
        aggregate.quarters.q3,
        aggregate.quarters.q4,
        aggregate.quarters.total
      )
    );
  }

  // Unir amb CRLF
  const content = lines.join(CRLF) + CRLF;

  return {
    content,
    errors: [],
    excluded,
    includedCount: validatedRecords.length,
    excludedCount: excluded.length,
  };
}

// Re-exportar encodeLatin1 per comoditat del component
export { encodeLatin1 } from '@/lib/model182-aeat';
