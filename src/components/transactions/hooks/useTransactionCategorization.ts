'use client';

import * as React from 'react';
import { doc, CollectionReference } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { useAppLog } from '@/hooks/use-app-log';
import { trackUX } from '@/lib/ux/trackUX';
import type { Transaction, Category } from '@/lib/data';

// =============================================================================
// TYPES
// =============================================================================

interface UseTransactionCategorizationParams {
  transactionsCollection: CollectionReference | null;
  transactions: Transaction[] | null;
  availableCategories: Category[] | null;
  getCategoryDisplayName: (categoryId: string) => string;
  bulkMode?: boolean;
  onQuotaExceeded?: () => void;
}

interface UseTransactionCategorizationReturn {
  // Loading states
  loadingStates: Record<string, boolean>;
  isBatchCategorizing: boolean;
  batchProgress: { current: number; total: number } | null;

  // Actions
  handleCategorize: (txId: string) => Promise<void>;
  handleBatchCategorize: () => Promise<void>;
  handleCancelBatch: () => void;
}

// API Response types
type ApiSuccessResponse = {
  ok: true;
  category: string;
  confidence: number;
};

type ApiErrorResponse = {
  ok: false;
  code: 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'TRANSIENT' | 'INVALID_INPUT' | 'AI_ERROR';
  message: string;
};

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

// =============================================================================
// CONSTANTS
// =============================================================================

// IMPORTANT: Processament SEQÜENCIAL via Route Handler (NO Server Action)
// La velocitat ve de l'automatització, NO del paral·lelisme

// Delay base entre crides IA
const BASE_DELAY_NORMAL_MS = 1500; // 1.5 segons
const BASE_DELAY_BULK_MS = 1200; // 1.2 segons en mode ràpid

// Backoff adaptatiu
const MAX_DELAY_MS = 8000; // Màxim 8 segons
const BACKOFF_MULTIPLIER = 2;

// =============================================================================
// API CALL HELPER
// =============================================================================

async function callCategorizationAPI(input: {
  description: string;
  amount: number;
  expenseCategories: string[];
  incomeCategories: string[];
}): Promise<ApiResponse> {
  const response = await fetch('/api/ai/categorize-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  // Parse JSON - Route Handler always returns 200 with ok field
  const data = await response.json();
  return data as ApiResponse;
}

// =============================================================================
// HOOK
// =============================================================================

export function useTransactionCategorization({
  transactionsCollection,
  transactions,
  availableCategories,
  getCategoryDisplayName,
  bulkMode = false,
  onQuotaExceeded,
}: UseTransactionCategorizationParams): UseTransactionCategorizationReturn {
  const { toast } = useToast();
  const { t } = useTranslations();
  const { log } = useAppLog();

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});
  const [isBatchCategorizing, setIsBatchCategorizing] = React.useState(false);
  const [batchProgress, setBatchProgress] = React.useState<{ current: number; total: number } | null>(null);

  // Cancel·lació
  const cancelRef = React.useRef(false);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------------------------------

  const expenseCategories = React.useMemo(
    () => availableCategories?.filter((c) => c.type === 'expense').map((c) => c.name) || [],
    [availableCategories]
  );

  const incomeCategories = React.useMemo(
    () => availableCategories?.filter((c) => c.type === 'income').map((c) => c.name) || [],
    [availableCategories]
  );

  // ---------------------------------------------------------------------------
  // CANCEL HANDLER
  // ---------------------------------------------------------------------------

  const handleCancelBatch = React.useCallback(() => {
    cancelRef.current = true;
    log('[IA] Cancel·lació sol·licitada per l\'usuari');
  }, [log]);

  // ---------------------------------------------------------------------------
  // CATEGORIZE SINGLE TRANSACTION (via Route Handler)
  // ---------------------------------------------------------------------------

  const handleCategorize = React.useCallback(async (txId: string) => {
    if (!transactions) return;
    const transaction = transactions.find((tx) => tx.id === txId);
    if (!transaction || !availableCategories || !transactionsCollection) return;

    setLoadingStates((prev) => ({ ...prev, [txId]: true }));
    try {
      log(`[IA] Iniciant categoritzacio per: "${transaction.description.substring(0, 40)}..."`);

      const result = await callCategorizationAPI({
        description: transaction.description,
        amount: transaction.amount,
        expenseCategories,
        incomeCategories,
      });

      if (!result.ok) {
        // Error controlat - marcar com Revisar
        updateDocumentNonBlocking(doc(transactionsCollection, txId), { category: 'Revisar' });
        toast({
          variant: 'destructive',
          title: 'Error de IA',
          description: result.message,
        });
        log(`[IA] ERROR: ${result.code} - ${result.message}`);
        return;
      }

      updateDocumentNonBlocking(doc(transactionsCollection, txId), { category: result.category });

      const categoryName = getCategoryDisplayName(result.category);
      toast({
        title: 'Categorització Automàtica',
        description: `Transacció classificada com "${categoryName}" amb una confiança del ${Math.round(result.confidence * 100)}%.`,
      });
      log(`[IA] Transaccio classificada com "${categoryName}" (confianca: ${(result.confidence * 100).toFixed(0)}%).`);
    } catch (error) {
      // Error de xarxa - marcar com Revisar
      console.error('Error categorizing transaction:', error);
      updateDocumentNonBlocking(doc(transactionsCollection, txId), { category: 'Revisar' });
      toast({
        variant: 'destructive',
        title: 'Error de IA',
        description: t.movements.table.categorizationError,
      });
      log(`[IA] ERROR categoritzant: ${error}`);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [txId]: false }));
    }
  }, [
    transactions,
    availableCategories,
    transactionsCollection,
    expenseCategories,
    incomeCategories,
    getCategoryDisplayName,
    toast,
    t,
    log,
  ]);

  // ---------------------------------------------------------------------------
  // BATCH CATEGORIZE ALL UNCATEGORIZED (SEQÜENCIAL via Route Handler)
  // ---------------------------------------------------------------------------

  const handleBatchCategorize = React.useCallback(async () => {
    // Bloquejar si ja s'està executant
    if (isBatchCategorizing) {
      log('[IA] Batch ja en execució - ignorant');
      return;
    }

    if (!transactions || !availableCategories || !transactionsCollection) {
      toast({ title: t.movements.table.dataUnavailable, description: t.movements.table.dataLoadError });
      return;
    }

    const transactionsToCategorize = transactions.filter(tx => !tx.category || tx.category === 'Revisar');
    if (transactionsToCategorize.length === 0) {
      toast({ title: t.movements.table.nothingToCategorize, description: t.movements.table.allAlreadyCategorized });
      return;
    }

    // Reset cancel flag
    cancelRef.current = false;

    // Delay base segons mode
    let currentDelay = bulkMode ? BASE_DELAY_BULK_MS : BASE_DELAY_NORMAL_MS;

    setIsBatchCategorizing(true);
    setBatchProgress({ current: 0, total: transactionsToCategorize.length });
    const startTime = Date.now();
    log(`[IA] Iniciant classificacio SEQÜENCIAL de ${transactionsToCategorize.length} moviments${bulkMode ? ' (MODE RÀPID)' : ''}.`);
    trackUX('ai.bulk.run.start', { count: transactionsToCategorize.length, bulkMode, sequential: true });

    let successCount = 0;
    let errorCount = 0;
    let quotaExceeded = false;
    let cancelled = false;

    // PROCESSAMENT SEQÜENCIAL: una transacció alhora
    for (let i = 0; i < transactionsToCategorize.length; i++) {
      // Check cancel
      if (cancelRef.current) {
        cancelled = true;
        log('[IA] Batch cancel·lat per l\'usuari');
        break;
      }

      if (quotaExceeded) break;

      const tx = transactionsToCategorize[i];
      setBatchProgress({ current: i + 1, total: transactionsToCategorize.length });

      log(`[IA] Classificant ${i + 1}/${transactionsToCategorize.length}: "${tx.description.substring(0, 30)}..."`);

      try {
        const result = await callCategorizationAPI({
          description: tx.description,
          amount: tx.amount,
          expenseCategories,
          incomeCategories,
        });

        if (!result.ok) {
          // Error controlat de l'API
          log(`[IA] ✗ ${tx.id}: ${result.code} - ${result.message}`);
          errorCount++;

          // Marcar com Revisar
          updateDocumentNonBlocking(doc(transactionsCollection, tx.id), { category: 'Revisar' });

          // Manejar segons tipus d'error
          if (result.code === 'QUOTA_EXCEEDED') {
            quotaExceeded = true;
            log('[IA] QUOTA EXCEDIDA - Aturant procés');
            onQuotaExceeded?.();
            break;
          }

          if (result.code === 'RATE_LIMITED' || result.code === 'TRANSIENT') {
            // Backoff adaptatiu
            currentDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
            log(`[IA] Backoff: nou delay = ${currentDelay}ms`);
          }

          // Continuar amb la següent
          continue;
        }

        // Èxit
        updateDocumentNonBlocking(doc(transactionsCollection, tx.id), { category: result.category });
        const categoryName = getCategoryDisplayName(result.category);
        log(`[IA] ✓ ${tx.id} → "${categoryName}"`);
        successCount++;

        // Reset delay si èxit (opcional: podríem mantenir-lo)
        // currentDelay = bulkMode ? BASE_DELAY_BULK_MS : BASE_DELAY_NORMAL_MS;

      } catch (error: any) {
        // Error de xarxa o inesperada
        console.error('Error categorizing transaction:', error);
        log(`[IA] ✗ ERROR ${tx.id}: ${error?.message || error}`);
        errorCount++;

        // Marcar com Revisar
        updateDocumentNonBlocking(doc(transactionsCollection, tx.id), { category: 'Revisar' });

        // Backoff per errors de xarxa
        currentDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
        log(`[IA] Backoff per error xarxa: nou delay = ${currentDelay}ms`);
      }

      // Delay entre crides (excepte l'última)
      if (i < transactionsToCategorize.length - 1 && !quotaExceeded && !cancelRef.current) {
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }
    }

    const durationMs = Date.now() - startTime;
    setIsBatchCategorizing(false);
    setBatchProgress(null);

    const status = cancelled ? 'CANCEL·LAT' : quotaExceeded ? 'QUOTA' : 'COMPLETAT';
    log(`[IA] ${status}: ${successCount} OK, ${errorCount} errors en ${Math.round(durationMs / 1000)}s.`);
    trackUX('ai.bulk.run.done', {
      processedCount: successCount,
      errorCount,
      durationMs,
      bulkMode,
      quotaExceeded,
      cancelled,
    });

    if (cancelled) {
      toast({
        title: 'Categorització aturada',
        description: `S'han classificat ${successCount} moviments abans de l'aturada.`,
      });
    } else {
      toast({
        title: t.movements.table.batchCategorizationComplete,
        description: t.movements.table.itemsCategorized(successCount),
      });
    }
  }, [
    transactions,
    availableCategories,
    transactionsCollection,
    expenseCategories,
    incomeCategories,
    getCategoryDisplayName,
    bulkMode,
    onQuotaExceeded,
    isBatchCategorizing,
    toast,
    t,
    log,
  ]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Loading states
    loadingStates,
    isBatchCategorizing,
    batchProgress,

    // Actions
    handleCategorize,
    handleBatchCategorize,
    handleCancelBatch,
  };
}
