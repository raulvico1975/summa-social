/**
 * Dropbox HTTP API wrapper (sense SDK)
 *
 * Funcions bàsiques per interactuar amb l'API de Dropbox via fetch.
 */

import * as functions from "firebase-functions/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DropboxTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface DropboxFileMetadata {
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
  size?: number;
}

export interface DropboxListFolderResponse {
  entries: DropboxFileMetadata[];
  cursor: string;
  has_more: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Access Token from Refresh Token
// ─────────────────────────────────────────────────────────────────────────────

export async function getAccessToken(refreshToken: string): Promise<string> {
  const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
  const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;

  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    throw new Error("Dropbox credentials not configured");
  }

  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: DROPBOX_APP_KEY,
      client_secret: DROPBOX_APP_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error("[BACKUP:dropboxHttp] Token refresh failed:", errorText);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data: DropboxTokenResponse = await response.json();
  return data.access_token;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Folder
// ─────────────────────────────────────────────────────────────────────────────

export async function createFolder(
  accessToken: string,
  path: string
): Promise<void> {
  const response = await fetch(
    "https://api.dropboxapi.com/2/files/create_folder_v2",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path,
        autorename: false,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    // Ignorar error si la carpeta ja existeix (idempotència)
    if (errorText.includes("path/conflict/folder")) {
      functions.logger.info(`[BACKUP:dropboxHttp] Folder already exists: ${path}`);
      return;
    }

    functions.logger.error(
      `[BACKUP:dropboxHttp] Create folder failed for ${path}:`,
      errorText
    );
    throw new Error(`Create folder failed: ${response.status}`);
  }

  functions.logger.info(`[BACKUP:dropboxHttp] Created folder: ${path}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload File
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadFile(
  accessToken: string,
  path: string,
  content: Uint8Array,
  contentType: string = "application/octet-stream"
): Promise<DropboxFileMetadata> {
  const dropboxArg = {
    path,
    mode: "overwrite", // Permet sobreescriure si existeix
    autorename: false,
    mute: true, // No notificar a l'usuari
  };

  const response = await fetch(
    "https://content.dropboxapi.com/2/files/upload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify(dropboxArg),
      },
      body: Buffer.from(content),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error(
      `[BACKUP:dropboxHttp] Upload failed for ${path}:`,
      errorText
    );
    throw new Error(`Upload failed: ${response.status}`);
  }

  const metadata: DropboxFileMetadata = await response.json();
  functions.logger.info(
    `[BACKUP:dropboxHttp] Uploaded file: ${path} (${content.length} bytes)`
  );
  return metadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// List Folder
// ─────────────────────────────────────────────────────────────────────────────

export async function listFolder(
  accessToken: string,
  path: string
): Promise<DropboxFileMetadata[]> {
  const entries: DropboxFileMetadata[] = [];

  const response = await fetch(
    "https://api.dropboxapi.com/2/files/list_folder",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path,
        recursive: false,
        include_deleted: false,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    // Si la carpeta no existeix, retornar llista buida
    if (errorText.includes("path/not_found")) {
      return [];
    }

    functions.logger.error(
      `[BACKUP:dropboxHttp] List folder failed for ${path}:`,
      errorText
    );
    throw new Error(`List folder failed: ${response.status}`);
  }

  let data: DropboxListFolderResponse = await response.json();
  entries.push(...data.entries);

  // Gestionar paginació
  while (data.has_more) {
    const continueResponse = await fetch(
      "https://api.dropboxapi.com/2/files/list_folder/continue",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cursor: data.cursor,
        }),
      }
    );

    if (!continueResponse.ok) {
      break;
    }

    data = await continueResponse.json();
    entries.push(...data.entries);
  }

  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Path (file or folder)
// ─────────────────────────────────────────────────────────────────────────────

export async function deletePath(
  accessToken: string,
  path: string
): Promise<void> {
  const response = await fetch("https://api.dropboxapi.com/2/files/delete_v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Ignorar si ja no existeix
    if (errorText.includes("path_lookup/not_found")) {
      functions.logger.info(`[BACKUP:dropboxHttp] Path already deleted: ${path}`);
      return;
    }

    functions.logger.error(
      `[BACKUP:dropboxHttp] Delete failed for ${path}:`,
      errorText
    );
    throw new Error(`Delete failed: ${response.status}`);
  }

  functions.logger.info(`[BACKUP:dropboxHttp] Deleted: ${path}`);
}
