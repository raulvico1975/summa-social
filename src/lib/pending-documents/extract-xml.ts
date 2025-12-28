// src/lib/pending-documents/extract-xml.ts
// Servei per extreure dades d'un document XML pujat i actualitzar el pendingDocument

import { ref, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { updateDoc, serverTimestamp, Firestore, FieldValue } from 'firebase/firestore';
import { pendingDocumentDoc } from './refs';
import type { PendingDocument, PendingDocumentExtraction } from './types';
import { parseFacturaeXml, isFacturaeXml } from '@/lib/invoices/xml/parse-facturae';
import { matchSupplier } from '@/lib/suppliers/match-supplier';
import type { Contact } from '@/lib/data';

/**
 * Resultat de l'extracció.
 */
export interface ExtractXmlResult {
  success: boolean;
  extracted: boolean;       // true si s'ha extret algun camp
  error?: string;
  fields?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    amount?: number;
    supplierId?: string;
    categoryId?: string;
  };
}

/**
 * Determina la categoria basant-se en el proveïdor (si té defaultCategoryId).
 * Si no, retorna null.
 */
function getCategoryFromSupplier(
  supplierId: string | null,
  contacts: Contact[]
): string | null {
  if (!supplierId) return null;

  const contact = contacts.find(c => c.id === supplierId);
  if (!contact) return null;

  return contact.defaultCategoryId || null;
}

/**
 * Extreu dades d'un XML pujat a Storage i actualitza el document Firestore.
 *
 * @param storage - Instància de Firebase Storage
 * @param firestore - Instància de Firestore
 * @param orgId - ID de l'organització
 * @param doc - Document pendent a processar
 * @param contacts - Llista de contactes per fer match del proveïdor
 * @returns Resultat de l'extracció
 */
export async function extractXmlData(
  storage: FirebaseStorage,
  firestore: Firestore,
  orgId: string,
  doc: PendingDocument,
  contacts: Contact[]
): Promise<ExtractXmlResult> {
  try {
    // Verificar que és XML
    const isXml =
      doc.file.contentType.includes('xml') ||
      doc.file.filename.toLowerCase().endsWith('.xml');

    if (!isXml) {
      return { success: true, extracted: false };
    }

    // Obtenir URL de descàrrega i baixar el contingut
    const storageRef = ref(storage, doc.file.storagePath);
    const downloadUrl = await getDownloadURL(storageRef);

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return {
        success: false,
        extracted: false,
        error: `Error descarregant fitxer: ${response.status}`,
      };
    }

    const xmlText = await response.text();

    // Verificar que és Facturae
    if (!isFacturaeXml(xmlText)) {
      // No és un format conegut, no extraiem res
      return { success: true, extracted: false };
    }

    // Parsejar el XML
    const parsed = parseFacturaeXml(xmlText);

    // Si no hem extret res, sortir
    if (!parsed.invoiceNumber && !parsed.invoiceDate && !parsed.totalAmount && !parsed.supplierTaxId) {
      return { success: true, extracted: false };
    }

    // Fer match del proveïdor
    const supplierId = matchSupplier(
      { taxId: parsed.supplierTaxId, name: parsed.supplierName },
      contacts
    );

    // Obtenir categoria del proveïdor (si té defaultCategoryId)
    const categoryId = getCategoryFromSupplier(supplierId, contacts);

    // Preparar l'update - només escriure camps que són null al document actual
    const updates: { [key: string]: string | number | PendingDocumentExtraction | FieldValue | null } = {
      updatedAt: serverTimestamp(),
    };

    // Camp extracted
    const extraction: PendingDocumentExtraction = {
      source: 'xml',
      confidence: 'high',
    };
    updates.extracted = extraction;

    // Camps de dades (només si el document té el camp a null)
    const fields: ExtractXmlResult['fields'] = {};

    if (doc.invoiceNumber === null && parsed.invoiceNumber) {
      updates.invoiceNumber = parsed.invoiceNumber;
      fields.invoiceNumber = parsed.invoiceNumber;
    }

    if (doc.invoiceDate === null && parsed.invoiceDate) {
      updates.invoiceDate = parsed.invoiceDate;
      fields.invoiceDate = parsed.invoiceDate;
    }

    if (doc.amount === null && parsed.totalAmount !== undefined) {
      updates.amount = parsed.totalAmount;
      fields.amount = parsed.totalAmount;
    }

    if (doc.supplierId === null && supplierId) {
      updates.supplierId = supplierId;
      fields.supplierId = supplierId;
    }

    if (doc.categoryId === null && categoryId) {
      updates.categoryId = categoryId;
      fields.categoryId = categoryId;
    }

    // Actualitzar Firestore
    const docRef = pendingDocumentDoc(firestore, orgId, doc.id);
    await updateDoc(docRef, updates);

    return {
      success: true,
      extracted: Object.keys(fields).length > 0,
      fields,
    };
  } catch (error) {
    console.error('[extractXmlData] Error:', error);
    return {
      success: false,
      extracted: false,
      error: error instanceof Error ? error.message : 'Error desconegut',
    };
  }
}
