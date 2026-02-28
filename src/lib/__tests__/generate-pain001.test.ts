import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  downloadPain001,
  generatePain001,
  validatePain001Params,
  type Pain001GenerateParams,
} from '../sepa/generate-pain001';

function validParams(): Pain001GenerateParams {
  return {
    debtorName: 'Associacio Test',
    debtorIban: 'ES3900496990192310051311',
    executionDate: '2026-03-10',
    messageId: 'MSG-001',
    payments: [
      {
        amount: 12.34,
        creditorName: 'Creditor One',
        creditorIban: 'ES9121000418450200051332',
        concept: 'Quota març',
      },
    ],
  };
}

describe('validatePain001Params', () => {
  it('returns no errors for valid params', () => {
    const errors = validatePain001Params(validParams());
    assert.equal(errors.length, 0);
  });

  it('detects invalid debtor IBAN and missing payments', () => {
    const errors = validatePain001Params({
      ...validParams(),
      debtorIban: 'INVALID',
      payments: [],
    });

    assert.equal(errors.some((e) => e.field === 'debtorIban'), true);
    assert.equal(errors.some((e) => e.field === 'payments'), true);
  });

  it('rejects amounts with more than 2 decimals', () => {
    const errors = validatePain001Params({
      ...validParams(),
      payments: [
        {
          amount: 10.123,
          creditorName: 'Creditor',
          creditorIban: 'ES6621000418401234567891',
        },
      ],
    });

    assert.equal(errors.some((e) => e.field === 'payments[0].amount'), true);
  });
});

describe('generatePain001', () => {
  it('generates non-empty XML for valid params', () => {
    const xml = generatePain001(validParams());
    assert.equal(typeof xml, 'string');
    assert.ok(xml.length > 0);
    assert.ok(xml.includes('pain.001.001.03'));
    assert.ok(xml.includes('<MsgId>MSG-001</MsgId>'));
  });

  it('throws on invalid params', () => {
    assert.throws(
      () => generatePain001({ ...validParams(), debtorIban: 'INVALID' }),
      /Errors de validació:/,
    );
  });

  it('keeps decimal behavior for valid 2-decimal amounts and escapes XML', () => {
    const xml = generatePain001({
      ...validParams(),
      debtorName: 'Assoc & <Test>',
      payments: [
        {
          amount: 10.1,
          creditorName: 'Creditor & <One>',
          creditorIban: 'ES6621000418401234567891',
          concept: 'A & B <C>',
          endToEndId: 'E2E&<1>',
        },
      ],
    });

    assert.ok(xml.includes('<InstdAmt Ccy="EUR">10.10</InstdAmt>'));
    assert.ok(xml.includes('Assoc &amp; &lt;Test&gt;'));
    assert.ok(xml.includes('Creditor &amp; &lt;One&gt;'));
    assert.ok(xml.includes('A &amp; B &lt;C&gt;'));
    assert.ok(xml.includes('E2E&amp;&lt;1&gt;'));
  });
});

describe('downloadPain001', () => {
  it('is browser-oriented and throws in node without document', () => {
    assert.equal(typeof downloadPain001, 'function');
    assert.throws(() => downloadPain001(validParams()), /document|createElement/i);
  });
});
