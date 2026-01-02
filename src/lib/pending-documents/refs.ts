// src/lib/pending-documents/refs.ts
// Helpers per accedir a la col·lecció pendingDocuments a Firestore

import {
  collection,
  doc,
  type Firestore,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import type { PendingDocument } from './types';

/**
 * Path de la col·lecció pendingDocuments dins d'una organització.
 */
export const PENDING_DOCUMENTS_PATH = 'pendingDocuments';

/**
 * Retorna la referència a la col·lecció pendingDocuments d'una organització.
 *
 * @param firestore - Instància de Firestore
 * @param orgId - ID de l'organització
 * @returns CollectionReference tipada
 */
export function pendingDocumentsCollection(
  firestore: Firestore,
  orgId: string
): CollectionReference<PendingDocument> {
  return collection(
    firestore,
    'organizations',
    orgId,
    PENDING_DOCUMENTS_PATH
  ) as CollectionReference<PendingDocument>;
}

/**
 * Retorna la referència a un document pendent específic.
 *
 * @param firestore - Instància de Firestore
 * @param orgId - ID de l'organització
 * @param docId - ID del document pendent
 * @returns DocumentReference tipada
 */
export function pendingDocumentDoc(
  firestore: Firestore,
  orgId: string,
  docId: string
): DocumentReference<PendingDocument> {
  return doc(
    firestore,
    'organizations',
    orgId,
    PENDING_DOCUMENTS_PATH,
    docId
  ) as DocumentReference<PendingDocument>;
}
