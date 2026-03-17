import { collection, getDocs, query, where, writeBatch, type Firestore } from 'firebase/firestore';

type UndoStripeImputationDeps = {
  loadStripeDonationsByParentTransactionId: (args: {
    firestore: Firestore;
    organizationId: string;
    parentTransactionId: string;
  }) => Promise<Array<{ ref: unknown }>>;
  deleteDonationRefs: (args: { firestore: Firestore; refs: Array<{ ref: unknown }> }) => Promise<void>;
};

async function loadStripeDonationsByParentTransactionId({
  firestore,
  organizationId,
  parentTransactionId,
}: {
  firestore: Firestore;
  organizationId: string;
  parentTransactionId: string;
}): Promise<Array<{ ref: unknown }>> {
  const donationsRef = collection(firestore, 'organizations', organizationId, 'donations');
  const snapshot = await getDocs(
    query(
      donationsRef,
      where('parentTransactionId', '==', parentTransactionId),
      where('source', '==', 'stripe')
    )
  );

  return snapshot.docs;
}

async function deleteDonationRefs({
  firestore,
  refs,
}: {
  firestore: Firestore;
  refs: Array<{ ref: unknown }>;
}): Promise<void> {
  const batch = writeBatch(firestore);
  refs.forEach((docSnap) => {
    batch.delete(docSnap.ref as never);
  });
  await batch.commit();
}

export async function undoStripeImputation({
  firestore,
  organizationId,
  parentTransactionId,
  deps,
}: {
  firestore: Firestore;
  organizationId: string;
  parentTransactionId: string;
  deps?: Partial<UndoStripeImputationDeps>;
}): Promise<{ deletedCount: number }> {
  const loadDocs = deps?.loadStripeDonationsByParentTransactionId ?? loadStripeDonationsByParentTransactionId;
  const deleteDocs = deps?.deleteDonationRefs ?? deleteDonationRefs;
  const docs = await loadDocs({
    firestore,
    organizationId,
    parentTransactionId,
  });
  await deleteDocs({
    firestore,
    refs: docs,
  });

  return { deletedCount: docs.length };
}
