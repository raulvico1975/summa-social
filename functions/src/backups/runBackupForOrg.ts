/**
 * Run Backup For Org
 *
 * Executor principal de backup per una organització.
 * Flux complet: export → upload → logs → update status
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import {
  ensureBaseFolder as ensureDropboxFolder,
  uploadBackupFile as uploadDropboxFile,
  type DropboxProviderConfig,
} from "./providers/dropboxProvider";
import {
  ensureBaseFolder as ensureGoogleDriveFolder,
  uploadBackupFile as uploadGoogleDriveFile,
  type GoogleDriveProviderConfig,
} from "./providers/googleDriveProvider";
import { exportFirestoreOrg } from "./exportFirestoreOrg";
import { buildManifest, calculateChecksum } from "./buildManifest";

/**
 * Feature flag per activar/desactivar backups al núvol.
 * Posar a `true` només si es vol reactivar la funcionalitat.
 */
const CLOUD_BACKUPS_ENABLED = false;

// ─────────────────────────────────────────────────────────────────────────────
// Error Sanitization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanititza missatges d'error per evitar filtrar tokens, IDs o dades sensibles.
 * Només es desa un missatge genèric per a l'usuari.
 */
function sanitizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Error desconegut durant el backup";
  }

  const msg = error.message.toLowerCase();

  // Errors d'autenticació/tokens
  if (
    msg.includes("token") ||
    msg.includes("refresh") ||
    msg.includes("auth") ||
    msg.includes("credential") ||
    msg.includes("oauth") ||
    msg.includes("401") ||
    msg.includes("403")
  ) {
    return "Error d'autenticació amb el proveïdor. Reconnecta el servei.";
  }

  // Errors de xarxa
  if (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("fetch") ||
    msg.includes("socket")
  ) {
    return "Error de connexió amb el proveïdor. Reintenta més tard.";
  }

  // Errors de quota/límit
  if (
    msg.includes("quota") ||
    msg.includes("limit") ||
    msg.includes("rate") ||
    msg.includes("429")
  ) {
    return "Límit del proveïdor excedit. Reintenta més tard.";
  }

  // Errors de permisos/espai
  if (
    msg.includes("permission") ||
    msg.includes("access") ||
    msg.includes("space") ||
    msg.includes("storage")
  ) {
    return "Error de permisos o espai al proveïdor.";
  }

  // Per defecte, missatge genèric (mai el missatge original)
  return "Error durant el backup. Contacta suport si persisteix.";
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BackupProvider = "dropbox" | "googleDrive";
type BackupStatus = "disconnected" | "connected" | "error";
type BackupRunStatus = "success" | "error";

interface BackupIntegration {
  provider: BackupProvider | null;
  status: BackupStatus;
  connectedAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: BackupRunStatus | null;
  lastError: string | null;
  dropbox: {
    refreshToken: string | null;
    rootPath: string | null;
  } | null;
  googleDrive: {
    folderId: string | null;
    refreshToken: string | null;
  } | null;
}

interface BackupRunLog {
  id: string;
  provider: BackupProvider;
  startedAt: string;
  finishedAt: string | null;
  status: BackupRunStatus;
  files: Array<{
    name: string;
    size: number;
    checksum: string | null;
  }>;
  error: string | null;
}

export interface RunBackupResult {
  success: boolean;
  backupId: string | null;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get today's date
// ─────────────────────────────────────────────────────────────────────────────

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Runner
// ─────────────────────────────────────────────────────────────────────────────

export async function runBackupForOrg(orgId: string): Promise<RunBackupResult> {
  // ─────────────────────────────────────────────────────────────────────────────
  // Feature desactivada: early-return
  // ─────────────────────────────────────────────────────────────────────────────
  if (!CLOUD_BACKUPS_ENABLED) {
    functions.logger.info(`[BACKUP:runBackupForOrg] Cloud backups disabled, skipping org ${orgId}`);
    return {
      success: false,
      backupId: null,
      error: "Cloud backups are disabled",
    };
  }

  const db = admin.firestore();
  const startTime = new Date();

  functions.logger.info(`[BACKUP:runBackupForOrg] Starting backup for org ${orgId}`);

  // 1. Carregar BackupIntegration
  const integrationRef = db.doc(`organizations/${orgId}/integrations/backup`);
  const integrationSnap = await integrationRef.get();

  if (!integrationSnap.exists) {
    return {
      success: false,
      backupId: null,
      error: "Backup integration not configured",
    };
  }

  const integration = integrationSnap.data() as BackupIntegration;

  // 2. Validar provider
  const provider = integration.provider;
  if (provider !== "dropbox" && provider !== "googleDrive") {
    return {
      success: false,
      backupId: null,
      error: `Provider not supported: ${provider}`,
    };
  }

  if (integration.status !== "connected") {
    return {
      success: false,
      backupId: null,
      error: `Integration not connected: ${integration.status}`,
    };
  }

  // Validar refresh token segons provider
  if (provider === "dropbox" && !integration.dropbox?.refreshToken) {
    return {
      success: false,
      backupId: null,
      error: "Missing Dropbox refresh token",
    };
  }

  if (provider === "googleDrive" && !integration.googleDrive?.refreshToken) {
    return {
      success: false,
      backupId: null,
      error: "Missing Google Drive refresh token",
    };
  }

  // 3. Obtenir orgSlug
  const orgDoc = await db.doc(`organizations/${orgId}`).get();
  const orgSlug = orgDoc.data()?.slug as string;

  if (!orgSlug) {
    return {
      success: false,
      backupId: null,
      error: "Organization slug not found",
    };
  }

  // 4. Preparar backup run log
  const backupsRef = db.collection(`organizations/${orgId}/backups`);
  const backupRef = backupsRef.doc();
  const backupId = backupRef.id;
  const folderDate = getTodayDate();

  const initialLog: BackupRunLog = {
    id: backupId,
    provider,
    startedAt: startTime.toISOString(),
    finishedAt: null,
    status: "error", // Pessimista fins que acabi bé
    files: [],
    error: null,
  };

  try {
    // Escriure log inicial
    await backupRef.set(initialLog);

    // 5. Exportar dades (comú per tots els providers)
    functions.logger.info(`[BACKUP:runBackupForOrg] Exporting data for ${orgSlug}`);
    const dataBytes = await exportFirestoreOrg(orgId, orgSlug);

    // 6. Generar manifest (comú per tots els providers)
    const manifestBytes = buildManifest({
      orgId,
      orgSlug,
      provider,
      backupDate: folderDate,
      files: [{ name: "data.json", content: dataBytes }],
    });

    // 7. Upload segons provider
    let dataUploadSize: number;
    let manifestUploadSize: number;

    if (provider === "dropbox") {
      // Dropbox
      const dropboxConfig: DropboxProviderConfig = {
        refreshToken: integration.dropbox!.refreshToken!,
        rootPath: integration.dropbox!.rootPath || `/Summa Social/${orgSlug}`,
      };

      await ensureDropboxFolder(dropboxConfig, orgSlug);

      functions.logger.info(`[BACKUP:runBackupForOrg] Uploading data.json to Dropbox`);
      const dataUpload = await uploadDropboxFile(
        dropboxConfig,
        orgSlug,
        folderDate,
        "data.json",
        dataBytes,
        "application/json"
      );
      dataUploadSize = dataUpload.size;

      functions.logger.info(`[BACKUP:runBackupForOrg] Uploading manifest.json to Dropbox`);
      const manifestUpload = await uploadDropboxFile(
        dropboxConfig,
        orgSlug,
        folderDate,
        "manifest.json",
        manifestBytes,
        "application/json"
      );
      manifestUploadSize = manifestUpload.size;
    } else {
      // Google Drive
      const googleDriveConfig: GoogleDriveProviderConfig = {
        refreshToken: integration.googleDrive!.refreshToken!,
        backupsFolderId: integration.googleDrive!.folderId,
      };

      // Assegurar carpetes i obtenir folderId
      const backupsFolderId = await ensureGoogleDriveFolder(googleDriveConfig, orgSlug);

      // Actualitzar folderId si cal (per accelerar futures execucions)
      if (!integration.googleDrive!.folderId) {
        await integrationRef.update({
          "googleDrive.folderId": backupsFolderId,
        });
        googleDriveConfig.backupsFolderId = backupsFolderId;
      }

      functions.logger.info(`[BACKUP:runBackupForOrg] Uploading data.json to Google Drive`);
      const dataUpload = await uploadGoogleDriveFile(
        googleDriveConfig,
        orgSlug,
        folderDate,
        "data.json",
        dataBytes,
        "application/json"
      );
      dataUploadSize = dataUpload.size;

      functions.logger.info(`[BACKUP:runBackupForOrg] Uploading manifest.json to Google Drive`);
      const manifestUpload = await uploadGoogleDriveFile(
        googleDriveConfig,
        orgSlug,
        folderDate,
        "manifest.json",
        manifestBytes,
        "application/json"
      );
      manifestUploadSize = manifestUpload.size;
    }

    // 8. Actualitzar log amb èxit
    const finishedAt = new Date().toISOString();
    const successLog: Partial<BackupRunLog> = {
      finishedAt,
      status: "success",
      files: [
        {
          name: "data.json",
          size: dataUploadSize,
          checksum: calculateChecksum(dataBytes),
        },
        {
          name: "manifest.json",
          size: manifestUploadSize,
          checksum: calculateChecksum(manifestBytes),
        },
      ],
      error: null,
    };

    await backupRef.update(successLog);

    // 9. Actualitzar BackupIntegration
    await integrationRef.update({
      lastRunAt: finishedAt,
      lastRunStatus: "success",
      lastError: null,
    });

    functions.logger.info(
      `[BACKUP:runBackupForOrg] Backup completed successfully for ${orgSlug}`,
      {
        backupId,
        folderDate,
        provider,
        dataSize: dataUploadSize,
      }
    );

    return {
      success: true,
      backupId,
      error: null,
    };
  } catch (error) {
    // Error complet per logs (només visible per devs)
    const rawErrorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // Error sanititzat per usuari (sense tokens ni dades sensibles)
    const safeErrorMessage = sanitizeErrorMessage(error);
    const finishedAt = new Date().toISOString();

    // Log complet per debugging (només Cloud Functions logs)
    functions.logger.error(
      `[BACKUP:runBackupForOrg] Backup failed for org ${orgId}:`,
      { rawError: rawErrorMessage, safeError: safeErrorMessage }
    );

    // Actualitzar log amb error sanititzat
    await backupRef.update({
      finishedAt,
      status: "error",
      error: safeErrorMessage,
    });

    // Actualitzar BackupIntegration amb error sanititzat
    await integrationRef.update({
      status: "error",
      lastRunAt: finishedAt,
      lastRunStatus: "error",
      lastError: safeErrorMessage,
    });

    return {
      success: false,
      backupId,
      error: safeErrorMessage,
    };
  }
}
