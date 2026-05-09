/**
 * POST /api/projects/archive
 *
 * Arxiva un projecte (eix d'actuació) amb reassignació opcional de transaccions.
 *
 * Característiques:
 * - Només escriptura via Admin SDK (bypassant Firestore Rules)
 * - orgId derivat de la membership de l'usuari (no del body)
 * - Validació del permís projectes.manage
 * - Reassignació atòmica amb batch (50 docs/batch)
 * - Idempotent: si ja està arxivat, retorna success
 *
 * NOTA: Aquesta API NO afecta projectModule/* (mòdul de projectes modern)
 * Només afecta organizations/{orgId}/projects/* (eixos d'actuació legacy)
 */

import { NextRequest } from 'next/server';
import { handleArchiveProjectPost } from './handler';

export async function POST(request: NextRequest) {
  return handleArchiveProjectPost(request);
}
