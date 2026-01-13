/**
 * Tests unitaris per al motor de càlcul fiscal calculateDonorNet
 *
 * Executa amb: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateDonorNet, calculateDonorNetEuros } from '../fiscal/calculateDonorNet';

// =============================================================================
// HELPERS
// =============================================================================

const createTransaction = (overrides: {
  amount: number;
  date?: string;
  transactionType?: string;
  donationStatus?: string;
  contactId?: string | null;
}) => ({
  amount: overrides.amount,
  date: overrides.date ?? '2024-06-15',
  transactionType: overrides.transactionType,
  donationStatus: overrides.donationStatus,
  contactId: overrides.contactId ?? 'donor-1',
});

// =============================================================================
// TESTS: calculateDonorNet
// =============================================================================

describe('calculateDonorNet', () => {
  it('calcula correctament donacions sense devolucions', () => {
    const result = calculateDonorNet({
      transactions: [
        createTransaction({ amount: 100, date: '2024-03-01' }),
        createTransaction({ amount: 50, date: '2024-06-15' }),
      ],
      donorId: 'donor-1',
      year: 2024,
    });

    assert.strictEqual(result.grossDonationsCents, 15000); // 150€
    assert.strictEqual(result.returnsCents, 0);
    assert.strictEqual(result.netCents, 15000);
    assert.strictEqual(result.donationsCount, 2);
    assert.strictEqual(result.returnsCount, 0);
  });

  it('calcula correctament donacions amb devolucions (net positiu)', () => {
    const result = calculateDonorNet({
      transactions: [
        createTransaction({ amount: 70, date: '2024-03-01' }),
        createTransaction({ amount: -30, date: '2024-06-15', transactionType: 'return' }),
      ],
      donorId: 'donor-1',
      year: 2024,
    });

    assert.strictEqual(result.grossDonationsCents, 7000); // 70€
    assert.strictEqual(result.returnsCents, -3000);       // -30€
    assert.strictEqual(result.netCents, 4000);            // 40€
    assert.strictEqual(result.donationsCount, 1);
    assert.strictEqual(result.returnsCount, 1);
  });

  it('NO fa clamp a 0 quan devolucions > donacions (net negatiu)', () => {
    const result = calculateDonorNet({
      transactions: [
        createTransaction({ amount: 50, date: '2024-03-01' }),
        createTransaction({ amount: -80, date: '2024-06-15', transactionType: 'return' }),
      ],
      donorId: 'donor-1',
      year: 2024,
    });

    assert.strictEqual(result.grossDonationsCents, 5000);  // 50€
    assert.strictEqual(result.returnsCents, -8000);        // -80€
    assert.strictEqual(result.netCents, -3000);            // -30€ (NO clamp!)
    assert.strictEqual(result.donationsCount, 1);
    assert.strictEqual(result.returnsCount, 1);
  });

  it('ignora transaccions d\'altres donants', () => {
    const result = calculateDonorNet({
      transactions: [
        createTransaction({ amount: 100, date: '2024-03-01', contactId: 'donor-1' }),
        createTransaction({ amount: 200, date: '2024-06-15', contactId: 'donor-2' }),
      ],
      donorId: 'donor-1',
      year: 2024,
    });

    assert.strictEqual(result.grossDonationsCents, 10000); // Només 100€
    assert.strictEqual(result.donationsCount, 1);
  });

  it('ignora transaccions d\'altres anys', () => {
    const result = calculateDonorNet({
      transactions: [
        createTransaction({ amount: 100, date: '2024-03-01' }),
        createTransaction({ amount: 200, date: '2023-06-15' }),
        createTransaction({ amount: 300, date: '2025-01-01' }),
      ],
      donorId: 'donor-1',
      year: 2024,
    });

    assert.strictEqual(result.grossDonationsCents, 10000); // Només 2024
    assert.strictEqual(result.donationsCount, 1);
  });

  it('ignora donacions amb donationStatus=returned', () => {
    const result = calculateDonorNet({
      transactions: [
        createTransaction({ amount: 100, date: '2024-03-01' }),
        createTransaction({ amount: 50, date: '2024-06-15', donationStatus: 'returned' }),
      ],
      donorId: 'donor-1',
      year: 2024,
    });

    assert.strictEqual(result.grossDonationsCents, 10000); // Només 100€
    assert.strictEqual(result.donationsCount, 1);
  });

  it('ignora devolucions amb amount positiu (malformed)', () => {
    const result = calculateDonorNet({
      transactions: [
        createTransaction({ amount: 100, date: '2024-03-01' }),
        createTransaction({ amount: 50, date: '2024-06-15', transactionType: 'return' }), // malformed: positiu
      ],
      donorId: 'donor-1',
      year: 2024,
    });

    // El return amb amount positiu s'ignora com a return però compta com a donació
    assert.strictEqual(result.grossDonationsCents, 15000);
    assert.strictEqual(result.returnsCount, 0);
  });

  it('retorna zeros per donant sense transaccions', () => {
    const result = calculateDonorNet({
      transactions: [],
      donorId: 'donor-1',
      year: 2024,
    });

    assert.strictEqual(result.grossDonationsCents, 0);
    assert.strictEqual(result.returnsCents, 0);
    assert.strictEqual(result.netCents, 0);
    assert.strictEqual(result.donationsCount, 0);
    assert.strictEqual(result.returnsCount, 0);
  });
});

// =============================================================================
// TESTS: calculateDonorNetEuros
// =============================================================================

describe('calculateDonorNetEuros', () => {
  it('converteix correctament de cèntims a euros', () => {
    const result = calculateDonorNetEuros({
      transactions: [
        createTransaction({ amount: 70.50, date: '2024-03-01' }),
        createTransaction({ amount: -30.25, date: '2024-06-15', transactionType: 'return' }),
      ],
      donorId: 'donor-1',
      year: 2024,
    });

    assert.strictEqual(result.grossDonations, 70.5);
    assert.strictEqual(result.returns, -30.25);
    assert.strictEqual(result.net, 40.25);
  });
});
