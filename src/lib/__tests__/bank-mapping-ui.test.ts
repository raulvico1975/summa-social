import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BANK_MAPPING_FIELD_DEFINITIONS,
  buildBankMappingColumnOptions,
  buildBankMappingPreviewRows,
  getBankMappingColumnCount,
} from '../importers/bank/mapping-ui';

describe('bank-mapping-ui', () => {
  it('builds a preview limited to first 8 non-empty data rows', () => {
    const rows: unknown[][] = [
      ['Header A', 'Header B'],
      ['r1a', 'r1b'],
      ['r2a', 'r2b'],
      ['r3a', 'r3b'],
      ['r4a', 'r4b'],
      ['r5a', 'r5b'],
      ['r6a', 'r6b'],
      ['r7a', 'r7b'],
      ['r8a', 'r8b'],
      ['r9a', 'r9b'],
      ['', ''],
    ];

    const previewRows = buildBankMappingPreviewRows(rows, 0);
    assert.strictEqual(previewRows.length, 8);
    assert.deepStrictEqual(previewRows[0], ['r1a', 'r1b']);
    assert.deepStrictEqual(previewRows[7], ['r8a', 'r8b']);
  });

  it('builds column options with first non-empty sample per column', () => {
    const rows: unknown[][] = [
      ['Data', 'Concepte', 'Import', 'Saldo'],
      ['', '', '', ''],
      ['01/02/2026', 'Quota febrer', '-23,18', '1.000,00'],
      ['02/02/2026', 'Donació', '+300,00', '1.300,00'],
    ];

    const options = buildBankMappingColumnOptions(rows, 0, ['Data', 'Concepte', 'Import', 'Saldo']);
    assert.strictEqual(options.length, 4);
    assert.strictEqual(options[0].sample, '01/02/2026');
    assert.strictEqual(options[1].sample, 'Quota febrer');
    assert.strictEqual(options[2].sample, '-23,18');
    assert.strictEqual(options[3].sample, '1.000,00');
  });

  it('defines required and optional fields for bank statement mapping', () => {
    const byId = Object.fromEntries(BANK_MAPPING_FIELD_DEFINITIONS.map((field) => [field.id, field.required]));
    assert.strictEqual(byId.operationDate, true);
    assert.strictEqual(byId.description, true);
    assert.strictEqual(byId.amount, true);
    assert.strictEqual(byId.balanceAfter, false);
  });

  it('computes column count using the widest row in preview', () => {
    const columnCount = getBankMappingColumnCount(
      ['Data', 'Concepte'],
      [
        ['01/01/2026', 'Quota', 'EXTRA'],
        ['02/01/2026', 'Donació'],
      ]
    );

    assert.strictEqual(columnCount, 3);
  });
});
