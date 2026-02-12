import { ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { doc, updateDoc, Firestore, DocumentReference, collection } from 'firebase/firestore';
import { buildDocumentFilename } from '@/lib/build-document-filename';

// =============================================================================
// TYPES
// =============================================================================

export interface AttachDocumentToTransactionParams {
  firestore: Firestore;
  storage: FirebaseStorage;
  organizationId: string;
  transactionId: string;
  file: File;
  /** Data del moviment en format ISO (YYYY-MM-DD). Usada per construir el nom del fitxer. */
  transactionDate?: string;
  /** Concepte del moviment. Usat per construir el nom del fitxer. */
  transactionConcept?: string;
  /** Nom de fitxer explícit. Si present, s'usa en lloc d'auto-generar amb buildDocumentFilename(). */
  overrideFilename?: string;
}

export interface AttachDocumentToExpenseParams {
  firestore: Firestore;
  storage: FirebaseStorage;
  organizationId: string;
  expenseId: string;
  file: File;
  /** Data de la despesa en format ISO (YYYY-MM-DD). Usada per construir el nom del fitxer. */
  expenseDate?: string;
  /** Concepte de la despesa. Usat per construir el nom del fitxer. */
  expenseConcept?: string;
}

export interface AttachDocumentResult {
  success: boolean;
  downloadURL?: string;
  error?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Determina el contentType del fitxer.
 * Si el navegador no detecta el tipus (comú amb XML), intenta per extensió.
 */
function getContentType(file: File): string {
  if (file.type) return file.type;

  const ext = file.name.toLowerCase().split('.').pop();
  switch (ext) {
    case 'xml':
      return 'application/xml';
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Adjunta un document a un moviment (transaction).
 * Puja el fitxer a Storage i actualitza el camp `document` del moviment a Firestore.
 */
export async function attachDocumentToTransaction({
  firestore,
  storage,
  organizationId,
  transactionId,
  file,
  transactionDate,
  transactionConcept,
  overrideFilename,
}: AttachDocumentToTransactionParams): Promise<AttachDocumentResult> {
  try {
    // Construir nom de fitxer estandarditzat
    const dateISO = transactionDate ?? new Date().toISOString().split('T')[0];
    const concept = transactionConcept?.trim() || 'moviment';
    const finalName = overrideFilename ?? buildDocumentFilename({ dateISO, concept, originalName: file.name });

    // Path a Storage: organizations/{orgId}/documents/{transactionId}/{filename}
    const storagePath = `organizations/${organizationId}/documents/${transactionId}/${finalName}`;
    const storageRef = ref(storage, storagePath);

    // Pujar fitxer
    const uploadResult = await uploadBytes(storageRef, file, {
      contentType: getContentType(file),
      customMetadata: {
        originalFileName: file.name,
      },
    });

    // Obtenir URL de descàrrega
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Actualitzar Firestore
    const transactionRef = doc(
      collection(firestore, `organizations/${organizationId}/transactions`),
      transactionId
    );
    await updateDoc(transactionRef, { document: downloadURL });

    return { success: true, downloadURL };
  } catch (error) {
    console.error('[attachDocumentToTransaction] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconegut';
    return { success: false, error: errorMessage };
  }
}

/**
 * Adjunta un document a una despesa off-bank del mòdul de projectes.
 * Puja el fitxer a Storage i actualitza el camp `attachments` de la despesa a Firestore.
 */
export async function attachDocumentToExpense({
  firestore,
  storage,
  organizationId,
  expenseId,
  file,
  expenseDate,
  expenseConcept,
}: AttachDocumentToExpenseParams): Promise<AttachDocumentResult> {
  try {
    // Construir nom de fitxer estandarditzat
    const dateISO = expenseDate ?? new Date().toISOString().split('T')[0];
    const concept = expenseConcept?.trim() || 'despesa';
    const finalName = buildDocumentFilename({ dateISO, concept, originalName: file.name });

    // Path a Storage: organizations/{orgId}/offBankExpenses/{expenseId}/{filename}
    const storagePath = `organizations/${organizationId}/offBankExpenses/${expenseId}/${finalName}`;
    const storageRef = ref(storage, storagePath);

    // Pujar fitxer
    const contentType = getContentType(file);
    const uploadResult = await uploadBytes(storageRef, file, {
      contentType,
      customMetadata: {
        originalFileName: file.name,
      },
    });

    // Obtenir URL de descàrrega
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Llegir el document actual per afegir l'attachment
    const expenseRef = doc(
      collection(firestore, `organizations/${organizationId}/offBankExpenses`),
      expenseId
    );

    // Crear nou attachment
    const newAttachment = {
      url: downloadURL,
      name: finalName,
      contentType,
      size: file.size,
      uploadedAt: new Date().toISOString().split('T')[0],
    };

    // Actualitzar usant arrayUnion per afegir a attachments existent
    // Però com que arrayUnion pot ser complex, fem update directe si només és 1 attachment
    // Per simplicitat: llegim el doc, afegim i escrivim
    const { getDoc } = await import('firebase/firestore');
    const expenseDoc = await getDoc(expenseRef);
    const existingAttachments = expenseDoc.data()?.attachments || [];

    await updateDoc(expenseRef, {
      attachments: [...existingAttachments, newAttachment],
    });

    return { success: true, downloadURL };
  } catch (error) {
    console.error('[attachDocumentToExpense] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconegut';
    return { success: false, error: errorMessage };
  }
}
