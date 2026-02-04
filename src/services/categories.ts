import type { Auth } from 'firebase/auth';

/**
 * Update a category document via Admin SDK API.
 * Bypasses Firestore Rules (archive field guardrails handled server-side).
 */
export async function updateCategoryViaApi(params: {
  orgId: string;
  categoryId: string;
  data: Record<string, any>;
  auth: Auth;
}): Promise<void> {
  const idToken = await params.auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('No autenticat');

  const res = await fetch('/api/categories/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      orgId: params.orgId,
      categoryId: params.categoryId,
      data: params.data,
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
