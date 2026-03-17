import { collection, getDocs, query, where, type Firestore } from 'firebase/firestore';

export const ERR_STRIPE_PARENT_ALREADY_IMPUTED = 'ERR_STRIPE_PARENT_ALREADY_IMPUTED';

type StripeActiveImputationDeps = {
  hasActiveStripeImputationByParentTransactionId: (args: {
    firestore: Firestore;
    organizationId: string;
    parentTransactionId: string;
  }) => Promise<boolean>;
};

export async function hasActiveStripeImputationByParentTransactionId({
  firestore,
  organizationId,
  parentTransactionId,
}: {
  firestore: Firestore;
  organizationId: string;
  parentTransactionId: string;
}): Promise<boolean> {
  const donationsRef = collection(firestore, 'organizations', organizationId, 'donations');
  const snapshot = await getDocs(
    query(donationsRef, where('parentTransactionId', '==', parentTransactionId))
  );

  return snapshot.docs.some((docSnap) => {
    const data = docSnap.data() as { archivedAt?: string | null };
    return !data.archivedAt;
  });
}

export async function assertNoActiveStripeImputationByParentTransactionId({
  firestore,
  organizationId,
  parentTransactionId,
  deps,
}: {
  firestore: Firestore;
  organizationId: string;
  parentTransactionId: string;
  deps?: Partial<StripeActiveImputationDeps>;
}): Promise<void> {
  const hasActiveImputation =
    deps?.hasActiveStripeImputationByParentTransactionId
    ?? hasActiveStripeImputationByParentTransactionId;

  if (await hasActiveImputation({ firestore, organizationId, parentTransactionId })) {
    throw new Error(ERR_STRIPE_PARENT_ALREADY_IMPUTED);
  }
}
