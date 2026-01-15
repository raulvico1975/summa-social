/**
 * Run Weekly Backup
 *
 * Scheduler setmanal per executar backups automàtics.
 * - S'executa cada diumenge a les 03:00 Europe/Madrid
 * - Processa totes les orgs amb backup connectat
 * - Aplica retenció de 8 setmanes
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { runBackupForOrg } from "./runBackupForOrg";
import { applyRetention } from "./applyRetention";

/**
 * Feature flag per activar/desactivar backups al núvol.
 * Posar a `true` només si es vol reactivar la funcionalitat.
 */
const CLOUD_BACKUPS_ENABLED = false;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BackupIntegration {
  provider: "dropbox" | "googleDrive" | null;
  status: "disconnected" | "connected" | "error";
  dropbox: {
    refreshToken: string | null;
    rootPath: string | null;
  } | null;
  googleDrive: {
    refreshToken: string | null;
    folderId: string | null;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduler Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scheduler setmanal per backups automàtics
 * S'executa cada diumenge a les 03:00 Europe/Madrid
 */
export const runWeeklyBackup = functions
  .region("europe-west1")
  .runWith({
    timeoutSeconds: 540, // 9 minuts
    memory: "512MB",
  })
  .pubsub.schedule("0 3 * * 0") // Diumenge 03:00
  .timeZone("Europe/Madrid")
  .onRun(async () => {
    // ─────────────────────────────────────────────────────────────────────────────
    // Feature desactivada: early-return
    // ─────────────────────────────────────────────────────────────────────────────
    if (!CLOUD_BACKUPS_ENABLED) {
      functions.logger.info("[BACKUP:runWeeklyBackup] Cloud backups disabled, skipping run");
      return null;
    }

    const db = admin.firestore();
    const startTime = new Date();

    functions.logger.info("[BACKUP:runWeeklyBackup] Starting weekly backup run", {
      startTime: startTime.toISOString(),
    });

    // 1. Buscar totes les orgs amb backup connectat
    const orgsSnap = await db.collection("organizations").get();

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ orgId: string; error: string }> = [];

    // 2. Processar cada org seqüencialment
    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id;

      try {
        // Llegir integració de backup
        const integrationRef = db.doc(
          `organizations/${orgId}/integrations/backup`
        );
        const integrationSnap = await integrationRef.get();

        if (!integrationSnap.exists) {
          continue; // Org sense integració configurada
        }

        const integration = integrationSnap.data() as BackupIntegration;

        // Només processar orgs connectades
        if (integration.status !== "connected") {
          continue;
        }

        if (integration.provider !== "dropbox" && integration.provider !== "googleDrive") {
          continue; // Només Dropbox i Google Drive
        }

        functions.logger.info(`[BACKUP:runWeeklyBackup] Processing org ${orgId}`);
        processedCount++;

        // Executar backup
        const result = await runBackupForOrg(orgId);

        if (result.success) {
          successCount++;
          functions.logger.info(
            `[BACKUP:runWeeklyBackup] Backup success for org ${orgId}`,
            { backupId: result.backupId }
          );

          // Aplicar retenció només si el backup ha anat bé
          try {
            await applyRetention(orgId, integration);
          } catch (retentionError) {
            // No marcar com error, només log
            functions.logger.warn(
              `[BACKUP:runWeeklyBackup] Retention failed for org ${orgId}:`,
              retentionError
            );
          }
        } else {
          errorCount++;
          errors.push({ orgId, error: result.error || "Unknown error" });
          functions.logger.error(
            `[BACKUP:runWeeklyBackup] Backup failed for org ${orgId}:`,
            { error: result.error }
          );
        }
      } catch (error) {
        errorCount++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push({ orgId, error: errorMessage });
        functions.logger.error(
          `[BACKUP:runWeeklyBackup] Unexpected error for org ${orgId}:`,
          error
        );
      }
    }

    const finishTime = new Date();
    const durationMs = finishTime.getTime() - startTime.getTime();

    functions.logger.info("[BACKUP:runWeeklyBackup] Weekly backup run completed", {
      finishTime: finishTime.toISOString(),
      durationMs,
      processedCount,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
    });

    return null;
  });
