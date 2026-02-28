import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  IBAN_LENGTHS_BY_COUNTRY,
  getIbanLengthIssue,
} from '../../src/lib/sepa/pain008/iban-length';

describe('IBAN_LENGTHS_BY_COUNTRY', () => {
  it('contains known SEPA country lengths', () => {
    assert.equal(IBAN_LENGTHS_BY_COUNTRY.ES, 24);
    assert.equal(IBAN_LENGTHS_BY_COUNTRY.FR, 27);
    assert.equal(IBAN_LENGTHS_BY_COUNTRY.DE, 22);
  });
});

describe('getIbanLengthIssue', () => {
  it('returns null for supported country with correct length', () => {
    const issue = getIbanLengthIssue('ES9121000418450200051332');
    assert.equal(issue, null);
  });

  it('returns issue for supported country with incorrect length', () => {
    const issue = getIbanLengthIssue('ES91210004184502000513');
    assert.deepEqual(issue, { country: 'ES', length: 22, expected: 24 });
  });

  it('returns null for unsupported country (current non-blocking behavior)', () => {
    const issue = getIbanLengthIssue('US1234567890123456789012');
    assert.equal(issue, null);
  });
});
