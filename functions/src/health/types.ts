import * as admin from "firebase-admin";

export type HealthSeverity = "CRITICAL" | "WARNING";
export type HealthStatus = "ok" | "issues" | "failed";

export type HealthCheckId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "R1"
  | "R2"
  | "R3";

export const HEALTH_CHECK_IDS: HealthCheckId[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "R1",
  "R2",
  "R3",
];

export interface HealthCheckBlock {
  id: HealthCheckId;
  title: string;
  severity: HealthSeverity;
  count: number;
  sampleIds: string[];
  hasIssues: boolean;
  examples: Array<Record<string, unknown>>;
  details?: Record<string, unknown>;
}

export type HealthChecksMap = Record<HealthCheckId, HealthCheckBlock>;
export type HealthResultsMap = Record<HealthCheckId, { count: number; sampleIds: string[] }>;

export interface HealthCheckDelta {
  previous: number;
  current: number;
  delta: number;
  worsened: boolean;
}

export type HealthDeltaMap = Record<HealthCheckId, HealthCheckDelta>;

export interface HealthTotals {
  criticalCount: number;
  warningCount: number;
  score: number;
}

export interface HealthDatasetStats {
  transactionsAll: number;
  transactionsOperational: number;
  categories: number;
  projects: number;
  bankAccounts: number;
  contacts: number;
  expenseReports: number;
  pendingDocuments: number;
  exportedProjectExpenses: number;
  expenseLinks: number;
  offBankExpenses: number;
  projectModuleProjects: number;
}

export interface HealthAlertInfo {
  triggered: boolean;
  incidentId: string | null;
  reason: string | null;
}

export interface HealthSnapshotDoc {
  schemaVersion: 1;
  orgId: string;
  orgSlug: string | null;

  runDate: string;
  runAt: admin.firestore.Timestamp;
  durationMs: number;
  trigger: "nightly" | "manual";
  scope: "full_dataset_server";

  status: HealthStatus;

  datasetStats: HealthDatasetStats;
  checks: HealthChecksMap;
  results: HealthResultsMap;
  totals: HealthTotals;
  deltaVsPrevious: HealthDeltaMap;

  alert: HealthAlertInfo;

  errorMessage?: string;

  createdAt?: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
}

export interface ComputedCheck {
  count: number;
  sampleIds: string[];
  examples: Array<Record<string, unknown>>;
  details?: Record<string, unknown>;
}

export interface OrgRunResult {
  orgId: string;
  orgSlug: string | null;
  status: HealthStatus;
  criticalCount: number;
  warningCount: number;
  alertTriggered: boolean;
}
