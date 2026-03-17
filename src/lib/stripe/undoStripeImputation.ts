import {
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

type UndoStripeImputationDeps = {
  loadStripeDonationsByParentTransactionId: (args: {
    firestore: Firestore;
    organizationId: string;
    parentTransactionId: string;
  }) => Promise<Array<{ ref: unknown }>>;
  deleteDonationRefs: (args: { firestore: Firestore; refs: Array<{ ref: unknown }> }) => Promise<void>;
  clearParentStripeMarker: (args: {
    firestore: Firestore;
    organizationId: string;
    parentTransactionId: string;
  }) => Promise<void>;
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

async function clearParentStripeMarker({
  firestore,
  organizationId,
  parentTransactionId,
}: {
  firestore: Firestore;
  organizationId: string;
  parentTransactionId: string;
}): Promise<void> {
  const parentRef = doc(firestore, 'organizations', organizationId, 'transactions', parentTransactionId);
  await updateDoc(parentRef, {
    stripeTransferId: deleteField(),
  });
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
  const clearParentMarker = deps?.clearParentStripeMarker ?? clearParentStripeMarker;
  const docs = await loadDocs({
    firestore,
    organizationId,
    parentTransactionId,
  });
  await deleteDocs({
    firestore,
    refs: docs,
  });
  await clearParentMarker({
    firestore,
    organizationId,
    parentTransactionId,
  });

  return { deletedCount: docs.length };
}
