/**
 * GET /api/invitations/resolve?token=<token>
 *
 * Resol una invitació pel camp `token` (no per docId).
 * NO requereix autenticació — l'usuari encara no existeix.
 * Usa Admin SDK per bypass de Firestore Rules.
 *
 * Retorna el mínim necessari per al formulari de registre.
 */

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/api/admin-sdk';
import { Timestamp } from 'firebase-admin/firestore';

interface ResolveResponse {
  invitationId: string;
  organizationId: string;
  organizationName: string | null;
  email: string;
  role: string;
  expiresAt: string | null;
}

interface ErrorResponse {
  error: string;
}

export async function GET(
  req: Request
): Promise<NextResponse<ResolveResponse | ErrorResponse>> {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const snap = await db
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const doc = snap.docs[0];
    const data = doc.data();

    // Validacions server-side
    if (!data.email) {
      return NextResponse.json({ error: 'no_email' }, { status: 410 });
    }

    if (data.usedAt) {
      return NextResponse.json({ error: 'already_used' }, { status: 410 });
    }

    if (data.expiresAt) {
      const now = Timestamp.now();
      const expiresAt =
        data.expiresAt instanceof Timestamp
          ? data.expiresAt
          : Timestamp.fromDate(new Date(data.expiresAt));
      if (expiresAt.toMillis() <= now.toMillis()) {
        return NextResponse.json({ error: 'expired' }, { status: 410 });
      }
    }

    // Carregar nom de l'organització
    let organizationName: string | null = data.organizationName ?? null;
    if (!organizationName && data.organizationId) {
      const orgSnap = await db.doc(`organizations/${data.organizationId}`).get();
      if (orgSnap.exists) {
        organizationName = orgSnap.data()?.name ?? null;
      }
    }

    return NextResponse.json({
      invitationId: doc.id,
      organizationId: data.organizationId,
      organizationName,
      email: data.email,
      role: data.role ?? 'user',
      expiresAt: data.expiresAt
        ? data.expiresAt instanceof Timestamp
          ? data.expiresAt.toDate().toISOString()
          : data.expiresAt
        : null,
    });
  } catch (error) {
    console.error('[invitations/resolve] Error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
