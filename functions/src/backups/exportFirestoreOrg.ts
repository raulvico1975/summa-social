/**
 * Export Firestore Org Data
 *
 * Exporta les dades d'una organització a un objecte serialitzable.
 * MVP: només dades Firestore, sense Storage.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgBackupData {
  meta: {
    orgId: string;
    orgSlug: string;
    exportedAt: string; // ISO
  };
  data: {
    organization: Record<string, unknown>;
    categories: Record<string, unknown>[];
    contacts: {
      donors: Record<string, unknown>[];
      suppliers: Record<string, unknown>[];
      employees: Record<string, unknown>[];
    };
    transactions: Record<string, unknown>[];
    members: Record<string, unknown>[];
    projects: Record<string, unknown>[];
    remittances: Record<string, unknown>[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converteix un document Firestore a objecte pla.
 * - Elimina camps undefined
 * - Converteix Timestamps a strings ISO
 */
function docToPlainObject(
  doc: admin.firestore.DocumentSnapshot
): Record<string, unknown> {
  const data = doc.data();
  if (!data) return { id: doc.id };

  const result: Record<string, unknown> = { id: doc.id };

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;

    if (value instanceof admin.firestore.Timestamp) {
      result[key] = value.toDate().toISOString();
    } else if (value instanceof admin.firestore.GeoPoint) {
      result[key] = { latitude: value.latitude, longitude: value.longitude };
    } else if (value instanceof admin.firestore.DocumentReference) {
      result[key] = value.path;
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (item instanceof admin.firestore.Timestamp) {
          return item.toDate().toISOString();
        }
        return item;
      });
    } else if (typeof value === "object" && value !== null) {
      // Objecte imbricat
      const nested: Record<string, unknown> = {};
      for (const [nKey, nValue] of Object.entries(
        value as Record<string, unknown>
      )) {
        if (nValue === undefined) continue;
        if (nValue instanceof admin.firestore.Timestamp) {
          nested[nKey] = nValue.toDate().toISOString();
        } else {
          nested[nKey] = nValue;
        }
      }
      result[key] = nested;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Llegeix tots els documents d'una col·lecció
 */
async function readCollection(
  ref: admin.firestore.CollectionReference
): Promise<Record<string, unknown>[]> {
  const snapshot = await ref.get();
  return snapshot.docs.map(docToPlainObject);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export Function
// ─────────────────────────────────────────────────────────────────────────────

export async function exportFirestoreOrg(
  orgId: string,
  orgSlug: string
): Promise<Uint8Array> {
  const db = admin.firestore();
  const orgRef = db.doc(`organizations/${orgId}`);

  functions.logger.info(`[BACKUP:exportFirestoreOrg] Starting export for ${orgSlug}`);

  // 1. Llegir organització
  const orgDoc = await orgRef.get();
  const organization = docToPlainObject(orgDoc);

  // 2. Llegir categories
  const categories = await readCollection(orgRef.collection("categories"));

  // 3. Llegir contactes per tipus
  const contactsRef = orgRef.collection("contacts");

  const donorsSnap = await contactsRef.where("type", "==", "donor").get();
  const donors = donorsSnap.docs.map(docToPlainObject);

  const suppliersSnap = await contactsRef.where("type", "==", "supplier").get();
  const suppliers = suppliersSnap.docs.map(docToPlainObject);

  const employeesSnap = await contactsRef.where("type", "==", "employee").get();
  const employees = employeesSnap.docs.map(docToPlainObject);

  // 4. Llegir transaccions
  const transactions = await readCollection(orgRef.collection("transactions"));

  // 5. Llegir membres
  const members = await readCollection(orgRef.collection("members"));

  // 6. Llegir projectes
  const projects = await readCollection(orgRef.collection("projects"));

  // 7. Llegir remeses
  const remittances = await readCollection(orgRef.collection("remittances"));

  // Construir objecte final
  const backupData: OrgBackupData = {
    meta: {
      orgId,
      orgSlug,
      exportedAt: new Date().toISOString(),
    },
    data: {
      organization,
      categories,
      contacts: {
        donors,
        suppliers,
        employees,
      },
      transactions,
      members,
      projects,
      remittances,
    },
  };

  functions.logger.info(
    `[BACKUP:exportFirestoreOrg] Export complete for ${orgSlug}:`,
    {
      categories: categories.length,
      donors: donors.length,
      suppliers: suppliers.length,
      employees: employees.length,
      transactions: transactions.length,
      members: members.length,
      projects: projects.length,
      remittances: remittances.length,
    }
  );

  // Serialitzar a JSON i convertir a Uint8Array
  const jsonString = JSON.stringify(backupData, null, 2);
  const encoder = new TextEncoder();
  return encoder.encode(jsonString);
}
