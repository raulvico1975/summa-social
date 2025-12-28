// src/lib/expense-reports/generate-sepa-reimbursement.ts
// Generador SEPA per reemborsaments de liquidacions

import {
  doc,
  collection,
  setDoc,
  serverTimestamp,
  type Firestore,
  type Timestamp,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';
import { generatePain001, type Pain001Payment } from '@/lib/sepa';
import { updateExpenseReport } from './api';
import type { ExpenseReport, ExpenseReportSepa, ExpenseReportPayment } from './types';
import type { BankAccount, Contact } from '@/lib/data';
import type { PrebankRemittance } from '@/lib/pending-documents/sepa-remittance';

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateSepaReimbursementInput {
  /** La liquidació a reemborsar */
  report: ExpenseReport;
  /** Compte bancari emissor */
  bankAccount: BankAccount;
  /** Data d'execució (YYYY-MM-DD) */
  executionDate: string;
  /** Nom del deutor (organització) */
  debtorName: string;
  /** Nom del beneficiari (resolt) */
  beneficiaryName: string;
  /** IBAN del beneficiari (resolt) */
  beneficiaryIban: string;
}

export interface GenerateSepaReimbursementResult {
  remittanceId: string;
  endToEndId: string;
  filename: string;
  downloadUrl: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Genera un endToEndId únic per a una liquidació.
 * Format: ER-{primeres 8 chars del reportId}
 */
function generateEndToEndId(reportId: string): string {
  return `ER-${reportId.slice(0, 8).toUpperCase()}`;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Genera una remesa SEPA (pain.001) per reemborsar una liquidació.
 *
 * Reutilitza el motor SEPA existent (generatePain001).
 * Crea una prebankRemittance amb un sol pagament.
 *
 * @throws Error si falla alguna operació
 */
export async function generateSepaReimbursement(
  firestore: Firestore,
  storage: FirebaseStorage,
  orgId: string,
  input: GenerateSepaReimbursementInput
): Promise<GenerateSepaReimbursementResult> {
  const { report, bankAccount, executionDate, debtorName, beneficiaryName, beneficiaryIban } = input;

  // Validacions
  if (!bankAccount.iban) {
    throw new Error('El compte bancari seleccionat no té IBAN');
  }

  if (report.sepa) {
    throw new Error('Aquesta liquidació ja té una remesa SEPA generada');
  }

  if (report.totalAmount <= 0) {
    throw new Error('L\'import de la liquidació ha de ser positiu');
  }

  if (!beneficiaryIban || beneficiaryIban.trim() === '') {
    throw new Error('El beneficiari no té IBAN');
  }

  // Generar endToEndId
  const endToEndId = generateEndToEndId(report.id);

  // Preparar pagament
  const payments: Pain001Payment[] = [{
    amount: report.totalAmount,
    creditorName: beneficiaryName,
    creditorIban: beneficiaryIban,
    concept: `Reemborsament liquidacio ${report.id.slice(0, 8)}`,
    endToEndId,
  }];

  // Generar XML
  const messageId = `SEPA${Date.now().toString(36).toUpperCase()}`;
  const xmlContent = generatePain001({
    debtorName,
    debtorIban: bankAccount.iban,
    executionDate,
    payments,
    messageId,
  });

  // Crear ID de remesa
  const remittanceId = doc(collection(firestore, 'organizations', orgId, 'prebankRemittances')).id;

  // Desar fitxer a Storage
  const filename = `reemborsament_${report.id.slice(0, 8)}_${executionDate}.xml`;
  const storagePath = `organizations/${orgId}/prebankRemittances/${remittanceId}/${filename}`;
  const storageRef = ref(storage, storagePath);

  await uploadString(storageRef, xmlContent, 'raw', {
    contentType: 'application/xml',
  });

  const downloadUrl = await getDownloadURL(storageRef);

  // Crear document de remesa
  const now = serverTimestamp();
  const remittance: Omit<PrebankRemittance, 'id'> = {
    status: 'prebank_generated',
    direction: 'out',
    nbOfTxs: 1,
    ctrlSum: report.totalAmount,
    executionDate,
    createdAt: now as Timestamp,
    updatedAt: now as Timestamp,
    debtorBankAccountId: bankAccount.id,
    debtorBankAccountName: bankAccount.name,
    debtorIban: bankAccount.iban,
    pendingDocumentIds: [], // No hi ha pendingDocuments, és una liquidació
    sepaFile: {
      storagePath,
      filename,
      messageId,
    },
  };

  // Afegir camps extra per identificar que és un reemborsament
  const remittanceWithExtra = {
    ...remittance,
    type: 'expense_report_reimbursement',
    expenseReportId: report.id,
  };

  // Desar remesa
  const remittanceRef = doc(firestore, 'organizations', orgId, 'prebankRemittances', remittanceId);
  await setDoc(remittanceRef, remittanceWithExtra);

  // Actualitzar liquidació
  const sepaInfo: ExpenseReportSepa = {
    remittanceId,
    endToEndId,
  };

  const paymentInfo: ExpenseReportPayment = {
    method: 'sepa',
    debtorBankAccountId: bankAccount.id,
    executionDate,
  };

  await updateExpenseReport(firestore, orgId, report.id, {
    sepa: sepaInfo,
    payment: paymentInfo,
    status: 'submitted', // Marcar com enviada si encara era draft
  });

  return {
    remittanceId,
    endToEndId,
    filename,
    downloadUrl,
  };
}

/**
 * Resolt el nom i IBAN del beneficiari d'una liquidació.
 */
export function resolveBeneficiary(
  report: ExpenseReport,
  contacts: Contact[]
): { name: string; iban: string } | null {
  if (!report.beneficiary) return null;

  switch (report.beneficiary.kind) {
    case 'employee': {
      const contact = contacts.find((c) => c.id === report.beneficiary!.employeeId);
      if (!contact) return null;
      const iban = (contact as Contact & { iban?: string }).iban;
      if (!iban) return null;
      return { name: contact.name, iban };
    }
    case 'contact': {
      const contact = contacts.find((c) => c.id === (report.beneficiary as { kind: 'contact'; contactId: string }).contactId);
      if (!contact) return null;
      const iban = (contact as Contact & { iban?: string }).iban;
      if (!iban) return null;
      return { name: contact.name, iban };
    }
    case 'manual': {
      const manual = report.beneficiary as { kind: 'manual'; name: string; iban: string };
      if (!manual.iban || manual.iban.trim() === '') return null;
      return { name: manual.name, iban: manual.iban };
    }
    default:
      return null;
  }
}
