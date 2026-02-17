import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import {
  HEALTH_CHECK_IDS,
  type HealthCheckId,
  type HealthChecksMap,
  type HealthResultsMap,
  type HealthDeltaMap,
  type HealthSeverity,
  type HealthSnapshotDoc,
  type OrgRunResult,
} from "./types";
import { runIntegrityChecks, type HealthTx, type PendingDocument } from "./checks";
import {
  runReconciliations,
  type CategoryDoc,
  type ExpenseExportDoc,
  type ExpenseLinkDoc,
  type OffBankExpenseDoc,
  type ProjectModuleProjectDoc,
  type FxTransferDoc,
} from "./reconciliations";
import { upsertNightlyHealthIncident } from "./incidents";

const SNAPSHOT_RETENTION_DAYS = 180;

const CHECK_META: Record<HealthCheckId, { title: string; severity: HealthSeverity }> = {
  A: { title: "Categories legacy", severity: "CRITICAL" },
  B: { title: "Dates mal formades", severity: "CRITICAL" },
  C: { title: "Coherència source/bankAccount", severity: "CRITICAL" },
  D: { title: "Arxivats colats al dataset operatiu", severity: "WARNING" },
  E: { title: "Signe import vs tipus", severity: "CRITICAL" },
  F: { title: "Categories inexistents", severity: "CRITICAL" },
  G: { title: "Projectes inexistents", severity: "CRITICAL" },
  H: { title: "Comptes bancaris inexistents", severity: "CRITICAL" },
  I: { title: "Contactes inexistents", severity: "CRITICAL" },
  J: { title: "Tiquets amb liquidació inexistent", severity: "CRITICAL" },
  K: { title: "Remeses filles sense pare", severity: "CRITICAL" },
  R1: { title: "Paritat totals dashboard", severity: "CRITICAL" },
  R2: { title: "Paritat feed despeses projectes", severity: "CRITICAL" },
  R3: { title: "Paritat FX i imputacions", severity: "CRITICAL" },
};

function madridDateString(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";

  return `${year}-${month}-${day}`;
}

function computeScore(criticalCount: number, warningCount: number): number {
  const penalty = criticalCount * 5 + warningCount * 2;
  return Math.max(0, Math.min(100, 100 - penalty));
}

function toTxList(snapshot: FirebaseFirestore.QuerySnapshot): HealthTx[] {
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as HealthTx));
}

function toList<T>(snapshot: FirebaseFirestore.QuerySnapshot): T[] {
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as T));
}

async function cleanupOldSnapshots(
  snapshotsRef: FirebaseFirestore.CollectionReference,
  now: Date
): Promise<void> {
  const cutoffDate = new Date(now.getTime() - SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const cutoff = madridDateString(cutoffDate);

  const oldSnap = await snapshotsRef.where("runDate", "<", cutoff).limit(200).get();
  if (oldSnap.empty) return;

  const batch = snapshotsRef.firestore.batch();
  for (const doc of oldSnap.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

function emptyDeltaMap(): HealthDeltaMap {
  const out = {} as HealthDeltaMap;
  for (const id of HEALTH_CHECK_IDS) {
    out[id] = { previous: 0, current: 0, delta: 0, worsened: false };
  }
  return out;
}

async function writeFailedSnapshot(params: {
  db: FirebaseFirestore.Firestore;
  orgId: string;
  orgSlug: string | null;
  runDate: string;
  durationMs: number;
  errorMessage: string;
}): Promise<void> {
  const { db, orgId, orgSlug, runDate, durationMs, errorMessage } = params;

  const ref = db
    .collection("organizations")
    .doc(orgId)
    .collection("exports")
    .doc("healthSnapshots")
    .collection("items")
    .doc(runDate);

  const emptyChecks = {} as HealthChecksMap;
  const emptyResults = {} as HealthResultsMap;
  for (const id of HEALTH_CHECK_IDS) {
    emptyChecks[id] = {
      id,
      title: CHECK_META[id].title,
      severity: CHECK_META[id].severity,
      count: 0,
      sampleIds: [],
      hasIssues: false,
      examples: [],
    };
    emptyResults[id] = {
      count: 0,
      sampleIds: [],
    };
  }

  const failedSnapshot: HealthSnapshotDoc = {
    schemaVersion: 1,
    orgId,
    orgSlug,
    runDate,
    runAt: admin.firestore.Timestamp.now(),
    durationMs,
    trigger: "nightly",
    scope: "full_dataset_server",
    status: "failed",
    datasetStats: {
      transactionsAll: 0,
      transactionsOperational: 0,
      categories: 0,
      projects: 0,
      bankAccounts: 0,
      contacts: 0,
      expenseReports: 0,
      pendingDocuments: 0,
      exportedProjectExpenses: 0,
      expenseLinks: 0,
      offBankExpenses: 0,
      projectModuleProjects: 0,
    },
    checks: emptyChecks,
    results: emptyResults,
    totals: {
      criticalCount: 0,
      warningCount: 0,
      score: 0,
    },
    deltaVsPrevious: emptyDeltaMap(),
    alert: {
      triggered: false,
      incidentId: null,
      reason: null,
    },
    errorMessage: errorMessage.slice(0, 500),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.set(
    {
      ...failedSnapshot,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function runNightlyHealthForOrganization(params: {
  db: FirebaseFirestore.Firestore;
  orgId: string;
  orgSlug: string | null;
  runDate: string;
  trigger?: "nightly" | "manual";
}): Promise<OrgRunResult> {
  const { db, orgId, orgSlug, runDate, trigger = "nightly" } = params;
  const startedAt = Date.now();

  const orgRef = db.collection("organizations").doc(orgId);
  const snapshotsRef = orgRef
    .collection("exports")
    .doc("healthSnapshots")
    .collection("items");

  try {
    const [
      txSnap,
      categoriesSnap,
      rootProjectsSnap,
      bankAccountsSnap,
      contactsSnap,
      reportsSnap,
      pendingDocsSnap,
      exportExpensesSnap,
      expenseLinksSnap,
      offBankSnap,
      moduleProjectsSnap,
    ] = await Promise.all([
      orgRef.collection("transactions").get(),
      orgRef.collection("categories").get(),
      orgRef.collection("projects").get(),
      orgRef.collection("bankAccounts").get(),
      orgRef.collection("contacts").get(),
      orgRef.collection("expenseReports").get(),
      orgRef.collection("pendingDocuments").get(),
      orgRef.collection("exports").doc("projectExpenses").collection("items").get(),
      orgRef.collection("projectModule").doc("_").collection("expenseLinks").get(),
      orgRef.collection("projectModule").doc("_").collection("offBankExpenses").get(),
      orgRef.collection("projectModule").doc("_").collection("projects").get(),
    ]);

    const allTransactions = toTxList(txSnap);
    const operationalTransactions = allTransactions.filter((tx) => tx.archivedAt == null);

    const categories = toList<CategoryDoc>(categoriesSnap);
    const rootProjects = toList<{ id: string }>(rootProjectsSnap);
    const bankAccounts = toList<{ id: string }>(bankAccountsSnap);
    const contacts = toList<{ id: string }>(contactsSnap);
    const expenseReports = toList<{ id: string }>(reportsSnap);
    const pendingDocuments = toList<PendingDocument>(pendingDocsSnap);
    const exportExpenses = toList<ExpenseExportDoc>(exportExpensesSnap);
    const expenseLinks = toList<ExpenseLinkDoc>(expenseLinksSnap);
    const offBankExpenses = toList<OffBankExpenseDoc>(offBankSnap);
    const moduleProjects = toList<ProjectModuleProjectDoc>(moduleProjectsSnap);

    // Carregar transferències FX de cada projecte del mòdul
    const projectFxTransfers = new Map<string, FxTransferDoc[]>();
    await Promise.all(
      moduleProjects.map(async (project) => {
        const fxSnap = await orgRef
          .collection("projectModule")
          .doc("_")
          .collection("projects")
          .doc(project.id)
          .collection("fxTransfers")
          .get();
        projectFxTransfers.set(project.id, toList<FxTransferDoc>(fxSnap));
      })
    );

    const validCategoryIds = new Set(categories.map((c) => c.id));
    const validProjectIds = new Set(rootProjects.map((p) => p.id));
    const validBankAccountIds = new Set(bankAccounts.map((a) => a.id));
    const validContactIds = new Set(contacts.map((c) => c.id));
    const validReportIds = new Set(expenseReports.map((r) => r.id));
    const validOperationalTxIds = new Set(operationalTransactions.map((t) => t.id));

    const integrity = runIntegrityChecks({
      transactions: operationalTransactions,
      validTransactionIds: validOperationalTxIds,
      validCategoryIds,
      validProjectIds,
      validBankAccountIds,
      validContactIds,
      tickets: pendingDocuments,
      validReportIds,
    });

    const reconciliations = runReconciliations({
      operationalTransactions,
      allTransactions,
      categories,
      exportExpenses,
      expenseLinks,
      offBankExpenses,
      projectModuleProjects: moduleProjects,
      projectFxTransfers,
    });

    const rawChecks = {
      ...integrity,
      ...reconciliations,
    } as Record<HealthCheckId, { count: number; sampleIds: string[]; examples: Array<Record<string, unknown>>; details?: Record<string, unknown> }>;

    const checks = {} as HealthChecksMap;
    for (const id of HEALTH_CHECK_IDS) {
      const raw = rawChecks[id];
      checks[id] = {
        id,
        title: CHECK_META[id].title,
        severity: CHECK_META[id].severity,
        count: raw.count,
        sampleIds: Array.isArray(raw.sampleIds) ? raw.sampleIds.slice(0, 10) : [],
        hasIssues: raw.count > 0,
        examples: raw.examples,
        details: raw.details,
      };
    }

    const results = {} as HealthResultsMap;
    for (const id of HEALTH_CHECK_IDS) {
      results[id] = {
        count: checks[id].count,
        sampleIds: checks[id].sampleIds,
      };
    }

    let criticalCount = 0;
    let warningCount = 0;
    for (const id of HEALTH_CHECK_IDS) {
      const block = checks[id];
      if (block.severity === "CRITICAL") {
        criticalCount += block.count;
      } else {
        warningCount += block.count;
      }
    }

    const previousSnaps = await snapshotsRef.orderBy("runDate", "desc").limit(3).get();
    const previousDoc = previousSnaps.docs.find((doc) => doc.id !== runDate);
    const previousData = previousDoc ? (previousDoc.data() as { checks?: Record<string, { count?: number }> }) : null;

    const deltaVsPrevious = {} as HealthDeltaMap;
    for (const id of HEALTH_CHECK_IDS) {
      const previous = previousData?.checks?.[id]?.count ?? 0;
      const current = checks[id].count;
      deltaVsPrevious[id] = {
        previous,
        current,
        delta: current - previous,
        worsened: current - previous > 0,
      };
    }

    const worsenedCriticalChecks = HEALTH_CHECK_IDS.filter(
      (id) => checks[id].severity === "CRITICAL" && deltaVsPrevious[id].worsened
    );

    let incidentId: string | null = null;
    const hasPrevious = !!previousData;
    const shouldAlert = hasPrevious && worsenedCriticalChecks.length > 0;

    if (shouldAlert) {
      const sampleIdsByBlock = {} as Partial<Record<HealthCheckId, string[]>>;
      for (const id of worsenedCriticalChecks) {
        sampleIdsByBlock[id] = checks[id].sampleIds;
      }

      incidentId = await upsertNightlyHealthIncident({
        db,
        orgId,
        orgSlug,
        worsenedCriticalChecks,
        deltas: worsenedCriticalChecks.map((id) => ({
          id,
          delta: deltaVsPrevious[id].delta,
        })),
        sampleIdsByBlock,
      });
    }

    const now = new Date();
    const durationMs = Date.now() - startedAt;

    const snapshot: HealthSnapshotDoc = {
      schemaVersion: 1,
      orgId,
      orgSlug,
      runDate,
      runAt: admin.firestore.Timestamp.now(),
      durationMs,
      trigger,
      scope: "full_dataset_server",
      status: criticalCount + warningCount > 0 ? "issues" : "ok",
      datasetStats: {
        transactionsAll: allTransactions.length,
        transactionsOperational: operationalTransactions.length,
        categories: categories.length,
        projects: rootProjects.length,
        bankAccounts: bankAccounts.length,
        contacts: contacts.length,
        expenseReports: expenseReports.length,
        pendingDocuments: pendingDocuments.length,
        exportedProjectExpenses: exportExpenses.length,
        expenseLinks: expenseLinks.length,
        offBankExpenses: offBankExpenses.length,
        projectModuleProjects: moduleProjects.length,
      },
      checks,
      results,
      totals: {
        criticalCount,
        warningCount,
        score: computeScore(criticalCount, warningCount),
      },
      deltaVsPrevious,
      alert: {
        triggered: shouldAlert,
        incidentId,
        reason: !hasPrevious
          ? "Primer snapshot (baseline)"
          : shouldAlert
          ? `Empitjora en checks crítics: ${worsenedCriticalChecks.join(", ")}`
          : "Sense empitjorament crític",
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await snapshotsRef.doc(runDate).set(
      {
        ...snapshot,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await cleanupOldSnapshots(snapshotsRef, now);

    functions.logger.info("[HEALTH:org] Snapshot guardat", {
      orgId,
      runDate,
      criticalCount,
      warningCount,
      shouldAlert,
      incidentId,
    });

    return {
      orgId,
      orgSlug,
      status: snapshot.status,
      criticalCount,
      warningCount,
      alertTriggered: shouldAlert,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : "Unknown error";

    functions.logger.error("[HEALTH:org] Error executant health check", {
      orgId,
      error: message,
    });

    await writeFailedSnapshot({
      db,
      orgId,
      orgSlug,
      runDate,
      durationMs,
      errorMessage: message,
    });

    return {
      orgId,
      orgSlug,
      status: "failed",
      criticalCount: 0,
      warningCount: 0,
      alertTriggered: false,
    };
  }
}

export function buildRunDate(now = new Date()): string {
  return madridDateString(now);
}
