// Types
export type {
  BackupProvider,
  BackupStatus,
  BackupRunStatus,
  DropboxConfig,
  GoogleDriveConfig,
  BackupIntegration,
  BackupFile,
  BackupRun,
  BackupOAuthRequest,
} from './types';

export { INITIAL_BACKUP_INTEGRATION } from './types';

// Server-side helpers (requereixen firebase-admin)
export {
  getOrInitBackupIntegration,
  updateBackupIntegration,
} from './backup-integration';
