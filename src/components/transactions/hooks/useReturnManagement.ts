'use client';

import * as React from 'react';
import { doc, query, where, getDocs, limit, CollectionReference } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import type { Transaction, Donor, ContactType } from '@/lib/data';

// =============================================================================
// TYPES
// =============================================================================

interface UseReturnManagementParams {
  transactionsCollection: CollectionReference | null;
  contactsCollection: CollectionReference | null;
  donors: Donor[];
  contactMap: Record<string, { name: string; type: ContactType }>;
}

interface UseReturnManagementReturn {
  // Dialog state
  isReturnDialogOpen: boolean;
  handleCloseReturnDialog: () => void;

  // Return data being edited
  returnTransaction: Transaction | null;
  returnDonorId: string | null;
  setReturnDonorId: (id: string | null) => void;
  returnLinkedTxId: string | null;
  setReturnLinkedTxId: (id: string | null) => void;

  // Donations from selected donor
  donorDonations: Transaction[];
  isLoadingDonations: boolean;

  // Actions
  handleOpenReturnDialog: (tx: Transaction) => void;
  handleSaveReturn: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useReturnManagement({
  transactionsCollection,
  contactsCollection,
  donors,
  contactMap,
}: UseReturnManagementParams): UseReturnManagementReturn {
  const { toast } = useToast();
  const { t } = useTranslations();

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [isReturnDialogOpen, setIsReturnDialogOpen] = React.useState(false);
  const [returnTransaction, setReturnTransaction] = React.useState<Transaction | null>(null);
  const [returnDonorId, setReturnDonorId] = React.useState<string | null>(null);
  const [returnLinkedTxId, setReturnLinkedTxId] = React.useState<string | null>(null);
  const [donorDonations, setDonorDonations] = React.useState<Transaction[]>([]);
  const [isLoadingDonations, setIsLoadingDonations] = React.useState(false);

  // ---------------------------------------------------------------------------
  // LOAD DONATIONS FROM SELECTED DONOR
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    if (!returnDonorId || !transactionsCollection) {
      setDonorDonations([]);
      return;
    }

    let isMounted = true;

    const loadDonorDonations = async () => {
      setIsLoadingDonations(true);
      try {
        const q = query(
          transactionsCollection,
          where('contactId', '==', returnDonorId),
          where('amount', '>', 0),
          limit(100)
        );
        const snapshot = await getDocs(q);

        if (!isMounted) return;

        const donations = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Transaction))
          .filter(tx => tx.donationStatus !== 'returned')
          .sort((a, b) => b.date.localeCompare(a.date));

        setDonorDonations(donations);
      } catch (error) {
        console.error('Error loading donor donations:', error);
      } finally {
        if (isMounted) {
          setIsLoadingDonations(false);
        }
      }
    };

    loadDonorDonations();

    return () => {
      isMounted = false;
    };
  }, [returnDonorId, transactionsCollection]);

  // ---------------------------------------------------------------------------
  // OPEN RETURN DIALOG
  // ---------------------------------------------------------------------------

  const handleOpenReturnDialog = React.useCallback((tx: Transaction) => {
    setReturnTransaction(tx);
    setReturnDonorId(tx.contactId || null);
    setReturnLinkedTxId(tx.linkedTransactionId || null);
    setDonorDonations([]);
    setIsReturnDialogOpen(true);
  }, []);

  // ---------------------------------------------------------------------------
  // CLOSE RETURN DIALOG
  // ---------------------------------------------------------------------------

  const handleCloseReturnDialog = React.useCallback(() => {
    setIsReturnDialogOpen(false);
    setReturnTransaction(null);
    setReturnDonorId(null);
    setReturnLinkedTxId(null);
    setDonorDonations([]);
  }, []);

  // ---------------------------------------------------------------------------
  // SAVE RETURN
  // ---------------------------------------------------------------------------

  const handleSaveReturn = React.useCallback(async () => {
    if (!returnTransaction || !transactionsCollection) return;

    try {
      // 1. Update return with donor
      const returnUpdate: Record<string, unknown> = {
        contactId: returnDonorId,
        contactType: returnDonorId ? 'donor' : null,
      };

      if (returnLinkedTxId) {
        returnUpdate.linkedTransactionId = returnLinkedTxId;
      }

      updateDocumentNonBlocking(
        doc(transactionsCollection, returnTransaction.id),
        returnUpdate
      );

      // 2. If linked to a donation, mark it as "returned"
      if (returnLinkedTxId) {
        updateDocumentNonBlocking(
          doc(transactionsCollection, returnLinkedTxId),
          {
            donationStatus: 'returned',
            linkedTransactionId: returnTransaction.id,
          }
        );

        // 3. Update donor return counter
        if (returnDonorId && contactsCollection) {
          const donor = donors.find(d => d.id === returnDonorId);
          if (donor) {
            updateDocumentNonBlocking(
              doc(contactsCollection, returnDonorId),
              {
                returnCount: (donor.returnCount || 0) + 1,
                lastReturnDate: new Date().toISOString(),
                status: 'pending_return',
              }
            );
          }
        }
      }

      toast({
        title: t.movements.table.returnAssigned,
        description: t.movements.table.returnAssignedDescription(
          contactMap[returnDonorId as string]?.name || ''
        ),
      });

      // Close and clean up using the shared handler
      handleCloseReturnDialog();
    } catch (error) {
      console.error('Error saving return:', error);
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.movements.table.returnSaveError,
      });
    }
  }, [
    returnTransaction,
    returnDonorId,
    returnLinkedTxId,
    transactionsCollection,
    contactsCollection,
    donors,
    contactMap,
    toast,
    t,
    handleCloseReturnDialog,
  ]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Dialog state
    isReturnDialogOpen,
    handleCloseReturnDialog,

    // Return data being edited
    returnTransaction,
    returnDonorId,
    setReturnDonorId,
    returnLinkedTxId,
    setReturnLinkedTxId,

    // Donations from selected donor
    donorDonations,
    isLoadingDonations,

    // Actions
    handleOpenReturnDialog,
    handleSaveReturn,
  };
}
