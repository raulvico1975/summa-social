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
      { success: false as const, error: 'NOT_MEMBER', code: 'NOT_MEMBER' },
      { status: 403 }
    );
  }

  if (membership.role === 'viewer') {
    return NextResponse.json(
      { success: false as const, error: 'READ_ONLY_ROLE', code: 'READ_ONLY_ROLE' },
      { status: 403 }
    );
  }

  return null;
}
