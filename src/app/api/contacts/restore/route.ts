import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  getAdminDb,
  verifyIdToken,
  validateUserMembership,
} from '@/lib/api/admin-sdk';
import { requireOperationalAccess } from '@/lib/api/require-operational-access';

interface RestoreContactRequest {
  orgId: string;
  contactId: string;
}

interface RestoreContactResponse {
  success: boolean;
  idempotent?: boolean;
  error?: string;
  code?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<RestoreContactResponse>> {
  const authResult = await verifyIdToken(request);
  if (!authResult) {
    return NextResponse.json(
      { success: false, error: 'No autenticat', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  let body: RestoreContactRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invàlid', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const { orgId, contactId } = body;
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'orgId és obligatori', code: 'MISSING_ORG_ID' },
      { status: 400 }
    );
  }

  if (!contactId) {
    return NextResponse.json(
      { success: false, error: 'contactId és obligatori', code: 'MISSING_CONTACT_ID' },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const membership = await validateUserMembership(db, authResult.uid, orgId);
  const accessError = requireOperationalAccess(membership);
  if (accessError) return accessError;

  const contactRef = db.doc(`organizations/${orgId}/contacts/${contactId}`);
  const contactSnap = await contactRef.get();

  if (!contactSnap.exists) {
    return NextResponse.json(
      { success: false, error: 'Contacte no existeix', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const contactData = contactSnap.data();
  if (contactData?.archivedAt == null) {
    return NextResponse.json({ success: true, idempotent: true });
  }

  await contactRef.update({
    archivedAt: FieldValue.delete(),
    archivedByUid: FieldValue.delete(),
    archivedFromAction: FieldValue.delete(),
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
