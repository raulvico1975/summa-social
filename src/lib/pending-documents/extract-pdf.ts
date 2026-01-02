// src/lib/pending-documents/extract-pdf.ts
// Servei per extreure dades d'un document PDF pujat i actualitzar el pendingDocument

import { ref, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { updateDoc, serverTimestamp, Firestore, FieldValue } from 'firebase/firestore';
import { pendingDocumentDoc } from './refs';
import type { PendingDocument, PendingDocumentExtraction } from './types';
import { extractPdfInvoice, type ExtractPdfInvoiceOutput } from '@/ai/flows/extract-pdf-invoice';
import { matchSupplier } from '@/lib/suppliers/match-supplier';
import type { Contact } from '@/lib/data';

/**
 * Resultat de l'extracció PDF.
 */
export interface ExtractPdfResult {
  success: boolean;
  extracted: boolean;       // true si s'ha extret algun camp
  error?: string;
  aiOutput?: ExtractPdfInvoiceOutput;  // Output complet de Gemini per debugging
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
 * Converteix un ArrayBuffer a string Base64.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Mapeja la confiança de Gemini a la nostra escala.
 */
function mapConfidence(aiConfidence: number): PendingDocumentExtraction['confidence'] {
  if (aiConfidence >= 0.8) return 'high';
  if (aiConfidence >= 0.5) return 'medium';
  return 'low';
}

/**
 * Extreu dades d'un PDF pujat a Storage i actualitza el document Firestore.
 *
 * @param storage - Instància de Firebase Storage
 * @param firestore - Instància de Firestore
 * @param orgId - ID de l'organització
 * @param orgLegalName - Nom legal de l'organització
 * @param orgTaxId - CIF/NIF de l'organització
 * @param doc - Document pendent a processar
 * @param contacts - Llista de contactes per fer match del proveïdor
 * @returns Resultat de l'extracció
 */
export async function extractPdfData(
  storage: FirebaseStorage,
  firestore: Firestore,
  orgId: string,
  orgLegalName: string,
  orgTaxId: string,
  doc: PendingDocument,
  contacts: Contact[]
): Promise<ExtractPdfResult> {
  try {
    // Verificar que és PDF
    const isPdf =
      doc.file.contentType === 'application/pdf' ||
      doc.file.filename.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
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

    // Convertir a base64
    const arrayBuffer = await response.arrayBuffer();
    const pdfBase64 = arrayBufferToBase64(arrayBuffer);

    // Cridar Gemini per extreure dades
    const aiOutput = await extractPdfInvoice({
      pdfBase64,
      orgLegalName,
      orgTaxId,
    });

    // Si la confiança és molt baixa o és unknown, no guardem res
    if (aiOutput.confidence < 0.3 || aiOutput.docType === 'unknown') {
      return {
        success: true,
        extracted: false,
        aiOutput,
      };
    }

    // Fer match del proveïdor
    const supplierId = matchSupplier(
      {
        taxId: aiOutput.supplierTaxId.value ?? undefined,
        name: aiOutput.supplierName.value ?? undefined,
      },
      contacts
    );

    // Obtenir categoria del proveïdor
    const categoryId = getCategoryFromSupplier(supplierId, contacts);

    // Preparar l'update - només escriure camps que són null al document actual
    const updates: { [key: string]: string | number | PendingDocumentExtraction | FieldValue | null } = {
      updatedAt: serverTimestamp(),
    };

    // Camp extracted amb evidències
    const extraction: PendingDocumentExtraction = {
      source: 'ai',
      confidence: mapConfidence(aiOutput.confidence),
      evidence: {
        invoiceNumber: aiOutput.invoiceNumber.evidence ?? undefined,
        invoiceDate: aiOutput.invoiceDate.evidence ?? undefined,
        amount: aiOutput.amount.evidence ?? undefined,
        supplierName: aiOutput.supplierName.evidence ?? undefined,
        supplierTaxId: aiOutput.supplierTaxId.evidence ?? undefined,
      },
    };
    updates.extracted = extraction;

    // Actualitzar docType si encara no està definit
    // Nota: aiOutput.docType ja no pot ser 'unknown' aquí (hem sortit abans si ho era)
    if (doc.type === 'unknown') {
      updates.type = aiOutput.docType;
    }

    // Camps de dades (només si el document té el camp a null)
    const fields: ExtractPdfResult['fields'] = {};

    if (doc.invoiceNumber === null && aiOutput.invoiceNumber.value) {
      updates.invoiceNumber = aiOutput.invoiceNumber.value;
      fields.invoiceNumber = aiOutput.invoiceNumber.value;
    }

    if (doc.invoiceDate === null && aiOutput.invoiceDate.value) {
      updates.invoiceDate = aiOutput.invoiceDate.value;
      fields.invoiceDate = aiOutput.invoiceDate.value;
    }

    if (doc.amount === null && aiOutput.amount.value !== null) {
      updates.amount = aiOutput.amount.value;
      fields.amount = aiOutput.amount.value;
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
      aiOutput,
      fields,
    };
  } catch (error) {
    console.error('[extractPdfData] Error:', error);
    return {
      success: false,
      extracted: false,
      error: error instanceof Error ? error.message : 'Error desconegut',
    };
  }
}
