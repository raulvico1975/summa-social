import type { Auth } from 'firebase/auth';

export interface ArchiveContactResult {
  success: boolean;
  idempotent?: boolean;
  error?: string;
  code?: string;
  activeCount?: number;
  archivedCount?: number;
  transactionCount?: number;
  canArchive?: boolean;
}

async function getAuthToken(auth: Auth): Promise<string> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('No autenticat');
  return idToken;
}

/**
 * Update a contact document via Admin SDK API.
 * Bypasses Firestore Rules (archive field guardrails handled server-side).
 * Reuses POST /api/contacts/import with a single update.
 */
export async function updateContactViaApi(params: {
  orgId: string;
  docId: string;
  data: Record<string, any>;
  auth: Auth;
}): Promise<void> {
  const idToken = await getAuthToken(params.auth);

  const res = await fetch('/api/contacts/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      orgId: params.orgId,
      updates: [{ docId: params.docId, data: params.data }],
    }),
  });

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const payload = await res.json();
      if (payload?.error) msg = payload.error;
    } catch {}
    throw new Error(msg);
  }
}

export async function checkArchiveContactViaApi(params: {
  orgId: string;
  contactId: string;
  auth: Auth;
  blockIfAnyTransaction?: boolean;
}): Promise<ArchiveContactResult> {
  const idToken = await getAuthToken(params.auth);

  const res = await fetch('/api/contacts/archive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      orgId: params.orgId,
      contactId: params.contactId,
      dryRun: true,
      blockIfAnyTransaction: params.blockIfAnyTransaction ?? false,
    }),
  });

  return res.json();
}

export async function archiveContactViaApi(params: {
  orgId: string;
  contactId: string;
  auth: Auth;
  blockIfAnyTransaction?: boolean;
}): Promise<ArchiveContactResult> {
  const idToken = await getAuthToken(params.auth);

  const res = await fetch('/api/contacts/archive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      orgId: params.orgId,
      contactId: params.contactId,
      blockIfAnyTransaction: params.blockIfAnyTransaction ?? false,
    }),
  });

  return res.json();
}

export async function restoreContactViaApi(params: {
  orgId: string;
  contactId: string;
  auth: Auth;
}): Promise<void> {
  const idToken = await getAuthToken(params.auth);

  const res = await fetch('/api/contacts/restore', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      orgId: params.orgId,
      contactId: params.contactId,
    }),
  });

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const payload = await res.json();
      if (payload?.error) msg = payload.error;
    } catch {}
    throw new Error(msg);
  }
}
