// src/lib/pending-documents/sepa-remittance.ts
// API per generar remeses SEPA (pain.001) des de documents pendents

import {
  doc,
  collection,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  type Firestore,
  type Timestamp,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';
import type { PendingDocument, PendingDocumentSepa } from './types';
import type { Contact, BankAccount } from '@/lib/data';
import { generatePain001, type Pain001Payment } from '@/lib/sepa';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estat d'una remesa pre-banc.
 * - prebank_generated: Fitxer generat, pendent de pujar al banc
 * - matched_to_bank: Detectada una transacció bancària que coincideix
 * - reconciled: Conciliada i desagregada amb els fills
 * - uploaded: Pujat al banc manualment per l'usuari
 * - executed: El banc ha executat els pagaments
 */
export type PrebankRemittanceStatus = 'prebank_generated' | 'matched_to_bank' | 'reconciled' | 'uploaded' | 'executed';

/**
 * Remesa de pagaments pre-banc (pain.001).
 * S'emmagatzema a: organizations/{orgId}/prebankRemittances/{remittanceId}
 */
export interface PrebankRemittance {
  id: string;

  // Metadades
  status: PrebankRemittanceStatus;
  direction: 'out';  // Sempre sortida (pagaments)

  // Totals
  nbOfTxs: number;        // Nombre de transaccions
  ctrlSum: number;        // Suma de control (total)

  // Dates
  executionDate: string;  // Data d'execució sol·licitada (YYYY-MM-DD)
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Compte deutor (de l'organització)
  debtorBankAccountId: string;
  debtorBankAccountName: string;
  debtorIban: string;

  // Documents inclosos
  pendingDocumentIds: string[];

  // Fitxer SEPA generat
  sepaFile: {
    storagePath: string;
    filename: string;
    messageId: string;
  };

  // Vincle amb transacció bancària (quan es detecta al banc)
  parentTransactionId?: string | null;

  // Vincle amb remesa post-banc (després de desagregar)
  linkedRemittanceId?: string | null;
  linkedAt?: Timestamp | null;
}

/**
 * Dades per crear una remesa.
 */
export interface CreateSepaRemittanceInput {
  /** Compte bancari emissor */
  bankAccount: BankAccount;
  /** Data d'execució (YYYY-MM-DD) */
  executionDate: string;
  /** Nom del deutor (organització) */
  debtorName: string;
  /** Documents a incloure */
  documents: PendingDocument[];
  /** Contactes (per obtenir IBAN) */
  contacts: Contact[];
}

/**
 * Resultat de la validació de documents per SEPA.
 */
export interface ValidateSepaDocsResult {
  valid: ValidDocInfo[];
  invalid: InvalidDocInfo[];
}

export interface ValidDocInfo {
  doc: PendingDocument;
  supplier: Contact;
  iban: string;
}

export interface InvalidDocInfo {
  doc: PendingDocument;
  reason: string;
}

/**
 * Resultat de la generació de la remesa.
 */
export interface CreateSepaRemittanceResult {
  remittanceId: string;
  filename: string;
  downloadUrl: string;
  nbOfTxs: number;
  ctrlSum: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDACIÓ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida quins documents poden entrar a una remesa SEPA.
 *
 * Requisits per document:
 * - status === 'confirmed' (no 'sepa_generated', no 'matched', no 'archived', no 'draft')
 * - supplierId present
 * - El contacte (supplier/employee) té IBAN
 * - amount > 0
 * - invoiceNumber present
 * - invoiceDate present
 */
export function validateDocsForSepa(
  documents: PendingDocument[],
  contacts: Contact[]
): ValidateSepaDocsResult {
  const valid: ValidDocInfo[] = [];
  const invalid: InvalidDocInfo[] = [];

  for (const doc of documents) {
    // 1. Estat ha de ser 'confirmed'
    if (doc.status !== 'confirmed') {
      invalid.push({
        doc,
        reason: doc.status === 'sepa_generated'
          ? 'Ja inclòs en una remesa anterior'
          : `Estat no vàlid: ${doc.status}`,
      });
      continue;
    }

    // 2. supplierId obligatori
    if (!doc.supplierId) {
      invalid.push({ doc, reason: 'Falta proveïdor' });
      continue;
    }

    // 3. Buscar contacte i verificar IBAN
    const supplier = contacts.find(c => c.id === doc.supplierId);
    if (!supplier) {
      invalid.push({ doc, reason: 'Proveïdor no trobat' });
      continue;
    }

    // El tipus Contact no té iban directament, cal fer cast
    const supplierWithIban = supplier as Contact & { iban?: string };
    const iban = supplierWithIban.iban;

    if (!iban || iban.trim() === '') {
      invalid.push({ doc, reason: `Proveïdor "${supplier.name}" sense IBAN` });
      continue;
    }

    // 4. amount > 0
    if (doc.amount === null || doc.amount <= 0) {
      invalid.push({ doc, reason: 'Import no vàlid (ha de ser > 0)' });
      continue;
    }

    // 5. invoiceNumber present
    if (!doc.invoiceNumber || doc.invoiceNumber.trim() === '') {
      invalid.push({ doc, reason: 'Falta número de factura' });
      continue;
    }

    // 6. invoiceDate present
    if (!doc.invoiceDate) {
      invalid.push({ doc, reason: 'Falta data de factura' });
      continue;
    }

    // Tot correcte
    valid.push({ doc, supplier, iban });
  }

  return { valid, invalid };
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERACIÓ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera un endToEndId únic i estable per a un document pendent.
 * Format: PD-{primeres 8 chars del docId}
 */
function generateEndToEndId(docId: string): string {
  return `PD-${docId.slice(0, 8).toUpperCase()}`;
}

/**
 * Genera una remesa SEPA (pain.001) i la desa a Firestore + Storage.
 *
 * 1. Valida els documents
 * 2. Genera el fitxer XML
 * 3. Desa el fitxer a Storage
 * 4. Crea el document de remesa
 * 5. Actualitza cada pendingDocument amb sepa info i status
 *
 * @throws Error si no hi ha documents vàlids o falla alguna operació
 */
export async function createSepaRemittance(
  firestore: Firestore,
  storage: FirebaseStorage,
  orgId: string,
  input: CreateSepaRemittanceInput
): Promise<CreateSepaRemittanceResult> {
  // 1. Validar documents
  const { valid, invalid } = validateDocsForSepa(input.documents, input.contacts);

  if (valid.length === 0) {
    throw new Error('Cap document vàlid per generar la remesa');
  }

  // 2. Validar compte bancari
  if (!input.bankAccount.iban) {
    throw new Error('El compte bancari seleccionat no té IBAN');
  }

  // 3. Preparar pagaments per al generador
  const payments: Pain001Payment[] = valid.map(({ doc, supplier, iban }) => ({
    amount: doc.amount!, // Ja validat que no és null
    creditorName: supplier.name,
    creditorIban: iban,
    concept: `${doc.invoiceNumber} - ${doc.file.filename}`,
    endToEndId: generateEndToEndId(doc.id),
  }));

  // 4. Generar XML
  const messageId = `SEPA${Date.now().toString(36).toUpperCase()}`;
  const xmlContent = generatePain001({
    debtorName: input.debtorName,
    debtorIban: input.bankAccount.iban,
    executionDate: input.executionDate,
    payments,
    messageId,
  });

  // 5. Crear ID de remesa
  const remittanceId = doc(collection(firestore, 'organizations', orgId, 'prebankRemittances')).id;

  // 6. Desar fitxer a Storage
  const filename = `remesa_${input.executionDate}_${valid.length}pagaments.xml`;
  const storagePath = `organizations/${orgId}/prebankRemittances/${remittanceId}/${filename}`;
  const storageRef = ref(storage, storagePath);

  await uploadString(storageRef, xmlContent, 'raw', {
    contentType: 'application/xml',
  });

  const downloadUrl = await getDownloadURL(storageRef);

  // 7. Calcular totals
  const ctrlSum = payments.reduce((sum, p) => sum + p.amount, 0);
  const nbOfTxs = payments.length;

  // 8. Crear document de remesa
  const now = serverTimestamp();
  const remittance: Omit<PrebankRemittance, 'id'> = {
    status: 'prebank_generated',
    direction: 'out',
    nbOfTxs,
    ctrlSum,
    executionDate: input.executionDate,
    createdAt: now as Timestamp,
    updatedAt: now as Timestamp,
    debtorBankAccountId: input.bankAccount.id,
    debtorBankAccountName: input.bankAccount.name,
    debtorIban: input.bankAccount.iban,
    pendingDocumentIds: valid.map(v => v.doc.id),
    sepaFile: {
      storagePath,
      filename,
      messageId,
    },
  };

  // 9. Batch: remesa + actualitzar tots els pendingDocuments
  // Firestore batch limit: max 50 operacions per batch
  const BATCH_SIZE = 49; // 49 docs + 1 remesa = 50 al primer batch

  // Primer batch: remesa + primers docs
  const firstBatchDocs = valid.slice(0, BATCH_SIZE);
  const remainingDocs = valid.slice(BATCH_SIZE);

  const batch = writeBatch(firestore);

  // Afegir document de remesa
  const remittanceRef = doc(firestore, 'organizations', orgId, 'prebankRemittances', remittanceId);
  batch.set(remittanceRef, remittance);

  // Actualitzar pendingDocuments del primer batch
  for (let i = 0; i < firstBatchDocs.length; i++) {
    const { doc: pendingDoc } = firstBatchDocs[i];
    const endToEndId = payments[i].endToEndId!;

    const sepaInfo: PendingDocumentSepa = {
      remittanceId,
      endToEndId,
    };

    const pendingDocRef = doc(firestore, 'organizations', orgId, 'pendingDocuments', pendingDoc.id);
    batch.update(pendingDocRef, {
      status: 'sepa_generated',
      sepa: sepaInfo,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();

  // Processar batches addicionals si cal
  if (remainingDocs.length > 0) {
    for (let i = 0; i < remainingDocs.length; i += 50) {
      const chunk = remainingDocs.slice(i, i + 50);
      const chunkBatch = writeBatch(firestore);
      const startIndex = firstBatchDocs.length + i;

      for (let j = 0; j < chunk.length; j++) {
        const { doc: pendingDoc } = chunk[j];
        const paymentIndex = startIndex + j;
        const endToEndId = payments[paymentIndex].endToEndId!;

        const sepaInfo: PendingDocumentSepa = {
          remittanceId,
          endToEndId,
        };

        const pendingDocRef = doc(firestore, 'organizations', orgId, 'pendingDocuments', pendingDoc.id);
        chunkBatch.update(pendingDocRef, {
          status: 'sepa_generated',
          sepa: sepaInfo,
          updatedAt: serverTimestamp(),
        });
      }

      await chunkBatch.commit();
    }
  }

  return {
    remittanceId,
    filename,
    downloadUrl,
    nbOfTxs,
    ctrlSum,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REFS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retorna la referència a la col·lecció de remeses pre-banc.
 */
export function prebankRemittancesCollection(firestore: Firestore, orgId: string) {
  return collection(firestore, 'organizations', orgId, 'prebankRemittances');
}

/**
 * Retorna la referència a un document de remesa pre-banc.
 */
export function prebankRemittanceDoc(firestore: Firestore, orgId: string, remittanceId: string) {
  return doc(firestore, 'organizations', orgId, 'prebankRemittances', remittanceId);
}
