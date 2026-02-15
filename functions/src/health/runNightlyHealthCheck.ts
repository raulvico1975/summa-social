import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { buildRunDate, runNightlyHealthForOrganization } from "./runner";

export const runNightlyHealthCheck = functions
  .region("europe-west1")
  .runWith({
    timeoutSeconds: 540,
    memory: "1GB",
  })
  .pubsub.schedule("20 2 * * *")
  .timeZone("Europe/Madrid")
  .onRun(async () => {
    const db = admin.firestore();
    const runDate = buildRunDate();
    const startedAt = Date.now();

    functions.logger.info("[HEALTH:nightly] Starting nightly health check", { runDate });

    const orgsSnap = await db.collection("organizations").get();

    let processed = 0;
    let failed = 0;
    let alerts = 0;
    let totalCritical = 0;
    let totalWarning = 0;

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id;
      const orgSlug = (orgDoc.data() as { slug?: string }).slug ?? null;

      const result = await runNightlyHealthForOrganization({
        db,
        orgId,
        orgSlug,
        runDate,
        trigger: "nightly",
      });

      processed++;
      totalCritical += result.criticalCount;
      totalWarning += result.warningCount;
      if (result.alertTriggered) alerts++;
      if (result.status === "failed") failed++;
    }

    const durationMs = Date.now() - startedAt;

    functions.logger.info("[HEALTH:nightly] Finished", {
      runDate,
      durationMs,
      organizationsTotal: orgsSnap.size,
      processed,
      failed,
      alerts,
      totalCritical,
      totalWarning,
    });

    return null;
  });
