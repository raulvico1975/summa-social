// src/hooks/use-product-updates.ts
// Hook per carregar novetats de Firestore amb fallback a legacy

'use client';

import * as React from 'react';
import { collection, query, where, orderBy, limit, getDocs, Firestore } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { type ProductUpdate, PRODUCT_UPDATES } from '@/lib/notifications';

/**
 * Tipus ampliat per incloure camps nous de Firestore.
 */
export type FirestoreProductUpdate = ProductUpdate & {
  // Camps nous del schema ampliat
  contentLong?: string | null;
  guideUrl?: string | null;
  videoUrl?: string | null;
};

export type UseProductUpdatesResult = {
  updates: FirestoreProductUpdate[];
  isLoading: boolean;
  error: Error | null;
  usingFallback: boolean;
};

/**
 * Hook per carregar novetats del producte.
 *
 * Query: productUpdates on isActive==true, orderBy createdAt desc, limit 6
 * Si Firestore falla → fallback a PRODUCT_UPDATES legacy + console.warn
 *
 * NOTA: Ordenem per createdAt (no publishedAt) perquè:
 * - createdAt sempre està resolt com a Timestamp real després del setDoc
 * - publishedAt pot quedar pendent fins que Firestore resol serverTimestamp()
 * - Per timeline futur, es pot migrar a publishedAt quan sigui Timestamp garantit
 */
export function useProductUpdates(): UseProductUpdatesResult {
  const { firestore } = useFirebase();
  const [updates, setUpdates] = React.useState<FirestoreProductUpdate[]>(
    // Convertir legacy a format ampliat
    PRODUCT_UPDATES.map((u) => ({ ...u }))
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [usingFallback, setUsingFallback] = React.useState(false);

  React.useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      setUsingFallback(true);
      return;
    }

    async function fetchUpdates() {
      try {
        const q = query(
          collection(firestore as Firestore, 'productUpdates'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(6)
        );
        const snapshot = await getDocs(q);
        const firestoreUpdates: FirestoreProductUpdate[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title ?? '',
            body: data.description ?? '',
            href: data.link ?? undefined,
            ctaLabel: data.link ? 'Veure' : undefined,
            createdAt: data.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? '',
            // Camps nous
            contentLong: data.contentLong ?? null,
            guideUrl: data.guideUrl ?? null,
            videoUrl: data.videoUrl ?? null,
          };
        });

        if (firestoreUpdates.length > 0) {
          setUpdates(firestoreUpdates);
          setUsingFallback(false);
        } else {
          // Firestore buit → usar fallback
          setUpdates(PRODUCT_UPDATES.map((u) => ({ ...u })));
          setUsingFallback(true);
        }
      } catch (err: unknown) {
        const errorCode = (err as { code?: string })?.code ?? 'unknown';
        const errorMessage = (err as { message?: string })?.message ?? String(err);
        // Log detallat per diagnòstic
        console.warn(
          '[product-updates] Firestore query failed, using legacy fallback',
          { code: errorCode, message: errorMessage }
        );
        // Si és FAILED_PRECONDITION, probablement falta l'índex
        if (errorCode === 'failed-precondition') {
          console.error(
            '[product-updates] Index missing! Run: firebase deploy --only firestore:indexes'
          );
        }
        setError(err instanceof Error ? err : new Error(String(err)));
        setUpdates(PRODUCT_UPDATES.map((u) => ({ ...u })));
        setUsingFallback(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUpdates();
  }, [firestore]);

  return { updates, isLoading, error, usingFallback };
}
