/**
 * Members Export Utilities
 *
 * Exportació Excel de membres i plantilla per invitacions massives.
 * Format: columnes amb noms en català per a usuaris.
 */

import * as XLSX from 'xlsx';
import type { OrganizationMember, Invitation } from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

interface MemberExportRow {
  Nom: string;
  Email: string;
  Rol: string;
  'Data alta': string;
}

interface InviteTemplateRow {
  Email: string;
  Rol: string;
  Nom: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converteix un rol a format visible per usuaris
 */
function formatRoleDisplay(role: string): string {
  switch (role) {
    case 'admin': return 'admin';
    case 'user': return 'user';
    case 'viewer': return 'viewer';
    default: return role;
  }
}

/**
 * Formata una data ISO a format català
 */
function formatDateCatalan(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ PRINCIPAL: EXPORTAR MEMBRES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega un fitxer Excel amb la llista de membres
 *
 * @param members - Llista de membres a exportar
 * @param filename - Nom del fitxer (opcional)
 */
export function exportMembersToExcel(
  members: OrganizationMember[],
  filename?: string
): void {
  // Ordenar per nom
  const sortedMembers = [...members].sort((a, b) =>
    (a.displayName || a.email).localeCompare(b.displayName || b.email, 'ca', { sensitivity: 'base' })
  );

  // Convertir a files d'exportació
  const rows: MemberExportRow[] = sortedMembers.map(member => ({
    Nom: member.displayName || '',
    Email: member.email,
    Rol: formatRoleDisplay(member.role),
    'Data alta': formatDateCatalan(member.joinedAt),
  }));

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 30 },  // Nom
    { wch: 35 },  // Email
    { wch: 12 },  // Rol
    { wch: 12 },  // Data alta
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Membres');

  // Generar nom de fitxer
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `membres_${date}.xlsx`;

  // Descarregar
  XLSX.writeFile(wb, finalFilename);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ: DESCARREGAR PLANTILLA D'INVITACIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega una plantilla Excel per importar invitacions massives
 * Inclou 2 files d'exemple amb dades realistes
 */
export function downloadMembersInviteTemplate(): void {
  // Files d'exemple per mostrar el format esperat
  const exampleRows: InviteTemplateRow[] = [
    {
      Email: 'maria.garcia@exemple.com',
      Rol: 'admin',
      Nom: 'Maria Garcia',
    },
    {
      Email: 'joan.serra@exemple.com',
      Rol: 'user',
      Nom: 'Joan Serra',
    },
    {
      Email: 'anna.vila@exemple.com',
      Rol: 'viewer',
      Nom: '',
    },
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(exampleRows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 35 },  // Email
    { wch: 12 },  // Rol
    { wch: 30 },  // Nom
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Invitacions');

  // Descarregar
  XLSX.writeFile(wb, 'plantilla_invitacions.xlsx');
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ: EXPORTAR INVITACIONS PENDENTS
// ═══════════════════════════════════════════════════════════════════════════

interface PendingInvitationExportRow {
  Email: string;
  Rol: string;
  'Expira': string;
  'Creada per': string;
}

/**
 * Genera i descarrega un fitxer Excel amb les invitacions pendents
 */
export function exportPendingInvitationsToExcel(
  invitations: Invitation[],
  filename?: string
): void {
  // Ordenar per email
  const sortedInvitations = [...invitations].sort((a, b) =>
    (a.email || '').localeCompare(b.email || '', 'ca', { sensitivity: 'base' })
  );

  // Convertir a files d'exportació
  const rows: PendingInvitationExportRow[] = sortedInvitations.map(inv => ({
    Email: inv.email || '',
    Rol: formatRoleDisplay(inv.role),
    'Expira': formatDateCatalan(inv.expiresAt),
    'Creada per': inv.createdBy,
  }));

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 35 },  // Email
    { wch: 12 },  // Rol
    { wch: 12 },  // Expira
    { wch: 30 },  // Creada per
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Invitacions pendents');

  // Generar nom de fitxer
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `invitacions_pendents_${date}.xlsx`;

  // Descarregar
  XLSX.writeFile(wb, finalFilename);
}
