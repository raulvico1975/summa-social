/**
 * Run Backup for Org (Server-side)
 *
 * Executor principal de backup per una organització.
 * Per ser usat des de Next.js API routes amb Firebase Admin SDK.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { getAccessToken, createFolder, uploadFile } from './dropbox-api';
import type { BackupIntegration, BackupRun } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OrgBackupData {
  meta: {
    orgId: string;
    orgSlug: string;
    exportedAt: string;
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

interface BackupManifest {
  orgId: string;
  orgSlug: string;
  provider: 'dropbox' | 'googleDrive';
  backupDate: string;
  exportedAt: string;
  files: Array<{
    name: string;
    size: number;
    checksum: string;
  }>;
  app: {
    name: string;
    version: string | null;
  };
}

export interface RunBackupResult {
  success: boolean;
  backupId: string | null;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function calculateChecksum(content: Uint8Array): string {
  const hash = createHash('sha256');
  hash.update(content);
  return `sha256:${hash.digest('hex')}`;
}

/**
 * Converteix un document Firestore a objecte pla
 */
function docToPlainObject(
  doc: FirebaseFirestore.DocumentSnapshot
): Record<string, unknown> {
  const data = doc.data();
  if (!data) return { id: doc.id };

  const result: Record<string, unknown> = { id: doc.id };

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;

    if (value && typeof value === 'object' && 'toDate' in value) {
      // Timestamp
      result[key] = (value as { toDate: () => Date }).toDate().toISOString();
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (item && typeof item === 'object' && 'toDate' in item) {
          return (item as { toDate: () => Date }).toDate().toISOString();
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      const nested: Record<string, unknown> = {};
      for (const [nKey, nValue] of Object.entries(value as Record<string, unknown>)) {
        if (nValue === undefined) continue;
        if (nValue && typeof nValue === 'object' && 'toDate' in nValue) {
          nested[nKey] = (nValue as { toDate: () => Date }).toDate().toISOString();
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

async function readCollection(
  ref: FirebaseFirestore.CollectionReference
): Promise<Record<string, unknown>[]> {
  const snapshot = await ref.get();
  return snapshot.docs.map(docToPlainObject);
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Firestore Data
// ─────────────────────────────────────────────────────────────────────────────

async function exportFirestoreOrg(
  db: Firestore,
  orgId: string,
  orgSlug: string
): Promise<Uint8Array> {
  const orgRef = db.doc(`organizations/${orgId}`);

  // Llegir organització
  const orgDoc = await orgRef.get();
  const organization = docToPlainObject(orgDoc);

  // Llegir categories
  const categories = await readCollection(
    orgRef.collection('categories') as unknown as FirebaseFirestore.CollectionReference
  );

  // Llegir contactes per tipus
  const contactsRef = orgRef.collection('contacts');

  const donorsSnap = await contactsRef.where('type', '==', 'donor').get();
  const donors = donorsSnap.docs.map(docToPlainObject);

  const suppliersSnap = await contactsRef.where('type', '==', 'supplier').get();
  const suppliers = suppliersSnap.docs.map(docToPlainObject);

  const employeesSnap = await contactsRef.where('type', '==', 'employee').get();
  const employees = employeesSnap.docs.map(docToPlainObject);

  // Llegir transaccions
  const transactions = await readCollection(
    orgRef.collection('transactions') as unknown as FirebaseFirestore.CollectionReference
  );

  // Llegir membres
  const members = await readCollection(
    orgRef.collection('members') as unknown as FirebaseFirestore.CollectionReference
  );

  // Llegir projectes
  const projects = await readCollection(
    orgRef.collection('projects') as unknown as FirebaseFirestore.CollectionReference
  );

  // Llegir remeses
  const remittances = await readCollection(
    orgRef.collection('remittances') as unknown as FirebaseFirestore.CollectionReference
  );

  const backupData: OrgBackupData = {
    meta: {
      orgId,
      orgSlug,
      exportedAt: new Date().toISOString(),
    },
    data: {
      organization,
      categories,
      contacts: { donors, suppliers, employees },
      transactions,
      members,
      projects,
      remittances,
    },
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const encoder = new TextEncoder();
  return encoder.encode(jsonString);
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Manifest
// ─────────────────────────────────────────────────────────────────────────────

function buildManifest(
  orgId: string,
  orgSlug: string,
  backupDate: string,
  files: Array<{ name: string; content: Uint8Array }>
): Uint8Array {
  const manifest: BackupManifest = {
    orgId,
    orgSlug,
    provider: 'dropbox',
    backupDate,
    exportedAt: new Date().toISOString(),
    files: files.map((f) => ({
      name: f.name,
      size: f.content.length,
      checksum: calculateChecksum(f.content),
    })),
    app: {
      name: 'Summa Social',
      version: process.env.APP_VERSION || null,
    },
  };

  const jsonString = JSON.stringify(manifest, null, 2);
  const encoder = new TextEncoder();
  return encoder.encode(jsonString);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Runner
// ─────────────────────────────────────────────────────────────────────────────

export async function runBackupForOrg(
  db: Firestore,
  orgId: string
): Promise<RunBackupResult> {
  const startTime = new Date();

  console.log(`[runBackup] Starting backup for org ${orgId}`);

  // 1. Carregar BackupIntegration
  const integrationRef = db.doc(`organizations/${orgId}/integrations/backup`);
  const integrationSnap = await integrationRef.get();

  if (!integrationSnap.exists) {
    return {
      success: false,
      backupId: null,
      error: 'Backup integration not configured',
    };
  }

  const integration = integrationSnap.data() as BackupIntegration;

  // 2. Validar
  if (integration.provider !== 'dropbox') {
    return {
      success: false,
      backupId: null,
      error: `Provider not supported: ${integration.provider}`,
    };
  }

  if (integration.status !== 'connected') {
    return {
      success: false,
      backupId: null,
      error: `Integration not connected: ${integration.status}`,
    };
  }

  if (!integration.dropbox?.refreshToken) {
    return {
      success: false,
      backupId: null,
      error: 'Missing Dropbox refresh token',
    };
  }

  // 3. Obtenir orgSlug
  const orgDoc = await db.doc(`organizations/${orgId}`).get();
  const orgSlug = orgDoc.data()?.slug as string;

  if (!orgSlug) {
    return {
      success: false,
      backupId: null,
      error: 'Organization slug not found',
    };
  }

  // 4. Preparar backup run log
  const backupsRef = db.collection(`organizations/${orgId}/backups`);
  const backupRef = backupsRef.doc();
  const backupId = backupRef.id;
  const folderDate = getTodayDate();

  const initialLog: Omit<BackupRun, 'id'> & { id: string } = {
    id: backupId,
    provider: 'dropbox',
    startedAt: startTime.toISOString(),
    finishedAt: null,
    status: 'error',
    files: [],
    error: null,
  };

  try {
    // Escriure log inicial
    await backupRef.set(initialLog);

    // 5. Obtenir access token
    const accessToken = await getAccessToken(integration.dropbox.refreshToken);

    // 6. Assegurar carpetes base
    const basePath = `/Summa Social/${orgSlug}`;
    const backupsPath = `${basePath}/backups`;
    const runPath = `${backupsPath}/${folderDate}`;

    await createFolder(accessToken, basePath);
    await createFolder(accessToken, backupsPath);
    await createFolder(accessToken, runPath);

    // 7. Exportar dades
    console.log(`[runBackup] Exporting data for ${orgSlug}`);
    const dataBytes = await exportFirestoreOrg(db, orgId, orgSlug);

    // 8. Pujar data.json
    console.log(`[runBackup] Uploading data.json`);
    const dataPath = `${runPath}/data.json`;
    const dataUpload = await uploadFile(accessToken, dataPath, dataBytes);

    // 9. Generar i pujar manifest.json
    const manifestBytes = buildManifest(orgId, orgSlug, folderDate, [
      { name: 'data.json', content: dataBytes },
    ]);

    console.log(`[runBackup] Uploading manifest.json`);
    const manifestPath = `${runPath}/manifest.json`;
    const manifestUpload = await uploadFile(accessToken, manifestPath, manifestBytes);

    // 10. Actualitzar log amb èxit
    const finishedAt = new Date().toISOString();
    await backupRef.update({
      finishedAt,
      status: 'success',
      files: [
        {
          name: 'data.json',
          size: dataUpload.size,
          checksum: calculateChecksum(dataBytes),
        },
        {
          name: 'manifest.json',
          size: manifestUpload.size,
          checksum: calculateChecksum(manifestBytes),
        },
      ],
      error: null,
    });

    // 11. Actualitzar BackupIntegration
    await integrationRef.update({
      lastRunAt: finishedAt,
      lastRunStatus: 'success',
      lastError: null,
    });

    console.log(`[runBackup] Backup completed for ${orgSlug}`, {
      backupId,
      folderDate,
      dataSize: dataUpload.size,
    });

    return {
      success: true,
      backupId,
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const finishedAt = new Date().toISOString();

    console.error(`[runBackup] Backup failed for org ${orgId}:`, error);

    // Actualitzar log amb error
    await backupRef.update({
      finishedAt,
      status: 'error',
      error: errorMessage,
    });

    // Actualitzar BackupIntegration amb error
    await integrationRef.update({
      status: 'error',
      lastRunAt: finishedAt,
      lastRunStatus: 'error',
      lastError: errorMessage,
    });

    return {
      success: false,
      backupId,
      error: errorMessage,
    };
  }
}
