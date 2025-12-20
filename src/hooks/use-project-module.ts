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
  save: (txId: string, assignments: ExpenseAssignment[], note: string | null) => Promise<void>;
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
    note: string | null
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

      const linkData: Omit<ExpenseLink, 'id' | 'createdAt' | 'updatedAt'> & {
        createdAt?: ReturnType<typeof serverTimestamp>;
        updatedAt: ReturnType<typeof serverTimestamp>;
      } = {
        orgId: organizationId,
        assignments,
        note: note ?? null,
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

      const projectData = {
        orgId: organizationId,
        name: data.name.trim(),
        code: data.code.trim() || null,
        status: data.status,
        budgetEUR: data.budgetEUR ? parseFloat(data.budgetEUR) : null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
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
