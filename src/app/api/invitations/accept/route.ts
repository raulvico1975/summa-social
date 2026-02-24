/**
 * POST /api/invitations/accept
 *
 * Accepta una invitació: crea el membre a l'organització i marca la invitació com usada.
 * Requereix autenticació (Bearer token) — l'usuari ja s'ha creat a Firebase Auth.
 * Usa Admin SDK per bypass de Firestore Rules (evita problemes de token.email timing).
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, verifyIdToken } from '@/lib/api/admin-sdk';
import { ROLE_DEFAULT_CAPABILITIES } from '@/lib/permissions';
import type { OrganizationRole } from '@/lib/data';

interface AcceptRequest {
  invitationId: string;
  organizationId: string;
  displayName: string;
  email: string;
  role: string;
}

interface AcceptResponse {
  success: boolean;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<AcceptResponse>> {
  // 1. Autenticació
  const authResult = await verifyIdToken(request);
  if (!authResult) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  // 2. Parsejar body
  let body: AcceptRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_body' }, { status: 400 });
  }

  const { invitationId, organizationId, displayName, email, role } = body;

  if (!invitationId || !organizationId || !displayName || !email || !role) {
    return NextResponse.json({ success: false, error: 'missing_fields' }, { status: 400 });
  }

  try {
    const db = getAdminDb();

    // 3. Verificar que la invitació existeix, no està usada, i les dades coincideixen
    const invitationRef = db.doc(`invitations/${invitationId}`);
    const invitationSnap = await invitationRef.get();

    if (!invitationSnap.exists) {
      return NextResponse.json({ success: false, error: 'invitation_not_found' }, { status: 404 });
    }

    const invData = invitationSnap.data()!;

    if (invData.usedAt) {
      return NextResponse.json({ success: false, error: 'already_used' }, { status: 410 });
    }

    if (invData.organizationId !== organizationId) {
      return NextResponse.json({ success: false, error: 'org_mismatch' }, { status: 403 });
    }

    if (invData.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'email_mismatch' }, { status: 403 });
    }

    if (invData.role !== role) {
      return NextResponse.json({ success: false, error: 'role_mismatch' }, { status: 403 });
    }

    // 4. Batch: crear membre + marcar invitació com usada
    const batch = db.batch();

    // 4a. Crear membre (amb capabilities D1 per enforçament Firestore Rules)
    const memberRef = db.doc(`organizations/${organizationId}/members/${authResult.uid}`);
    const memberRole = role as OrganizationRole;
    batch.set(memberRef, {
      userId: authResult.uid,
      email,
      displayName,
      role,
      joinedAt: new Date().toISOString(),
      invitationId,
      capabilities: memberRole === 'admin' ? {} : ROLE_DEFAULT_CAPABILITIES[memberRole] ?? { 'moviments.read': true },
    });

    // 4b. Marcar invitació com usada
    batch.update(invitationRef, {
      usedAt: FieldValue.serverTimestamp(),
      usedBy: authResult.uid,
    });

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[invitations/accept] Error:', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
