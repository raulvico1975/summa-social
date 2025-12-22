'use client';

import * as React from 'react';
import { doc, CollectionReference } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { useAppLog } from '@/hooks/use-app-log';
import { categorizeTransaction } from '@/ai/flows/categorize-transactions';
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
}

// =============================================================================
// CONSTANTS
// =============================================================================

// IMPORTANT: Processament SEQÜENCIAL (1 crida IA activa alhora)
// La velocitat ve de l'automatització, NO del paral·lelisme

// Delay entre crides IA individuals
const DELAY_BETWEEN_CALLS_MS = 1500; // 1.5 segons entre cada transacció

// Bulk mode té delay més curt però segueix sent seqüencial
const BULK_DELAY_BETWEEN_CALLS_MS = 800; // 0.8 segons en mode ràpid

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
  // CATEGORIZE SINGLE TRANSACTION
  // ---------------------------------------------------------------------------

  const handleCategorize = React.useCallback(async (txId: string) => {
    if (!transactions) return;
    const transaction = transactions.find((tx) => tx.id === txId);
    if (!transaction || !availableCategories || !transactionsCollection) return;

    setLoadingStates((prev) => ({ ...prev, [txId]: true }));
    try {
      log(`[IA] Iniciant categoritzacio per: "${transaction.description.substring(0, 40)}..."`);

      const result = await categorizeTransaction({
        description: transaction.description,
        amount: transaction.amount,
        expenseCategories,
        incomeCategories,
      });

      updateDocumentNonBlocking(doc(transactionsCollection, txId), { category: result.category });

      const categoryName = getCategoryDisplayName(result.category);
      toast({
        title: 'Categorització Automàtica',
        description: `Transacció classificada com "${categoryName}" amb una confiança del ${Math.round(result.confidence * 100)}%.`,
      });
      log(`[IA] Transaccio classificada com "${categoryName}" (confianca: ${(result.confidence * 100).toFixed(0)}%).`);
    } catch (error) {
      console.error('Error categorizing transaction:', error);
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
  // BATCH CATEGORIZE ALL UNCATEGORIZED (SEQÜENCIAL - 1 crida IA alhora)
  // ---------------------------------------------------------------------------

  const handleBatchCategorize = React.useCallback(async () => {
    if (!transactions || !availableCategories || !transactionsCollection) {
      toast({ title: t.movements.table.dataUnavailable, description: t.movements.table.dataLoadError });
      return;
    }

    const transactionsToCategorize = transactions.filter(tx => !tx.category);
    if (transactionsToCategorize.length === 0) {
      toast({ title: t.movements.table.nothingToCategorize, description: t.movements.table.allAlreadyCategorized });
      return;
    }

    // Delay entre crides segons mode (sempre seqüencial, mai paral·lel)
    const delayMs = bulkMode ? BULK_DELAY_BETWEEN_CALLS_MS : DELAY_BETWEEN_CALLS_MS;

    setIsBatchCategorizing(true);
    setBatchProgress({ current: 0, total: transactionsToCategorize.length });
    const startTime = Date.now();
    log(`[IA] Iniciant classificacio SEQÜENCIAL de ${transactionsToCategorize.length} moviments${bulkMode ? ' (MODE RÀPID)' : ''}.`);
    trackUX('ai.bulk.run.start', { count: transactionsToCategorize.length, bulkMode, sequential: true });

    let successCount = 0;
    let errorCount = 0;
    let quotaExceeded = false;

    // PROCESSAMENT SEQÜENCIAL: una transacció alhora amb for...of
    for (let i = 0; i < transactionsToCategorize.length; i++) {
      if (quotaExceeded) break;

      const tx = transactionsToCategorize[i];
      setBatchProgress({ current: i + 1, total: transactionsToCategorize.length });

      log(`[IA] Classificant ${i + 1}/${transactionsToCategorize.length}: "${tx.description.substring(0, 30)}..."`);

      try {
        const result = await categorizeTransaction({
          description: tx.description,
          amount: tx.amount,
          expenseCategories,
          incomeCategories,
        });

        updateDocumentNonBlocking(doc(transactionsCollection, tx.id), { category: result.category });
        const categoryName = getCategoryDisplayName(result.category);
        log(`[IA] ✓ ${tx.id} → "${categoryName}"`);
        successCount++;
      } catch (error: any) {
        console.error('Error categorizing transaction:', error);
        log(`[IA] ✗ ERROR ${tx.id}: ${error?.message || error}`);
        errorCount++;

        // Detectar errors de quota
        const errorMsg = error?.message || error?.toString() || '';
        if (
          errorMsg.includes('429') ||
          errorMsg.toLowerCase().includes('quota') ||
          errorMsg.toLowerCase().includes('resource_exhausted') ||
          errorMsg.toLowerCase().includes('rate limit')
        ) {
          quotaExceeded = true;
          log('[IA] QUOTA EXCEDIDA - Aturant procés');
          onQuotaExceeded?.();
          break;
        }
        // Si no és quota, continuar amb la següent transacció
      }

      // Delay entre crides (excepte l'última)
      if (i < transactionsToCategorize.length - 1 && !quotaExceeded) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const durationMs = Date.now() - startTime;
    setIsBatchCategorizing(false);
    setBatchProgress(null);
    log(`[IA] Completat: ${successCount} OK, ${errorCount} errors en ${Math.round(durationMs / 1000)}s.`);
    trackUX('ai.bulk.run.done', { processedCount: successCount, errorCount, durationMs, bulkMode, quotaExceeded });
    toast({
      title: t.movements.table.batchCategorizationComplete,
      description: t.movements.table.itemsCategorized(successCount),
    });
  }, [
    transactions,
    availableCategories,
    transactionsCollection,
    expenseCategories,
    incomeCategories,
    getCategoryDisplayName,
    bulkMode,
    onQuotaExceeded,
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
  };
}
