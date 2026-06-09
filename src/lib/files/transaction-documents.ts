import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import { buildDocumentFilename } from '@/lib/build-document-filename';
import {
  LEGACY_TRANSACTION_DOCUMENT_ID,
  pickNextPrimaryDocument,
  resolveTransactionDocuments,
  type ResolvedTransactionDocuments,
  type TransactionDocumentRecord,
} from '@/lib/transactions/transaction-documents';

interface TransactionLike {
  id: string;
  date?: string | null;
  description?: string | null;
  note?: string | null;
  document?: string | null;
}

export interface AddTransactionDocumentParams {
  firestore: Firestore;
  storage: FirebaseStorage;
  organizationId: string;
  transaction: TransactionLike;
  file: File;
  overrideFilename?: string;
  createdByUid?: string | null;
  makePrimary?: boolean;
}

export interface AddTransactionDocumentResult {
  documentId: string;
  downloadURL: string;
  storagePath: string;
  filename: string;
  isPrimary: boolean;
}

export interface LinkExistingTransactionDocumentParams {
  firestore: Firestore;
  organizationId: string;
  transaction: TransactionLike;
  url: string;
  storagePath?: string | null;
  filename?: string | null;
  contentType?: string | null;
  size?: number | null;
  createdByUid?: string | null;
  source?: TransactionDocumentRecord['source'];
  makePrimary?: boolean;
}

export async function listTransactionDocuments(
  firestore: Firestore,
  organizationId: string,
  transaction: TransactionLike
): Promise<ResolvedTransactionDocuments> {
  const snapshot = await getDocs(query(
    transactionDocumentsCollection(firestore, organizationId, transaction.id),
    orderBy('createdAt', 'asc')
  ));
  const documents = snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as TransactionDocumentRecord),
    id: docSnap.id,
  }));

  return resolveTransactionDocuments({
    transactionId: transaction.id,
    legacyDocument: transaction.document ?? null,
    documents,
  });
}

export async function addTransactionDocument({
  firestore,
  storage,
  organizationId,
  transaction,
  file,
  overrideFilename,
  createdByUid = null,
  makePrimary,
}: AddTransactionDocumentParams): Promise<AddTransactionDocumentResult> {
  const dateISO = transaction.date ?? new Date().toISOString().split('T')[0];
  const concept = transaction.note?.trim() || transaction.description?.trim() || 'moviment';
  const filename = overrideFilename ?? buildDocumentFilename({ dateISO, concept, originalName: file.name });
  const storagePath = `organizations/${organizationId}/documents/${transaction.id}/${filename}`;
  const storageRef = ref(storage, storagePath);
  const contentType = getContentType(file);
  const uploadResult = await uploadBytes(storageRef, file, {
    contentType,
    customMetadata: {
      originalFileName: file.name,
    },
  });
  const downloadURL = await getDownloadURL(uploadResult.ref);

  const existing = await listTransactionDocuments(firestore, organizationId, transaction);
  const shouldBePrimary = makePrimary === true || existing.count === 0;
  const documentRef = doc(transactionDocumentsCollection(firestore, organizationId, transaction.id));
  const now = new Date().toISOString();
  const record: TransactionDocumentRecord = {
    url: downloadURL,
    storagePath,
    filename,
    contentType,
    size: typeof file.size === 'number' ? file.size : null,
    isPrimary: shouldBePrimary,
    createdAt: now,
    createdByUid: createdByUid ?? null,
    source: 'transaction-upload',
  };

  const batch = writeBatch(firestore);
  if (shouldBePrimary) {
    materializeLegacyIfNeeded(batch, firestore, organizationId, transaction, existing);
    for (const document of existing.documents) {
      if (!document.isLegacy) {
        batch.update(doc(transactionDocumentsCollection(firestore, organizationId, transaction.id), document.id), {
          isPrimary: false,
        });
      }
    }
    batch.update(transactionRef(firestore, organizationId, transaction.id), {
      document: downloadURL,
      updatedAt: now,
    });
  }
  batch.set(documentRef, record);
  await batch.commit();

  return {
    documentId: documentRef.id,
    downloadURL,
    storagePath,
    filename,
    isPrimary: shouldBePrimary,
  };
}

export async function linkExistingTransactionDocument({
  firestore,
  organizationId,
  transaction,
  url,
  storagePath = null,
  filename = null,
  contentType = null,
  size = null,
  createdByUid = null,
  source = 'transaction-upload',
  makePrimary,
}: LinkExistingTransactionDocumentParams): Promise<string> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new Error('URL de document buida');
  }

  const existing = await listTransactionDocuments(firestore, organizationId, transaction);
  const duplicate = existing.documents.find((document) => document.url === trimmedUrl);
  if (duplicate && !duplicate.isLegacy) {
    return duplicate.id;
  }

  const shouldBePrimary = makePrimary === true || existing.count === 0;
  const documentRef = doc(transactionDocumentsCollection(firestore, organizationId, transaction.id));
  const now = new Date().toISOString();
  const batch = writeBatch(firestore);
  if (shouldBePrimary) {
    materializeLegacyIfNeeded(batch, firestore, organizationId, transaction, existing);
    for (const document of existing.documents) {
      if (!document.isLegacy) {
        batch.update(doc(transactionDocumentsCollection(firestore, organizationId, transaction.id), document.id), {
          isPrimary: false,
        });
      }
    }
    batch.update(transactionRef(firestore, organizationId, transaction.id), {
      document: trimmedUrl,
      updatedAt: now,
    });
  }
  batch.set(documentRef, {
    url: trimmedUrl,
    storagePath: storagePath ?? null,
    filename: filename?.trim() || inferFilenameFromUrl(trimmedUrl) || 'document',
    contentType: contentType ?? null,
    size: typeof size === 'number' && Number.isFinite(size) ? size : null,
    isPrimary: shouldBePrimary,
    createdAt: now,
    createdByUid: createdByUid ?? null,
    source,
  } satisfies TransactionDocumentRecord);
  await batch.commit();
  return documentRef.id;
}

export async function deleteTransactionDocument(
  firestore: Firestore,
  organizationId: string,
  transaction: TransactionLike,
  documentId: string
): Promise<void> {
  if (documentId === LEGACY_TRANSACTION_DOCUMENT_ID) {
    await updateDoc(transactionRef(firestore, organizationId, transaction.id), {
      document: null,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const docsRef = transactionDocumentsCollection(firestore, organizationId, transaction.id);
  const snapshot = await getDocs(query(docsRef, orderBy('createdAt', 'asc')));
  const documents = snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as TransactionDocumentRecord),
    id: docSnap.id,
  }));
  const target = documents.find((document) => document.id === documentId);
  const nextPrimary = target?.isPrimary
    ? pickNextPrimaryDocument(documents, documentId)
    : null;
  const now = new Date().toISOString();
  const batch = writeBatch(firestore);

  batch.delete(doc(docsRef, documentId));
  if (target?.isPrimary) {
    if (nextPrimary?.id) {
      batch.update(doc(docsRef, nextPrimary.id), { isPrimary: true });
      batch.update(transactionRef(firestore, organizationId, transaction.id), {
        document: nextPrimary.url,
        updatedAt: now,
      });
    } else {
      batch.update(transactionRef(firestore, organizationId, transaction.id), {
        document: transaction.document ?? null,
        updatedAt: now,
      });
    }
  }

  await batch.commit();
}

export async function setPrimaryTransactionDocument(
  firestore: Firestore,
  organizationId: string,
  transaction: TransactionLike,
  documentId: string
): Promise<void> {
  const docsRef = transactionDocumentsCollection(firestore, organizationId, transaction.id);
  const snapshot = await getDocs(query(docsRef, orderBy('createdAt', 'asc')));
  const documents = snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as TransactionDocumentRecord),
    id: docSnap.id,
  }));
  const now = new Date().toISOString();
  const batch = writeBatch(firestore);
  if (documentId !== LEGACY_TRANSACTION_DOCUMENT_ID) {
    const resolved = resolveTransactionDocuments({
      transactionId: transaction.id,
      legacyDocument: transaction.document ?? null,
      documents,
    });
    materializeLegacyIfNeeded(batch, firestore, organizationId, transaction, resolved);
  }

  for (const document of documents) {
    if (!document.id) continue;
    batch.update(doc(docsRef, document.id), {
      isPrimary: document.id === documentId,
    });
  }

  if (documentId === LEGACY_TRANSACTION_DOCUMENT_ID) {
    batch.update(transactionRef(firestore, organizationId, transaction.id), {
      document: transaction.document ?? null,
      updatedAt: now,
    });
  } else {
    const primary = documents.find((document) => document.id === documentId);
    if (!primary) {
      throw new Error('Document no trobat');
    }
    batch.update(transactionRef(firestore, organizationId, transaction.id), {
      document: primary.url,
      updatedAt: now,
    });
  }

  await batch.commit();
}

export async function clearTransactionDocumentLink(
  firestore: Firestore,
  organizationId: string,
  transactionId: string,
  documentUrl: string | null
): Promise<void> {
  const docsRef = transactionDocumentsCollection(firestore, organizationId, transactionId);
  const snapshot = await getDocs(query(docsRef, orderBy('createdAt', 'asc')));
  const matches = snapshot.docs.filter((docSnap) => {
    const data = docSnap.data() as TransactionDocumentRecord;
    return documentUrl ? data.url === documentUrl : false;
  });

  const batch = writeBatch(firestore);
  for (const match of matches) {
    batch.delete(match.ref);
  }
  batch.update(transactionRef(firestore, organizationId, transactionId), {
    document: null,
    updatedAt: new Date().toISOString(),
  });
  await batch.commit();
}

function transactionDocumentsCollection(
  firestore: Firestore,
  organizationId: string,
  transactionId: string
) {
  return collection(firestore, 'organizations', organizationId, 'transactions', transactionId, 'documents');
}

function transactionRef(
  firestore: Firestore,
  organizationId: string,
  transactionId: string
) {
  return doc(firestore, 'organizations', organizationId, 'transactions', transactionId);
}

function materializeLegacyIfNeeded(
  batch: ReturnType<typeof writeBatch>,
  firestore: Firestore,
  organizationId: string,
  transaction: TransactionLike,
  resolved: ResolvedTransactionDocuments
): void {
  const legacyUrl = transaction.document?.trim();
  if (!legacyUrl) return;
  const alreadyPersisted = resolved.documents.some((document) => !document.isLegacy && document.url === legacyUrl);
  if (alreadyPersisted) return;

  const legacyRef = doc(transactionDocumentsCollection(firestore, organizationId, transaction.id));
  batch.set(legacyRef, {
    url: legacyUrl,
    storagePath: null,
    filename: inferFilenameFromUrl(legacyUrl) || `${transaction.id}-document`,
    contentType: null,
    size: null,
    isPrimary: false,
    createdAt: new Date().toISOString(),
    createdByUid: null,
    source: 'legacy-document',
  } satisfies TransactionDocumentRecord);
}

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

function inferFilenameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const encodedName = parsed.pathname.split('/').filter(Boolean).pop();
    if (!encodedName) return null;
    const decodedPath = decodeURIComponent(encodedName);
    return decodedPath.split('/').filter(Boolean).pop() ?? decodedPath;
  } catch {
    return url.split('/').filter(Boolean).pop() ?? null;
  }
}
