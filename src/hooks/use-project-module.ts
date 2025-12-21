// src/hooks/use-project-module.ts
// Hooks per al mòdul de Projectes (B1)

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import type {
  ProjectExpenseExport,
  Project,
  ExpenseLink,
  ExpenseWithLink,
  ExpenseStatus,
  ProjectFormData,
  ExpenseAssignment,
  ExpenseJustification,
  OffBankExpense,
  OffBankExpenseFormData,
  UnifiedExpense,
  UnifiedExpenseWithLink,
  BudgetLine,
  BudgetLineFormData,
} from '@/lib/project-module-types';

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Llistat de despeses exportades (feed read-only)
// ═══════════════════════════════════════════════════════════════════════════

interface UseExpenseFeedResult {
  expenses: ExpenseWithLink[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useExpenseFeed(): UseExpenseFeedResult {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [expenses, setExpenses] = useState<ExpenseWithLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const loadExpenses = useCallback(async (isLoadMore = false) => {
    if (!organizationId) return;

    try {
      if (!isLoadMore) {
        setIsLoading(true);
      }

      // Query al feed d'exports
      const feedRef = collection(
        firestore,
        'organizations',
        organizationId,
        'exports',
        'projectExpenses',
        'items'
      );

      let q = query(
        feedRef,
        where('isEligibleForProjects', '==', true),
        where('deletedAt', '==', null),
        orderBy('date', 'desc'),
        limit(PAGE_SIZE)
      );

      if (isLoadMore && lastDoc) {
        q = query(
          feedRef,
          where('isEligibleForProjects', '==', true),
          where('deletedAt', '==', null),
          orderBy('date', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setHasMore(false);
        if (!isLoadMore) {
          setExpenses([]);
        }
        return;
      }

      // Obtenir els IDs per fer el batch lookup dels links
      const txIds = snapshot.docs.map((d) => d.id);

      // Carregar els expenseLinks corresponents
      const linksRef = collection(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'expenseLinks'
      );

      const linksMap = new Map<string, ExpenseLink>();

      // Firestore 'in' query suporta màxim 10 elements
      // Per ara fem queries individuals (millorable amb batching)
      for (const txId of txIds) {
        const linkDoc = await getDoc(doc(linksRef, txId));
        if (linkDoc.exists()) {
          linksMap.set(txId, { id: linkDoc.id, ...linkDoc.data() } as ExpenseLink);
        }
      }

      // Combinar expenses amb links
      const newExpenses: ExpenseWithLink[] = snapshot.docs.map((d) => {
        const expense = { id: d.id, ...d.data() } as ProjectExpenseExport;
        const link = linksMap.get(d.id) ?? null;

        const assignedAmount = link
          ? link.assignments.reduce((sum, a) => sum + Math.abs(a.amountEUR), 0)
          : 0;
        const totalAmount = Math.abs(expense.amountEUR);
        const remainingAmount = totalAmount - assignedAmount;

        let status: ExpenseStatus = 'unassigned';
        if (link && link.assignments.length > 0) {
          status = remainingAmount <= 0.01 ? 'assigned' : 'partial';
        }

        return {
          expense,
          link,
          status,
          assignedAmount,
          remainingAmount,
        };
      });

      if (isLoadMore) {
        setExpenses((prev) => [...prev, ...newExpenses]);
      } else {
        setExpenses(newExpenses);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

    } catch (err) {
      console.error('Error loading expense feed:', err);
      setError(err instanceof Error ? err : new Error('Error desconegut'));
    } finally {
      setIsLoading(false);
    }
  }, [firestore, organizationId, lastDoc]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadExpenses(true);
  }, [hasMore, isLoading, loadExpenses]);

  const refresh = useCallback(async () => {
    setLastDoc(null);
    setHasMore(true);
    await loadExpenses(false);
  }, [loadExpenses]);

  useEffect(() => {
    loadExpenses(false);
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    expenses,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Llistat unificat de despeses (bank + off-bank) amb filtres opcionals
// ═══════════════════════════════════════════════════════════════════════════

interface UseUnifiedExpenseFeedOptions {
  projectId?: string | null;
  budgetLineId?: string | null;
}

interface UseUnifiedExpenseFeedResult {
  expenses: UnifiedExpenseWithLink[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  isFiltered: boolean;
  usedFallback: boolean;
}

export function useUnifiedExpenseFeed(options?: UseUnifiedExpenseFeedOptions): UseUnifiedExpenseFeedResult {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const projectId = options?.projectId ?? null;
  const budgetLineId = options?.budgetLineId ?? null;
  const isFiltered = !!(projectId || budgetLineId);

  const [expenses, setExpenses] = useState<UnifiedExpenseWithLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  // Helper per carregar despeses filtrades
  const loadFilteredExpenses = useCallback(async () => {
    const linksRef = collection(
      firestore,
      'organizations',
      organizationId!,
      'projectModule',
      '_',
      'expenseLinks'
    );

    let linksSnapshot;
    let didUseFallback = false;

    // Fer query segons el filtre
    if (budgetLineId) {
      // Cas A: filtrar per budgetLineId
      // Primer intentem amb budgetLineIds (dades noves)
      const directQuery = query(linksRef, where('budgetLineIds', 'array-contains', budgetLineId));
      linksSnapshot = await getDocs(directQuery);

      // Si no trobem res, fem fallback: carregar per projectId i filtrar client-side
      if (linksSnapshot.empty && projectId) {
        didUseFallback = true;
        const fallbackQuery = query(linksRef, where('projectIds', 'array-contains', projectId));
        const fallbackSnapshot = await getDocs(fallbackQuery);

        // Filtrar client-side per budgetLineId dins assignments
        const filteredDocs = fallbackSnapshot.docs.filter((d) => {
          const data = d.data();
          return data.assignments?.some((a: ExpenseAssignment) => a.budgetLineId === budgetLineId);
        });

        linksSnapshot = {
          docs: filteredDocs,
          empty: filteredDocs.length === 0,
        } as unknown as typeof linksSnapshot;
      }
    } else if (projectId) {
      // Cas B: filtrar per projectId
      const directQuery = query(linksRef, where('projectIds', 'array-contains', projectId));
      linksSnapshot = await getDocs(directQuery);
    } else {
      // No hauria d'arribar aquí, però per seguretat
      setExpenses([]);
      setUsedFallback(false);
      return;
    }

    setUsedFallback(didUseFallback);

    const linksMap = new Map<string, ExpenseLink>();
    const txIds: string[] = [];

    for (const linkDoc of linksSnapshot.docs) {
      const linkData = { id: linkDoc.id, ...linkDoc.data() } as ExpenseLink;
      linksMap.set(linkDoc.id, linkData);
      txIds.push(linkDoc.id);
    }

    if (txIds.length === 0) {
      setExpenses([]);
      return;
    }

    // Carregar les despeses corresponents
    const bankRef = collection(
      firestore,
      'organizations',
      organizationId!,
      'exports',
      'projectExpenses',
      'items'
    );

    const offBankRef = collection(
      firestore,
      'organizations',
      organizationId!,
      'projectModule',
      '_',
      'offBankExpenses'
    );

    const allExpenses: UnifiedExpense[] = [];

    for (const txId of txIds) {
      if (txId.startsWith('off_')) {
        // Despesa off-bank
        const offBankId = txId.replace('off_', '');
        const offBankDoc = await getDoc(doc(offBankRef, offBankId));
        if (offBankDoc.exists()) {
          const data = offBankDoc.data() as OffBankExpense;
          allExpenses.push({
            txId,
            source: 'offBank' as const,
            date: data.date,
            description: data.concept,
            amountEUR: -Math.abs(data.amountEUR),
            categoryName: data.categoryName,
            counterpartyName: data.counterpartyName,
            documentUrl: data.documentUrl,
            // Camps FX
            currency: data.currency ?? null,
            amountOriginal: data.amountOriginal ?? null,
            fxRateUsed: data.fxRateUsed ?? null,
            // Camps justificació
            invoiceNumber: data.invoiceNumber ?? null,
            issuerTaxId: data.issuerTaxId ?? null,
            invoiceDate: data.invoiceDate ?? null,
            paymentDate: data.paymentDate ?? null,
            supportDocNumber: data.supportDocNumber ?? null,
          });
        }
      } else {
        // Despesa bank
        const bankDoc = await getDoc(doc(bankRef, txId));
        if (bankDoc.exists()) {
          const data = bankDoc.data() as ProjectExpenseExport;
          allExpenses.push({
            txId,
            source: 'bank' as const,
            date: data.date,
            description: data.description,
            amountEUR: data.amountEUR,
            categoryName: data.categoryName,
            counterpartyName: data.counterpartyName,
            documentUrl: data.documents?.[0]?.fileUrl ?? null,
          });
        }
      }
    }

    // Ordenar per data desc
    allExpenses.sort((a, b) => b.date.localeCompare(a.date));

    // Combinar amb links
    const result: UnifiedExpenseWithLink[] = allExpenses.map((expense) => {
      const link = linksMap.get(expense.txId) ?? null;

      const assignedAmount = link
        ? link.assignments.reduce((sum, a) => sum + Math.abs(a.amountEUR), 0)
        : 0;
      const totalAmount = Math.abs(expense.amountEUR);
      const remainingAmount = totalAmount - assignedAmount;

      let status: ExpenseStatus = 'unassigned';
      if (link && link.assignments.length > 0) {
        status = remainingAmount <= 0.01 ? 'assigned' : 'partial';
      }

      return {
        expense,
        link,
        status,
        assignedAmount,
        remainingAmount,
      };
    });

    setExpenses(result);
  }, [firestore, organizationId, projectId, budgetLineId]);

  const loadExpenses = useCallback(async () => {
    if (!organizationId) return;

    try {
      setIsLoading(true);

      // Si hi ha filtre, carreguem des dels expenseLinks primer
      if (budgetLineId || projectId) {
        await loadFilteredExpenses();
        return;
      }

      // Cas sense filtre: carregar totes les despeses
      // 1. Carregar despeses bank (exports)
      const bankRef = collection(
        firestore,
        'organizations',
        organizationId,
        'exports',
        'projectExpenses',
        'items'
      );
      const bankQuery = query(
        bankRef,
        where('isEligibleForProjects', '==', true),
        where('deletedAt', '==', null),
        orderBy('date', 'desc'),
        limit(100)
      );
      const bankSnapshot = await getDocs(bankQuery);

      // 2. Carregar despeses off-bank
      const offBankRef = collection(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'offBankExpenses'
      );
      const offBankQuery = query(offBankRef, orderBy('date', 'desc'), limit(100));
      const offBankSnapshot = await getDocs(offBankQuery);

      // 3. Convertir a UnifiedExpense
      const bankExpenses: UnifiedExpense[] = bankSnapshot.docs.map((d) => {
        const data = d.data() as ProjectExpenseExport;
        return {
          txId: d.id,
          source: 'bank' as const,
          date: data.date,
          description: data.description,
          amountEUR: data.amountEUR, // ja negatiu
          categoryName: data.categoryName,
          counterpartyName: data.counterpartyName,
          documentUrl: data.documents?.[0]?.fileUrl ?? null,
        };
      });

      const offBankExpenses: UnifiedExpense[] = offBankSnapshot.docs.map((d) => {
        const data = d.data() as OffBankExpense;
        return {
          txId: `off_${d.id}`,
          source: 'offBank' as const,
          date: data.date,
          description: data.concept,
          amountEUR: -Math.abs(data.amountEUR), // convertir a negatiu per consistència
          categoryName: data.categoryName,
          counterpartyName: data.counterpartyName,
          documentUrl: data.documentUrl,
          // Camps FX
          currency: data.currency ?? null,
          amountOriginal: data.amountOriginal ?? null,
          fxRateUsed: data.fxRateUsed ?? null,
          // Camps justificació
          invoiceNumber: data.invoiceNumber ?? null,
          issuerTaxId: data.issuerTaxId ?? null,
          invoiceDate: data.invoiceDate ?? null,
          paymentDate: data.paymentDate ?? null,
          supportDocNumber: data.supportDocNumber ?? null,
        };
      });

      // 4. Mergeja i ordena per data desc
      const allExpenses = [...bankExpenses, ...offBankExpenses].sort(
        (a, b) => b.date.localeCompare(a.date)
      );

      // 5. Carregar els expenseLinks corresponents
      const linksRef = collection(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'expenseLinks'
      );

      const linksMap = new Map<string, ExpenseLink>();
      for (const exp of allExpenses) {
        const linkDoc = await getDoc(doc(linksRef, exp.txId));
        if (linkDoc.exists()) {
          linksMap.set(exp.txId, { id: linkDoc.id, ...linkDoc.data() } as ExpenseLink);
        }
      }

      // 6. Combinar amb links
      const result: UnifiedExpenseWithLink[] = allExpenses.map((expense) => {
        const link = linksMap.get(expense.txId) ?? null;

        const assignedAmount = link
          ? link.assignments.reduce((sum, a) => sum + Math.abs(a.amountEUR), 0)
          : 0;
        const totalAmount = Math.abs(expense.amountEUR);
        const remainingAmount = totalAmount - assignedAmount;

        let status: ExpenseStatus = 'unassigned';
        if (link && link.assignments.length > 0) {
          status = remainingAmount <= 0.01 ? 'assigned' : 'partial';
        }

        return {
          expense,
          link,
          status,
          assignedAmount,
          remainingAmount,
        };
      });

      setExpenses(result);

    } catch (err) {
      console.error('Error loading unified expense feed:', err);
      setError(err instanceof Error ? err : new Error('Error desconegut'));
    } finally {
      setIsLoading(false);
    }
  }, [firestore, organizationId, projectId, budgetLineId, loadFilteredExpenses]);

  const refresh = useCallback(async () => {
    await loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    loadExpenses();
  }, [organizationId, projectId, budgetLineId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    expenses,
    isLoading,
    error,
    refresh,
    isFiltered,
    usedFallback,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Crear despesa off-bank
// ═══════════════════════════════════════════════════════════════════════════

interface UseSaveOffBankExpenseResult {
  save: (data: OffBankExpenseFormData) => Promise<string>;
  isSaving: boolean;
  error: Error | null;
}

export function useSaveOffBankExpense(): UseSaveOffBankExpenseResult {
  const { firestore, user } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const save = useCallback(async (data: OffBankExpenseFormData): Promise<string> => {
    if (!organizationId || !user) {
      throw new Error('No autenticat');
    }

    // Validacions
    const amount = parseFloat(data.amountEUR);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('L\'import ha de ser un número positiu');
    }

    const concept = data.concept.trim();
    if (concept.length === 0) {
      throw new Error('El concepte és obligatori');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      throw new Error('La data ha de tenir format YYYY-MM-DD');
    }

    setIsSaving(true);
    setError(null);

    try {
      const offBankRef = collection(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'offBankExpenses'
      );

      const now = serverTimestamp();
      const newRef = doc(offBankRef);

      // Camps FX opcionals
      const currency = data.currency?.trim().toUpperCase() || null;
      const amountOriginal = data.amountOriginal ? parseFloat(data.amountOriginal) : null;
      const fxRateUsed = data.useFxOverride && data.fxRateOverride
        ? parseFloat(data.fxRateOverride)
        : null;

      const expenseData: Record<string, unknown> = {
        orgId: organizationId,
        source: 'offBank' as const,
        date: data.date,
        concept,
        amountEUR: amount,
        counterpartyName: data.counterpartyName?.trim() || null,
        categoryName: data.categoryName?.trim() || null,
        documentUrl: null, // Implementar upload després
        createdBy: user.uid,
        createdAt: now,
        updatedAt: now,
      };

      // Afegir camps FX si existeixen
      if (currency && currency !== 'EUR') {
        expenseData.currency = currency;
        if (amountOriginal !== null && !isNaN(amountOriginal)) {
          expenseData.amountOriginal = amountOriginal;
        }
        if (fxRateUsed !== null && !isNaN(fxRateUsed) && fxRateUsed > 0) {
          expenseData.fxRateUsed = fxRateUsed;
        }
      }

      // Camps justificació opcionals
      if (data.invoiceNumber?.trim()) {
        expenseData.invoiceNumber = data.invoiceNumber.trim();
      }
      if (data.issuerTaxId?.trim()) {
        expenseData.issuerTaxId = data.issuerTaxId.trim();
      }
      if (data.invoiceDate) {
        expenseData.invoiceDate = data.invoiceDate;
      }
      if (data.paymentDate) {
        expenseData.paymentDate = data.paymentDate;
      }
      if (data.supportDocNumber?.trim()) {
        expenseData.supportDocNumber = data.supportDocNumber.trim();
      }

      await setDoc(newRef, expenseData);

      return newRef.id;

    } catch (err) {
      console.error('Error saving off-bank expense:', err);
      const e = err instanceof Error ? err : new Error('Error desant despesa');
      setError(e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, [firestore, organizationId, user]);

  return {
    save,
    isSaving,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Actualitzar despesa off-bank
// ═══════════════════════════════════════════════════════════════════════════

interface UseUpdateOffBankExpenseResult {
  update: (expenseId: string, data: Partial<OffBankExpenseFormData>) => Promise<void>;
  isUpdating: boolean;
  error: Error | null;
}

export function useUpdateOffBankExpense(): UseUpdateOffBankExpenseResult {
  const { firestore, user } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (expenseId: string, data: Partial<OffBankExpenseFormData>): Promise<void> => {
    if (!organizationId || !user) {
      throw new Error('No autenticat');
    }

    if (!expenseId) {
      throw new Error('ID de despesa no vàlid');
    }

    // Validacions si s'inclouen els camps
    if (data.amountEUR !== undefined) {
      const amount = parseFloat(data.amountEUR);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('L\'import ha de ser un número positiu');
      }
    }

    if (data.concept !== undefined) {
      const concept = data.concept.trim();
      if (concept.length === 0) {
        throw new Error('El concepte és obligatori');
      }
    }

    if (data.date !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.date)) {
        throw new Error('La data ha de tenir format YYYY-MM-DD');
      }
    }

    setIsUpdating(true);
    setError(null);

    try {
      const expenseRef = doc(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'offBankExpenses',
        expenseId
      );

      const updateData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      if (data.date !== undefined) {
        updateData.date = data.date;
      }
      if (data.concept !== undefined) {
        updateData.concept = data.concept.trim();
      }
      if (data.amountEUR !== undefined) {
        updateData.amountEUR = parseFloat(data.amountEUR);
      }
      if (data.counterpartyName !== undefined) {
        updateData.counterpartyName = data.counterpartyName.trim() || null;
      }
      if (data.categoryName !== undefined) {
        updateData.categoryName = data.categoryName.trim() || null;
      }

      // Camps FX
      if (data.currency !== undefined) {
        const currency = data.currency?.trim().toUpperCase() || null;
        if (currency && currency !== 'EUR') {
          updateData.currency = currency;
          if (data.amountOriginal !== undefined) {
            const amountOriginal = parseFloat(data.amountOriginal);
            updateData.amountOriginal = isNaN(amountOriginal) ? null : amountOriginal;
          }
          if (data.useFxOverride && data.fxRateOverride) {
            const fxRateUsed = parseFloat(data.fxRateOverride);
            updateData.fxRateUsed = isNaN(fxRateUsed) ? null : fxRateUsed;
          } else {
            updateData.fxRateUsed = null;
          }
        } else {
          // Si torna a EUR, netejar camps FX
          updateData.currency = null;
          updateData.amountOriginal = null;
          updateData.fxRateUsed = null;
        }
      }

      // Camps justificació
      if (data.invoiceNumber !== undefined) {
        updateData.invoiceNumber = data.invoiceNumber?.trim() || null;
      }
      if (data.issuerTaxId !== undefined) {
        updateData.issuerTaxId = data.issuerTaxId?.trim() || null;
      }
      if (data.invoiceDate !== undefined) {
        updateData.invoiceDate = data.invoiceDate || null;
      }
      if (data.paymentDate !== undefined) {
        updateData.paymentDate = data.paymentDate || null;
      }
      if (data.supportDocNumber !== undefined) {
        updateData.supportDocNumber = data.supportDocNumber?.trim() || null;
      }

      await updateDoc(expenseRef, updateData);

    } catch (err) {
      console.error('Error updating off-bank expense:', err);
      const e = err instanceof Error ? err : new Error('Error actualitzant despesa');
      setError(e);
      throw e;
    } finally {
      setIsUpdating(false);
    }
  }, [firestore, organizationId, user]);

  return {
    update,
    isUpdating,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Detall d'una despesa amb el seu link
// ═══════════════════════════════════════════════════════════════════════════

interface UseExpenseDetailResult {
  expense: ProjectExpenseExport | null;
  link: ExpenseLink | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useExpenseDetail(txId: string): UseExpenseDetailResult {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [expense, setExpense] = useState<ProjectExpenseExport | null>(null);
  const [link, setLink] = useState<ExpenseLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!organizationId || !txId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Carregar despesa del feed
      const expenseRef = doc(
        firestore,
        'organizations',
        organizationId,
        'exports',
        'projectExpenses',
        'items',
        txId
      );
      const expenseSnap = await getDoc(expenseRef);

      if (!expenseSnap.exists()) {
        throw new Error('Despesa no trobada');
      }

      setExpense({ id: expenseSnap.id, ...expenseSnap.data() } as ProjectExpenseExport);

      // Carregar link si existeix
      const linkRef = doc(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'expenseLinks',
        txId
      );
      const linkSnap = await getDoc(linkRef);

      if (linkSnap.exists()) {
        setLink({ id: linkSnap.id, ...linkSnap.data() } as ExpenseLink);
      } else {
        setLink(null);
      }

    } catch (err) {
      console.error('Error loading expense detail:', err);
      setError(err instanceof Error ? err : new Error('Error desconegut'));
    } finally {
      setIsLoading(false);
    }
  }, [firestore, organizationId, txId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    expense,
    link,
    isLoading,
    error,
    refresh: load,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Guardar assignació de despesa
// ═══════════════════════════════════════════════════════════════════════════

interface UseSaveExpenseLinkResult {
  save: (txId: string, assignments: ExpenseAssignment[], note: string | null, justification?: ExpenseJustification | null) => Promise<void>;
  remove: (txId: string) => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}

export function useSaveExpenseLink(): UseSaveExpenseLinkResult {
  const { firestore, user } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const save = useCallback(async (
    txId: string,
    assignments: ExpenseAssignment[],
    note: string | null,
    justification?: ExpenseJustification | null
  ) => {
    if (!organizationId || !user) {
      throw new Error('No autenticat');
    }

    setIsSaving(true);
    setError(null);

    try {
      const linkRef = doc(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'expenseLinks',
        txId
      );

      const existingSnap = await getDoc(linkRef);
      const now = serverTimestamp();

      // Calcular projectIds i budgetLineIds per queries ràpides
      const projectIds = [...new Set(assignments.map((a) => a.projectId))];
      const budgetLineIds = [...new Set(
        assignments
          .filter((a) => a.budgetLineId)
          .map((a) => a.budgetLineId as string)
      )];

      const linkData: Omit<ExpenseLink, 'id' | 'createdAt' | 'updatedAt'> & {
        createdAt?: ReturnType<typeof serverTimestamp>;
        updatedAt: ReturnType<typeof serverTimestamp>;
        budgetLineIds: string[];
      } = {
        orgId: organizationId,
        assignments,
        projectIds,
        budgetLineIds,
        note: note ?? null,
        justification: justification ?? null,
        createdBy: user.uid,
        updatedAt: now,
      };

      if (!existingSnap.exists()) {
        linkData.createdAt = now;
      }

      await setDoc(linkRef, linkData, { merge: true });

    } catch (err) {
      console.error('Error saving expense link:', err);
      const e = err instanceof Error ? err : new Error('Error desant assignació');
      setError(e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, [firestore, organizationId, user]);

  const remove = useCallback(async (txId: string) => {
    if (!organizationId) {
      throw new Error('No autenticat');
    }

    setIsSaving(true);
    setError(null);

    try {
      const linkRef = doc(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'expenseLinks',
        txId
      );

      await deleteDoc(linkRef);

    } catch (err) {
      console.error('Error removing expense link:', err);
      const e = err instanceof Error ? err : new Error('Error eliminant assignació');
      setError(e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, [firestore, organizationId]);

  return {
    save,
    remove,
    isSaving,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Llistat de projectes del mòdul
// ═══════════════════════════════════════════════════════════════════════════

interface UseProjectsResult {
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useProjects(onlyActive = false): UseProjectsResult {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const projectsRef = collection(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'projects'
      );

      let q = query(projectsRef, orderBy('name', 'asc'));

      if (onlyActive) {
        q = query(projectsRef, where('status', '==', 'active'), orderBy('name', 'asc'));
      }

      const snapshot = await getDocs(q);

      const loadedProjects: Project[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as Project));

      setProjects(loadedProjects);

    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err instanceof Error ? err : new Error('Error desconegut'));
    } finally {
      setIsLoading(false);
    }
  }, [firestore, organizationId, onlyActive]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    projects,
    isLoading,
    error,
    refresh: load,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Detall d'un projecte
// ═══════════════════════════════════════════════════════════════════════════

interface UseProjectDetailResult {
  project: Project | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useProjectDetail(projectId: string): UseProjectDetailResult {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!organizationId || !projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const projectRef = doc(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'projects',
        projectId
      );
      const projectSnap = await getDoc(projectRef);

      if (!projectSnap.exists()) {
        throw new Error('Projecte no trobat');
      }

      setProject({ id: projectSnap.id, ...projectSnap.data() } as Project);

    } catch (err) {
      console.error('Error loading project detail:', err);
      setError(err instanceof Error ? err : new Error('Error desconegut'));
    } finally {
      setIsLoading(false);
    }
  }, [firestore, organizationId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    project,
    isLoading,
    error,
    refresh: load,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Crear/Editar projecte
// ═══════════════════════════════════════════════════════════════════════════

interface UseSaveProjectResult {
  save: (data: ProjectFormData, projectId?: string) => Promise<string>;
  isSaving: boolean;
  error: Error | null;
}

export function useSaveProject(): UseSaveProjectResult {
  const { firestore, user } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const save = useCallback(async (data: ProjectFormData, projectId?: string): Promise<string> => {
    if (!organizationId || !user) {
      throw new Error('No autenticat');
    }

    setIsSaving(true);
    setError(null);

    try {
      const projectsRef = collection(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'projects'
      );

      const now = serverTimestamp();

      const deviationPct = data.allowedDeviationPct ? parseFloat(data.allowedDeviationPct) : 10;

      const projectData = {
        orgId: organizationId,
        name: data.name.trim(),
        code: data.code.trim() || null,
        status: data.status,
        budgetEUR: data.budgetEUR ? parseFloat(data.budgetEUR) : null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        allowedDeviationPct: isNaN(deviationPct) ? 10 : deviationPct,
        updatedAt: now,
      };

      let finalId: string;

      if (projectId) {
        // Editar existent
        const projectRef = doc(projectsRef, projectId);
        await setDoc(projectRef, projectData, { merge: true });
        finalId = projectId;
      } else {
        // Crear nou
        const newRef = doc(projectsRef);
        await setDoc(newRef, {
          ...projectData,
          createdBy: user.uid,
          createdAt: now,
        });
        finalId = newRef.id;
      }

      return finalId;

    } catch (err) {
      console.error('Error saving project:', err);
      const e = err instanceof Error ? err : new Error('Error desant projecte');
      setError(e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, [firestore, organizationId, user]);

  return {
    save,
    isSaving,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Desar tipus de canvi del projecte (FX)
// ═══════════════════════════════════════════════════════════════════════════

interface UseSaveProjectFxResult {
  saveFx: (projectId: string, fxRate: number | null, fxCurrency: string | null) => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}

export function useSaveProjectFx(): UseSaveProjectFxResult {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveFx = useCallback(async (
    projectId: string,
    fxRate: number | null,
    fxCurrency: string | null
  ): Promise<void> => {
    if (!organizationId) {
      throw new Error('No autenticat');
    }

    setIsSaving(true);
    setError(null);

    try {
      const projectRef = doc(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'projects',
        projectId
      );

      await setDoc(projectRef, {
        fxRate: fxRate,
        fxCurrency: fxCurrency,
        updatedAt: serverTimestamp(),
      }, { merge: true });

    } catch (err) {
      console.error('Error saving project FX:', err);
      const e = err instanceof Error ? err : new Error('Error desant tipus de canvi');
      setError(e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, [firestore, organizationId]);

  return {
    saveFx,
    isSaving,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Partides de pressupost d'un projecte
// ═══════════════════════════════════════════════════════════════════════════

interface UseProjectBudgetLinesResult {
  budgetLines: BudgetLine[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useProjectBudgetLines(projectId: string): UseProjectBudgetLinesResult {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!organizationId || !projectId) {
      setBudgetLines([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const linesRef = collection(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'projects',
        projectId,
        'budgetLines'
      );

      // Carregar totes les partides (ordenarem al client per evitar problemes amb nulls)
      const snapshot = await getDocs(linesRef);

      const lines: BudgetLine[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as BudgetLine));

      // Ordenar al client: primer per order (nulls al final), després per name
      lines.sort((a, b) => {
        if (a.order !== null && b.order !== null) return a.order - b.order;
        if (a.order !== null) return -1;
        if (b.order !== null) return 1;
        return a.name.localeCompare(b.name);
      });

      setBudgetLines(lines);

    } catch (err) {
      console.error('Error loading budget lines:', err);
      setError(err instanceof Error ? err : new Error('Error desconegut'));
    } finally {
      setIsLoading(false);
    }
  }, [firestore, organizationId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    budgetLines,
    isLoading,
    error,
    refresh: load,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: CRUD de partides de pressupost
// ═══════════════════════════════════════════════════════════════════════════

interface UseSaveBudgetLineResult {
  save: (projectId: string, data: BudgetLineFormData, lineId?: string) => Promise<string>;
  remove: (projectId: string, lineId: string) => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}

export function useSaveBudgetLine(): UseSaveBudgetLineResult {
  const { firestore, user } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const save = useCallback(async (
    projectId: string,
    data: BudgetLineFormData,
    lineId?: string
  ): Promise<string> => {
    if (!organizationId || !user) {
      throw new Error('No autenticat');
    }

    const name = data.name.trim();
    if (!name) {
      throw new Error('El nom de la partida és obligatori');
    }

    const amount = parseFloat(data.budgetedAmountEUR);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('L\'import pressupostat ha de ser positiu');
    }

    setIsSaving(true);
    setError(null);

    try {
      const linesRef = collection(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'projects',
        projectId,
        'budgetLines'
      );

      const now = serverTimestamp();
      const orderNum = data.order ? parseInt(data.order, 10) : null;

      const lineData = {
        name,
        code: data.code.trim() || null,
        budgetedAmountEUR: amount,
        order: isNaN(orderNum as number) ? null : orderNum,
        updatedAt: now,
      };

      let finalId: string;

      if (lineId) {
        const lineRef = doc(linesRef, lineId);
        await setDoc(lineRef, lineData, { merge: true });
        finalId = lineId;
      } else {
        const newRef = doc(linesRef);
        await setDoc(newRef, {
          ...lineData,
          createdBy: user.uid,
          createdAt: now,
        });
        finalId = newRef.id;
      }

      return finalId;

    } catch (err) {
      console.error('Error saving budget line:', err);
      const e = err instanceof Error ? err : new Error('Error desant partida');
      setError(e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, [firestore, organizationId, user]);

  const remove = useCallback(async (projectId: string, lineId: string) => {
    if (!organizationId) {
      throw new Error('No autenticat');
    }

    setIsSaving(true);
    setError(null);

    try {
      const lineRef = doc(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'projects',
        projectId,
        'budgetLines',
        lineId
      );

      await deleteDoc(lineRef);

    } catch (err) {
      console.error('Error removing budget line:', err);
      const e = err instanceof Error ? err : new Error('Error eliminant partida');
      setError(e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, [firestore, organizationId]);

  return {
    save,
    remove,
    isSaving,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Actualitzar budgetLine d'una assignació
// ═══════════════════════════════════════════════════════════════════════════

interface UseSetBudgetLineResult {
  setBudgetLineForAssignment: (
    txId: string,
    assignmentIndex: number,
    budgetLineId: string | null,
    budgetLineName: string | null
  ) => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}

export function useSetBudgetLine(): UseSetBudgetLineResult {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setBudgetLineForAssignment = useCallback(async (
    txId: string,
    assignmentIndex: number,
    budgetLineId: string | null,
    budgetLineName: string | null
  ) => {
    if (!organizationId) {
      throw new Error('No autenticat');
    }

    setIsSaving(true);
    setError(null);

    try {
      const linkRef = doc(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'expenseLinks',
        txId
      );

      const linkSnap = await getDoc(linkRef);
      if (!linkSnap.exists()) {
        throw new Error('Assignació no trobada');
      }

      const linkData = linkSnap.data() as ExpenseLink;
      const assignments = [...linkData.assignments];

      if (assignmentIndex < 0 || assignmentIndex >= assignments.length) {
        throw new Error('Índex d\'assignació invàlid');
      }

      // Actualitzar budgetLineId i budgetLineName
      assignments[assignmentIndex] = {
        ...assignments[assignmentIndex],
        budgetLineId,
        budgetLineName,
      };

      await setDoc(linkRef, {
        assignments,
        updatedAt: serverTimestamp(),
      }, { merge: true });

    } catch (err) {
      console.error('Error setting budget line:', err);
      const e = err instanceof Error ? err : new Error('Error actualitzant partida');
      setError(e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, [firestore, organizationId]);

  return {
    setBudgetLineForAssignment,
    isSaving,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: Despeses assignades a un projecte (per calcular execució)
// ═══════════════════════════════════════════════════════════════════════════

interface UseProjectExpenseLinksResult {
  expenseLinks: ExpenseLink[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useProjectExpenseLinks(projectId: string): UseProjectExpenseLinksResult {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [expenseLinks, setExpenseLinks] = useState<ExpenseLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!organizationId || !projectId) {
      setExpenseLinks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const linksRef = collection(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'expenseLinks'
      );

      // Query amb projectIds array-contains
      const q = query(linksRef, where('projectIds', 'array-contains', projectId));
      const snapshot = await getDocs(q);

      const links: ExpenseLink[] = snapshot.docs.map((d) => {
        const data = d.data();
        // Compatibilitat: si no té projectIds, calcular-lo
        const projectIds = data.projectIds ?? data.assignments?.map((a: ExpenseAssignment) => a.projectId) ?? [];
        return {
          id: d.id,
          ...data,
          projectIds,
        } as ExpenseLink;
      });

      setExpenseLinks(links);

    } catch (err) {
      console.error('Error loading project expense links:', err);
      setError(err instanceof Error ? err : new Error('Error desconegut'));
    } finally {
      setIsLoading(false);
    }
  }, [firestore, organizationId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    expenseLinks,
    isLoading,
    error,
    refresh: load,
  };
}
