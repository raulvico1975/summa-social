export function openDocumentUrl(url: string): void {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export interface OpenTransactionDocumentParams {
  organizationId: string;
  transactionId: string;
  documentId: string;
  fallbackUrl: string;
  getIdToken: () => Promise<string>;
}

export async function openTransactionDocument({
  organizationId,
  transactionId,
  documentId,
  fallbackUrl,
  getIdToken,
}: OpenTransactionDocumentParams): Promise<void> {
  const targetWindow = window.open('about:blank', '_blank');
  if (!targetWindow) return;
  targetWindow.opener = null;

  try {
    const token = await getIdToken();
    const params = new URLSearchParams({
      orgId: organizationId,
      transactionId,
      documentId,
    });
    const response = await fetch(`/api/transaction-documents/open?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await response.json() as { success?: boolean; url?: string };
    if (response.ok && body.success && body.url) {
      targetWindow.location.href = body.url;
      return;
    }
  } catch {
    // Fallback conservador: manté compatibilitat amb documents legacy que encara tinguin un URL vàlid.
  }

  if (fallbackUrl) {
    targetWindow.location.href = fallbackUrl;
  } else {
    targetWindow.close();
  }
}

export interface OpenOrganizationDocumentParams {
  organizationId: string;
  storagePath?: string | null;
  fallbackUrl: string;
  getIdToken: () => Promise<string>;
}

export async function openOrganizationDocument({
  organizationId,
  storagePath,
  fallbackUrl,
  getIdToken,
}: OpenOrganizationDocumentParams): Promise<void> {
  const targetWindow = window.open('about:blank', '_blank');
  if (!targetWindow) return;
  targetWindow.opener = null;

  try {
    const token = await getIdToken();
    const params = new URLSearchParams({ orgId: organizationId });
    if (storagePath) {
      params.set('storagePath', storagePath);
    } else if (fallbackUrl) {
      params.set('url', fallbackUrl);
    }
    const response = await fetch(`/api/org-documents/open?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await response.json() as { success?: boolean; url?: string };
    if (response.ok && body.success && body.url) {
      targetWindow.location.href = body.url;
      return;
    }
  } catch {
    // Compatibilitat amb documents legacy que encara tinguin un URL directe vàlid.
  }

  if (fallbackUrl) {
    targetWindow.location.href = fallbackUrl;
  } else {
    targetWindow.close();
  }
}
