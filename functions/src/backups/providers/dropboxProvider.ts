/**
 * Dropbox Provider
 *
 * Implementa operacions de backup sobre Dropbox.
 * Estructura:
 *   /Summa Social/{orgSlug}/backups/{YYYY-MM-DD}/
 *     ├── data.json
 *     └── manifest.json
 */

import * as functions from "firebase-functions/v1";
import {
  getAccessToken,
  createFolder,
  uploadFile,
  listFolder,
  deletePath,
  type DropboxFileMetadata,
} from "./dropboxHttp";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DropboxProviderConfig {
  refreshToken: string;
  rootPath: string; // "/Summa Social/{orgSlug}"
}

export interface BackupInfo {
  folderDate: string; // YYYY-MM-DD
  path: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Path helpers
// ─────────────────────────────────────────────────────────────────────────────

function getBasePath(orgSlug: string): string {
  return `/Summa Social/${orgSlug}`;
}

function getBackupsPath(orgSlug: string): string {
  return `${getBasePath(orgSlug)}/backups`;
}

function getBackupRunPath(orgSlug: string, folderDate: string): string {
  return `${getBackupsPath(orgSlug)}/${folderDate}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assegura que existeixen les carpetes base
 */
export async function ensureBaseFolder(
  config: DropboxProviderConfig,
  orgSlug: string
): Promise<void> {
  const accessToken = await getAccessToken(config.refreshToken);

  // Crear carpeta base /Summa Social/{orgSlug}
  await createFolder(accessToken, getBasePath(orgSlug));

  // Crear carpeta backups
  await createFolder(accessToken, getBackupsPath(orgSlug));

  functions.logger.info(`[BACKUP:dropboxProvider] Base folders ensured for ${orgSlug}`);
}

/**
 * Puja un fitxer a una carpeta de backup específica
 */
export async function uploadBackupFile(
  config: DropboxProviderConfig,
  orgSlug: string,
  folderDate: string,
  fileName: string,
  content: Uint8Array,
  contentType: string = "application/json"
): Promise<{ path: string; size: number }> {
  const accessToken = await getAccessToken(config.refreshToken);

  // Assegurar que existeix la carpeta del run
  const runPath = getBackupRunPath(orgSlug, folderDate);
  await createFolder(accessToken, runPath);

  // Pujar fitxer
  const filePath = `${runPath}/${fileName}`;
  const metadata = await uploadFile(accessToken, filePath, content, contentType);

  return {
    path: metadata.path_display || filePath,
    size: content.length,
  };
}

/**
 * Llista tots els backups existents per una org
 */
export async function listBackups(
  config: DropboxProviderConfig,
  orgSlug: string
): Promise<BackupInfo[]> {
  const accessToken = await getAccessToken(config.refreshToken);
  const backupsPath = getBackupsPath(orgSlug);

  const entries = await listFolder(accessToken, backupsPath);

  // Filtrar només carpetes amb format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const backups: BackupInfo[] = entries
    .filter(
      (entry) =>
        entry[".tag" as keyof DropboxFileMetadata] === "folder" &&
        dateRegex.test(entry.name)
    )
    .map((entry) => ({
      folderDate: entry.name,
      path: entry.path_display || entry.path_lower,
    }))
    .sort((a, b) => b.folderDate.localeCompare(a.folderDate)); // Més recent primer

  functions.logger.info(
    `[BACKUP:dropboxProvider] Found ${backups.length} backups for ${orgSlug}`
  );
  return backups;
}

/**
 * Elimina un backup específic
 */
export async function deleteBackup(
  config: DropboxProviderConfig,
  orgSlug: string,
  folderDate: string
): Promise<void> {
  const accessToken = await getAccessToken(config.refreshToken);
  const runPath = getBackupRunPath(orgSlug, folderDate);

  await deletePath(accessToken, runPath);

  functions.logger.info(
    `[BACKUP:dropboxProvider] Deleted backup ${folderDate} for ${orgSlug}`
  );
}
