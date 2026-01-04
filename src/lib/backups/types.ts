/**
 * Backup Integration Types
 *
 * Estructura de dades per a /organizations/{orgId}/integrations/backup
 * i /organizations/{orgId}/backups/{backupId}
 */

export type BackupProvider = 'dropbox' | 'googleDrive';

export type BackupStatus = 'disconnected' | 'connected' | 'error';

export type BackupRunStatus = 'success' | 'error';

export interface DropboxConfig {
  rootPath: string | null; // "/Summa Social/{orgSlug}"
  refreshToken: string | null;
}

export interface GoogleDriveConfig {
  folderId: string | null;
  refreshToken: string | null;
}

/**
 * Document principal d'integració de backup
 * Path: /organizations/{orgId}/integrations/backup
 */
export interface BackupIntegration {
  provider: BackupProvider | null;
  status: BackupStatus;
  connectedAt: string | null; // YYYY-MM-DD
  lastRunAt: string | null; // ISO
  lastRunStatus: BackupRunStatus | null;
  lastError: string | null;

  dropbox: DropboxConfig | null;
  googleDrive: GoogleDriveConfig | null;
}

/**
 * Fitxer inclòs en un backup run
 */
export interface BackupFile {
  name: string;
  size: number;
  checksum: string | null;
}

/**
 * Registre d'execució de backup
 * Path: /organizations/{orgId}/backups/{backupId}
 */
export interface BackupRun {
  id: string;
  provider: BackupProvider;
  startedAt: string; // ISO
  finishedAt: string | null; // ISO
  status: BackupRunStatus;
  files: BackupFile[];
  error: string | null;
}

/**
 * OAuth request per backup (one-shot, anti-CSRF)
 * Path: /organizations/{orgId}/integrations/backupOAuthRequests/{requestId}
 */
export interface BackupOAuthRequest {
  id: string;
  provider: BackupProvider;
  orgId: string;
  orgSlug: string;
  createdAt: string; // ISO
  expiresAt: string; // ISO (now + 10 min)
  usedAt: string | null; // ISO or null
  createdByUid: string;
}

/**
 * Estat inicial per a organitzacions sense configuració de backup
 */
export const INITIAL_BACKUP_INTEGRATION: BackupIntegration = {
  provider: null,
  status: 'disconnected',
  connectedAt: null,
  lastRunAt: null,
  lastRunStatus: null,
  lastError: null,
  dropbox: null,
  googleDrive: null,
};
