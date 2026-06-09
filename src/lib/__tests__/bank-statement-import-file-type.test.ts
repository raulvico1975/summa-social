import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';

import { resolveBankStatementImportFileType } from '../importers/bank/import-file-type';
import { parseBankStatementRows } from '../importers/bank/bankStatementParser';

test('resolveBankStatementImportFileType routes CSV files to the CSV parser', () => {
  assert.equal(resolveBankStatementImportFileType('extracte.csv'), 'csv');
  assert.equal(resolveBankStatementImportFileType('EXTRACTE.CSV'), 'csv');
});

test('resolveBankStatementImportFileType routes XLSX and XLS files to the Excel parser', () => {
  assert.equal(resolveBankStatementImportFileType('extracte.xlsx'), 'excel');
  assert.equal(resolveBankStatementImportFileType('extracte.xls'), 'excel');
  assert.equal(resolveBankStatementImportFileType('EXTRACTE.XLSX'), 'excel');
  assert.equal(resolveBankStatementImportFileType('EXTRACTE.XLS'), 'excel');
});

test('resolveBankStatementImportFileType rejects unsupported formats', () => {
  assert.equal(resolveBankStatementImportFileType('extracte.pdf'), null);
  assert.equal(resolveBankStatementImportFileType('extracte.csv.pdf'), null);
});

test('SheetJS XLS workbook rows remain compatible with the bank statement parser', () => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Fecha operación', 'Concepto', 'Importe'],
    ['01/06/2026', 'Cuota socia', '10,00'],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracte');

  const xlsBuffer = XLSX.write(workbook, { bookType: 'xls', type: 'buffer' });
  const parsedWorkbook = XLSX.read(xlsBuffer, { type: 'buffer', cellDates: true });
  const parsedSheet = parsedWorkbook.Sheets[parsedWorkbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(parsedSheet, { header: 1, defval: '' });

  const parsed = parseBankStatementRows(rows);

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].operationDate, '2026-06-01');
  assert.equal(parsed.rows[0].description, 'Cuota socia');
  assert.equal(parsed.rows[0].amount, 10);
});
