/**
 * Build Manifest
 *
 * Genera el fitxer manifest.json per un backup.
 */

import * as crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ManifestFile {
  name: string;
  size: number;
  checksum: string; // "sha256:..."
}

export interface BackupManifest {
  orgId: string;
  orgSlug: string;
  provider: "dropbox" | "googleDrive";
  backupDate: string; // YYYY-MM-DD
  exportedAt: string; // ISO
  files: ManifestFile[];
  app: {
    name: string;
    version: string | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el checksum SHA256 d'un contingut
 */
export function calculateChecksum(content: Uint8Array): string {
  const hash = crypto.createHash("sha256");
  hash.update(content);
  return `sha256:${hash.digest("hex")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Manifest
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildManifestParams {
  orgId: string;
  orgSlug: string;
  provider: "dropbox" | "googleDrive";
  backupDate: string;
  files: Array<{
    name: string;
    content: Uint8Array;
  }>;
}

export function buildManifest(params: BuildManifestParams): Uint8Array {
  const { orgId, orgSlug, provider, backupDate, files } = params;

  const manifestFiles: ManifestFile[] = files.map((file) => ({
    name: file.name,
    size: file.content.length,
    checksum: calculateChecksum(file.content),
  }));

  const manifest: BackupManifest = {
    orgId,
    orgSlug,
    provider,
    backupDate,
    exportedAt: new Date().toISOString(),
    files: manifestFiles,
    app: {
      name: "Summa Social",
      version: process.env.APP_VERSION || null,
    },
  };

  const jsonString = JSON.stringify(manifest, null, 2);
  const encoder = new TextEncoder();
  return encoder.encode(jsonString);
}
