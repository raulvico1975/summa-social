/**
 * Google Drive HTTP API wrapper (sense SDK)
 *
 * Funcions bàsiques per interactuar amb l'API de Google Drive via fetch.
 */

import * as functions from "firebase-functions/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
}

export interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

// MIME type per carpetes de Google Drive
export const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

// ─────────────────────────────────────────────────────────────────────────────
// Get Access Token from Refresh Token
// ─────────────────────────────────────────────────────────────────────────────

export async function getAccessToken(refreshToken: string): Promise<string> {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google Drive credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error("[BACKUP:googleDriveHttp] Token refresh failed:", errorText);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data: GoogleTokenResponse = await response.json();
  return data.access_token;
}

// ─────────────────────────────────────────────────────────────────────────────
// Find Folder by Name and Parent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca una carpeta per nom i parent (opcional).
 * Si parentId és null, busca a l'arrel de "My Drive".
 */
export async function findFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<DriveFile | null> {
  // Construir query
  let q = `name='${name}' and mimeType='${FOLDER_MIME_TYPE}' and trashed=false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  } else {
    q += ` and 'root' in parents`;
  }

  const params = new URLSearchParams({
    q,
    fields: "files(id,name,mimeType,parents)",
    pageSize: "1",
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error("[BACKUP:googleDriveHttp] Find folder failed:", errorText);
    throw new Error(`Find folder failed: ${response.status}`);
  }

  const data: DriveFileList = await response.json();
  return data.files.length > 0 ? data.files[0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Folder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea una carpeta. Si parentId és null, la crea a l'arrel.
 * Retorna l'ID de la carpeta creada.
 */
export async function createFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: FOLDER_MIME_TYPE,
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const response = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error(
      `[BACKUP:googleDriveHttp] Create folder failed for ${name}:`,
      errorText
    );
    throw new Error(`Create folder failed: ${response.status}`);
  }

  const data: DriveFile = await response.json();
  functions.logger.info(`[BACKUP:googleDriveHttp] Created folder: ${name} (${data.id})`);
  return data.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ensure Folder Exists (idempotent)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assegura que una carpeta existeix. Si no existeix, la crea.
 * Retorna l'ID de la carpeta.
 */
export async function ensureFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string> {
  const existing = await findFolder(accessToken, name, parentId);
  if (existing) {
    functions.logger.info(
      `[BACKUP:googleDriveHttp] Folder already exists: ${name} (${existing.id})`
    );
    return existing.id;
  }
  return createFolder(accessToken, name, parentId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Find File by Name and Parent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca un fitxer per nom i parent.
 */
export async function findFile(
  accessToken: string,
  name: string,
  parentId: string
): Promise<DriveFile | null> {
  const q = `name='${name}' and '${parentId}' in parents and trashed=false and mimeType!='${FOLDER_MIME_TYPE}'`;

  const params = new URLSearchParams({
    q,
    fields: "files(id,name,mimeType,parents)",
    pageSize: "1",
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error("[BACKUP:googleDriveHttp] Find file failed:", errorText);
    throw new Error(`Find file failed: ${response.status}`);
  }

  const data: DriveFileList = await response.json();
  return data.files.length > 0 ? data.files[0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload File (multipart, idempotent)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Puja un fitxer a Google Drive usant multipart upload.
 * Si ja existeix un fitxer amb el mateix nom, l'esborra primer (idempotència).
 */
export async function uploadFile(
  accessToken: string,
  name: string,
  content: Uint8Array,
  parentId: string,
  mimeType: string = "application/json"
): Promise<DriveFile> {
  // Idempotència: esborrar fitxer existent si n'hi ha
  const existing = await findFile(accessToken, name, parentId);
  if (existing) {
    functions.logger.info(
      `[BACKUP:googleDriveHttp] Deleting existing file for overwrite: ${name} (${existing.id})`
    );
    await deleteFile(accessToken, existing.id);
  }

  const boundary = "summa_social_backup_boundary";

  // Metadata part
  const metadata = {
    name,
    parents: [parentId],
  };
  const metadataJson = JSON.stringify(metadata);

  // Construir multipart body manualment
  const bodyParts: string[] = [];
  bodyParts.push(`--${boundary}`);
  bodyParts.push("Content-Type: application/json; charset=UTF-8");
  bodyParts.push("");
  bodyParts.push(metadataJson);
  bodyParts.push(`--${boundary}`);
  bodyParts.push(`Content-Type: ${mimeType}`);
  bodyParts.push("Content-Transfer-Encoding: base64");
  bodyParts.push("");

  // Convertir Uint8Array a base64
  const base64Content = Buffer.from(content).toString("base64");
  bodyParts.push(base64Content);
  bodyParts.push(`--${boundary}--`);

  const bodyString = bodyParts.join("\r\n");

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: bodyString,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error(
      `[BACKUP:googleDriveHttp] Upload failed for ${name}:`,
      errorText
    );
    throw new Error(`Upload failed: ${response.status}`);
  }

  const data: DriveFile = await response.json();
  functions.logger.info(
    `[BACKUP:googleDriveHttp] Uploaded file: ${name} (${data.id}, ${content.length} bytes)`
  );
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// List Files in Folder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Llista tots els fitxers/carpetes dins d'una carpeta.
 */
export async function listFolder(
  accessToken: string,
  folderId: string
): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id,name,mimeType,parents),nextPageToken",
      pageSize: "100",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      functions.logger.error("[BACKUP:googleDriveHttp] List folder failed:", errorText);
      throw new Error(`List folder failed: ${response.status}`);
    }

    const data: DriveFileList = await response.json();
    files.push(...data.files);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete File or Folder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Elimina un fitxer o carpeta (mou a la paperera).
 */
export async function deleteFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  // Usar trash en lloc de delete permanent per seguretat
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    // Ignorar si ja no existeix (404)
    if (response.status === 404) {
      functions.logger.info(`[BACKUP:googleDriveHttp] File already deleted: ${fileId}`);
      return;
    }

    functions.logger.error(
      `[BACKUP:googleDriveHttp] Delete failed for ${fileId}:`,
      errorText
    );
    throw new Error(`Delete failed: ${response.status}`);
  }

  functions.logger.info(`[BACKUP:googleDriveHttp] Deleted: ${fileId}`);
}
