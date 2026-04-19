/**
 * API Route: Proxy per a la Cloud Function exportClosingBundleZip
 *
 * Reexpedeix la petició a la Cloud Function i retorna l'stream del ZIP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, validateUserMembership, verifyIdToken } from '@/lib/api/admin-sdk';
import { requirePermission } from '@/lib/api/require-permission';

const REGION = 'europe-west1';
const ALLOWED_ORIGINS = [
  'https://summasocial.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function resolveOrigin(origin: string | null): string | null {
  if (!origin) return null;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

function buildCorsHeaders(request: Request, baseHeaders?: HeadersInit): Headers {
  const headers = new Headers(baseHeaders);
  const origin = resolveOrigin(request.headers.get('origin'));

  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else {
    headers.delete('Access-Control-Allow-Origin');
  }

  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  headers.set('Vary', 'Origin');

  return headers;
}

function jsonWithCors(
  request: Request,
  body: unknown,
  init?: ResponseInit
): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: buildCorsHeaders(request, init?.headers),
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Obtenir token del header Authorization + validar usuari
    const authHeader = request.headers.get('Authorization');
    const authResult = await verifyIdToken(request);
    if (!authHeader?.startsWith('Bearer ') || !authResult) {
      return jsonWithCors(
        request,
        { code: 'UNAUTHENTICATED', message: 'Token no proporcionat' },
        { status: 401 }
      );
    }

    // 2. Obtenir body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonWithCors(
        request,
        { code: 'INVALID_REQUEST', message: 'Body invàlid' },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;
    const orgId = typeof payload.orgId === 'string' ? payload.orgId.trim() : '';
    if (!orgId) {
      return jsonWithCors(
        request,
        { code: 'INVALID_REQUEST', message: 'orgId obligatori' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const membership = await validateUserMembership(db, authResult.uid, orgId);
    const denied = requirePermission(membership, {
      code: 'INFORMES_EXPORTAR_REQUIRED',
      check: (permissions) => permissions['informes.exportar'],
    });
    if (denied) return denied;

    // 3. Construir URL de la Cloud Function
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      return jsonWithCors(
        request,
        { code: 'INTERNAL_ERROR', message: 'Configuració del servidor incompleta' },
        { status: 500 }
      );
    }

    const functionUrl = `https://${REGION}-${projectId}.cloudfunctions.net/exportClosingBundleZip`;

    // 4. Fer fetch a la Cloud Function
    const upstream = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // 5. Obtenir headers de la resposta
    const contentType = upstream.headers.get('Content-Type') || 'application/octet-stream';
    const contentDisposition = upstream.headers.get('Content-Disposition') || '';

    // 6. Si és un error JSON, retornar-lo tal qual
    if (contentType.includes('application/json')) {
      const errorData = await upstream.json();
      return jsonWithCors(request, errorData, { status: upstream.status });
    }

    // 7. Si és un ZIP, retornar l'stream
    if (!upstream.body) {
      return jsonWithCors(
        request,
        { code: 'INTERNAL_ERROR', message: 'Resposta buida del servidor' },
        { status: 500 }
      );
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: buildCorsHeaders(request, {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      }),
    });
  } catch (error) {
    console.error('[closing-bundle-zip] Error proxy:', error);
    return jsonWithCors(
      request,
      { code: 'INTERNAL_ERROR', message: 'Error intern del servidor' },
      { status: 500 }
    );
  }
}

// Permetre peticions OPTIONS per CORS (tot i que Next.js ho gestiona automàticament)
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}
