import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as sepa from '../sepa';
import * as pain008 from '../sepa/pain008';

describe('sepa index exports', () => {
  it('exports pain.001 helpers from root sepa index', () => {
    assert.equal(typeof sepa.generatePain001, 'function');
    assert.equal(typeof sepa.parsePain001, 'function');
    assert.equal(typeof sepa.validatePain001Params, 'function');
    assert.equal(typeof sepa.isPain001File, 'function');
    assert.equal(typeof sepa.downloadPain001, 'function');
  });

  it('exports pain.008 helpers from pain008 index', () => {
    assert.equal(typeof pain008.generatePain008Xml, 'function');
    assert.equal(typeof pain008.generateMessageId, 'function');
    assert.equal(typeof pain008.validateCollectionRun, 'function');
    assert.equal(typeof pain008.determineSequenceType, 'function');
    assert.equal(typeof pain008.isEligibleForSepaCollection, 'function');
    assert.equal(typeof pain008.filterEligibleDonors, 'function');
    assert.equal(typeof pain008.getIbanLengthIssue, 'function');
    assert.equal(typeof pain008.computeDonorCollectionStatus, 'function');
  });
});
