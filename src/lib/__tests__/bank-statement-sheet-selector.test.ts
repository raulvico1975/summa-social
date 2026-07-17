import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BankStatementParseError } from '../importers/bank/bankStatementParser';
import {
  EmptyBankStatementWorkbookError,
  selectBankStatementSheet,
} from '../importers/bank/selectBankStatementSheet';

const bankRows = (description: string, amount = '10,00'): unknown[][] => [
  ['Data', 'Concepte', 'Import', 'Saldo'],
  ['01/07/2026', description, amount, '110,00'],
];

describe('bank-statement-sheet-selector', () => {
  it('selects Control caixa when an empty helper sheet comes first', () => {
    const selected = selectBankStatementSheet([
      { name: 'Importació Summa', rows: [] },
      {
        name: 'Control caixa',
        rows: [
          ['Data', 'Concepte', 'Import', 'Saldo', 'Importar?'],
          ['01/07/2026', 'No seleccionat', '10,00', '110,00', 'No'],
          ['02/07/2026', 'Donació Dolors Cabot', '15,00', '125,00', 'Sí'],
        ],
      },
      { name: 'Validació interna', rows: [['Comprovació'], ['Correcte']] },
    ]);

    assert.strictEqual(selected.name, 'Control caixa');
    assert.strictEqual(selected.parsed.rows.length, 1);
    assert.strictEqual(selected.parsed.rows[0].description, 'Donació Dolors Cabot');
    assert.strictEqual(selected.parsed.rows[0].amount, 15);
  });

  it('keeps a normal single-sheet bank statement working', () => {
    const selected = selectBankStatementSheet([
      { name: 'Extracte juliol', rows: bankRows('Quota juliol') },
    ]);

    assert.strictEqual(selected.name, 'Extracte juliol');
    assert.strictEqual(selected.parsed.rows[0].description, 'Quota juliol');
  });

  it('prefers a normalized Control caixa name over another valid sheet', () => {
    const selected = selectBankStatementSheet([
      { name: 'Extracte', rows: bankRows('Moviment bancari') },
      { name: '  CONTRÓL   CAIXA  ', rows: bankRows('Moviment de caixa', '20,00') },
    ]);

    assert.strictEqual(selected.name, 'CONTRÓL   CAIXA');
    assert.strictEqual(selected.parsed.rows[0].description, 'Moviment de caixa');
  });

  it('falls back to the first valid sheet when Control caixa is absent', () => {
    const selected = selectBankStatementSheet([
      { name: 'Primer', rows: bankRows('Primer moviment') },
      { name: 'Segon', rows: bankRows('Segon moviment') },
    ]);

    assert.strictEqual(selected.name, 'Primer');
    assert.strictEqual(selected.parsed.rows.length, 1);
  });

  it('does not treat headers without importable movements as a valid sheet', () => {
    assert.throws(
      () => selectBankStatementSheet([
        {
          name: 'Control caixa',
          rows: [
            ['Data', 'Concepte', 'Import', 'Saldo', 'Importar?'],
            ['01/07/2026', 'No seleccionat', '10,00', '110,00', 'No'],
          ],
        },
      ]),
      (error: unknown) => error instanceof BankStatementParseError && error.code === 'NO_VALID_TRANSACTIONS'
    );
  });

  it('distinguishes a completely empty workbook', () => {
    assert.throws(
      () => selectBankStatementSheet([
        { name: 'Buit', rows: [[], ['', null, undefined]] },
      ]),
      EmptyBankStatementWorkbookError
    );
  });

  it('returns the relevant parser error when no sheet is valid', () => {
    assert.throws(
      () => selectBankStatementSheet([
        { name: 'Notes', rows: [['Text sense capçalera'], ['Cap moviment']] },
      ]),
      (error: unknown) => error instanceof BankStatementParseError && error.code === 'HEADER_NOT_FOUND'
    );
  });
});
