/**
 * Apply Retention
 *
 * Aplica la política de retenció de backups (8 setmanes màxim).
 * Elimina els backups més antics si n'hi ha més de 8.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import {
  listBackups as listDropboxBackups,
  deleteBackup as deleteDropboxBackup,
  type DropboxProviderConfig,
} from "./providers/dropboxProvider";
import {
  listBackups as listGoogleDriveBackups,
  deleteBackup as deleteGoogleDriveBackup,
  type GoogleDriveProviderConfig,
} from "./providers/googleDriveProvider";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BACKUPS = 8;

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
// Apply Retention
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica retenció de backups per una organització.
 * Manté un màxim de 8 backups, eliminant els més antics.
 */
export async function applyRetention(
  orgId: string,
  integration: BackupIntegration
): Promise<{ deleted: number; errors: string[] }> {
  const db = admin.firestore();

  const provider = integration.provider;

  // Validar provider
  if (provider !== "dropbox" && provider !== "googleDrive") {
    return { deleted: 0, errors: ["Provider not supported"] };
  }

  // Validar refresh token
  if (provider === "dropbox" && !integration.dropbox?.refreshToken) {
    return { deleted: 0, errors: ["Missing Dropbox refresh token"] };
  }

  if (provider === "googleDrive" && !integration.googleDrive?.refreshToken) {
    return { deleted: 0, errors: ["Missing Google Drive refresh token"] };
  }

  // Obtenir orgSlug
  const orgDoc = await db.doc(`organizations/${orgId}`).get();
  const orgSlug = orgDoc.data()?.slug as string;

  if (!orgSlug) {
    return { deleted: 0, errors: ["Organization slug not found"] };
  }

  // Llistar i esborrar segons provider
  let deletedCount = 0;
  const errors: string[] = [];
  const today = new Date().toISOString().split("T")[0];

  if (provider === "dropbox") {
    const config: DropboxProviderConfig = {
      refreshToken: integration.dropbox!.refreshToken!,
      rootPath: integration.dropbox!.rootPath || `/Summa Social/${orgSlug}`,
    };

    const backups = await listDropboxBackups(config, orgSlug);

    functions.logger.info(
      `[BACKUP:applyRetention] Found ${backups.length} backups for ${orgSlug} (Dropbox)`
    );

    if (backups.length <= MAX_BACKUPS) {
      return { deleted: 0, errors: [] };
    }

    const toDelete = backups
      .slice(MAX_BACKUPS)
      .filter((b) => b.folderDate !== today);

    for (const backup of toDelete) {
      try {
        await deleteDropboxBackup(config, orgSlug, backup.folderDate);
        deletedCount++;
        functions.logger.info(
          `[BACKUP:applyRetention] Deleted backup ${backup.folderDate} for ${orgSlug}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to delete ${backup.folderDate}: ${errorMessage}`);
        functions.logger.warn(
          `[BACKUP:applyRetention] Failed to delete backup ${backup.folderDate}:`,
          error
        );
      }
    }
  } else {
    // Google Drive
    const config: GoogleDriveProviderConfig = {
      refreshToken: integration.googleDrive!.refreshToken!,
      backupsFolderId: integration.googleDrive!.folderId,
    };

    const backups = await listGoogleDriveBackups(config, orgSlug);

    functions.logger.info(
      `[BACKUP:applyRetention] Found ${backups.length} backups for ${orgSlug} (Google Drive)`
    );

    if (backups.length <= MAX_BACKUPS) {
      return { deleted: 0, errors: [] };
    }

    const toDelete = backups
      .slice(MAX_BACKUPS)
      .filter((b) => b.folderDate !== today);

    for (const backup of toDelete) {
      try {
        await deleteGoogleDriveBackup(config, backup.folderId, backup.folderDate);
        deletedCount++;
        functions.logger.info(
          `[BACKUP:applyRetention] Deleted backup ${backup.folderDate} for ${orgSlug}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to delete ${backup.folderDate}: ${errorMessage}`);
        functions.logger.warn(
          `[BACKUP:applyRetention] Failed to delete backup ${backup.folderDate}:`,
          error
        );
      }
    }
  }

  functions.logger.info(`[BACKUP:applyRetention] Retention completed for ${orgSlug}`, {
    deleted: deletedCount,
    errors: errors.length,
  });

  return { deleted: deletedCount, errors };
}
