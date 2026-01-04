/**
 * Members Import Utilities
 *
 * Importació Excel d'invitacions massives amb:
 * - Validació d'emails
 * - Validació de rols (admin, user, viewer)
 * - Deduplicació contra membres existents i invitacions pendents
 * - Preview abans d'aplicar canvis
 */

import * as XLSX from 'xlsx';
import type { OrganizationMember, OrganizationRole, Invitation } from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fila parsejada del fitxer Excel
 */
export interface ParsedInviteRow {
  rowIndex: number;           // Fila original (1-indexed per mostrar)
  email: string;              // Email normalitzat (lowercase, trimmed)
  role: OrganizationRole;
  displayName: string | null; // Nom opcional
}

/**
 * Resultat del matching amb membres/invitacions existents
 */
export interface InviteImportPreview {
  rowIndex: number;
  action: 'create' | 'skip';
  reason?: string;            // Motiu del skip
  parsed: ParsedInviteRow;
}

/**
 * Resultat complet de la importació (preview)
 */
export interface InviteImportResult {
  previews: InviteImportPreview[];
  summary: {
    total: number;
    toCreate: number;
    toSkip: number;
  };
  warnings: string[];
  errors: string[];           // Errors bloquejants
}

// ═══════════════════════════════════════════════════════════════════════════
// DETECCIÓ DE COLUMNES
// ═══════════════════════════════════════════════════════════════════════════

interface ColumnMapping {
  email: number;
  role: number;
  displayName: number;
}

const COLUMN_PATTERNS: Record<keyof ColumnMapping, RegExp[]> = {
  email: [/^email$/i, /^correu$/i, /^e-mail$/i, /^mail$/i],
  role: [/^rol$/i, /^role$/i, /^perfil$/i],
  displayName: [/^nom$/i, /^nombre$/i, /^name$/i, /^display\s*name$/i],
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    email: -1,
    role: -1,
    displayName: -1,
  };

  headers.forEach((header, idx) => {
    const normalized = normalizeHeader(header);

    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (mapping[field as keyof ColumnMapping] === -1) {
        for (const pattern of patterns) {
          if (pattern.test(normalized) || pattern.test(header)) {
            mapping[field as keyof ColumnMapping] = idx;
            break;
          }
        }
      }
    }
  });

  return mapping;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSING DE DADES
// ═══════════════════════════════════════════════════════════════════════════

function getCellValue(row: unknown[], idx: number): string | null {
  if (idx < 0 || idx >= row.length) return null;
  const val = row[idx];
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  return str || null;
}

/**
 * Valida format d'email bàsic
 */
function isValidEmail(email: string): boolean {
  // Regex simple però efectiu per emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parseja i valida un rol
 */
function parseRole(value: string | null): OrganizationRole | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'admin':
    case 'administrador':
    case 'administrator':
      return 'admin';
    case 'user':
    case 'usuari':
    case 'usuario':
      return 'user';
    case 'viewer':
    case 'visualitzador':
    case 'visor':
    case 'només lectura':
    case 'solo lectura':
    case 'read-only':
      return 'viewer';
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LECTURA D'EXCEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Llegeix un fitxer Excel i retorna les files parsejades
 */
export function readInvitesExcel(data: ArrayBuffer): {
  rows: ParsedInviteRow[];
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const rows: ParsedInviteRow[] = [];

  // Llegir workbook
  const wb = XLSX.read(data, { type: 'array' });

  // Obtenir primera sheet
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    errors.push('El fitxer no conté cap full.');
    return { rows, warnings, errors };
  }

  const sheet = wb.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  if (rawData.length < 2) {
    errors.push('El fitxer no conté files de dades (només capçalera o buit).');
    return { rows, warnings, errors };
  }

  // Detectar capçaleres (primera fila)
  const headers = (rawData[0] as unknown[]).map(h => String(h || '').trim());
  const mapping = detectColumnMapping(headers);

  // Validar columnes obligatòries
  if (mapping.email === -1) {
    errors.push('No s\'ha trobat la columna "Email". És obligatòria.');
    return { rows, warnings, errors };
  }

  if (mapping.role === -1) {
    errors.push('No s\'ha trobat la columna "Rol". És obligatòria.');
    return { rows, warnings, errors };
  }

  // Parsejar files (saltant capçalera)
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i] as unknown[];
    if (!row || row.every(c => c === null || c === undefined || String(c).trim() === '')) {
      continue; // Saltar files buides
    }

    const emailRaw = getCellValue(row, mapping.email);
    if (!emailRaw) {
      warnings.push(`Fila ${i + 1}: Saltada perquè no té email.`);
      continue;
    }

    // Normalitzar email
    const email = emailRaw.trim().toLowerCase();

    // Validar format email
    if (!isValidEmail(email)) {
      errors.push(`Fila ${i + 1}: Email invàlid "${emailRaw}".`);
      continue;
    }

    // Parsejar rol
    const roleRaw = getCellValue(row, mapping.role);
    const role = parseRole(roleRaw);

    if (!role) {
      errors.push(`Fila ${i + 1}: Rol invàlid "${roleRaw}". Valors vàlids: admin, user, viewer.`);
      continue;
    }

    // Nom opcional
    const displayName = getCellValue(row, mapping.displayName);

    rows.push({
      rowIndex: i + 1,
      email,
      role,
      displayName,
    });
  }

  return { rows, warnings, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICACIÓ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera el preview de la importació comparant amb membres/invitacions existents
 *
 * REGLA: Deduplicació per email (case insensitive)
 * - Si l'email ja és membre → SKIP (ja és membre)
 * - Si l'email ja té invitació pendent → SKIP (ja convidat)
 * - Si l'email és duplicat dins l'Excel → SKIP (duplicat)
 * - Sinó → CREATE
 */
export function generateInviteImportPreview(
  parsedRows: ParsedInviteRow[],
  existingMembers: OrganizationMember[],
  pendingInvitations: Invitation[]
): InviteImportResult {
  const previews: InviteImportPreview[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Crear índexs per email (case insensitive)
  const memberEmails = new Set<string>(
    existingMembers.map(m => m.email.toLowerCase())
  );

  const pendingEmails = new Set<string>(
    pendingInvitations
      .filter(inv => inv.email)
      .map(inv => inv.email!.toLowerCase())
  );

  // Emails processats dins aquest import (per detectar duplicats)
  const processedEmails = new Set<string>();

  // Processar cada fila
  for (const parsed of parsedRows) {
    const emailLower = parsed.email.toLowerCase();

    // Ja és membre?
    if (memberEmails.has(emailLower)) {
      previews.push({
        rowIndex: parsed.rowIndex,
        action: 'skip',
        reason: 'Ja és membre de l\'organització',
        parsed,
      });
      continue;
    }

    // Ja té invitació pendent?
    if (pendingEmails.has(emailLower)) {
      previews.push({
        rowIndex: parsed.rowIndex,
        action: 'skip',
        reason: 'Ja té una invitació pendent',
        parsed,
      });
      continue;
    }

    // Duplicat dins l'Excel?
    if (processedEmails.has(emailLower)) {
      previews.push({
        rowIndex: parsed.rowIndex,
        action: 'skip',
        reason: 'Email duplicat dins el fitxer',
        parsed,
      });
      continue;
    }

    // Tot correcte, crear invitació
    processedEmails.add(emailLower);
    previews.push({
      rowIndex: parsed.rowIndex,
      action: 'create',
      parsed,
    });
  }

  // Resum
  const summary = {
    total: previews.length,
    toCreate: previews.filter(p => p.action === 'create').length,
    toSkip: previews.filter(p => p.action === 'skip').length,
  };

  return { previews, summary, warnings, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
// PREPARACIÓ DE DADES PER CREAR INVITACIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera un token únic per la invitació
 */
export function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Prepara les dades per crear una invitació a Firestore
 */
export function prepareInvitationData(
  parsed: ParsedInviteRow,
  organizationId: string,
  organizationName: string,
  createdBy: string
): Omit<Invitation, 'id'> {
  const now = new Date().toISOString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 dies

  return {
    token: generateInviteToken(),
    organizationId,
    organizationName,
    role: parsed.role,
    email: parsed.email,
    createdAt: now,
    expiresAt: expiresAt.toISOString(),
    createdBy,
  };
}
