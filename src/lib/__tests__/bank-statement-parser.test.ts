import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BankStatementParseError,
  parseBankStatementRows,
  parseDateToIsoDate,
  parseSignedNumber,
  shouldOpenManualMapping,
} from '../importers/bank/bankStatementParser';

describe('bank-statement-parser', () => {
  it('keeps date-only value stable for timezone-sensitive inputs', () => {
    assert.strictEqual(parseDateToIsoDate('01/01/2025'), '2025-01-01');
    assert.strictEqual(parseDateToIsoDate('31/12/2025'), '2025-12-31');
    assert.strictEqual(parseDateToIsoDate('2025-01-01'), '2025-01-01');
    assert.strictEqual(parseDateToIsoDate(new Date(2025, 0, 1)), '2025-01-01');
    assert.strictEqual(parseDateToIsoDate(45658), '2025-01-01');
  });

  it('parses signed numbers in EU and EN formats', () => {
    assert.strictEqual(parseSignedNumber('+300'), 300);
    assert.strictEqual(parseSignedNumber('-300'), -300);
    assert.strictEqual(parseSignedNumber('-23,18'), -23.18);
    assert.strictEqual(parseSignedNumber('1.234,56'), 1234.56);
    assert.strictEqual(parseSignedNumber('-158.33'), -158.33);
  });

  it('parses Sabadell/Baruma-style preamble and header', () => {
    const rows: unknown[][] = [
      ['Consulta de moviments'],
      ['Compte: ES12...'],
      ['Data: 01/2025'],
      [],
      ['---'],
      ['Document generat'],
      ['Pàgina 1'],
      [''],
      ['D. Operativa', 'Concepte', 'D. Valor', 'Import', 'Saldo', 'Referència 1', 'Referència 2'],
      ['01/01/2025', 'Quota gener', '01/01/2025', '-23,18', '1.234,56', '', ''],
      ['02/01/2025', 'Donació puntual', '02/01/2025', '+300', '1.534,56', '', ''],
    ];

    const result = parseBankStatementRows(rows);

    assert.strictEqual(result.headerRowIndex, 8);
    assert.strictEqual(result.rows.length, 2);
    assert.strictEqual(result.rows[0].operationDate, '2025-01-01');
    assert.strictEqual(result.rows[0].date, '2025-01-01');
    assert.strictEqual(result.rows[0].amount, -23.18);
    assert.strictEqual(result.rows[0].balanceAfter, 1234.56);
    assert.strictEqual(result.rows[1].amount, 300);
    assert.strictEqual(shouldOpenManualMapping(result), false);
  });

  it('derives operationDate from valueDate when operation column is missing', () => {
    const rows: unknown[][] = [
      ['Resumen'],
      ['F. VALOR', 'DESCRIPCIÓN', 'IMPORTE (€)', 'SALDO (€)'],
      ['03/02/2026', 'Quota febrer', '-158.33', '900,00'],
    ];

    const result = parseBankStatementRows(rows);

    assert.strictEqual(result.headerRowIndex, 1);
    assert.strictEqual(result.rows.length, 1);
    assert.strictEqual(result.rows[0].valueDate, '2026-02-03');
    assert.strictEqual(result.rows[0].operationDate, '2026-02-03');
    assert.strictEqual(result.rows[0].amount, -158.33);
    assert.strictEqual(result.riskSignals.operationDateDerived, true);
    assert.strictEqual(shouldOpenManualMapping(result), true);
  });

  it('parses CaixaBank-style header with mixed amount formats', () => {
    const rows: unknown[][] = [
      ['Extracto'],
      ['Fecha', 'Concepto', 'Importe', 'Saldo'],
      ['05/01/2025', 'Transferencia recibida', '1.234,56', '2.000,00'],
      ['06/01/2025', 'Comisión', '-23,18', '1.976,82'],
      ['07/01/2025', 'Cargo tarjeta', '-158.33', '1.818,49'],
    ];

    const result = parseBankStatementRows(rows);

    assert.strictEqual(result.rows.length, 3);
    assert.strictEqual(result.rows[0].amount, 1234.56);
    assert.strictEqual(result.rows[1].amount, -23.18);
    assert.strictEqual(result.rows[2].amount, -158.33);
  });

  it('uses Debe/Haber fallback when Importe is not available', () => {
    const rows: unknown[][] = [
      ['Informe'],
      ['Fecha', 'Concepto', 'Debe', 'Haber', 'Saldo'],
      ['08/01/2025', 'Pagament proveïdor', '120,50', '', '500,00'],
      ['09/01/2025', 'Quota rebuda', '', '45,00', '545,00'],
    ];

    const result = parseBankStatementRows(rows);

    assert.strictEqual(result.rows.length, 2);
    assert.strictEqual(result.rows[0].amount, -120.5);
    assert.strictEqual(result.rows[1].amount, 45);
    assert.strictEqual(result.riskSignals.hasDebitCredit, true);
    assert.strictEqual(shouldOpenManualMapping(result), true);
  });

  it('prefers Importe over Debe/Haber when both are present', () => {
    const rows: unknown[][] = [
      ['Fecha', 'Concepto', 'Importe', 'Debe', 'Haber'],
      ['10/01/2025', 'Ajust', '12,00', '999,00', '0,00'],
    ];

    const result = parseBankStatementRows(rows);

    assert.strictEqual(result.rows.length, 1);
    assert.strictEqual(result.rows[0].amount, 12);
  });

  it('throws a blocking error when operation date cannot be derived', () => {
    const rows: unknown[][] = [
      ['Fecha', 'Concepto', 'Importe'],
      ['', 'Quota', '-10,00'],
    ];

    assert.throws(
      () => parseBankStatementRows(rows),
      (error: unknown) => {
        return error instanceof BankStatementParseError && error.code === 'OPERATION_DATE_REQUIRED';
      }
    );
  });
});
