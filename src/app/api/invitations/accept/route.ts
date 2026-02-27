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

function isOrganizationRole(value: unknown): value is OrganizationRole {
  return value === 'admin' || value === 'user' || value === 'viewer';
}

function defaultCapabilitiesForRole(role: OrganizationRole): Record<string, boolean> {
  if (role === 'admin') return {};
  return ROLE_DEFAULT_CAPABILITIES[role] ?? { 'moviments.read': true };
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

    const invitationRole: OrganizationRole = isOrganizationRole(invData.role) ? invData.role : 'user';

    if (!isOrganizationRole(role) || invitationRole !== role) {
      return NextResponse.json({ success: false, error: 'role_mismatch' }, { status: 403 });
    }

    // 4. Batch: assegurar membre consistent + marcar invitació com usada
    const batch = db.batch();
    const memberRef = db.doc(`organizations/${organizationId}/members/${authResult.uid}`);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      // Membre nou: crear amb rol i capabilities per defecte.
      batch.set(memberRef, {
        userId: authResult.uid,
        email,
        displayName,
        role: invitationRole,
        joinedAt: new Date().toISOString(),
        invitationId,
        capabilities: defaultCapabilitiesForRole(invitationRole),
      });
    } else {
      // Tria A: fill-if-missing.
      // Si el membre ja existeix i no té capabilities, omplim defaults segons rol.
      const memberData = memberSnap.data() as Record<string, unknown> | undefined;
      const hasCapabilities = memberData?.capabilities !== undefined && memberData?.capabilities !== null;

      if (!hasCapabilities) {
        const existingRole = memberData?.role;
        const roleForDefaults: OrganizationRole = isOrganizationRole(existingRole)
          ? existingRole
          : invitationRole;
        batch.update(memberRef, {
          capabilities: defaultCapabilitiesForRole(roleForDefaults),
        });
      }
    }

    // Marcar invitació com usada
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
