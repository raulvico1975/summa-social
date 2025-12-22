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

  // Actions
  handleCategorize: (txId: string) => Promise<void>;
  handleBatchCategorize: () => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Quota limits for AI API - Normal mode
const BATCH_SIZE = 10;
const DELAY_MS = 60000; // 60 seconds between batches

// Bulk mode (SuperAdmin) - Més ràpid però pot esgotar quota
const BULK_BATCH_SIZE = 25;
const BULK_DELAY_MS = 3000; // 3 segons entre lots

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
  // BATCH CATEGORIZE ALL UNCATEGORIZED
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

    // Seleccionar paràmetres segons mode
    const batchSize = bulkMode ? BULK_BATCH_SIZE : BATCH_SIZE;
    const delayMs = bulkMode ? BULK_DELAY_MS : DELAY_MS;

    setIsBatchCategorizing(true);
    const startTime = Date.now();
    log(`[IA] Iniciant classificacio massiva de ${transactionsToCategorize.length} moviments${bulkMode ? ' (MODE BULK)' : ''}.`);
    trackUX('ai.bulk.run.start', { count: transactionsToCategorize.length, bulkMode });
    toast({
      title: t.movements.table.startingBatchCategorization,
      description: `Classificant ${transactionsToCategorize.length} moviments${bulkMode ? ' (mode ràpid)' : ''}.`,
    });

    let successCount = 0;
    let quotaExceeded = false;

    for (let i = 0; i < transactionsToCategorize.length; i += batchSize) {
      // Si s'ha excedit la quota en mode bulk, sortir del bucle
      if (quotaExceeded) break;

      const batch = transactionsToCategorize.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(transactionsToCategorize.length / batchSize);

      log(`[IA] Processant lot ${batchNumber}/${totalBatches} (${batch.length} transaccions)...`);

      const batchResults = await Promise.all(batch.map(async (tx, batchIndex) => {
        if (quotaExceeded) return { success: false };

        const index = i + batchIndex;
        log(`[IA] Classificant moviment ${index + 1}/${transactionsToCategorize.length}: "${tx.description.substring(0, 30)}..."`);
        try {
          const result = await categorizeTransaction({
            description: tx.description,
            amount: tx.amount,
            expenseCategories,
            incomeCategories,
          });

          updateDocumentNonBlocking(doc(transactionsCollection, tx.id), { category: result.category });
          const categoryName = getCategoryDisplayName(result.category);
          log(`[IA] Moviment ${tx.id} classificat com "${categoryName}".`);
          return { success: true };
        } catch (error: any) {
          console.error('Error categorizing transaction:', error);
          log(`[IA] ERROR categoritzant ${tx.id}: ${error}`);

          // Detectar errors de quota
          const errorMsg = error?.message || error?.toString() || '';
          if (
            errorMsg.includes('429') ||
            errorMsg.toLowerCase().includes('quota') ||
            errorMsg.toLowerCase().includes('resource_exhausted') ||
            errorMsg.toLowerCase().includes('rate limit')
          ) {
            if (!quotaExceeded) {
              quotaExceeded = true;
              log('[IA] QUOTA EXCEDIDA - Notificant fallback');
              onQuotaExceeded?.();
            }
          }

          return { success: false };
        }
      }));

      successCount += batchResults.filter(r => r.success).length;

      // Wait between batches (except the last one) if no quota exceeded
      if (!quotaExceeded && i + batchSize < transactionsToCategorize.length) {
        log(`[IA] Esperant ${delayMs / 1000}s abans del seguent lot...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const durationMs = Date.now() - startTime;
    setIsBatchCategorizing(false);
    log(`[IA] Classificacio massiva completada. ${successCount} moviments classificats en ${Math.round(durationMs / 1000)}s.`);
    trackUX('ai.bulk.run.done', { processedCount: successCount, durationMs, bulkMode, quotaExceeded });
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

    // Actions
    handleCategorize,
    handleBatchCategorize,
  };
}
