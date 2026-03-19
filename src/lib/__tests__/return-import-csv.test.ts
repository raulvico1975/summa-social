import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeReturnCsvBuffer,
  findReturnColumnByHeader,
  normalizeReturnHeader,
  parseReturnCsvBuffer,
} from '../returns/import-csv';

describe('return-import-csv', () => {
  it('parses Latin-1 CSV files with semicolon delimiter and quoted fields without shifting columns', () => {
    const csv = [
      '"Cuenta de adeudo";"Importe";"Fecha liquidación";"Nº referència externa";"Motivo devolución";"Nombre cliente"',
      '"ES7620770024003102575766";"25,50";"15/03/2026";"12345678Z";"AC01 - Compte tancat; client absent";"Fundació Març"',
    ].join('\r\n');

    const buffer = Uint8Array.from(Buffer.from(csv, 'latin1')).buffer;
    const parsed = parseReturnCsvBuffer(buffer);

    assert.strictEqual(parsed.encoding, 'iso-8859-1');
    assert.strictEqual(parsed.delimiter, ';');
    assert.deepStrictEqual(parsed.rows[0], [
      'Cuenta de adeudo',
      'Importe',
      'Fecha liquidación',
      'Nº referència externa',
      'Motivo devolución',
      'Nombre cliente',
    ]);
    assert.strictEqual(parsed.rows[1].length, 6);
    assert.strictEqual(parsed.rows[1][1], '25,50');
    assert.strictEqual(parsed.rows[1][4], 'AC01 - Compte tancat; client absent');
  });

  it('normalizes headers before matching accents and numero variants', () => {
    assert.strictEqual(normalizeReturnHeader('  Nº referència externa  '), 'numero referencia externa');
    assert.strictEqual(normalizeReturnHeader('No liquidación'), 'numero liquidacion');
    assert.strictEqual(normalizeReturnHeader('Nº de recibo'), 'numero de recibo');
    assert.strictEqual(normalizeReturnHeader('No de recibo'), 'numero de recibo');
    assert.strictEqual(normalizeReturnHeader('Num recibo'), 'numero recibo');
    assert.strictEqual(normalizeReturnHeader('Motivo devolución'), 'motivo devolucion');
    assert.strictEqual(normalizeReturnHeader('Motiu devolució'), 'motiu devolucio');
  });

  it('matches headers conservatively after normalization', () => {
    const headers = [
      'Cuenta de adeudo',
      'Importe',
      'Fecha liquidación',
      'Nº referència externa',
      'Motivo devolución',
    ];

    assert.strictEqual(findReturnColumnByHeader(headers, ['cuenta de adeudo', 'iban']), 0);
    assert.strictEqual(findReturnColumnByHeader(headers, ['importe']), 1);
    assert.strictEqual(findReturnColumnByHeader(headers, ['fecha de liquidacion', 'fecha liquidacion']), 2);
    assert.strictEqual(findReturnColumnByHeader(headers, ['referencia externa']), 3);
    assert.strictEqual(findReturnColumnByHeader(headers, ['motivo devolucion']), 4);
  });

  it('keeps UTF-8 when the bytes are valid and fit the expected headers better than Latin-1', () => {
    const csv = [
      '"Cuenta de adeudo";"Importe";"Motiu devolució"',
      '"ES7620770024003102575766";"25,50";"Retornació vàlida"',
    ].join('\n');

    const decoded = decodeReturnCsvBuffer(Uint8Array.from(Buffer.from(csv, 'utf8')).buffer);

    assert.strictEqual(decoded.encoding, 'utf-8');
    assert.match(decoded.text, /Motiu devolució/);
  });
});
