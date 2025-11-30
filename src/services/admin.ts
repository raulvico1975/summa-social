'use server';

import { authAdmin, firestoreAdmin } from '@/lib/firebase-admin';
import { nanoid } from 'nanoid';
import type { Organization, UserProfile, OrganizationRole, OrganizationMember } from '@/lib/data';

interface CreateOrganizationArgs {
  name: string;
  taxId: string;
}

export async function createOrganization({ name, taxId }: CreateOrganizationArgs): Promise<Organization> {
  if (!name || !taxId) {
    throw new Error("El nom i el CIF són obligatoris.");
  }
  
  const now = new Date();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const newOrgRef = firestoreAdmin.collection('organizations').doc();
  
  const newOrgData: Omit<Organization, 'id'> = {
    slug,
    name,
    taxId,
    createdAt: now.toISOString(),
  };

  await newOrgRef.set(newOrgData);
  
  return { id: newOrgRef.id, ...newOrgData };
}

interface InviteUserArgs {
  email: string;
  displayName: string;
  role: OrganizationRole;
  organizationId: string;
}

export async function inviteUser({ email, displayName, role, organizationId }: InviteUserArgs) {
  if (!email || !displayName || !role || !organizationId) {
    throw new Error("Tots els camps són obligatoris.");
  }

  const orgDoc = await firestoreAdmin.collection('organizations').doc(organizationId).get();
  if (!orgDoc.exists) {
    throw new Error("L'organització seleccionada no existeix.");
  }
  
  const temporaryPassword = nanoid(10);
  
  try {
    const userRecord = await authAdmin.createUser({
      email,
      password: temporaryPassword,
      displayName,
      emailVerified: false,
    });
    
    const batch = firestoreAdmin.batch();
    const now = new Date();

    // Create UserProfile
    const userProfileRef = firestoreAdmin.collection('users').doc(userRecord.uid);
    const userProfileData: UserProfile = {
      organizationId,
      role,
      displayName,
    };
    batch.set(userProfileRef, userProfileData);

    // Create OrganizationMember
    const memberRef = firestoreAdmin.collection('organizations').doc(organizationId).collection('members').doc(userRecord.uid);
    const memberData: OrganizationMember = {
      userId: userRecord.uid,
      email,
      displayName,
      role,
      joinedAt: now.toISOString(),
    };
    batch.set(memberRef, memberData);

    await batch.commit();

    // Here you would typically send an email with the temporary password.
    // For this example, we'll return it in the response for the admin to see.
    console.log(`User ${email} created with temporary password: ${temporaryPassword}`);
    
    return { success: true, password: temporaryPassword };

  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      throw new Error("Ja existeix un usuari amb aquest correu electrònic.");
    }
    console.error("Error creating user:", error);
    throw new Error("No s'ha pogut crear l'usuari. Revisa els logs del servidor.");
  }
}

interface DeleteUserArgs {
    userId: string;
    orgId: string;
}

export async function deleteUser({ userId, orgId }: DeleteUserArgs) {
    const batch = firestoreAdmin.batch();

    // Delete UserProfile
    const userProfileRef = firestoreAdmin.collection('users').doc(userId);
    batch.delete(userProfileRef);

    // Delete OrganizationMember
    const memberRef = firestoreAdmin.collection('organizations').doc(orgId).collection('members').doc(userId);
    batch.delete(memberRef);

    await batch.commit();
    await authAdmin.deleteUser(userId);
    
    return { success: true };
}


interface DeleteOrganizationArgs {
    orgId: string;
}

export async function deleteOrganization({ orgId }: DeleteOrganizationArgs) {
    const membersRef = firestoreAdmin.collection('organizations').doc(orgId).collection('members');
    const membersSnapshot = await membersRef.get();

    const batch = firestoreAdmin.batch();

    // Delete all members of the organization
    membersSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    // Delete the organization document itself
    const orgRef = firestoreAdmin.collection('organizations').doc(orgId);
    batch.delete(orgRef);

    await batch.commit();

    return { success: true };
}
