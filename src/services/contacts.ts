import type { Auth } from 'firebase/auth';

export class ContactApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null,
    public readonly requestId: string | null
  ) {
    super(message);
    this.name = 'ContactApiError';
  }
}

function contactErrorMessage(
  status: number,
  code: string | null,
  serverMessage: string | null,
  requestId: string | null
): string {
  let message = serverMessage;

  if (!message || message === code) {
    if (code === 'READ_ONLY_ROLE') {
      message = 'El teu compte té accés de només lectura i no pot desar canvis. Tanca la sessió i torna a entrar.';
    } else if (code === 'NOT_MEMBER') {
      message = 'Aquest compte no està vinculat a aquesta entitat. Tanca la sessió i torna a entrar.';
    } else if (status === 401) {
      message = 'La sessió ha caducat. Torna a iniciar sessió.';
    } else {
      message = 'No s’han pogut desar els canvis. Torna-ho a provar i, si es repeteix, avisa suport.';
    }
  }

  return requestId ? `${message} Referència: ${requestId.slice(0, 8)}.` : message;
}

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
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      'X-Summa-Client-Build': process.env.BUILD_ID || 'unknown',
    },
    body: JSON.stringify({
      orgId: params.orgId,
      updates: [{ docId: params.docId, data: params.data }],
    }),
  });

  if (!res.ok) {
    let serverMessage: string | null = null;
    let code: string | null = null;
    try {
      const payload = await res.json() as { error?: unknown; code?: unknown };
      if (typeof payload.error === 'string') serverMessage = payload.error;
      if (typeof payload.code === 'string') code = payload.code;
    } catch {}
    const requestId = res.headers.get('X-Summa-Request-Id');
    throw new ContactApiError(
      contactErrorMessage(res.status, code, serverMessage, requestId),
      res.status,
      code,
      requestId
    );
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
