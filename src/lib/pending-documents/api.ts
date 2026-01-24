// src/lib/pending-documents/api.ts
// Access layer per a documents pendents de conciliació

import {
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  writeBatch,
  type Firestore,
  type Query,
} from 'firebase/firestore';
import { ref, deleteObject, type FirebaseStorage } from 'firebase/storage';
import { pendingDocumentsCollection, pendingDocumentDoc } from './refs';
import type {
  PendingDocument,
  PendingDocumentStatus,
  CreatePendingDocumentInput,
  UpdatePendingDocumentInput,
} from './types';

/**
 * Opcions per filtrar documents pendents.
 */
export interface ListPendingDocumentsOptions {
  /** Filtrar per aquests estats (OR). Si no s'especifica, retorna tots. */
  statusIn?: PendingDocumentStatus[];
}

/**
 * Construeix una query per llistar documents pendents.
 * Útil per passar a useCollection amb useMemoFirebase.
 *
 * @param firestore - Instància de Firestore
 * @param orgId - ID de l'organització
 * @param options - Opcions de filtre
 * @returns Query tipada o null si no hi ha orgId
 */
export function buildPendingDocumentsQuery(
  firestore: Firestore,
  orgId: string | null | undefined,
  options: ListPendingDocumentsOptions = {}
): Query<PendingDocument> | null {
  if (!orgId) return null;

  const collectionRef = pendingDocumentsCollection(firestore, orgId);

  // Si hi ha filtre per status, aplicar-lo
  if (options.statusIn && options.statusIn.length > 0) {
    return query(
      collectionRef,
      where('status', 'in', options.statusIn),
      orderBy('createdAt', 'desc')
    );
  }

  // Sense filtre, retornar tots ordenats per data
  return query(collectionRef, orderBy('createdAt', 'desc'));
}

/**
 * Crea un document pendent en estat draft.
 * Només per ús intern (encara no exposat a UI).
 *
 * @param firestore - Instància de Firestore
 * @param orgId - ID de l'organització
 * @param input - Dades del document
 * @returns ID del document creat
 */
export async function createPendingDocumentDraft(
  firestore: Firestore,
  orgId: string,
  input: CreatePendingDocumentInput
): Promise<string> {
  const collectionRef = pendingDocumentsCollection(firestore, orgId);

  const now = serverTimestamp();
  const docData: Omit<PendingDocument, 'id'> = {
    status: 'draft',
    type: input.type,
    file: input.file,
    invoiceNumber: null,
    invoiceDate: null,
    amount: null,
    supplierId: null,
    categoryId: null,
    extracted: null,
    sepa: null,
    matchedTransactionId: null,
    reportId: null,
    createdAt: now as Timestamp,
    updatedAt: now as Timestamp,
    confirmedAt: null,
  };

  const docRef = await addDoc(collectionRef, docData);
  return docRef.id;
}

/**
 * Actualitza un document pendent.
 * Només per ús intern (encara no exposat a UI).
 *
 * @param firestore - Instància de Firestore
 * @param orgId - ID de l'organització
 * @param docId - ID del document
 * @param patch - Camps a actualitzar
 */
export async function updatePendingDocument(
  firestore: Firestore,
  orgId: string,
  docId: string,
  patch: UpdatePendingDocumentInput
): Promise<void> {
  const docRef = pendingDocumentDoc(firestore, orgId, docId);

  await updateDoc(docRef, {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDACIÓ I CONFIRMACIÓ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Camps obligatoris per poder confirmar un document segons el tipus.
 * - invoice/payroll: tots els camps (amount, invoiceDate, invoiceNumber, supplierId, categoryId)
 * - receipt: només amount, invoiceDate, categoryId (invoiceNumber i supplierId opcionals)
 */
export const REQUIRED_FIELDS_FOR_CONFIRM = [
  'amount',
  'invoiceDate',
  'invoiceNumber',
  'supplierId',
  'categoryId',
] as const;

export const REQUIRED_FIELDS_FOR_RECEIPT = [
  'amount',
  'invoiceDate',
  'categoryId',
] as const;

/**
 * Comprova si un document té tots els camps obligatoris per confirmar.
 * Els receipts tenen requisits més relaxats (no cal invoiceNumber ni supplierId).
 */
export function isDocumentReadyToConfirm(doc: PendingDocument): boolean {
  // Receipts: només cal amount, invoiceDate, categoryId
  if (doc.type === 'receipt') {
    return (
      doc.amount !== null &&
      doc.invoiceDate !== null &&
      doc.categoryId !== null
    );
  }

  // Invoice/payroll/unknown: tots els camps
  return (
    doc.amount !== null &&
    doc.invoiceDate !== null &&
    doc.invoiceNumber !== null &&
    doc.invoiceNumber.trim() !== '' &&
    doc.supplierId !== null &&
    doc.categoryId !== null
  );
}

/**
 * Retorna els camps que falten per poder confirmar.
 * Els receipts tenen requisits més relaxats.
 */
export function getMissingFields(doc: PendingDocument): string[] {
  const missing: string[] = [];

  // Camps obligatoris per a tots
  if (doc.amount === null) missing.push('amount');
  if (doc.invoiceDate === null) missing.push('invoiceDate');
  if (doc.categoryId === null) missing.push('categoryId');

  // Camps addicionals per invoice/payroll/unknown
  if (doc.type !== 'receipt') {
    if (doc.invoiceNumber === null || doc.invoiceNumber.trim() === '') missing.push('invoiceNumber');
    if (doc.supplierId === null) missing.push('supplierId');
  }

  return missing;
}

/**
 * Resultat de la confirmació massiva.
 */
export interface ConfirmManyResult {
  confirmedCount: number;
  skippedCount: number;
  skippedIds: string[];
}

/**
 * Confirma múltiples documents en batch.
 * Només confirma els documents que tenen tots els camps obligatoris.
 * Usa batch writes amb segments de 500 màxim.
 *
 * @param firestore - Instància de Firestore
 * @param orgId - ID de l'organització
 * @param docs - Documents a confirmar
 * @returns Resultat amb comptadors
 */
export async function confirmManyPendingDocuments(
  firestore: Firestore,
  orgId: string,
  docs: PendingDocument[]
): Promise<ConfirmManyResult> {
  // Filtrar només els que estan llestos
  const readyDocs = docs.filter(isDocumentReadyToConfirm);
  const skippedDocs = docs.filter(d => !isDocumentReadyToConfirm(d));

  if (readyDocs.length === 0) {
    return {
      confirmedCount: 0,
      skippedCount: skippedDocs.length,
      skippedIds: skippedDocs.map(d => d.id),
    };
  }

  // Firestore batch limit: max 50 operacions per batch
  const BATCH_SIZE = 50;
  const chunks: PendingDocument[][] = [];

  for (let i = 0; i < readyDocs.length; i += BATCH_SIZE) {
    chunks.push(readyDocs.slice(i, i + BATCH_SIZE));
  }

  // Processar cada chunk
  for (const chunk of chunks) {
    const batch = writeBatch(firestore);

    for (const doc of chunk) {
      const docRef = pendingDocumentDoc(firestore, orgId, doc.id);
      batch.update(docRef, {
        status: 'confirmed',
        confirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }

  return {
    confirmedCount: readyDocs.length,
    skippedCount: skippedDocs.length,
    skippedIds: skippedDocs.map(d => d.id),
  };
}

/**
 * Confirma un sol document.
 * Valida que tingui tots els camps obligatoris.
 *
 * @throws Error si el document no està llest per confirmar
 */
export async function confirmPendingDocument(
  firestore: Firestore,
  orgId: string,
  doc: PendingDocument
): Promise<void> {
  if (!isDocumentReadyToConfirm(doc)) {
    const missing = getMissingFields(doc);
    throw new Error(`Falten camps obligatoris: ${missing.join(', ')}`);
  }

  const docRef = pendingDocumentDoc(firestore, orgId, doc.id);

  await updateDoc(docRef, {
    status: 'confirmed',
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ARXIVAR I RESTAURAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Arxiva un document pendent.
 * Guarda l'estat anterior per poder restaurar-lo.
 *
 * @param firestore - Instància de Firestore
 * @param orgId - ID de l'organització
 * @param doc - Document a arxivar
 */
export async function archivePendingDocument(
  firestore: Firestore,
  orgId: string,
  doc: PendingDocument
): Promise<void> {
  if (doc.status === 'archived') {
    throw new Error('El document ja està arxivat');
  }

  if (doc.status === 'matched') {
    throw new Error('No es pot arxivar un document ja conciliat');
  }

  const docRef = pendingDocumentDoc(firestore, orgId, doc.id);

  await updateDoc(docRef, {
    status: 'archived',
    previousStatus: doc.status,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Restaura un document arxivat al seu estat anterior.
 *
 * @param firestore - Instància de Firestore
 * @param orgId - ID de l'organització
 * @param doc - Document a restaurar
 */
export async function restorePendingDocument(
  firestore: Firestore,
  orgId: string,
  doc: PendingDocument
): Promise<void> {
  if (doc.status !== 'archived') {
    throw new Error('El document no està arxivat');
  }

  const docRef = pendingDocumentDoc(firestore, orgId, doc.id);

  // Restaurar a l'estat anterior, o draft si no hi ha previousStatus
  const restoreStatus = doc.previousStatus || 'draft';

  await updateDoc(docRef, {
    status: restoreStatus,
    previousStatus: null,
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ELIMINAR DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resultat de l'eliminació amb informació sobre el fitxer.
 */
export interface DeletePendingDocumentResult {
  /** Si el fitxer s'ha esborrat correctament de Storage */
  fileDeleted: boolean;
  /** Missatge d'error si el fitxer no s'ha pogut esborrar */
  fileError?: string;
}

/**
 * Elimina un document pendent i el seu fitxer associat.
 *
 * Guardrails:
 * - Només es poden eliminar documents amb status 'draft' o 'confirmed'
 * - sepa_generated i matched NO es poden eliminar (només arxivar)
 * - archived es pot eliminar (l'usuari ja l'havia descartat)
 *
 * El fitxer de Storage s'intenta esborrar best-effort:
 * si falla, el document s'esborra igualment però es retorna l'error.
 *
 * @param firestore - Instància de Firestore
 * @param storage - Instància de Firebase Storage
 * @param orgId - ID de l'organització
 * @param docId - ID del document a eliminar
 * @returns Resultat amb info sobre l'eliminació del fitxer
 * @throws Error si l'estat del document no permet eliminació
 */
export async function deletePendingDocument(
  firestore: Firestore,
  storage: FirebaseStorage,
  orgId: string,
  docId: string
): Promise<DeletePendingDocumentResult> {
  // 1. Llegir el document per obtenir storagePath i validar status
  const docRef = pendingDocumentDoc(firestore, orgId, docId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('El document no existeix');
  }

  const docData = docSnap.data() as PendingDocument;

  // 2. Validar guardrails segons status
  if (docData.status === 'sepa_generated') {
    throw new Error(
      'No es pot eliminar un document inclòs en una remesa SEPA. Arxiva\'l si no el vols veure.'
    );
  }

  if (docData.status === 'matched') {
    throw new Error(
      'No es pot eliminar un document ja conciliat amb un moviment bancari. Arxiva\'l si no el vols veure.'
    );
  }

  // 3. Esborrar el document de Firestore
  await deleteDoc(docRef);

  // 4. Intentar esborrar el fitxer de Storage (best-effort)
  let fileDeleted = false;
  let fileError: string | undefined;

  if (docData.file?.storagePath) {
    try {
      const storageRef = ref(storage, docData.file.storagePath);
      await deleteObject(storageRef);
      fileDeleted = true;
    } catch (error) {
      // No fem rollback - el document ja està esborrat
      console.warn('[deletePendingDocument] No s\'ha pogut esborrar el fitxer:', error);
      fileError = error instanceof Error ? error.message : 'Error desconegut';
    }
  } else {
    // No hi havia fitxer associat
    fileDeleted = true;
  }

  return { fileDeleted, fileError };
}

/**
 * Comprova si un document es pot eliminar segons el seu estat.
 */
export function canDeletePendingDocument(status: PendingDocumentStatus): boolean {
  return status === 'draft' || status === 'confirmed' || status === 'archived';
}

/**
 * Comprova si un document es pot editar completament segons el seu estat.
 * - draft/confirmed: tots els camps editables
 * - sepa_generated: només categoryId editable (camps de pagament bloquejats)
 * - matched/archived: no editable
 */
export function getEditableFields(status: PendingDocumentStatus): {
  allEditable: boolean;
  limitedEditable: boolean;
  editableFields: string[];
} {
  switch (status) {
    case 'draft':
    case 'confirmed':
      return {
        allEditable: true,
        limitedEditable: false,
        editableFields: ['amount', 'invoiceDate', 'invoiceNumber', 'supplierId', 'categoryId', 'type'],
      };
    case 'sepa_generated':
      return {
        allEditable: false,
        limitedEditable: true,
        editableFields: ['categoryId'], // Només categoria editable
      };
    case 'matched':
    case 'archived':
    default:
      return {
        allEditable: false,
        limitedEditable: false,
        editableFields: [],
      };
  }
}
