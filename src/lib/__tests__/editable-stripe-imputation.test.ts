import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEditableStripeImputationLinesFromGroup,
  calculateEditableStripeImputationSummary,
  createManualEditableStripeImputationLine,
  resetEditableStripeImputationLinesFromCsv,
  resolveInitialSelectedTransferId,
  shouldPromptCsvReplacement,
  sortDonorsForStripeImputation,
  type EditableStripeImputationLine,
} from '@/lib/stripe/editable-stripe-imputation';

test('CSV preomple línies editables i permet edició posterior', () => {
  let counter = 0;
  const createLocalId = () => `line-${++counter}`;
  const lines = buildEditableStripeImputationLinesFromGroup({
    group: {
      transferId: 'po_1',
      rows: [
        {
          id: 'pay_1',
          createdDate: '2026-03-17',
          amount: 12,
          fee: 0.43,
          customerEmail: 'donor@example.org',
          status: 'Paid',
          transfer: 'po_1',
          description: 'Donatiu',
        },
      ],
      gross: 12,
      fees: 0.43,
      net: 11.57,
    },
    donorByEmail: new Map([['donor@example.org', 'donor-1']]),
    createLocalId,
  });

  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0], {
    localId: 'line-1',
    contactId: 'donor-1',
    amountGross: 12,
    imputationOrigin: 'csv',
    stripePaymentId: 'pay_1',
    feeAmount: 0.43,
    customerEmail: 'donor@example.org',
    description: 'Donatiu',
    date: '2026-03-17',
  });

  const edited: EditableStripeImputationLine = {
    ...lines[0],
    contactId: 'donor-2',
    amountGross: 15,
  };

  assert.equal(edited.contactId, 'donor-2');
  assert.equal(edited.amountGross, 15);
});

test('carregar CSV amb taula ja editada requereix substitució explícita', () => {
  const manualLine = createManualEditableStripeImputationLine('manual-1');
  assert.equal(shouldPromptCsvReplacement([]), false);
  assert.equal(shouldPromptCsvReplacement([manualLine]), true);
});

test('reiniciar des del CSV refà les línies des de l’últim payout seleccionat', () => {
  let counter = 0;
  const createLocalId = () => `line-${++counter}`;
  const donorByEmail = new Map([
    ['a@example.org', 'donor-a'],
    ['b@example.org', 'donor-b'],
  ]);
  const matchingGroups = [
    {
      transferId: 'po_a',
      rows: [
        {
          id: 'pay_a',
          createdDate: '2026-03-17',
          amount: 10,
          fee: 0.4,
          customerEmail: 'a@example.org',
          status: 'Paid',
          transfer: 'po_a',
          description: null,
        },
      ],
      gross: 10,
      fees: 0.4,
      net: 9.6,
    },
  ];

  const resetLines = resetEditableStripeImputationLinesFromCsv({
    matchingGroups,
    selectedTransferId: 'po_a',
    donorByEmail,
    createLocalId,
  });

  assert.equal(resetLines.length, 1);
  assert.equal(resetLines[0].stripePaymentId, 'pay_a');
  assert.equal(resetLines[0].contactId, 'donor-a');
});

test('si hi ha múltiples payouts possibles no es preselecciona cap', () => {
  const selectedTransferId = resolveInitialSelectedTransferId([
    {
      transferId: 'po_a',
      rows: [],
      gross: 22,
      fees: 0.83,
      net: 21.17,
    },
    {
      transferId: 'po_b',
      rows: [],
      gross: 21.17,
      fees: 0,
      net: 21.17,
    },
  ]);

  assert.equal(selectedTransferId, null);
});

test('resum detecta duplicats de stripePaymentId i diferència amb banc', () => {
  const summary = calculateEditableStripeImputationSummary({
    bankAmount: 21.17,
    lines: [
      {
        localId: '1',
        contactId: 'donor-1',
        amountGross: 12,
        imputationOrigin: 'csv',
        stripePaymentId: 'pay_dup',
      },
      {
        localId: '2',
        contactId: 'donor-2',
        amountGross: 10,
        imputationOrigin: 'csv',
        stripePaymentId: 'pay_dup',
      },
    ],
  });

  assert.equal(summary.totalImputed, 22);
  assert.equal(summary.difference, -0.83);
  assert.deepEqual(summary.duplicateStripePaymentIds, ['pay_dup']);
  assert.equal(summary.hasInvalidLines, false);
});

test('selector de donants prioritza ús Stripe recent, després volum i després alfabet', () => {
  const sorted = sortDonorsForStripeImputation([
    { id: '1', name: 'Alfa', type: 'donor', roles: { donor: true }, taxId: 'A' },
    { id: '2', name: 'Beta', type: 'donor', roles: { donor: true }, taxId: 'B' },
    { id: '3', name: 'Zeta', type: 'donor', roles: { donor: true }, taxId: 'C' },
  ] as any, {
    '2': { count: 2, lastDate: '2026-03-10' },
    '3': { count: 5, lastDate: '2026-03-17' },
  });

  assert.deepEqual(sorted.map((donor) => donor.name), ['Zeta', 'Beta', 'Alfa']);
});
