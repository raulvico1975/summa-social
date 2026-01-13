// src/lib/bank-accounts.ts

/**
 * Helpers per a la gestió de comptes bancaris
 * Col·lecció: organizations/{orgId}/bankAccounts/{bankAccountId}
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  Firestore,
  UpdateData,
  DocumentData,
} from 'firebase/firestore';
import type { BankAccount } from '@/lib/data';

/**
 * Obté la referència a la col·lecció de comptes bancaris
 */
export function getBankAccountsCol(firestore: Firestore, orgId: string) {
  return collection(firestore, 'organizations', orgId, 'bankAccounts');
}

/**
 * Normalitza un IBAN (majúscules, sense espais)
 */
export function normalizeIban(iban: string | null | undefined): string | null {
  if (!iban) return null;
  return iban.toUpperCase().replace(/\s+/g, '');
}

/**
 * Tipus per crear un compte bancari (sense id ni timestamps)
 */
export type CreateBankAccountData = {
  name: string;
  iban?: string | null;
  bankName?: string | null;
  isDefault?: boolean;
};

/**
 * Crea un nou compte bancari
 */
export async function createBankAccount(
  firestore: Firestore,
  orgId: string,
  data: CreateBankAccountData
): Promise<string> {
  const now = new Date().toISOString();
  const col = getBankAccountsCol(firestore, orgId);

  // Si és el primer compte o isDefault=true, assegurem que és l'únic default
  const isDefault = data.isDefault ?? false;

  if (isDefault) {
    // Desmarcar l'anterior default
    await clearDefaultBankAccount(firestore, orgId);
  }

  const docData = {
    name: data.name,
    iban: normalizeIban(data.iban) ?? null,
    bankName: data.bankName ?? null,
    isDefault: isDefault,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(col, docData);
  return docRef.id;
}

/**
 * Tipus per actualitzar un compte bancari
 */
export type UpdateBankAccountData = {
  name?: string;
  iban?: string | null;
  bankName?: string | null;
  isActive?: boolean;
};

/**
 * Actualitza un compte bancari existent
 */
export async function updateBankAccount(
  firestore: Firestore,
  orgId: string,
  bankAccountId: string,
  data: UpdateBankAccountData
): Promise<void> {
  const docRef = doc(firestore, 'organizations', orgId, 'bankAccounts', bankAccountId);

  const updateData: UpdateData<DocumentData> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.iban !== undefined) {
    updateData.iban = normalizeIban(data.iban);
  }
  if (data.bankName !== undefined) {
    updateData.bankName = data.bankName;
  }
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  await updateDoc(docRef, updateData);
}

/**
 * Desmarca el compte default actual (helper intern)
 */
async function clearDefaultBankAccount(
  firestore: Firestore,
  orgId: string
): Promise<void> {
  const col = getBankAccountsCol(firestore, orgId);
  const q = query(col, where('isDefault', '==', true));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const batch = writeBatch(firestore);
    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        isDefault: false,
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
  }
}

/**
 * Estableix un compte com a default
 */
export async function setDefaultBankAccount(
  firestore: Firestore,
  orgId: string,
  bankAccountId: string
): Promise<void> {
  // Primer desmarca l'actual default
  await clearDefaultBankAccount(firestore, orgId);

  // Després marca el nou
  const docRef = doc(firestore, 'organizations', orgId, 'bankAccounts', bankAccountId);
  await updateDoc(docRef, {
    isDefault: true,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Compta el nombre de comptes bancaris actius
 */
async function countActiveBankAccounts(
  firestore: Firestore,
  orgId: string
): Promise<number> {
  const col = getBankAccountsCol(firestore, orgId);
  const q = query(col, where('isActive', '!=', false));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Desactiva un compte bancari (soft delete)
 * INVARIANT: No permet desactivar l'últim compte actiu
 */
export async function deactivateBankAccount(
  firestore: Firestore,
  orgId: string,
  bankAccountId: string
): Promise<void> {
  // Guardrail: verificar que no és l'últim compte actiu
  const activeCount = await countActiveBankAccounts(firestore, orgId);
  if (activeCount <= 1) {
    throw new Error('No es pot desactivar l\'últim compte bancari actiu.');
  }

  await updateBankAccount(firestore, orgId, bankAccountId, {
    isActive: false,
  });
}

/**
 * Reactiva un compte bancari
 */
export async function activateBankAccount(
  firestore: Firestore,
  orgId: string,
  bankAccountId: string
): Promise<void> {
  await updateBankAccount(firestore, orgId, bankAccountId, {
    isActive: true,
  });
}
