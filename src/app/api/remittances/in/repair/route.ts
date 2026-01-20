/**
 * POST /api/remittances/in/repair
 *
 * DEPRECATED: Endpoint desactivat.
 *
 * El flux de recuperació ara és: Desfer → Processar
 * No existeix "Reparar" com a operació separada.
 *
 * @deprecated Use /undo then /process instead
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint desactivat. Utilitza Desfer → Processar per recuperar una remesa.',
      code: 'REPAIR_DISABLED',
    },
    { status: 410 }
  );
}
