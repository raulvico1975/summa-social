import * as admin from "firebase-admin";
import type { HealthCheckId } from "./types";

interface UpsertIncidentParams {
  db: FirebaseFirestore.Firestore;
  orgId: string;
  orgSlug: string | null;
  worsenedCriticalChecks: HealthCheckId[];
  deltas: Array<{ id: HealthCheckId; delta: number }>;
  sampleIdsByBlock: Partial<Record<HealthCheckId, string[]>>;
}

export async function upsertNightlyHealthIncident(params: UpsertIncidentParams): Promise<string> {
  const { db, orgId, orgSlug, worsenedCriticalChecks, deltas, sampleIdsByBlock } = params;

  const signature = `HEALTH_NIGHTLY_${orgId}`;
  const ref = db.collection("systemIncidents").doc(signature);
  const now = admin.firestore.Timestamp.now();

  const deltaText = deltas.map((d) => `${d.id}: +${d.delta}`).join(", ");
  const message = `Nightly health check ha empitjorat (${deltaText})`;
  const deltasMap: Partial<Record<HealthCheckId, number>> = {};
  for (const item of deltas) {
    deltasMap[item.id] = item.delta;
  }

  const sampleIdsMap: Partial<Record<HealthCheckId, string[]>> = {};
  for (const [rawBlock, rawIds] of Object.entries(sampleIdsByBlock)) {
    const block = rawBlock as HealthCheckId;
    const unique = Array.isArray(rawIds)
      ? [...new Set(rawIds.filter((id): id is string => typeof id === "string" && id.length > 0))].slice(0, 10)
      : [];
    sampleIdsMap[block] = unique;
  }

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
      deltas: deltasMap,
      sampleIds: sampleIdsMap,
      deltasList: deltas,
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
