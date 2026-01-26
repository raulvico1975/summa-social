// ═══════════════════════════════════════════════════════════════════════════════
// MODEL 182 AEAT - Export fitxer oficial per a Seu Electrònica
// ═══════════════════════════════════════════════════════════════════════════════
// Format de longitud fixa (250 caràcters per línia) segons especificacions AEAT
// Codificació: ISO-8859-1 (Latin-1)
// ═══════════════════════════════════════════════════════════════════════════════

import { removeAccents } from './normalize';
import type { Organization } from './data';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DonationReportRow {
  donor: {
    name: string;
    taxId?: string;
    zipCode?: string;
    donorType?: 'individual' | 'company';
  };
  totalAmount: number;
  previousYearAmount?: number;
  twoYearsAgoAmount?: number;
}

export interface AEATExportResult {
  content: string;
  errors: string[];           // Errors bloquejants (org o cap donant vàlid)
  excluded: string[];         // Donants exclosos (informatiu): "Nom" (motiu1; motiu2)
  includedCount: number;      // Donants inclosos al fitxer
  excludedCount: number;      // Donants exclosos
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const RECORD_LENGTH = 250;
const CRLF = '\r\n';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - ENCODING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Codifica un string a bytes ISO-8859-1 (Latin-1)
 * FALLA si detecta caràcter > 255 (error de sanitize previ)
 */
export function encodeLatin1(content: string): { bytes: Uint8Array; error: string | null } {
  const bytes = new Uint8Array(content.length);
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    if (code > 255) {
      return {
        bytes: new Uint8Array(0),
        error: `Caràcter no vàlid per ISO-8859-1 a posició ${i}: '${content[i]}' (code ${code})`,
      };
    }
    bytes[i] = code;
  }
  return { bytes, error: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - FORMATADORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Neteja text per camp alfanumèric AEAT:
 * - Majúscules
 * - Sense accents
 * - Només A-Z, 0-9, espai
 * - Talla a longitud màxima i fa padding amb espais
 */
export function sanitizeAlpha(str: string | undefined | null, maxLen: number): string {
  if (!str) return ' '.repeat(maxLen);
  const clean = removeAccents(str)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.substring(0, maxLen).padEnd(maxLen, ' ');
}

/**
 * Inverteix "Nom Cognom1 Cognom2" → "Cognom1 Cognom2 Nom"
 * Assumeix que la primera paraula és el nom
 */
export function invertName(name: string | undefined | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const firstName = parts[0];
  const surnames = parts.slice(1).join(' ');
  return `${surnames} ${firstName}`;
}

/**
 * Normalitza sufixos legals de persones jurídiques
 * "S A" → "SA", "S L" → "SL", "S L U" → "SLU"
 * Evita error 20701 AEAT per separacions artificials
 */
export function normalizeLegalSuffixes(name: string): string {
  return name
    .replace(/\bS\s+L\s+U\b/gi, 'SLU')
    .replace(/\bS\s+L\b/gi, 'SL')
    .replace(/\bS\s+A\b/gi, 'SA');
}

/**
 * Formata NIF a 9 posicions
 * Retorna { value, error } per validació estricta
 * MAI "arregla" longitud incorrecta (no maquilla errors)
 */
export function formatNIF(nif: string | undefined | null): { value: string; error: string | null } {
  if (!nif || !nif.trim()) return { value: '000000000', error: 'NIF buit' };
  const clean = nif.replace(/[\s\-\.]/g, '').toUpperCase();
  // Només A-Z i 0-9
  if (!/^[A-Z0-9]+$/.test(clean)) {
    return { value: '000000000', error: `NIF amb caràcters invàlids: ${nif}` };
  }
  // Ha de tenir EXACTAMENT 9 caràcters - no arreglem mai
  if (clean.length !== 9) {
    return { value: '000000000', error: `NIF amb longitud incorrecta (${clean.length}): ${nif}` };
  }
  return { value: clean, error: null };
}

/**
 * Formata telèfon a 9 dígits numèrics
 * Elimina tots els no-dígits, gestiona prefixos +34/0034
 * Retorna zeros si buit o invàlid
 */
export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '000000000';
  // Eliminar TOT excepte dígits
  let digits = phone.replace(/\D/g, '');
  // Gestionar prefix 34 (11 dígits: 34 + 9)
  if (digits.length === 11 && digits.startsWith('34')) {
    digits = digits.slice(2);
  }
  // Gestionar prefix 0034 (13 dígits: 0034 + 9) - poc probable però per seguretat
  if (digits.length === 13 && digits.startsWith('0034')) {
    digits = digits.slice(4);
  }
  // Si no són exactament 9 dígits → zeros
  if (digits.length !== 9) return '000000000';
  return digits;
}

/**
 * Formata import monetari per AEAT
 * Sense decimals visibles (2 decimals implícits)
 * Exemple: 1234.56 → "000000000123456" (15 posicions)
 */
export function formatAmount(amount: number, length: number): string {
  // Multiplicar per 100 per obtenir cèntims, arrodonir
  const cents = Math.round(amount * 100);
  return cents.toString().padStart(length, '0');
}

/**
 * Formata número amb zeros a l'esquerra
 */
export function padZeros(num: number, length: number): string {
  return num.toString().padStart(length, '0');
}

/**
 * Percentatge deducció AEAT (camp 79–83)
 *
 * PERSONA FÍSICA (IRPF):
 * - primers 250€ → 80%
 * - resta:
 *   - 40% normal
 *   - 45% si recurrent (>2 anys seguits)
 *
 * PERSONA JURÍDICA (IS):
 * - 40% normal
 * - 50% si recurrent (>2 anys mateix o superior import)
 *
 * Retorna string 5 posicions: 3 enters + 2 decimals
 */
export function calculateDeductionPct(
  amount: number,
  donorType: 'individual' | 'company',
  isRecurrent: boolean
): string {
  // PERSONA FÍSICA (IRPF)
  if (donorType === 'individual') {
    if (amount <= 250) return '08000'; // 80.00%
    return isRecurrent ? '04500' : '04000'; // 45% o 40%
  }

  // PERSONA JURÍDICA (IS)
  return isRecurrent ? '05000' : '04000'; // 50% o 40%
}

/**
 * Calcula camp recurrència segons criteri AEAT (només per CLAU A/B/H)
 * "1" = recurrent (valor1>0 i valor2>0)
 * "2" = NO recurrent (valor1=0 i valor2=0)
 * " " = un sol any amb import
 */
export function calculateRecurrence(previousYearAmount: number, twoYearsAgoAmount: number): string {
  if (previousYearAmount > 0 && twoYearsAgoAmount > 0) return '1';
  if (previousYearAmount === 0 && twoYearsAgoAmount === 0) return '2';
  return ' ';
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECORD BUILDER - Constructor de registres de longitud fixa
// ═══════════════════════════════════════════════════════════════════════════════

export class RecordBuilder {
  private buffer: string[];

  constructor() {
    // Inicialitzar buffer amb 250 espais
    this.buffer = new Array(RECORD_LENGTH).fill(' ');
  }

  /**
   * Escriu un valor a partir d'una posició (1-indexed com l'especificació AEAT)
   * @param startPos Posició inicial (1-indexed)
   * @param value Valor a escriure
   * @throws Error si startPos < 1 o si el valor excedeix la posició 250
   */
  setRange(startPos: number, value: string): this {
    const startIdx = startPos - 1; // Convertir a 0-indexed
    const endIdx = startIdx + value.length - 1;

    // Asserts per detectar errors de posicionament en dev/test
    if (startPos < 1) {
      throw new Error(`RecordBuilder: startPos ha de ser >= 1, rebut ${startPos}`);
    }
    if (endIdx >= RECORD_LENGTH) {
      throw new Error(
        `RecordBuilder: valor "${value.substring(0, 20)}${value.length > 20 ? '...' : ''}" (${value.length} chars) a pos ${startPos} excedeix 250 (fins pos ${endIdx + 1})`
      );
    }

    for (let i = 0; i < value.length; i++) {
      this.buffer[startIdx + i] = value[i];
    }
    return this;
  }

  /**
   * Retorna el registre complet de 250 caràcters
   */
  build(): string {
    return this.buffer.join('');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERADORS DE REGISTRES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera registre Tipus 1 (Declarant)
 */
function generateType1Record(
  org: Organization,
  year: number,
  donorCount: number,
  totalAmount: number,
  orgNIF: string,
  justificante13: string
): string {
  const builder = new RecordBuilder();

  builder
    .setRange(1, '1') // Tipus registre
    .setRange(2, '182') // Model
    .setRange(5, padZeros(year, 4)) // Exercici
    .setRange(9, orgNIF) // NIF declarant (ja validat)
    .setRange(18, sanitizeAlpha(org.name, 40)) // Denominació
    .setRange(58, 'T') // Tipus suport (Telemàtic)
    .setRange(59, formatPhone(org.phone)) // Telèfon
    .setRange(68, sanitizeAlpha(invertName(org.signatoryName), 40)) // Cognoms i nom contacte
    .setRange(108, justificante13) // Nº justificant (182 + any + 6 dígits aleatoris)
    .setRange(121, ' ') // Complementària
    .setRange(122, ' ') // Substitutiva
    .setRange(123, '0000000000000') // Justificant anterior
    .setRange(136, padZeros(donorCount, 9)) // Total registres declarats
    .setRange(145, formatAmount(totalAmount, 15)) // Import total
    .setRange(160, '1'); // Naturalesa declarant (1 = Llei 49/2002)
  // 161-237: Blancs (ja inicialitzats)
  // 238-250: Segell electrònic (blancs)

  return builder.build();
}

/**
 * Genera registre Tipus 2 (Declarat)
 */
function generateType2Record(
  org: Organization,
  year: number,
  row: DonationReportRow,
  orgNIF: string,
  donorNIF: string
): string {
  const builder = new RecordBuilder();

  const isRecurrent =
    (row.previousYearAmount ?? 0) > 0 && (row.twoYearsAgoAmount ?? 0) > 0;

  // Codi província: primers 2 dígits del codi postal
  const zipCode = row.donor.zipCode || '';
  const provinceCode = zipCode.replace(/\D/g, '').substring(0, 2).padStart(2, '0');

  // Naturalesa: F = persona física, J = persona jurídica
  const donorType = row.donor.donorType === 'company' ? 'company' : 'individual';
  const naturalesa = donorType === 'company' ? 'J' : 'F';

  // Nom: PJ → denominació social (amb sufixos normalitzats), PF → cognoms + nom (invertit)
  const rawName =
    donorType === 'company'
      ? normalizeLegalSuffixes(row.donor.name)
      : invertName(row.donor.name);
  const nameForAEAT = sanitizeAlpha(rawName, 40);

  builder
    .setRange(1, '2') // Tipus registre
    .setRange(2, '182') // Model
    .setRange(5, padZeros(year, 4)) // Exercici
    .setRange(9, orgNIF) // NIF declarant
    .setRange(18, donorNIF) // NIF declarat
    .setRange(27, ' '.repeat(9)) // NIF representant (buit)
    .setRange(36, nameForAEAT) // Cognoms i nom (PF) o denominació (PJ)
    .setRange(76, provinceCode) // Codi província
    .setRange(78, 'A') // Clau (A = Llei 49/2002, donació no prioritària)
    .setRange(79, calculateDeductionPct(row.totalAmount, donorType, isRecurrent)) // % deducció
    .setRange(84, formatAmount(row.totalAmount, 13)) // Import donació
    .setRange(97, ' ') // En espècie (no)
    .setRange(98, '00') // Codi autonòmic
    .setRange(100, '00000') // % deducció autonòmica
    .setRange(105, naturalesa) // Naturalesa F/J
    .setRange(106, ' ') // Revocació
    .setRange(107, '0000') // Exercici revocació
    .setRange(111, ' ') // Tipus bé espècie
    .setRange(112, ' '.repeat(20)) // Identificació bé
    .setRange(132, calculateRecurrence(row.previousYearAmount ?? 0, row.twoYearsAgoAmount ?? 0)) // Recurrència
    .setRange(133, ' '.repeat(9)) // NIF patrimoni protegit
    .setRange(142, ' '.repeat(40)); // Nom patrimoni protegit
  // 182-250: Blancs (ja inicialitzats)

  return builder.build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓ PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera el fitxer Model 182 en format AEAT (presentació mitjançant fitxer)
 *
 * @param organization Dades de l'organització
 * @param reportData Dades dels donants
 * @param year Any de l'exercici
 * @returns { content, errors, excluded, includedCount, excludedCount }
 *
 * Comportament:
 * - Errors d'organització → bloquejants (no es pot generar registre tipus 1 vàlid)
 * - Errors de donants → exclusions (s'exclouen del fitxer, però es genera igualment)
 * - Si 0 donants vàlids → error (no té sentit generar fitxer buit)
 */
export function generateModel182AEATFile(
  organization: Organization,
  reportData: DonationReportRow[],
  year: number
): AEATExportResult {
  const errors: string[] = [];
  const excluded: string[] = [];

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

  // Si hi ha errors d'organització → retornar immediatament (no processa donants)
  if (errors.length > 0) {
    return {
      content: '',
      errors,
      excluded: [],
      includedCount: 0,
      excludedCount: 0,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VALIDACIÓ DONANTS (NO BLOQUEJANT - EXCLUSIONS)
  // ───────────────────────────────────────────────────────────────────────────

  const validatedDonors: { row: DonationReportRow; nif: string }[] = [];

  for (const row of reportData) {
    const donorName = row.donor.name || 'Sense nom';
    const reasons: string[] = [];

    // Validar NIF
    const nifResult = formatNIF(row.donor.taxId);
    if (nifResult.error) {
      reasons.push(nifResult.error);
    }

    // Validar codi postal (mínim 2 dígits)
    const zipDigits = (row.donor.zipCode || '').replace(/\D/g, '');
    if (zipDigits.length < 2) {
      reasons.push('codi postal incomplet');
    }

    // Validar donorType
    if (row.donor.donorType !== 'individual' && row.donor.donorType !== 'company') {
      reasons.push('tipus (F/J) absent');
    }

    // Si té errors → excloure, si no → afegir a vàlids
    if (reasons.length > 0) {
      excluded.push(`"${donorName}" (${reasons.join('; ')})`);
    } else {
      validatedDonors.push({ row, nif: nifResult.value });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SI 0 DONANTS VÀLIDS → ERROR
  // ───────────────────────────────────────────────────────────────────────────

  if (validatedDonors.length === 0) {
    return {
      content: '',
      errors: ['Cap donant vàlid per exportar'],
      excluded,
      includedCount: 0,
      excludedCount: excluded.length,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GENERAR FITXER (NOMÉS AMB DONANTS VÀLIDS)
  // ───────────────────────────────────────────────────────────────────────────

  const lines: string[] = [];

  // Calcular totals (només dels vàlids)
  const donorCount = validatedDonors.length;
  const totalAmount = validatedDonors.reduce((sum, d) => sum + d.row.totalAmount, 0);

  // Generar justificant: 182 + any (4 dígits) + 6 dígits aleatoris = 13 caràcters
  const rand6 = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  const justificante13 = `182${padZeros(year, 4)}${rand6}`;

  // Registre Tipus 1 (Declarant)
  lines.push(generateType1Record(organization, year, donorCount, totalAmount, orgNIFResult.value, justificante13));

  // Registres Tipus 2 (Declarats)
  for (const { row, nif } of validatedDonors) {
    lines.push(generateType2Record(organization, year, row, orgNIFResult.value, nif));
  }

  // Unir amb CRLF
  const content = lines.join(CRLF) + CRLF;

  return {
    content,
    errors: [],
    excluded,
    includedCount: validatedDonors.length,
    excludedCount: excluded.length,
  };
}
