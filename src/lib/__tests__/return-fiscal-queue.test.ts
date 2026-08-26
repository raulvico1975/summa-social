import assert from 'node:assert/strict';
import test from 'node:test';

import type { Transaction } from '@/lib/data';
import { getReturnAssignmentStatus } from '@/components/transactions/hooks/useReturnManagement';
import { getReturnFiscalExceptionQueueItems } from '@/components/transactions/ReturnFiscalExceptionQueue';

const transaction = (overrides: Partial<Transaction>): Transaction => ({
  id: 'tx', date: '2026-01-01', description: 'Moviment', amount: -10,
  category: null, document: null, transactionType: 'return', contactId: 'donor-1',
  ...overrides,
});

test('UI queue mostra només devolucions bloquejants i excepcions actives', () => {
  const original = transaction({
    id: 'donation-1', amount: 10, transactionType: 'donation', linkedTransactionIds: ['return-resolved'],
  });
  const resolvedReturn = transaction({
    id: 'return-resolved', linkedTransactionId: original.id,
  });
  const unresolvedReturn = transaction({ id: 'return-unresolved' });
  const exceptionReturn = transaction({
    id: 'return-exception',
    returnFiscalException: {
      reason: 'Històric documentat', approvedAt: '2026-01-02', approvedByUid: 'admin-1',
    },
  });
  const parent = transaction({ id: 'return-parent', isRemittance: true, remittanceType: 'returns' });

  assert.deepEqual(
    getReturnFiscalExceptionQueueItems([original, resolvedReturn, unresolvedReturn, exceptionReturn, parent], 'org-1')
      .map((item) => item.id),
    ['return-exception', 'return-unresolved'],
  );
});

test('omitir la donació original conserva l’estat pendent de revisió i el mostra a la cua', () => {
  const unresolvedReturn = transaction({ id: 'return-pending-review' });

  assert.equal(getReturnAssignmentStatus(null), 'pending_review');
  assert.deepEqual(
    getReturnFiscalExceptionQueueItems([unresolvedReturn], 'org-1').map((item) => item.id),
    ['return-pending-review'],
  );
});
