import { NextResponse } from 'next/server';

/**
 * Guardrail centralitzat d'accés operatiu.
 *
 * Regla: admin / user → operativa completa, viewer → read-only.
 * Retorna null si l'accés és vàlid, o un NextResponse 403 si no.
 */
export function requireOperationalAccess(
  membership: { valid: boolean; role: string | null }
) {
  if (!membership.valid) {
    return NextResponse.json(
      {
        success: false as const,
        error: 'Aquest compte no està vinculat a aquesta entitat. Tanca la sessió i torna a entrar.',
        code: 'NOT_MEMBER',
      },
      { status: 403 }
    );
  }

  if (membership.role !== 'admin' && membership.role !== 'user') {
    return NextResponse.json(
      {
        success: false as const,
        error: 'El teu compte té accés de només lectura i no pot desar canvis. Tanca la sessió i torna a entrar.',
        code: 'READ_ONLY_ROLE',
      },
      { status: 403 }
    );
  }

  return null;
}
