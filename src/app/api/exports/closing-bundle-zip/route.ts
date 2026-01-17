/**
 * API Route: Proxy per a la Cloud Function exportClosingBundleZip
 *
 * Reexpedeix la petició a la Cloud Function i retorna l'stream del ZIP.
 */

import { NextResponse } from 'next/server';

const REGION = 'europe-west1';

export async function POST(request: Request) {
  try {
    // 1. Obtenir token del header Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { code: 'UNAUTHENTICATED', message: 'Token no proporcionat' },
        { status: 401 }
      );
    }

    // 2. Obtenir body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { code: 'INVALID_REQUEST', message: 'Body invàlid' },
        { status: 400 }
      );
    }

    // 3. Construir URL de la Cloud Function
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json(
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
      return NextResponse.json(errorData, { status: upstream.status });
    }

    // 7. Si és un ZIP, retornar l'stream
    if (!upstream.body) {
      return NextResponse.json(
        { code: 'INTERNAL_ERROR', message: 'Resposta buida del servidor' },
        { status: 500 }
      );
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (error) {
    console.error('[closing-bundle-zip] Error proxy:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Error intern del servidor' },
      { status: 500 }
    );
  }
}

// Permetre peticions OPTIONS per CORS (tot i que Next.js ho gestiona automàticament)
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
