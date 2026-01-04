// src/hooks/use-bank-accounts.ts

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import type { BankAccount } from '@/lib/data';
import {
  createBankAccount,
  updateBankAccount,
  setDefaultBankAccount,
  deactivateBankAccount,
  activateBankAccount,
  type CreateBankAccountData,
  type UpdateBankAccountData,
} from '@/lib/bank-accounts';

interface UseBankAccountsResult {
  /** Llista de comptes bancaris actius, ordenats (default primer, després per nom) */
  bankAccounts: BankAccount[];
  /** Tots els comptes (incloent inactius) */
  allBankAccounts: BankAccount[];
  /** ID del compte per defecte (si existeix) */
  defaultAccountId: string | null;
  /** Compte per defecte (si existeix) */
  defaultAccount: BankAccount | null;
  /** Indica si s'estan carregant les dades */
  isLoading: boolean;
  /** Error si n'hi ha */
  error: Error | null;
  /** Crear un nou compte */
  create: (data: CreateBankAccountData) => Promise<string>;
  /** Actualitzar un compte */
  update: (id: string, data: UpdateBankAccountData) => Promise<void>;
  /** Establir com a default */
  setDefault: (id: string) => Promise<void>;
  /** Desactivar un compte */
  deactivate: (id: string) => Promise<void>;
  /** Reactivar un compte */
  activate: (id: string) => Promise<void>;
}

/**
 * Hook per gestionar els comptes bancaris d'una organització.
 *
 * Retorna només comptes actius per defecte, ordenats:
 * 1. Compte default primer
 * 2. Resta ordenats per nom
 *
 * @example
 * ```tsx
 * const { bankAccounts, defaultAccountId, create, setDefault } = useBankAccounts();
 * ```
 */
export function useBankAccounts(): UseBankAccountsResult {
  const { firestore, user } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [allBankAccounts, setAllBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Subscripció en temps real als comptes bancaris
  // GUARD: No crear listener si no hi ha user (evita permission-denied durant logout)
  useEffect(() => {
    if (!user || !organizationId || !firestore) {
      setAllBankAccounts([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const col = collection(firestore, 'organizations', organizationId, 'bankAccounts');
    // Ordenem per nom, després filtrem i reordenem al client per posar default primer
    const q = query(col, orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const accounts: BankAccount[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as BankAccount));

        setAllBankAccounts(accounts);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useBankAccounts] Error:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, organizationId, user]);

  // Filtrar només actius i ordenar (default primer)
  const bankAccounts = useMemo(() => {
    const active = allBankAccounts.filter((acc) => acc.isActive !== false);

    // Ordenar: default primer, després per nom
    return active.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name, 'ca');
    });
  }, [allBankAccounts]);

  // Compte per defecte
  const defaultAccount = useMemo(() => {
    return bankAccounts.find((acc) => acc.isDefault === true) ?? null;
  }, [bankAccounts]);

  const defaultAccountId = defaultAccount?.id ?? null;

  // Accions
  const create = useCallback(
    async (data: CreateBankAccountData): Promise<string> => {
      if (!firestore || !organizationId) {
        throw new Error('No s\'ha pogut crear el compte: firestore o organització no disponibles');
      }
      return createBankAccount(firestore, organizationId, data);
    },
    [firestore, organizationId]
  );

  const update = useCallback(
    async (id: string, data: UpdateBankAccountData): Promise<void> => {
      if (!firestore || !organizationId) {
        throw new Error('No s\'ha pogut actualitzar el compte');
      }
      return updateBankAccount(firestore, organizationId, id, data);
    },
    [firestore, organizationId]
  );

  const setDefault = useCallback(
    async (id: string): Promise<void> => {
      if (!firestore || !organizationId) {
        throw new Error('No s\'ha pogut establir el compte per defecte');
      }
      return setDefaultBankAccount(firestore, organizationId, id);
    },
    [firestore, organizationId]
  );

  const deactivate = useCallback(
    async (id: string): Promise<void> => {
      if (!firestore || !organizationId) {
        throw new Error('No s\'ha pogut desactivar el compte');
      }
      return deactivateBankAccount(firestore, organizationId, id);
    },
    [firestore, organizationId]
  );

  const activate = useCallback(
    async (id: string): Promise<void> => {
      if (!firestore || !organizationId) {
        throw new Error('No s\'ha pogut reactivar el compte');
      }
      return activateBankAccount(firestore, organizationId, id);
    },
    [firestore, organizationId]
  );

  return {
    bankAccounts,
    allBankAccounts,
    defaultAccountId,
    defaultAccount,
    isLoading,
    error,
    create,
    update,
    setDefault,
    deactivate,
    activate,
  };
}
