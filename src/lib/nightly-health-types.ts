export type NightlyHealthSeverity = "CRITICAL" | "WARNING";
export type NightlyHealthStatus = "ok" | "issues" | "failed";

export type NightlyHealthCheckId =
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

export interface NightlyHealthCheckBlock {
  id: NightlyHealthCheckId;
  title: string;
  severity: NightlyHealthSeverity;
  count: number;
  hasIssues: boolean;
  examples: Array<Record<string, unknown>>;
  details?: Record<string, unknown>;
}

export interface NightlyHealthDeltaBlock {
  previous: number;
  current: number;
  delta: number;
  worsened: boolean;
}

export interface NightlyHealthTotals {
  criticalCount: number;
  warningCount: number;
  score: number;
}

export interface NightlyHealthSnapshot {
  id: string;
  schemaVersion: 1;
  runDate: string;
  status: NightlyHealthStatus;
  totals: NightlyHealthTotals;
  checks: Record<NightlyHealthCheckId, NightlyHealthCheckBlock>;
  deltaVsPrevious: Record<NightlyHealthCheckId, NightlyHealthDeltaBlock>;
  alert?: {
    triggered: boolean;
    incidentId: string | null;
    reason: string | null;
  };
  createdAt?: unknown;
  updatedAt?: unknown;
}
