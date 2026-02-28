import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Transaction } from '../../src/lib/data';
import {
  canShowUndoSplitAction,
  filterSplitChildTransactions,
} from '../../src/lib/splits/split-visibility';
import { TransactionRowMobile } from '../../src/components/transactions/components/TransactionRowMobile';

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-base',
    date: '2026-02-10',
    description: 'Moviment bancari',
    amount: 100,
    category: null,
    document: null,
    ...overrides,
  };
}

const t = {
  amount: 'Import',
  balance: 'Saldo',
  noContact: 'Sense contacte',
  returnBadge: 'Devolució',
  commissionBadge: 'Comissió',
  returnedDonation: 'Retornada',
  viewDocument: 'Veure document',
  attachProof: 'Adjuntar',
  edit: 'Editar',
  delete: 'Eliminar',
  splitAmount: 'Desglossar import',
  deleteBlocked: 'Bloquejat',
  deleteBlockedParentRemittance: 'Pare remesa',
  deleteBlockedChildRemittance: 'Fill remesa',
  viewRemittanceDetail: 'Veure detall remesa',
  splitProcessedLabel: 'Desglossat',
  undoSplit: 'Desfer desglossament',
  remittanceQuotes: 'quotes',
  manageReturn: 'Gestionar devolució',
  generateReturnEmail: 'Generar correu',
  addNote: 'Afegir nota',
  editNote: 'Editar nota',
};

test('quan hi ha split, només 1 fila visible (només pare)', () => {
  const parent = makeTransaction({ id: 'parent-1', isSplit: true });
  const child = makeTransaction({
    id: 'child-1',
    amount: 25,
    parentTransactionId: 'parent-1',
    transactionType: 'donation',
  });

  const transactions = [parent, child];
  const byId = transactions.reduce((acc, tx) => {
    acc[tx.id] = tx;
    return acc;
  }, {} as Record<string, Transaction>);

  const visible = filterSplitChildTransactions(transactions, byId);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'parent-1');
});

test('amb split, el badge i l\'acció de desfer són visibles', () => {
  const tx = makeTransaction({ id: 'parent-2', isSplit: true });
  const html = renderToStaticMarkup(
    React.createElement(TransactionRowMobile, {
      transaction: tx,
      contactName: null,
      contactType: null,
      categoryDisplayName: 'Sense categoria',
      onEdit: () => {},
      onDelete: () => {},
      onOpenSplitDetail: () => {},
      onUndoSplit: () => {},
      t,
    })
  );

  assert.match(html, /Desglossat/);
  assert.equal(canShowUndoSplitAction(tx), true);
});

test('després de desfer, el badge desapareix', () => {
  const tx = makeTransaction({ id: 'parent-3', isSplit: false });
  const html = renderToStaticMarkup(
    React.createElement(TransactionRowMobile, {
      transaction: tx,
      contactName: null,
      contactType: null,
      categoryDisplayName: 'Sense categoria',
      onEdit: () => {},
      onDelete: () => {},
      onOpenSplitDetail: () => {},
      onUndoSplit: () => {},
      t,
    })
  );

  assert.doesNotMatch(html, /Desglossat/);
  assert.equal(canShowUndoSplitAction(tx), false);
});
