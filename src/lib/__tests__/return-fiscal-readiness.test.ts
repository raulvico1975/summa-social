import assert from 'node:assert/strict';
import test from 'node:test';

import type { Transaction } from '@/lib/data';
import {
  checkFiscalReturnReadiness,
  UNRESOLVED_FISCAL_RETURNS,
} from '@/lib/fiscal/return-fiscal-readiness';

const base = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx',
  date: '2026-08-01',
  description: 'Moviment',
  amount: 100,
  category: null,
  document: null,
  contactId: 'donor-1',
  contactType: 'donor',
  transactionType: 'normal',
  fiscalKind: 'donation',
  archivedAt: null,
  ...overrides,
});

test('readiness: enllaç verificat i recíproc deixa la devolució preparada', () => {
  const returned = base({
    id: 'return-1',
    amount: -100,
    transactionType: 'return',
    linkedTransactionId: 'donation-1',
  });
  const original = base({
    id: 'donation-1',
    transactionType: 'donation',
    linkedTransactionIds: [returned.id],
  });
  const result = checkFiscalReturnReadiness({
    organizationId: 'org-1',
    year: 2026,
    transactions: [original, returned],
  });

  assert.equal(result.ready, true);
  assert.equal(result.unresolvedReturns.length, 0);
});

test('readiness: enllaç només en un sentit bloqueja', () => {
  const result = checkFiscalReturnReadiness({
    organizationId: 'org-1',
    year: 2026,
    transactions: [
      base({ id: 'donation-1', transactionType: 'donation' }),
      base({ id: 'return-1', amount: -100, transactionType: 'return', linkedTransactionId: 'donation-1' }),
    ],
  });

  assert.equal(result.ready, false);
  assert.equal(result.code, UNRESOLVED_FISCAL_RETURNS);
  assert.deepEqual(result.transactionIds, ['return-1']);
});

test('readiness: no usa el fallback contacte+data+import com a prova', () => {
  const result = checkFiscalReturnReadiness({
    organizationId: 'org-1',
    year: 2026,
    transactions: [
      base({ id: 'donation-1', date: '2026-08-01', amount: 100, transactionType: 'donation' }),
      base({ id: 'return-1', date: '2026-08-01', amount: -100, transactionType: 'return' }),
    ],
  });

  assert.equal(result.ready, false);
  assert.equal(result.unresolvedReturns[0]?.reason, 'UNVERIFIED_RETURN');
});

test('readiness: excepció completa aprovada al servidor resol la devolució', () => {
  const result = checkFiscalReturnReadiness({
    organizationId: 'org-1',
    year: 2026,
    transactions: [base({
      id: 'return-1',
      amount: -100,
      transactionType: 'return',
      returnFiscalException: {
        reason: 'Incidència històrica documentada',
        approvedAt: '2026-08-02T10:00:00.000Z',
        approvedByUid: 'admin-1',
      },
    })],
  });

  assert.equal(result.ready, true);
});

test('readiness: excepció incompleta o revocada bloqueja', () => {
  for (const exception of [
    { reason: 'Motiu', approvedAt: '', approvedByUid: 'admin-1' },
    { reason: 'Motiu', approvedAt: '2026-08-02T10:00:00.000Z', approvedByUid: '' },
    { reason: 'Motiu', approvedAt: '2026-08-02T10:00:00.000Z', approvedByUid: 'admin-1', active: false } as never,
    null,
  ]) {
    const result = checkFiscalReturnReadiness({
      organizationId: 'org-1',
      year: 2026,
      transactions: [base({ id: 'return-1', amount: -100, transactionType: 'return', returnFiscalException: exception })],
    });
    assert.equal(result.ready, false);
  }
});

test('readiness: exclou arxivades i el pare de remesa però avalua cada filla', () => {
  const parent = base({
    id: 'parent-1',
    amount: -200,
    transactionType: 'return',
    isRemittance: true,
    remittanceType: 'returns',
  });
  const archived = base({ id: 'archived-1', amount: -50, transactionType: 'return', archivedAt: '2026-08-02T00:00:00.000Z' });
  const child = base({ id: 'child-1', amount: -100, transactionType: 'return', isRemittanceItem: true });
  const resolvedChild = base({
    id: 'child-2',
    amount: -100,
    transactionType: 'return',
    isRemittanceItem: true,
    returnFiscalException: {
      reason: 'Filla revisada en documentació històrica',
      approvedAt: '2026-08-02T10:00:00.000Z',
      approvedByUid: 'admin-1',
    },
  });

  const result = checkFiscalReturnReadiness({
    organizationId: 'org-1',
    year: 2026,
    transactions: [parent, archived, child, resolvedChild],
  });

  assert.equal(result.ready, false);
  assert.deepEqual(result.transactionIds, ['child-1']);
});

test('readiness: exclou el contenidor de split però no la filla activa', () => {
  const splitParent = base({
    id: 'split-parent-1', amount: -200, transactionType: 'return', isSplit: true,
  });
  const splitChild = base({
    id: 'split-child-1', amount: -100, transactionType: 'return', parentTransactionId: splitParent.id,
    returnFiscalException: {
      reason: 'Filla revisada', approvedAt: '2026-08-02T10:00:00.000Z', approvedByUid: 'admin-1',
    },
  });
  const result = checkFiscalReturnReadiness({
    organizationId: 'org-1', year: 2026, transactions: [splitParent, splitChild],
  });

  assert.equal(result.ready, true);
  assert.deepEqual(result.transactionIds, []);
});

test('readiness: admet àmbits per donant i per transacció sense perdre el guard', () => {
  const transactions = [
    base({ id: 'return-1', amount: -10, transactionType: 'return', contactId: 'donor-1' }),
    base({ id: 'return-2', amount: -20, transactionType: 'return', contactId: 'donor-2' }),
  ];

  const donorResult = checkFiscalReturnReadiness({
    organizationId: 'org-1', year: 2026, transactions, scope: { donor: 'donor-1' },
  });
  const transactionResult = checkFiscalReturnReadiness({
    organizationId: 'org-1', year: 2026, transactions, scope: { transactionIds: ['return-2'] },
  });

  assert.deepEqual(donorResult.transactionIds, ['return-1']);
  assert.deepEqual(transactionResult.transactionIds, ['return-2']);
});

test('readiness: rebutja original arxivat, no fiscal o d’un altre donant', () => {
  const cases: Transaction[] = [
    base({ id: 'donation-1', transactionType: 'donation', archivedAt: '2026-08-02T00:00:00.000Z' }),
    base({ id: 'donation-1', transactionType: 'normal', fiscalKind: 'non_fiscal' }),
    base({ id: 'donation-1', transactionType: 'donation', contactId: 'donor-2' }),
  ];

  for (const original of cases) {
    const result = checkFiscalReturnReadiness({
      organizationId: 'org-1',
      year: 2026,
      transactions: [original, base({ id: 'return-1', amount: -100, transactionType: 'return', linkedTransactionId: original.id })],
    });
    assert.equal(result.ready, false);
  }
});
