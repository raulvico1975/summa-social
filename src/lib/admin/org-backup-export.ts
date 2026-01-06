/**
 * Exportador de backup d'organització (server-side only)
 *
 * Genera un JSON amb totes les dades d'una organització.
 * No inclou dades sensibles (tokens, URLs signades).
 *
 * @module org-backup-export
 */

import type { Firestore } from 'firebase-admin/firestore';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  orgId: string;
  orgSlug: string | null;
  counts: Record<string, number>;
  data: {
    organization: Record<string, unknown> | null;
    categories: Record<string, unknown>[];
    bankAccounts: Record<string, unknown>[];
    members: Record<string, unknown>[];
    transactions: Record<string, unknown>[];
    contacts: Record<string, unknown>[];
    remittances: Record<string, unknown>[];
    pendingDocuments: Record<string, unknown>[];
    expenseReports: Record<string, unknown>[];
    projectModule: {
      projects: Record<string, unknown>[];
      budgetLines: Record<string, unknown>[];
      expenses: Record<string, unknown>[];
    } | null;
  };
}

export interface BackupExportResult {
  filename: string;
  payload: BackupPayload;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Camps sensibles que sempre s'exclouen del backup
 */
const SENSITIVE_KEYS = new Set([
  'accessToken',
  'refreshToken',
  'downloadUrl',
  'signedUrl',
  'tempUrl',
  'passwordHash',
  'passwordSalt',
  // URLs de Storage amb token (signades)
  'logoUrl',
  'signatureUrl',
  'document', // URL del document adjunt
  'documentUrl',
]);

/**
 * Detecta si un string és una URL signada de Firebase Storage
 */
function isSignedStorageUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return (
    value.includes('firebasestorage.googleapis.com') &&
    value.includes('token=')
  );
}

/**
 * Sanititza un document per backup
 * - Elimina camps sensibles (tokens, URLs signades, etc.)
 * - Detecta i elimina qualsevol URL signada de Firebase Storage
 * - Converteix Timestamps a ISO strings
 * - Mai retorna undefined (substitueix per null)
 */
function sanitizeDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(doc)) {
    // Skip camps sensibles per nom
    if (SENSITIVE_KEYS.has(key)) {
      continue;
    }

    // Skip qualsevol URL signada de Firebase Storage (per valor)
    if (isSignedStorageUrl(value)) {
      continue;
    }

    // Convertir Timestamps a ISO strings
    if (value && typeof value === 'object' && 'toDate' in value) {
      result[key] = (value as { toDate: () => Date }).toDate().toISOString();
    } else if (value === undefined) {
      // Mai escriure undefined
      result[key] = null;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursivament sanititzar objectes niuats
      result[key] = sanitizeDoc(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Sanititzar arrays
      result[key] = value.map(item =>
        item && typeof item === 'object' ? sanitizeDoc(item as Record<string, unknown>) : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Llegeix tots els documents d'una col·lecció amb paginació
 * Per col·leccions grans (transactions) fa paginació de 500 docs
 */
async function readCollection(
  db: Firestore,
  collectionPath: string,
  pageSize = 500
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    let query = db.collection(collectionPath).orderBy('__name__').limit(pageSize);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      hasMore = false;
    } else {
      for (const doc of snapshot.docs) {
        results.push({
          id: doc.id,
          ...sanitizeDoc(doc.data()),
        });
      }

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      hasMore = snapshot.docs.length === pageSize;
    }
  }

  return results;
}

/**
 * Llegeix una subcol·lecció simple (sense paginació per col·leccions petites)
 */
async function readSubcollection(
  db: Firestore,
  path: string
): Promise<Record<string, unknown>[]> {
  const snapshot = await db.collection(path).get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...sanitizeDoc(doc.data()),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTADOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Exporta totes les dades d'una organització per backup
 *
 * @param db - Instància de Firestore Admin
 * @param orgId - ID de l'organització
 * @returns filename i payload JSON
 */
export async function exportOrganizationBackup(
  db: Firestore,
  orgId: string
): Promise<BackupExportResult> {
  const basePath = `organizations/${orgId}`;

  // 1. Document d'organització
  const orgDoc = await db.doc(basePath).get();
  if (!orgDoc.exists) {
    throw new Error(`Organització no trobada: ${orgId}`);
  }

  const orgData = sanitizeDoc(orgDoc.data() || {});
  const orgSlug = (orgData.slug as string) || null;

  // 2. Llegir totes les col·leccions en paral·lel (les petites)
  const [
    categories,
    bankAccounts,
    members,
    remittances,
    pendingDocuments,
    expenseReports,
  ] = await Promise.all([
    readSubcollection(db, `${basePath}/categories`),
    readSubcollection(db, `${basePath}/bankAccounts`),
    readSubcollection(db, `${basePath}/members`),
    readSubcollection(db, `${basePath}/remittances`),
    readSubcollection(db, `${basePath}/pendingDocuments`),
    readSubcollection(db, `${basePath}/expenseReports`),
  ]);

  // 3. Llegir col·leccions grans amb paginació
  const [transactions, contacts] = await Promise.all([
    readCollection(db, `${basePath}/transactions`, 500),
    readCollection(db, `${basePath}/contacts`, 500),
  ]);

  // 4. ProjectModule (si existeix)
  let projectModule: BackupPayload['data']['projectModule'] = null;
  try {
    const [projects, budgetLines, expenses] = await Promise.all([
      readSubcollection(db, `${basePath}/projectModule/projects`).catch(() => []),
      readSubcollection(db, `${basePath}/projectModule/budgetLines`).catch(() => []),
      readSubcollection(db, `${basePath}/projectModule/expenses`).catch(() => []),
    ]);

    if (projects.length > 0 || budgetLines.length > 0 || expenses.length > 0) {
      projectModule = { projects, budgetLines, expenses };
    }
  } catch {
    // ProjectModule no existeix, ignorar
  }

  // 5. Construir payload
  const exportedAt = new Date().toISOString();
  const dateStr = exportedAt.split('T')[0]; // YYYY-MM-DD

  const counts: Record<string, number> = {
    categories: categories.length,
    bankAccounts: bankAccounts.length,
    members: members.length,
    transactions: transactions.length,
    contacts: contacts.length,
    remittances: remittances.length,
    pendingDocuments: pendingDocuments.length,
    expenseReports: expenseReports.length,
  };

  if (projectModule) {
    counts.projectModuleProjects = projectModule.projects.length;
    counts.projectModuleBudgetLines = projectModule.budgetLines.length;
    counts.projectModuleExpenses = projectModule.expenses.length;
  }

  const payload: BackupPayload = {
    schemaVersion: 1,
    exportedAt,
    orgId,
    orgSlug,
    counts,
    data: {
      organization: orgData,
      categories,
      bankAccounts,
      members,
      transactions,
      contacts,
      remittances,
      pendingDocuments,
      expenseReports,
      projectModule,
    },
  };

  // 6. Generar filename
  const safeSlug = orgSlug ? orgSlug.replace(/[^a-z0-9-]/gi, '_') : orgId;
  const filename = `summa_backup_${safeSlug}_${dateStr}.json`;

  return { filename, payload };
}
