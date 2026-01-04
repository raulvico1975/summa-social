/**
 * Google Drive Provider
 *
 * Implementa operacions de backup sobre Google Drive.
 * Estructura:
 *   Summa Social/{orgSlug}/backups/{YYYY-MM-DD}/
 *     ├── data.json
 *     └── manifest.json
 */

import * as functions from "firebase-functions/v1";
import {
  getAccessToken,
  ensureFolder,
  uploadFile,
  listFolder,
  deleteFile,
  FOLDER_MIME_TYPE,
} from "./googleDriveHttp";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GoogleDriveProviderConfig {
  refreshToken: string;
  backupsFolderId: string | null; // ID de la carpeta /Summa Social/{orgSlug}/backups
}

export interface BackupInfo {
  folderDate: string; // YYYY-MM-DD
  folderId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assegura que existeixen les carpetes base i retorna l'ID de la carpeta backups.
 * Estructura: Summa Social / {orgSlug} / backups
 */
export async function ensureBaseFolder(
  config: GoogleDriveProviderConfig,
  orgSlug: string
): Promise<string> {
  const accessToken = await getAccessToken(config.refreshToken);

  // 1. Carpeta arrel "Summa Social" a My Drive
  const rootFolderId = await ensureFolder(accessToken, "Summa Social");

  // 2. Carpeta org: Summa Social/{orgSlug}
  const orgFolderId = await ensureFolder(accessToken, orgSlug, rootFolderId);

  // 3. Carpeta backups: Summa Social/{orgSlug}/backups
  const backupsFolderId = await ensureFolder(accessToken, "backups", orgFolderId);

  functions.logger.info(
    `[BACKUP:googleDriveProvider] Base folders ensured for ${orgSlug}: ${backupsFolderId}`
  );

  return backupsFolderId;
}

/**
 * Puja un fitxer a una carpeta de backup específica.
 * Crea la carpeta del run si no existeix.
 */
export async function uploadBackupFile(
  config: GoogleDriveProviderConfig,
  orgSlug: string,
  folderDate: string,
  fileName: string,
  content: Uint8Array,
  contentType: string = "application/json"
): Promise<{ fileId: string; size: number }> {
  const accessToken = await getAccessToken(config.refreshToken);

  // Assegurar carpeta base si no tenim l'ID
  let backupsFolderId = config.backupsFolderId;
  if (!backupsFolderId) {
    backupsFolderId = await ensureBaseFolder(config, orgSlug);
  }

  // Assegurar carpeta del run (YYYY-MM-DD)
  const runFolderId = await ensureFolder(accessToken, folderDate, backupsFolderId);

  // Pujar fitxer
  const file = await uploadFile(
    accessToken,
    fileName,
    content,
    runFolderId,
    contentType
  );

  return {
    fileId: file.id,
    size: content.length,
  };
}

/**
 * Llista tots els backups existents per una org.
 * Retorna les carpetes amb format YYYY-MM-DD ordenades per data (més recent primer).
 */
export async function listBackups(
  config: GoogleDriveProviderConfig,
  orgSlug: string
): Promise<BackupInfo[]> {
  const accessToken = await getAccessToken(config.refreshToken);

  // Assegurar carpeta base si no tenim l'ID
  let backupsFolderId = config.backupsFolderId;
  if (!backupsFolderId) {
    backupsFolderId = await ensureBaseFolder(config, orgSlug);
  }

  // Llistar contingut de la carpeta backups
  const files = await listFolder(accessToken, backupsFolderId);

  // Filtrar només carpetes amb format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const backups: BackupInfo[] = files
    .filter(
      (file) => file.mimeType === FOLDER_MIME_TYPE && dateRegex.test(file.name)
    )
    .map((file) => ({
      folderDate: file.name,
      folderId: file.id,
    }))
    .sort((a, b) => b.folderDate.localeCompare(a.folderDate)); // Més recent primer

  functions.logger.info(
    `[BACKUP:googleDriveProvider] Found ${backups.length} backups for ${orgSlug}`
  );

  return backups;
}

/**
 * Elimina un backup específic (la carpeta i tot el seu contingut).
 */
export async function deleteBackup(
  config: GoogleDriveProviderConfig,
  folderId: string,
  folderDate: string
): Promise<void> {
  const accessToken = await getAccessToken(config.refreshToken);

  // Eliminar la carpeta (elimina recursivament tot el contingut)
  await deleteFile(accessToken, folderId);

  functions.logger.info(
    `[BACKUP:googleDriveProvider] Deleted backup ${folderDate} (${folderId})`
  );
}
