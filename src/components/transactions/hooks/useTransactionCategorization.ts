'use client';

import * as React from 'react';
import { doc, CollectionReference } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { useAppLog } from '@/hooks/use-app-log';
import { categorizeTransaction } from '@/ai/flows/categorize-transactions';
import type { Transaction, Category } from '@/lib/data';

// =============================================================================
// TYPES
// =============================================================================

interface UseTransactionCategorizationParams {
  transactionsCollection: CollectionReference | null;
  transactions: Transaction[] | null;
  availableCategories: Category[] | null;
  getCategoryDisplayName: (categoryId: string) => string;
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

// Quota limits for AI API
const BATCH_SIZE = 10;
const DELAY_MS = 60000; // 60 seconds between batches

// =============================================================================
// HOOK
// =============================================================================

export function useTransactionCategorization({
  transactionsCollection,
  transactions,
  availableCategories,
  getCategoryDisplayName,
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

    setIsBatchCategorizing(true);
    log(`[IA] Iniciant classificacio massiva de ${transactionsToCategorize.length} moviments.`);
    toast({
      title: t.movements.table.startingBatchCategorization,
      description: `Classificant ${transactionsToCategorize.length} moviments.`,
    });

    let successCount = 0;

    for (let i = 0; i < transactionsToCategorize.length; i += BATCH_SIZE) {
      const batch = transactionsToCategorize.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(transactionsToCategorize.length / BATCH_SIZE);

      log(`[IA] Processant lot ${batchNumber}/${totalBatches} (${batch.length} transaccions)...`);

      const batchResults = await Promise.all(batch.map(async (tx, batchIndex) => {
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
        } catch (error) {
          console.error('Error categorizing transaction:', error);
          log(`[IA] ERROR categoritzant ${tx.id}: ${error}`);
          return { success: false };
        }
      }));

      successCount += batchResults.filter(r => r.success).length;

      // Wait between batches (except the last one)
      if (i + BATCH_SIZE < transactionsToCategorize.length) {
        log(`[IA] Esperant ${DELAY_MS / 1000}s abans del seguent lot...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    setIsBatchCategorizing(false);
    log(`[IA] Classificacio massiva completada. ${successCount} moviments classificats.`);
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
