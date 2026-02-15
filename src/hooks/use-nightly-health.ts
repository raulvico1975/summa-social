'use client';

import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import type { NightlyHealthSnapshot } from '@/lib/nightly-health-types';

interface UseNightlyHealthResult {
  snapshots: NightlyHealthSnapshot[];
  latest: NightlyHealthSnapshot | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useNightlyHealthSnapshots(days = 30): UseNightlyHealthResult {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [snapshots, setSnapshots] = useState<NightlyHealthSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!organizationId) {
      setSnapshots([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const itemsRef = collection(
        firestore,
        'organizations',
        organizationId,
        'exports',
        'healthSnapshots',
        'items'
      );

      const snapshot = await getDocs(
        query(itemsRef, orderBy('runDate', 'desc'), limit(days))
      );

      const rows = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<NightlyHealthSnapshot, 'id'>),
      } as NightlyHealthSnapshot));

      setSnapshots(rows);
    } catch (err) {
      console.error('[useNightlyHealthSnapshots] Error loading snapshots', err);
      setError(err instanceof Error ? err : new Error('Error carregant snapshots de health check'));
    } finally {
      setIsLoading(false);
    }
  }, [days, firestore, organizationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    snapshots,
    latest: snapshots[0] ?? null,
    isLoading,
    error,
    refresh,
  };
}
