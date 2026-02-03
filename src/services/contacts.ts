import type { Auth } from 'firebase/auth';

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
  const idToken = await params.auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('No autenticat');

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
