import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseStripeCsv,
  groupStripeRowsByTransfer,
  findAllMatchingPayoutGroups,
  parseStripeAmount,
  type StripeRow,
  type StripePayoutGroup,
} from '@/components/stripe-importer/useStripeImporter';

// ═══════════════════════════════════════════════════════════════════
// parseStripeAmount - Parsing d'imports
// ═══════════════════════════════════════════════════════════════════

describe('parseStripeAmount', () => {
  it('should parse European format (1.234,56)', () => {
    const result = parseStripeAmount('1.234,56');
    assert.strictEqual(result, 1234.56);
  });

  it('should parse English format (1234.56)', () => {
    const result = parseStripeAmount('1234.56');
    assert.strictEqual(result, 1234.56);
  });

  it('should handle small amounts without separators', () => {
    assert.strictEqual(parseStripeAmount('10'), 10);
    assert.strictEqual(parseStripeAmount('10.5'), 10.5);
    assert.strictEqual(parseStripeAmount('10,5'), 10.5);
  });

  it('should handle zero and empty strings', () => {
    assert.strictEqual(parseStripeAmount('0'), 0);
    assert.strictEqual(parseStripeAmount(''), 0);
    assert.strictEqual(parseStripeAmount('  '), 0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// parseStripeCsv - Parsing de CSV
// ═══════════════════════════════════════════════════════════════════

describe('parseStripeCsv', () => {
  it('should parse valid CSV with succeeded payments', () => {
    const csvContent = `id,Created date (UTC),Amount,Fee,Net,Status,Transfer,Customer Email,Amount Refunded
ch_123,2024-01-15 10:30:00,100.00,3.20,96.80,succeeded,po_abc,donor@example.com,0
ch_124,2024-01-15 11:00:00,50.00,1.75,48.25,succeeded,po_abc,another@example.com,0`;

    const result = parseStripeCsv(csvContent);

    assert.strictEqual(result.rows.length, 2);
    assert.strictEqual(result.warnings.length, 0);
    assert.strictEqual(result.rows[0].id, 'ch_123');
    assert.strictEqual(result.rows[0].amount, 100.00);
    assert.strictEqual(result.rows[0].fee, 3.20);
    assert.strictEqual(result.rows[0].customerEmail, 'donor@example.com');
    assert.strictEqual(result.rows[0].transfer, 'po_abc');
  });

  it('should exclude refunded payments and add warning', () => {
    const csvContent = `id,Created date (UTC),Amount,Fee,Net,Status,Transfer,Customer Email,Amount Refunded
ch_123,2024-01-15 10:30:00,100.00,3.20,96.80,succeeded,po_abc,donor@example.com,0
ch_124,2024-01-15 11:00:00,50.00,1.75,48.25,succeeded,po_abc,refund@example.com,50.00`;

    const result = parseStripeCsv(csvContent);

    assert.strictEqual(result.rows.length, 1);
    assert.strictEqual(result.warnings.length, 1);
    assert.strictEqual(result.warnings[0].code, 'WARN_REFUNDED');
    assert.strictEqual(result.warnings[0].count, 1);
    assert.strictEqual(result.warnings[0].amount, 50.00);
  });

  it('should handle CSV with only succeeded status', () => {
    const csvContent = `id,Created date (UTC),Amount,Fee,Net,Status,Transfer,Customer Email,Amount Refunded
ch_123,2024-01-15 10:30:00,100.00,3.20,96.80,succeeded,po_abc,donor@example.com,0`;

    const result = parseStripeCsv(csvContent);

    assert.strictEqual(result.rows.length, 1);
  });

  it('should throw error if no valid rows after filtering', () => {
    const csvContent = `id,Created date (UTC),Amount,Fee,Net,Status,Transfer,Customer Email,Amount Refunded
ch_123,2024-01-15 10:30:00,100.00,3.20,96.80,failed,po_abc,donor@example.com,0`;

    const result = parseStripeCsv(csvContent);

    // No valid rows (status=failed), should return empty array
    assert.strictEqual(result.rows.length, 0);
  });

  it('should convert date to YYYY-MM-DD format', () => {
    const csvContent = `id,Created date (UTC),Amount,Fee,Net,Status,Transfer,Customer Email,Amount Refunded
ch_123,2024-01-15 10:30:00,100.00,3.20,96.80,succeeded,po_abc,donor@example.com,0`;

    const result = parseStripeCsv(csvContent);

    assert.strictEqual(result.rows[0].createdDate, '2024-01-15');
  });
});

// ═══════════════════════════════════════════════════════════════════
// groupStripeRowsByTransfer - Agrupació per Transfer ID
// ═══════════════════════════════════════════════════════════════════

describe('groupStripeRowsByTransfer', () => {
  it('should group rows by transfer ID', () => {
    const rows: StripeRow[] = [
      {
        id: 'ch_1',
        createdDate: '2024-01-15',
        amount: 100,
        fee: 3,
        customerEmail: 'test@example.com',
        status: 'succeeded',
        transfer: 'po_abc',
        description: null,
      },
      {
        id: 'ch_2',
        createdDate: '2024-01-15',
        amount: 50,
        fee: 2,
        customerEmail: 'test2@example.com',
        status: 'succeeded',
        transfer: 'po_abc',
        description: null,
      },
      {
        id: 'ch_3',
        createdDate: '2024-01-16',
        amount: 200,
        fee: 5,
        customerEmail: 'test3@example.com',
        status: 'succeeded',
        transfer: 'po_xyz',
        description: null,
      },
    ];

    const groups = groupStripeRowsByTransfer(rows);

    assert.strictEqual(groups.length, 2);

    const groupAbc = groups.find(g => g.transferId === 'po_abc');
    const groupXyz = groups.find(g => g.transferId === 'po_xyz');

    assert.ok(groupAbc);
    assert.strictEqual(groupAbc.rows.length, 2);
    assert.strictEqual(groupAbc.gross, 150);
    assert.strictEqual(groupAbc.fees, 5);
    assert.strictEqual(groupAbc.net, 145);

    assert.ok(groupXyz);
    assert.strictEqual(groupXyz.rows.length, 1);
    assert.strictEqual(groupXyz.gross, 200);
    assert.strictEqual(groupXyz.fees, 5);
    assert.strictEqual(groupXyz.net, 195);
  });

  it('should throw error if row has empty transfer', () => {
    const rows: StripeRow[] = [
      {
        id: 'ch_1',
        createdDate: '2024-01-15',
        amount: 100,
        fee: 3,
        customerEmail: 'test@example.com',
        status: 'succeeded',
        transfer: '',
        description: null,
      },
    ];

    assert.throws(() => {
      groupStripeRowsByTransfer(rows);
    }, /ERR_NO_TRANSFER_VALUES/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// findAllMatchingPayoutGroups - Matching amb import bancari
// ═══════════════════════════════════════════════════════════════════

describe('findAllMatchingPayoutGroups', () => {
  it('should find matching payout group within tolerance', () => {
    const groups: StripePayoutGroup[] = [
      {
        transferId: 'po_abc',
        rows: [],
        gross: 100.00,
        fees: 3.50,
        net: 96.50,
      },
      {
        transferId: 'po_xyz',
        rows: [],
        gross: 200.00,
        fees: 7.00,
        net: 193.00,
      },
    ];

    const bankAmount = 96.51; // 1 cèntim de diferència (dins tolerància)
    const matches = findAllMatchingPayoutGroups(groups, bankAmount);

    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].transferId, 'po_abc');
  });

  it('should not match if difference exceeds tolerance', () => {
    const groups: StripePayoutGroup[] = [
      {
        transferId: 'po_abc',
        rows: [],
        gross: 100.00,
        fees: 3.50,
        net: 96.50,
      },
    ];

    const bankAmount = 96.53; // 3 cèntims de diferència (fora tolerància de 2¢)
    const matches = findAllMatchingPayoutGroups(groups, bankAmount);

    assert.strictEqual(matches.length, 0);
  });

  it('should find multiple matching groups if within tolerance', () => {
    const groups: StripePayoutGroup[] = [
      {
        transferId: 'po_abc',
        rows: [],
        gross: 100.00,
        fees: 3.50,
        net: 96.50,
      },
      {
        transferId: 'po_def',
        rows: [],
        gross: 95.00,
        fees: 1.50,
        net: 96.51, // Mateix net amb 1¢ diferència
      },
    ];

    const bankAmount = 96.50;
    const matches = findAllMatchingPayoutGroups(groups, bankAmount);

    assert.strictEqual(matches.length, 2);
  });

  it('should return empty array if no groups provided', () => {
    const matches = findAllMatchingPayoutGroups([], 100.00);
    assert.strictEqual(matches.length, 0);
  });

  it('should match with exact amount (zero tolerance)', () => {
    const groups: StripePayoutGroup[] = [
      {
        transferId: 'po_abc',
        rows: [],
        gross: 100.00,
        fees: 3.50,
        net: 96.50,
      },
    ];

    const bankAmount = 96.50;
    const matches = findAllMatchingPayoutGroups(groups, bankAmount);

    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].net, 96.50);
  });
});
