/**
 * Generador de fitxers XML SEPA pain.008 (Direct Debit Initiation)
 * Format: ISO 20022 pain.008.001.02
 *
 * Referència: Golden sample analitzat del client real
 */

import type {
  SepaCollectionRun,
  SepaCollectionItem,
  SepaSequenceType,
} from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PAIN008_NAMESPACE = 'urn:iso:std:iso:20022:tech:xsd:pain.008.001.02';
const PAYMENT_METHOD = 'DD'; // Direct Debit
const SERVICE_LEVEL = 'SEPA';
const CHARGE_BEARER = 'SLEV'; // Service Level

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Escapa caràcters especials XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formata un import en cèntims a format SEPA (2 decimals)
 */
function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Genera un timestamp ISO 8601 amb timezone
 */
function formatDateTime(date: Date = new Date()): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
  // Format sense mil·lisegons: YYYY-MM-DDTHH:MM:SS+HH:MM
  const iso = date.toISOString().slice(0, 19); // "YYYY-MM-DDTHH:MM:SS"
  return iso + sign + hours + ':' + minutes;
}

/**
 * Genera MsgId únic segons format SEPA
 * Format: PRE + YYYYMMDDHHMMSS + millis + padding
 */
export function generateMessageId(date: Date = new Date()): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const datePart =
    String(date.getFullYear()) +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds());
  const millis = pad(date.getMilliseconds(), 3);
  // Padding per arribar a 35 caràcters (màxim SEPA)
  const padding = '000000000000000';
  return `PRE${datePart}${millis}${padding}`.slice(0, 35);
}

/**
 * Assegura que un identificador SEPA no superi els 35 caràcters
 * Només permet: A-Z, a-z, 0-9, - (guió)
 */
function ensureMax35(id: string): string {
  const clean = id.replace(/[^A-Za-z0-9\-]/g, '');
  return clean.length <= 35 ? clean : clean.slice(0, 35);
}

/**
 * Obté el BIC d'un IBAN espanyol (simplificat)
 * En producció caldria una taula de lookup completa
 */
function getBicFromIban(iban: string): string | null {
  // Taula simplificada dels principals bancs espanyols
  const bicMap: Record<string, string> = {
    '0049': 'BSCHESMMXXX', // Santander
    '0075': 'POPUESMM',    // Banco Popular (ara Santander)
    '0081': 'BSABESBB',    // Banc Sabadell
    '0128': 'BKBKESMMXXX', // Bankinter
    '0182': 'BBVAESMMXXX', // BBVA
    '2038': 'CAABORRABXXX', // Bankia (ara CaixaBank)
    '2048': 'CECAESMM',    // Liberbank
    '2085': 'CAZABORRABXXX', // Ibercaja
    '2095': 'BASABORRABXXX', // Kutxabank
    '2100': 'CAIXESBB',    // CaixaBank
    '3058': 'CCABORRABXXX', // Cajamar
    '0487': 'GBMNESMMXXX', // Sabadell Atlántico
  };

  // Extreu el codi d'entitat (posicions 4-7 de l'IBAN espanyol)
  const entityCode = iban.replace(/\s/g, '').slice(4, 8);
  return bicMap[entityCode] || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERADOR XML
// ═══════════════════════════════════════════════════════════════════════════════

export interface Pain008Options {
  /** Inclou BIC del deutor si es pot determinar */
  includeBic?: boolean;
  /** Data de generació (per testing) */
  generationDate?: Date;
}

/**
 * Genera un fitxer XML pain.008.001.08 a partir d'una SepaCollectionRun
 */
export function generatePain008Xml(
  run: SepaCollectionRun,
  options: Pain008Options = {}
): string {
  const { includeBic = false, generationDate = new Date() } = options;

  const creationDateTime = formatDateTime(generationDate);
  const messageId = run.messageId || generateMessageId(generationDate);

  // Agrupa per SeqTp (FRST, RCUR, etc.)
  const itemsBySequence = groupBySequenceType(run.items);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="${PAIN008_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${PAIN008_NAMESPACE} pain.008.001.02.xsd">
  <CstmrDrctDbtInitn>
    ${buildGroupHeader(run, messageId, creationDateTime)}
    ${buildPaymentInfoBlocks(run, itemsBySequence, includeBic)}
  </CstmrDrctDbtInitn>
</Document>`;

  return xml;
}

/**
 * Agrupa els items per tipus de seqüència
 */
function groupBySequenceType(
  items: SepaCollectionItem[]
): Map<SepaSequenceType, SepaCollectionItem[]> {
  const groups = new Map<SepaSequenceType, SepaCollectionItem[]>();

  for (const item of items) {
    const existing = groups.get(item.sequenceType) || [];
    existing.push(item);
    groups.set(item.sequenceType, existing);
  }

  return groups;
}

/**
 * Construeix el bloc GrpHdr (Group Header)
 */
function buildGroupHeader(
  run: SepaCollectionRun,
  messageId: string,
  creationDateTime: string
): string {
  return `<GrpHdr>
      <MsgId>${escapeXml(messageId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${run.totalCount}</NbOfTxs>
      <CtrlSum>${formatAmount(run.totalAmountCents)}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(run.creditorName)}</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>${escapeXml(run.creditorId)}</Id>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>`;
}

/**
 * Construeix els blocs PmtInf (Payment Information)
 * Un bloc per cada SeqTp diferent
 */
function buildPaymentInfoBlocks(
  run: SepaCollectionRun,
  itemsBySequence: Map<SepaSequenceType, SepaCollectionItem[]>,
  includeBic: boolean
): string {
  const blocks: string[] = [];
  let pmtInfCounter = 1;

  for (const [seqType, items] of itemsBySequence) {
    const totalCents = items.reduce((sum, i) => sum + i.amountCents, 0);
    const pmtInfId = ensureMax35(`${run.messageId}-${pmtInfCounter}`);

    blocks.push(buildPaymentInfoBlock(
      run,
      pmtInfId,
      seqType,
      items,
      totalCents,
      includeBic
    ));

    pmtInfCounter++;
  }

  return blocks.join('\n    ');
}

/**
 * Construeix un bloc PmtInf individual
 */
function buildPaymentInfoBlock(
  run: SepaCollectionRun,
  pmtInfId: string,
  seqType: SepaSequenceType,
  items: SepaCollectionItem[],
  totalCents: number,
  includeBic: boolean
): string {
  const transactions = items
    .map((item) => buildTransaction(item, run.requestedCollectionDate, run.creditorName, includeBic))
    .join('\n      ');

  return `<PmtInf>
      <PmtInfId>${escapeXml(pmtInfId)}</PmtInfId>
      <PmtMtd>${PAYMENT_METHOD}</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${items.length}</NbOfTxs>
      <CtrlSum>${formatAmount(totalCents)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>${SERVICE_LEVEL}</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>${run.scheme}</Cd>
        </LclInstrm>
        <SeqTp>${seqType}</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${run.requestedCollectionDate}</ReqdColltnDt>
      <Cdtr>
        <Nm>${escapeXml(run.creditorName)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${run.creditorIban.replace(/\s/g, '')}</IBAN>
        </Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId>
          <Othr>
            <Id>NOTPROVIDED</Id>
          </Othr>
        </FinInstnId>
      </CdtrAgt>
      <ChrgBr>${CHARGE_BEARER}</ChrgBr>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${escapeXml(run.creditorId)}</Id>
              <SchmeNm>
                <Prtry>SEPA</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>
      ${transactions}
    </PmtInf>`;
}

/**
 * Construeix un bloc DrctDbtTxInf (transacció individual)
 */
function buildTransaction(
  item: SepaCollectionItem,
  collectionDate: string,
  creditorName: string,
  includeBic: boolean
): string {
  const bic = includeBic ? getBicFromIban(item.iban) : null;

  const dbtrAgtContent = bic
    ? `<FinInstnId>
            <BIC>${bic}</BIC>
          </FinInstnId>`
    : `<FinInstnId>
            <Othr>
              <Id>NOTPROVIDED</Id>
            </Othr>
          </FinInstnId>`;

  const ustrd = 'Cuota Socio/a';

  return `<DrctDbtTxInf>
        <PmtId>
          <EndToEndId>NOTPROVIDED</EndToEndId>
        </PmtId>
        <InstdAmt Ccy="EUR">${formatAmount(item.amountCents)}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${escapeXml(item.umr)}</MndtId>
            <DtOfSgntr>${item.signatureDate}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          ${dbtrAgtContent}
        </DbtrAgt>
        <Dbtr>
          <Nm>${escapeXml(item.donorName)}</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id>
            <IBAN>${item.iban.replace(/\s/g, '')}</IBAN>
          </Id>
        </DbtrAcct>
        <RmtInf>
          <Ustrd>${escapeXml(ustrd)}</Ustrd>
        </RmtInf>
      </DrctDbtTxInf>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationError {
  field: string;
  message: string;
  itemIndex?: number;
}

/**
 * Valida una SepaCollectionRun abans de generar el XML
 */
export function validateCollectionRun(
  run: SepaCollectionRun
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validacions globals
  if (!run.creditorId) {
    errors.push({ field: 'creditorId', message: 'Identificador de creditor SEPA obligatori' });
  } else if (!/^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z0-9]{1,28}$/.test(run.creditorId)) {
    errors.push({ field: 'creditorId', message: 'Format de creditorId invàlid' });
  }

  if (!run.creditorIban) {
    errors.push({ field: 'creditorIban', message: 'IBAN del creditor obligatori' });
  } else if (!isValidIban(run.creditorIban)) {
    errors.push({ field: 'creditorIban', message: 'IBAN del creditor invàlid' });
  }

  if (!run.creditorName) {
    errors.push({ field: 'creditorName', message: 'Nom del creditor obligatori' });
  } else if (run.creditorName.length > 70) {
    errors.push({ field: 'creditorName', message: 'Nom del creditor massa llarg (màx 70 caràcters)' });
  }

  if (!run.requestedCollectionDate) {
    errors.push({ field: 'requestedCollectionDate', message: 'Data de cobrament obligatòria' });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(run.requestedCollectionDate)) {
    errors.push({ field: 'requestedCollectionDate', message: 'Format de data invàlid (YYYY-MM-DD)' });
  }

  if (!run.items || run.items.length === 0) {
    errors.push({ field: 'items', message: 'Cal almenys un cobrament' });
  }

  // Validacions per item
  run.items.forEach((item, index) => {
    if (!item.iban) {
      errors.push({ field: 'iban', message: 'IBAN obligatori', itemIndex: index });
    } else if (!isValidIban(item.iban)) {
      errors.push({ field: 'iban', message: 'IBAN invàlid', itemIndex: index });
    }

    if (!item.donorName) {
      errors.push({ field: 'donorName', message: 'Nom del deutor obligatori', itemIndex: index });
    } else if (item.donorName.length > 70) {
      errors.push({ field: 'donorName', message: 'Nom massa llarg (màx 70)', itemIndex: index });
    }

    if (!item.umr) {
      errors.push({ field: 'umr', message: 'UMR (referència mandat) obligatori', itemIndex: index });
    } else if (item.umr.length > 35) {
      errors.push({ field: 'umr', message: 'UMR massa llarg (màx 35)', itemIndex: index });
    }

    if (!item.signatureDate) {
      errors.push({ field: 'signatureDate', message: 'Data signatura obligatòria', itemIndex: index });
    }

    if (!item.amountCents || item.amountCents <= 0) {
      errors.push({ field: 'amountCents', message: 'Import ha de ser positiu', itemIndex: index });
    }

    if (!item.sequenceType) {
      errors.push({ field: 'sequenceType', message: 'Tipus de seqüència obligatori', itemIndex: index });
    }
  });

  return errors;
}

/**
 * Validació bàsica d'IBAN (checksum mod 97)
 */
function isValidIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  if (cleaned.length < 15 || cleaned.length > 34) {
    return false;
  }

  // Mou els primers 4 caràcters al final i converteix lletres a números
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numeric = rearranged
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 65 ? String(code - 55) : char;
    })
    .join('');

  // Mod 97 check
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97;
  }

  return remainder === 1;
}
