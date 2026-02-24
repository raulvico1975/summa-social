/**
 * POST /api/fiscal/model347/generate
 *
 * Genera el fitxer Model 347 AEAT server-side amb guard de permís.
 * El servidor llegeix les dades de Firestore i recalcula (server recompute).
 * Retorna AEAT347ExportResult com JSON — el client gestiona el dialog d'exclosos.
 *
 * Guard: verifyIdToken + capabilities['fiscal.model347.generar'] == true (o role admin)
 *
 * Body: {
 *   orgId: string,
 *   year: number,
 *   excludedTxIds?: string[],          // IDs de transaccions excloses a la UI
 *   excludedSupplierKeys?: string[],   // Keys "contactId:direction" exclosos a la UI
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyIdToken } from '@/lib/api/admin-sdk';
import { computeModel347 } from '@/lib/reports/model347';
import { generateModel347AEATFile } from '@/lib/reports/model347-aeat';
import type { Organization, Transaction, AnyContact, Category, Supplier } from '@/lib/data';

export async function POST(request: NextRequest) {
  // 1. Autenticació
  const auth = await verifyIdToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // 2. Parsejar body
  let body: {
    orgId?: string;
    year?: number;
    excludedTxIds?: string[];
    excludedSupplierKeys?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { orgId, year, excludedTxIds = [], excludedSupplierKeys = [] } = body;
  if (!orgId || typeof orgId !== 'string') {
    return NextResponse.json({ error: 'MISSING_ORG_ID' }, { status: 400 });
  }
  if (!year || typeof year !== 'number' || !Number.isFinite(year)) {
    return NextResponse.json({ error: 'MISSING_YEAR' }, { status: 400 });
  }

  const db = getAdminDb();

  // 3. Guard de permís
  const memberSnap = await db.doc(`organizations/${orgId}/members/${auth.uid}`).get();
  if (!memberSnap.exists) {
    return NextResponse.json({ error: 'NOT_MEMBER' }, { status: 403 });
  }
  const memberData = memberSnap.data()!;
  const isAdmin = memberData.role === 'admin';
  const hasPerm = isAdmin || (memberData.capabilities?.['fiscal.model347.generar'] === true);
  if (!hasPerm) {
    return NextResponse.json({ error: 'FORBIDDEN', code: 'MISSING_PERMISSION' }, { status: 403 });
  }

  // 4. Llegir dades des de Firestore (server recompute — invariant A2)
  const [orgSnap, txSnap, contactsSnap, categoriesSnap] = await Promise.all([
    db.doc(`organizations/${orgId}`).get(),
    db.collection(`organizations/${orgId}/transactions`).get(),
    db.collection(`organizations/${orgId}/contacts`).get(),
    db.collection(`organizations/${orgId}/categories`).get(),
  ]);

  if (!orgSnap.exists) {
    return NextResponse.json({ error: 'ORG_NOT_FOUND' }, { status: 404 });
  }

  const organization = { id: orgId, ...orgSnap.data() } as Organization;
  const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
  const contacts = contactsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as AnyContact[];
  const categories = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[];

  // 5. Filtrar transaccions actives (invariant A2: mateix hotfix que el component)
  const activeTxs = transactions.filter(tx => !tx.archivedAt);
  const suppliers = contacts.filter(c => c.type === 'supplier') as Supplier[];

  // 6. Computar Model 347 (amb libs existents, sense canvis)
  const model347 = computeModel347(
    activeTxs,
    suppliers,
    categories,
    year,
    new Set(Array.isArray(excludedTxIds) ? excludedTxIds : [])
  );

  // 7. Aplicar exclusions de proveïdors seleccionades a la UI
  const excludedKeysSet = new Set(Array.isArray(excludedSupplierKeys) ? excludedSupplierKeys : []);
  const effectiveExpenses = model347.expenses.filter(
    a => !excludedKeysSet.has(`${a.contactId}:expense`)
  );
  const effectiveIncome = model347.income.filter(
    a => !excludedKeysSet.has(`${a.contactId}:income`)
  );

  // 8. Generar fitxer AEAT
  const result = generateModel347AEATFile(organization, effectiveExpenses, effectiveIncome, year);

  // 9. Retornar AEAT347ExportResult com JSON (el client gestiona dialog d'exclosos)
  return NextResponse.json(result);
}
