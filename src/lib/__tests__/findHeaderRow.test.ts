import { describe, it } from 'node:test';
import assert from 'node:assert';
import { findHeaderRow } from '../importers/bank/findHeaderRow';

describe('findHeaderRow', () => {
  it('detects header row at index 0 in a standard sheet', () => {
    const rows: unknown[][] = [
      ['Fecha', 'Concepto', 'Importe'],
      ['01/01/2025', 'Cuota socio', '-25,00'],
    ];

    const result = findHeaderRow(rows);

    assert.strictEqual(result.index, 0);
    assert.ok(result.score >= 4);
  });

  it('detects header row after decorative and empty rows', () => {
    const rows: unknown[][] = [
      ['Extracto bancario'],
      ['Periodo: 01/2025'],
      [],
      ['', '', ''],
      ['Cuenta: ES12....'],
      ['Fecha operación', 'Descripción', 'Importe', 'Saldo'],
      ['15/01/2025', 'Transferencia', '100,00', '1.000,00'],
    ];

    const result = findHeaderRow(rows);

    assert.strictEqual(result.index, 5);
    assert.ok(result.score >= 4);
  });

  it('detects header row with language variants and abbreviations', () => {
    const rows: unknown[][] = [
      ['Moviments'],
      ['F. ejecucion', 'Detall', 'Quantitat', 'Ref.'],
      ['16/01/2025', 'Pagament quota', '-30,00', 'A-001'],
    ];

    const result = findHeaderRow(rows);

    assert.strictEqual(result.index, 1);
    assert.ok(result.reasons.some((reason) => reason.includes('Matched categories')));
  });

  it('returns null when no confident header is found', () => {
    const rows: unknown[][] = [
      ['Extracte'],
      ['Compte', 'ES12...'],
      ['Moviments del període'],
      ['---', '---', '---'],
    ];

    const result = findHeaderRow(rows);

    assert.strictEqual(result.index, null);
    assert.strictEqual(result.score, 0);
  });
});
