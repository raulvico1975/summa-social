import * as admin from "firebase-admin";
import type { HealthCheckId } from "./types";

interface UpsertIncidentParams {
  db: FirebaseFirestore.Firestore;
  orgId: string;
  orgSlug: string | null;
  worsenedCriticalChecks: HealthCheckId[];
  deltas: Array<{ id: HealthCheckId; delta: number }>;
}

export async function upsertNightlyHealthIncident(params: UpsertIncidentParams): Promise<string> {
  const { db, orgId, orgSlug, worsenedCriticalChecks, deltas } = params;

  const signature = `HEALTH_NIGHTLY_${orgId}`;
  const ref = db.collection("systemIncidents").doc(signature);
  const now = admin.firestore.Timestamp.now();

  const deltaText = deltas.map((d) => `${d.id}: +${d.delta}`).join(", ");
  const message = `Nightly health check ha empitjorat (${deltaText})`;

  const payload: Record<string, unknown> = {
    signature,
    type: "INVARIANT_BROKEN",
    severity: "CRITICAL",
    orgId,
    route: "/health-check/nightly",
    message: message.slice(0, 500),
    status: "OPEN",
    lastSeenAt: now,
    lastSeenMeta: {
      worsenedCriticalChecks,
      deltas,
    },
  };
  if (orgSlug) payload.orgSlug = orgSlug;

  const existing = await ref.get();

  if (existing.exists) {
    const currentCount = (existing.data()?.count as number | undefined) ?? 1;
    await ref.update({
      ...payload,
      count: currentCount + 1,
    });
  } else {
    await ref.set({
      ...payload,
      count: 1,
      firstSeenAt: now,
    });
  }

  return signature;
}
