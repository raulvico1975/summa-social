/**
 * Parser SEPA pain.001 (Customer Credit Transfer Initiation)
 *
 * Parseja fitxers XML pain.001.001.03 i pain.001.002.03 sense dependències externes.
 * Utilitza DOMParser natiu del navegador.
 */

export interface Pain001Payment {
  /** Import en EUR (sempre positiu) */
  amount: number;
  /** Nom del creditor/beneficiari */
  creditorName: string;
  /** IBAN del creditor */
  creditorIban: string;
  /** Concepte/referència del pagament */
  concept: string;
  /** EndToEndId original (opcional) */
  endToEndId?: string;
}

export interface Pain001ParseResult {
  /** Llista de pagaments */
  payments: Pain001Payment[];
  /** Nom del deutor (ordenant) */
  debtorName: string;
  /** IBAN del deutor */
  debtorIban: string;
  /** Data d'execució sol·licitada */
  executionDate: string;
  /** Suma total dels pagaments */
  totalAmount: number;
  /** Nombre de transaccions */
  transactionCount: number;
  /** Avisos durant el parsing */
  warnings: string[];
}

/**
 * Parseja un fitxer SEPA pain.001 XML
 */
export function parsePain001(xmlContent: string): Pain001ParseResult {
  const warnings: string[] = [];
  const payments: Pain001Payment[] = [];

  // Parsejar XML amb DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');

  // Verificar errors de parsing
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Error parsejant XML: ${parseError.textContent}`);
  }

  // Trobar el namespace i l'element arrel
  const root = doc.documentElement;
  const ns = root.namespaceURI || '';

  // Helper per obtenir text d'un element
  const getText = (parent: Element, tagName: string): string => {
    // Buscar amb namespace i sense
    const elem = parent.getElementsByTagNameNS(ns, tagName)[0]
      || parent.getElementsByTagName(tagName)[0];
    return elem?.textContent?.trim() || '';
  };

  // Helper per obtenir tots els elements amb un tag
  const getAll = (parent: Element, tagName: string): Element[] => {
    const withNs = Array.from(parent.getElementsByTagNameNS(ns, tagName));
    if (withNs.length > 0) return withNs;
    return Array.from(parent.getElementsByTagName(tagName));
  };

  // Trobar GrpHdr (Group Header)
  const grpHdr = getAll(root, 'GrpHdr')[0];
  if (!grpHdr) {
    throw new Error('No s\'ha trobat GrpHdr (capçalera del grup)');
  }

  // Obtenir nombre de transaccions i import total del header
  const headerNbOfTxs = parseInt(getText(grpHdr, 'NbOfTxs')) || 0;
  const headerCtrlSum = parseFloat(getText(grpHdr, 'CtrlSum')) || 0;

  // Trobar PmtInf (Payment Information blocks)
  const pmtInfs = getAll(root, 'PmtInf');
  if (pmtInfs.length === 0) {
    throw new Error('No s\'ha trobat cap bloc PmtInf (informació de pagament)');
  }

  // Variables per al deutor (del primer PmtInf)
  let debtorName = '';
  let debtorIban = '';
  let executionDate = '';

  for (const pmtInf of pmtInfs) {
    // Obtenir data d'execució
    const reqExctnDt = getText(pmtInf, 'ReqdExctnDt');
    if (reqExctnDt && !executionDate) {
      executionDate = reqExctnDt;
    }

    // Obtenir info del deutor
    const dbtr = getAll(pmtInf, 'Dbtr')[0];
    if (dbtr && !debtorName) {
      debtorName = getText(dbtr, 'Nm');
    }

    const dbtrAcct = getAll(pmtInf, 'DbtrAcct')[0];
    if (dbtrAcct && !debtorIban) {
      debtorIban = getText(dbtrAcct, 'IBAN');
    }

    // Processar CdtTrfTxInf (Credit Transfer Transaction Information)
    const cdtTrfTxInfs = getAll(pmtInf, 'CdtTrfTxInf');

    for (const txInf of cdtTrfTxInfs) {
      try {
        // Import
        const amt = getAll(txInf, 'Amt')[0];
        const instdAmt = amt ? getAll(amt, 'InstdAmt')[0] : null;
        const amountStr = instdAmt?.textContent?.trim() || getText(txInf, 'InstdAmt');
        const amount = parseFloat(amountStr);

        if (!amount || amount <= 0) {
          warnings.push(`Transacció ignorada: import invàlid (${amountStr})`);
          continue;
        }

        // Creditor
        const cdtr = getAll(txInf, 'Cdtr')[0];
        const creditorName = cdtr ? getText(cdtr, 'Nm') : '';

        // IBAN del creditor
        const cdtrAcct = getAll(txInf, 'CdtrAcct')[0];
        const creditorIban = cdtrAcct ? getText(cdtrAcct, 'IBAN') : '';

        // Concepte (pot estar a RmtInf/Ustrd o EndToEndId)
        const rmtInf = getAll(txInf, 'RmtInf')[0];
        let concept = rmtInf ? getText(rmtInf, 'Ustrd') : '';

        // EndToEndId com a fallback o complement
        const pmtId = getAll(txInf, 'PmtId')[0];
        const endToEndId = pmtId ? getText(pmtId, 'EndToEndId') : '';

        if (!concept && endToEndId && endToEndId !== 'NOTPROVIDED') {
          concept = endToEndId;
        }

        // Validar camps mínims
        if (!creditorName && !creditorIban) {
          warnings.push(`Transacció ignorada: sense creditor ni IBAN`);
          continue;
        }

        payments.push({
          amount: Math.round(amount * 100) / 100, // Arrodonir a 2 decimals
          creditorName: creditorName || 'Desconegut',
          creditorIban: normalizeIban(creditorIban),
          concept: concept || '',
          endToEndId: endToEndId || undefined,
        });
      } catch (err) {
        warnings.push(`Error processant transacció: ${err}`);
      }
    }
  }

  // Calcular totals
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const transactionCount = payments.length;

  // Verificar consistència amb header
  if (headerNbOfTxs > 0 && headerNbOfTxs !== transactionCount) {
    warnings.push(`El nombre de transaccions (${transactionCount}) no coincideix amb el header (${headerNbOfTxs})`);
  }

  if (headerCtrlSum > 0 && Math.abs(headerCtrlSum - totalAmount) > 0.02) {
    warnings.push(`L'import total (${totalAmount.toFixed(2)}) no coincideix amb el header (${headerCtrlSum.toFixed(2)})`);
  }

  return {
    payments,
    debtorName,
    debtorIban: normalizeIban(debtorIban),
    executionDate,
    totalAmount: Math.round(totalAmount * 100) / 100,
    transactionCount,
    warnings,
  };
}

/**
 * Normalitza un IBAN eliminant espais i passant a majúscules
 */
function normalizeIban(iban: string): string {
  if (!iban) return '';
  return iban.replace(/\s/g, '').toUpperCase();
}

/**
 * Valida si un string sembla un fitxer pain.001
 */
export function isPain001File(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return (
    lowerContent.includes('pain.001') ||
    lowerContent.includes('cdttrf') ||
    (lowerContent.includes('<pmtinf') && lowerContent.includes('<cdttrftxinf'))
  );
}
