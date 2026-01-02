// src/lib/invoices/xml/parse-facturae.ts
// Parser determinista per factures en format Facturae (versions 3.2, 3.2.1, 3.2.2)
// NO usa dependències externes, només DOMParser natiu

/**
 * Resultat del parsing d'una factura Facturae.
 * Tots els camps són opcionals perquè pot faltar informació.
 */
export interface FacturaeParseResult {
  invoiceNumber?: string;
  invoiceDate?: string;      // Format: YYYY-MM-DD
  supplierName?: string;
  supplierTaxId?: string;    // CIF/NIF normalitzat
  totalAmount?: number;      // Import amb 2 decimals
}

// Namespaces coneguts de Facturae
const FACTURAE_NAMESPACES = [
  'http://www.facturae.es/Facturae/2009/v3.2/Facturae',
  'http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_1.xml',
  'http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml',
  'http://www.facturae.es/Facturae/2014/v3.2.1/Facturae',
  'http://www.facturae.es/Facturae/2014/v3.2.2/Facturae',
];

/**
 * Obté el text d'un element seguint un path de tags, usant namespace.
 * Prova tots els namespaces coneguts fins que trobi l'element.
 */
function getTextByPath(root: Element, path: string[]): string | undefined {
  // Primer intentem sense namespace (per XMLs sense prefix)
  let current: Element | null = root;
  for (const tag of path) {
    if (!current) return undefined;

    // Intentar primer amb getElementsByTagName (sense namespace)
    let found: Element | undefined = current.getElementsByTagName(tag)[0];

    // Si no trobem, intentar amb cada namespace
    if (!found) {
      for (const ns of FACTURAE_NAMESPACES) {
        const nsElement: Element | undefined = current.getElementsByTagNameNS(ns, tag)[0];
        if (nsElement) {
          found = nsElement;
          break;
        }
      }
    }

    // Si encara no trobem, intentar amb prefix fe:
    if (!found) {
      found = current.getElementsByTagName(`fe:${tag}`)[0];
    }

    current = found || null;
  }

  return current?.textContent?.trim() || undefined;
}

/**
 * Obté el primer element que coincideix amb un tag (cercant en tot el document).
 */
function getFirstElementByTag(doc: Document, tag: string): Element | null {
  // Sense namespace
  let el = doc.getElementsByTagName(tag)[0];
  if (el) return el;

  // Amb prefix
  el = doc.getElementsByTagName(`fe:${tag}`)[0];
  if (el) return el;

  // Amb namespaces
  for (const ns of FACTURAE_NAMESPACES) {
    el = doc.getElementsByTagNameNS(ns, tag)[0];
    if (el) return el;
  }

  return null;
}

/**
 * Normalitza un NIF/CIF espanyol.
 * Elimina espais, guions i converteix a majúscules.
 */
function normalizeTaxId(taxId: string | undefined): string | undefined {
  if (!taxId) return undefined;
  return taxId.replace(/[\s\-\.]/g, '').toUpperCase();
}

/**
 * Valida que una data tingui format YYYY-MM-DD.
 */
function isValidDate(date: string | undefined): boolean {
  if (!date) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Parseja un string numèric a number amb 2 decimals.
 */
function parseAmount(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = parseFloat(value.replace(',', '.'));
  if (isNaN(num)) return undefined;
  return Math.round(num * 100) / 100;
}

/**
 * Parseja un XML Facturae i retorna les dades principals.
 *
 * @param xmlText - Contingut XML com a string
 * @returns Objecte amb els camps extrets (poden ser undefined si no es troben)
 *
 * @example
 * const result = parseFacturaeXml(xmlContent);
 * console.log(result.invoiceNumber); // "A-2025-0001"
 */
export function parseFacturaeXml(xmlText: string): FacturaeParseResult {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    // Comprovar errors de parsing
    const parserError = doc.getElementsByTagName('parsererror')[0];
    if (parserError) {
      console.warn('[parseFacturaeXml] Error parsing XML:', parserError.textContent);
      return {};
    }

    // Buscar l'element arrel (pot ser Facturae o fe:Facturae)
    const root = doc.documentElement;
    if (!root) {
      console.warn('[parseFacturaeXml] No root element found');
      return {};
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NÚMERO DE FACTURA
    // Path: Invoices > Invoice > InvoiceHeader > InvoiceNumber
    // Si existeix InvoiceSeriesCode, concatenar: series + '-' + number
    // ═══════════════════════════════════════════════════════════════════════

    const invoiceNumber = getTextByPath(root, ['Invoices', 'Invoice', 'InvoiceHeader', 'InvoiceNumber']);
    const invoiceSeries = getTextByPath(root, ['Invoices', 'Invoice', 'InvoiceHeader', 'InvoiceSeriesCode']);

    let finalInvoiceNumber: string | undefined;
    if (invoiceNumber) {
      if (invoiceSeries && invoiceSeries.trim()) {
        finalInvoiceNumber = `${invoiceSeries.trim()}-${invoiceNumber.trim()}`;
      } else {
        finalInvoiceNumber = invoiceNumber.trim();
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DATA DE FACTURA
    // Path: Invoices > Invoice > InvoiceIssueData > IssueDate
    // ═══════════════════════════════════════════════════════════════════════

    const issueDate = getTextByPath(root, ['Invoices', 'Invoice', 'InvoiceIssueData', 'IssueDate']);
    const invoiceDate = isValidDate(issueDate) ? issueDate : undefined;

    // ═══════════════════════════════════════════════════════════════════════
    // CIF/NIF EMISSOR (PROVEÏDOR)
    // Path: Parties > SellerParty > TaxIdentification > TaxIdentificationNumber
    // ═══════════════════════════════════════════════════════════════════════

    const rawTaxId = getTextByPath(root, ['Parties', 'SellerParty', 'TaxIdentification', 'TaxIdentificationNumber']);
    const supplierTaxId = normalizeTaxId(rawTaxId);

    // ═══════════════════════════════════════════════════════════════════════
    // NOM EMISSOR
    // Prioritat 1: Parties > SellerParty > LegalEntity > CorporateName
    // Fallback: Parties > SellerParty > Individual > Name + FirstSurname + SecondSurname
    // ═══════════════════════════════════════════════════════════════════════

    let supplierName = getTextByPath(root, ['Parties', 'SellerParty', 'LegalEntity', 'CorporateName']);

    if (!supplierName) {
      // Intentar amb Individual
      const name = getTextByPath(root, ['Parties', 'SellerParty', 'Individual', 'Name']);
      const firstName = getTextByPath(root, ['Parties', 'SellerParty', 'Individual', 'FirstSurname']);
      const secondName = getTextByPath(root, ['Parties', 'SellerParty', 'Individual', 'SecondSurname']);

      const parts = [name, firstName, secondName].filter(Boolean);
      if (parts.length > 0) {
        supplierName = parts.join(' ');
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // IMPORT TOTAL
    // Prioritat 1: Invoices > Invoice > InvoiceTotals > InvoiceTotal
    // Fallback 1: TotalExecutableAmount
    // Fallback 2: TotalOutstandingAmount
    // ═══════════════════════════════════════════════════════════════════════

    let totalAmount = parseAmount(
      getTextByPath(root, ['Invoices', 'Invoice', 'InvoiceTotals', 'InvoiceTotal'])
    );

    if (totalAmount === undefined) {
      totalAmount = parseAmount(
        getTextByPath(root, ['Invoices', 'Invoice', 'InvoiceTotals', 'TotalExecutableAmount'])
      );
    }

    if (totalAmount === undefined) {
      totalAmount = parseAmount(
        getTextByPath(root, ['Invoices', 'Invoice', 'InvoiceTotals', 'TotalOutstandingAmount'])
      );
    }

    return {
      invoiceNumber: finalInvoiceNumber,
      invoiceDate,
      supplierName,
      supplierTaxId,
      totalAmount,
    };
  } catch (error) {
    console.error('[parseFacturaeXml] Unexpected error:', error);
    return {};
  }
}

/**
 * Detecta si un XML és format Facturae.
 * Útil per decidir quin parser usar.
 */
export function isFacturaeXml(xmlText: string): boolean {
  try {
    // Comprovació ràpida per string (més eficient que parsejar)
    const lowerXml = xmlText.toLowerCase();
    return (
      lowerXml.includes('facturae') ||
      lowerXml.includes('invoices') && lowerXml.includes('sellerparty')
    );
  } catch {
    return false;
  }
}
