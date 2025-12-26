/**
 * Generador SEPA pain.001 (Customer Credit Transfer Initiation)
 *
 * Genera fitxers XML pain.001.001.03 compatibles amb la majoria de bancs espanyols.
 * Implementació pura sense dependències externes.
 */

export interface Pain001Payment {
  /** Import en EUR (positiu, amb 2 decimals màxim) */
  amount: number;
  /** Nom del creditor/beneficiari */
  creditorName: string;
  /** IBAN del creditor */
  creditorIban: string;
  /** Concepte/referència del pagament */
  concept?: string;
  /** Identificador únic del pagament (opcional, es genera si no es proporciona) */
  endToEndId?: string;
}

export interface Pain001GenerateParams {
  /** Nom del deutor (ordenant) */
  debtorName: string;
  /** IBAN del deutor */
  debtorIban: string;
  /** BIC/SWIFT del deutor (opcional) */
  debtorBic?: string;
  /** Data d'execució sol·licitada (YYYY-MM-DD) */
  executionDate: string;
  /** Llista de pagaments */
  payments: Pain001Payment[];
  /** Identificador del missatge (opcional, es genera si no es proporciona) */
  messageId?: string;
}

export interface Pain001ValidationError {
  field: string;
  message: string;
}

/**
 * Valida els paràmetres d'entrada
 */
export function validatePain001Params(params: Pain001GenerateParams): Pain001ValidationError[] {
  const errors: Pain001ValidationError[] = [];

  // Validar deutor
  if (!params.debtorName || params.debtorName.trim().length === 0) {
    errors.push({ field: 'debtorName', message: 'El nom del deutor és obligatori' });
  } else if (params.debtorName.length > 70) {
    errors.push({ field: 'debtorName', message: 'El nom del deutor no pot superar 70 caràcters' });
  }

  if (!isValidIban(params.debtorIban)) {
    errors.push({ field: 'debtorIban', message: 'L\'IBAN del deutor no és vàlid' });
  }

  // Validar data
  if (!params.executionDate || !/^\d{4}-\d{2}-\d{2}$/.test(params.executionDate)) {
    errors.push({ field: 'executionDate', message: 'La data d\'execució ha de tenir format YYYY-MM-DD' });
  }

  // Validar pagaments
  if (!params.payments || params.payments.length === 0) {
    errors.push({ field: 'payments', message: 'Cal almenys un pagament' });
  } else {
    params.payments.forEach((payment, index) => {
      // Import
      if (typeof payment.amount !== 'number' || payment.amount <= 0) {
        errors.push({ field: `payments[${index}].amount`, message: `L'import ha de ser positiu` });
      } else if (!hasMaxTwoDecimals(payment.amount)) {
        errors.push({ field: `payments[${index}].amount`, message: `L'import no pot tenir més de 2 decimals` });
      }

      // Creditor
      if (!payment.creditorName || payment.creditorName.trim().length === 0) {
        errors.push({ field: `payments[${index}].creditorName`, message: `El nom del creditor és obligatori` });
      } else if (payment.creditorName.length > 70) {
        errors.push({ field: `payments[${index}].creditorName`, message: `El nom del creditor no pot superar 70 caràcters` });
      }

      if (!isValidIban(payment.creditorIban)) {
        errors.push({ field: `payments[${index}].creditorIban`, message: `L'IBAN del creditor no és vàlid` });
      }
    });
  }

  return errors;
}

/**
 * Genera un fitxer SEPA pain.001.001.03
 */
export function generatePain001(params: Pain001GenerateParams): string {
  // Validar
  const errors = validatePain001Params(params);
  if (errors.length > 0) {
    throw new Error(`Errors de validació: ${errors.map(e => e.message).join(', ')}`);
  }

  const now = new Date();
  const messageId = params.messageId || generateMessageId(now);
  const creationDateTime = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Calcular totals
  const totalAmount = params.payments.reduce((sum, p) => sum + p.amount, 0);
  const numberOfTransactions = params.payments.length;

  // Generar XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escapeXml(messageId)}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${numberOfTransactions}</NbOfTxs>
      <CtrlSum>${formatAmount(totalAmount)}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(truncate(params.debtorName, 70))}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(messageId)}-1</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${numberOfTransactions}</NbOfTxs>
      <CtrlSum>${formatAmount(totalAmount)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${params.executionDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>${escapeXml(truncate(params.debtorName, 70))}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${normalizeIban(params.debtorIban)}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>${params.debtorBic ? `
          <BIC>${escapeXml(params.debtorBic)}</BIC>` : `
          <Othr>
            <Id>NOTPROVIDED</Id>
          </Othr>`}
        </FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
${params.payments.map((payment, index) => generatePaymentBlock(payment, index)).join('\n')}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

  return xml;
}

/**
 * Genera un bloc CdtTrfTxInf per a un pagament
 */
function generatePaymentBlock(payment: Pain001Payment, index: number): string {
  const endToEndId = payment.endToEndId || `PAY${String(index + 1).padStart(6, '0')}`;
  const concept = payment.concept || `Pagament ${index + 1}`;

  return `      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${escapeXml(truncate(endToEndId, 35))}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${formatAmount(payment.amount)}</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>${escapeXml(truncate(payment.creditorName, 70))}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${normalizeIban(payment.creditorIban)}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${escapeXml(truncate(concept, 140))}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Escapa caràcters especials per XML
 */
function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Eliminar caràcters no permesos en XML 1.0
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/**
 * Normalitza un IBAN eliminant espais i passant a majúscules
 */
function normalizeIban(iban: string): string {
  if (!iban) return '';
  return iban.replace(/\s/g, '').toUpperCase();
}

/**
 * Valida un IBAN (validació bàsica de format)
 */
function isValidIban(iban: string): boolean {
  if (!iban) return false;
  const normalized = normalizeIban(iban);
  // Format bàsic: 2 lletres + 2 dígits + 10-30 caràcters alfanumèrics
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(normalized);
}

/**
 * Verifica si un número té com a màxim 2 decimals
 */
function hasMaxTwoDecimals(num: number): boolean {
  const str = num.toString();
  const decimalPart = str.split('.')[1];
  return !decimalPart || decimalPart.length <= 2;
}

/**
 * Formata un import amb 2 decimals
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Trunca un string a una longitud màxima
 */
function truncate(str: string, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

/**
 * Genera un ID de missatge únic
 */
function generateMessageId(date: Date): string {
  const datePart = date.toISOString().replace(/[-:T]/g, '').substring(0, 14);
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SEPA${datePart}${randomPart}`;
}

/**
 * Descarrega un fitxer pain.001
 */
export function downloadPain001(
  params: Pain001GenerateParams,
  filename?: string
): void {
  const xml = generatePain001(params);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `pain001_${params.executionDate}_${Date.now()}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
