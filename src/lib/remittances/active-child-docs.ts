export interface RemittanceChildDocDataLike {
  archivedAt?: unknown;
  parentTransactionId?: string | null;
  isRemittanceItem?: boolean | null;
}

export interface RemittanceChildDocLike<T extends RemittanceChildDocDataLike = RemittanceChildDocDataLike> {
  id: string;
  data(): T;
}

/**
 * Determina si un document és una filla activa real d'un pare concret.
 *
 * Guardrails:
 * - Exclou sempre el mateix pare encara que comparteixi remittanceId.
 * - Prioritza parentTransactionId (criteri canònic).
 * - Accepta isRemittanceItem=true com a fallback legacy.
 */
export function isActiveChildDocForParent<T extends RemittanceChildDocDataLike>(
  doc: RemittanceChildDocLike<T>,
  parentTxId: string
): boolean {
  const data = doc.data();

  if (doc.id === parentTxId) {
    return false;
  }

  if (data?.archivedAt) {
    return false;
  }

  if (data?.parentTransactionId === parentTxId) {
    return true;
  }

  return data?.isRemittanceItem === true;
}

export function filterActiveChildDocsForParent<
  TDoc extends RemittanceChildDocLike<TData>,
  TData extends RemittanceChildDocDataLike,
>(
  docs: TDoc[],
  parentTxId: string
): TDoc[] {
  return docs.filter((doc): doc is TDoc => isActiveChildDocForParent(doc, parentTxId));
}
