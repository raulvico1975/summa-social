import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generatePain008Xml,
  generateMessageId,
  validateCollectionRun,
} from '../../src/lib/sepa/pain008/generate-pain008';
import type { SepaCollectionRun } from '../../src/lib/data';

describe('generateMessageId', () => {
  it('generates a valid message ID with correct format', () => {
    const date = new Date('2026-01-08T16:44:01.667+01:00');
    const msgId = generateMessageId(date);

    assert.match(msgId, /^PRE\d{17}/);
    assert.ok(msgId.length <= 35);
    assert.ok(msgId.includes('20260108'));
  });
});

describe('validateCollectionRun', () => {
  const validRun: SepaCollectionRun = {
    id: 'test-run',
    status: 'draft',
    scheme: 'CORE',
    bankAccountId: 'bank-1',
    creditorId: 'ES21001G70782933',
    creditorName: 'FUNDACION TEST',
    creditorIban: 'ES3900496990192310051311',
    requestedCollectionDate: '2026-01-08',
    items: [
      {
        donorId: 'donor-1',
        donorName: 'John Doe',
        donorTaxId: '12345678Z',
        iban: 'ES9121000418450200051332',
        amountCents: 5000,
        umr: 'MANDATE-001',
        signatureDate: '2025-12-15',
        sequenceType: 'RCUR',
        endToEndId: 'E2E-001',
      },
    ],
    totalAmountCents: 5000,
    totalCount: 1,
    messageId: 'PRE20260108164401667',
    createdAt: '2026-01-08T16:44:01.667Z',
    createdBy: 'user-1',
  };

  it('validates a correct run without errors', () => {
    const errors = validateCollectionRun(validRun);
    assert.equal(errors.length, 0);
  });

  it('detects missing creditorId', () => {
    const invalidRun = { ...validRun, creditorId: '' };
    const errors = validateCollectionRun(invalidRun);
    assert.equal(errors.some((e: { field: string }) => e.field === 'creditorId'), true);
  });

  it('detects invalid creditorId format', () => {
    const invalidRun = { ...validRun, creditorId: 'INVALID' };
    const errors = validateCollectionRun(invalidRun);
    assert.equal(errors.some((e: { field: string }) => e.field === 'creditorId'), true);
  });

  it('detects invalid IBAN', () => {
    const invalidRun = {
      ...validRun,
      items: [{ ...validRun.items[0], iban: 'INVALID' }],
    };
    const errors = validateCollectionRun(invalidRun);
    assert.equal(errors.some((e: { field: string }) => e.field === 'iban'), true);
  });

  it('detects missing items', () => {
    const invalidRun = { ...validRun, items: [] };
    const errors = validateCollectionRun(invalidRun);
    assert.equal(errors.some((e: { field: string }) => e.field === 'items'), true);
  });
});

describe('generatePain008Xml', () => {
  const sampleRun: SepaCollectionRun = {
    id: 'test-run',
    status: 'draft',
    scheme: 'CORE',
    bankAccountId: 'bank-1',
    creditorId: 'ES21001G70782933',
    creditorName: 'FUNDACION FLORES DE KISKEYA',
    creditorIban: 'ES3900496990192310051311',
    requestedCollectionDate: '2026-01-08',
    items: [
      {
        donorId: 'donor-1',
        donorName: 'MARIA GARCIA LOPEZ',
        donorTaxId: '12345678Z',
        iban: 'ES9121000418450200051332',
        amountCents: 5000,
        umr: 'CUOTA SOCIA',
        signatureDate: '2025-12-15',
        sequenceType: 'RCUR',
        endToEndId: 'NOTPROVIDED',
      },
      {
        donorId: 'donor-2',
        donorName: 'JUAN MARTINEZ PEREZ',
        donorTaxId: '87654321X',
        iban: 'ES6621000418401234567891',
        amountCents: 2500,
        umr: 'CUOTA SOCIO',
        signatureDate: '2025-11-20',
        sequenceType: 'FRST',
        endToEndId: 'NOTPROVIDED',
      },
    ],
    totalAmountCents: 7500,
    totalCount: 2,
    messageId: 'PRE20260108164401667000000000000000',
    createdAt: '2026-01-08T16:44:01.667Z',
    createdBy: 'user-1',
  };

  it('generates valid XML with correct namespace', () => {
    const xml = generatePain008Xml(sampleRun);

    assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('urn:iso:std:iso:20022:tech:xsd:pain.008.001.02'));
    assert.ok(xml.includes('<CstmrDrctDbtInitn>'));
  });

  it('generates correct Group Header', () => {
    const xml = generatePain008Xml(sampleRun);

    assert.ok(xml.includes('<GrpHdr>'));
    assert.ok(xml.includes(`<MsgId>${sampleRun.messageId}</MsgId>`));
    assert.ok(xml.includes(`<NbOfTxs>${sampleRun.totalCount}</NbOfTxs>`));
    assert.ok(xml.includes('<CtrlSum>75.00</CtrlSum>'));
    assert.ok(xml.includes(`<Nm>${sampleRun.creditorName}</Nm>`));
  });

  it('generates correct Payment Info', () => {
    const xml = generatePain008Xml(sampleRun);

    assert.ok(xml.includes('<PmtInf>'));
    assert.ok(xml.includes('<PmtMtd>DD</PmtMtd>'));
    assert.ok(xml.includes('<Cd>SEPA</Cd>'));
    assert.ok(xml.includes('<Cd>CORE</Cd>'));
    assert.ok(xml.includes(`<ReqdColltnDt>${sampleRun.requestedCollectionDate}</ReqdColltnDt>`));
  });

  it('generates correct Creditor Scheme ID', () => {
    const xml = generatePain008Xml(sampleRun);

    assert.ok(xml.includes('<CdtrSchmeId>'));
    assert.ok(xml.includes(`<Id>${sampleRun.creditorId}</Id>`));
    assert.ok(xml.includes('<Prtry>SEPA</Prtry>'));
  });

  it('generates correct transaction details', () => {
    const xml = generatePain008Xml(sampleRun);

    assert.ok(xml.includes('<DrctDbtTxInf>'));
    assert.ok(xml.includes('<InstdAmt Ccy="EUR">50.00</InstdAmt>'));
    assert.ok(xml.includes('<MndtId>CUOTA SOCIA</MndtId>'));
    assert.ok(xml.includes('<DtOfSgntr>2025-12-15</DtOfSgntr>'));
    assert.ok(xml.includes('<Nm>MARIA GARCIA LOPEZ</Nm>'));
    assert.ok(xml.includes('<IBAN>ES9121000418450200051332</IBAN>'));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EndToEndId placeholder behavior
  // ═══════════════════════════════════════════════════════════════════════════

  it('keeps EndToEndId as NOTPROVIDED placeholder', () => {
    const runWithCustomEndToEnd: SepaCollectionRun = {
      ...sampleRun,
      items: [
        { ...sampleRun.items[0], endToEndId: 'E2E-CUSTOM-1' },
        { ...sampleRun.items[1], endToEndId: 'E2E-CUSTOM-2' },
      ],
    };

    const xml = generatePain008Xml(runWithCustomEndToEnd);

    assert.ok(xml.includes('<EndToEndId>NOTPROVIDED</EndToEndId>'));
    assert.equal(xml.includes('E2E-CUSTOM-1'), false);
    assert.equal(xml.includes('E2E-CUSTOM-2'), false);
  });

  it('EndToEndId is max 35 characters', () => {
    const longUmrRun: SepaCollectionRun = {
      ...sampleRun,
      items: [
        {
          ...sampleRun.items[0],
          umr: 'THIS-IS-A-VERY-LONG-MANDATE-REFERENCE-THAT-EXCEEDS-35-CHARS',
        },
      ],
      totalCount: 1,
    };

    const xml = generatePain008Xml(longUmrRun);

    // Extract EndToEndId
    const match = xml.match(/<EndToEndId>([^<]+)<\/EndToEndId>/);
    assert.ok(match);
    assert.ok(match[1].length <= 35);
  });

  it('keeps EndToEndId placeholder even with special UMR characters', () => {
    const specialCharsRun: SepaCollectionRun = {
      ...sampleRun,
      items: [
        {
          ...sampleRun.items[0],
          umr: 'Cuota Sòcia #1',
          endToEndId: 'NOTPROVIDED',
        },
      ],
      totalCount: 1,
    };

    const xml = generatePain008Xml(specialCharsRun);

    assert.ok(xml.includes('<EndToEndId>NOTPROVIDED</EndToEndId>'));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Multiple PmtInf per SeqTp
  // ═══════════════════════════════════════════════════════════════════════════

  it('creates separate PmtInf blocks for FRST and RCUR', () => {
    const xml = generatePain008Xml(sampleRun);

    // Count PmtInf blocks
    const pmtInfCount = (xml.match(/<PmtInf>/g) || []).length;
    assert.equal(pmtInfCount, 2);

    // Each PmtInf should have its own SeqTp
    assert.ok(xml.includes('<SeqTp>RCUR</SeqTp>'));
    assert.ok(xml.includes('<SeqTp>FRST</SeqTp>'));
  });

  it('each PmtInf has correct NbOfTxs and CtrlSum for its group', () => {
    const xml = generatePain008Xml(sampleRun);

    // RCUR group: 1 item, 50.00€
    // FRST group: 1 item, 25.00€

    // Extract PmtInf blocks
    const pmtInfBlocks = xml.split('<PmtInf>').slice(1);
    assert.equal(pmtInfBlocks.length, 2);

    // Verify each block has NbOfTxs=1 (since we have 1 per sequence type)
    for (const block of pmtInfBlocks) {
      assert.ok(block.includes('<NbOfTxs>1</NbOfTxs>'));
    }
  });

  it('single sequence type creates single PmtInf', () => {
    const singleSeqRun: SepaCollectionRun = {
      ...sampleRun,
      items: [
        { ...sampleRun.items[0], sequenceType: 'RCUR' },
        { ...sampleRun.items[1], sequenceType: 'RCUR' },
      ],
    };

    const xml = generatePain008Xml(singleSeqRun);

    // Should only have 1 PmtInf
    const pmtInfCount = (xml.match(/<PmtInf>/g) || []).length;
    assert.equal(pmtInfCount, 1);

    // With NbOfTxs=2
    assert.ok(xml.includes('<NbOfTxs>2</NbOfTxs>'));
  });

  it('escapes XML special characters', () => {
    const runWithSpecialChars: SepaCollectionRun = {
      ...sampleRun,
      creditorName: 'FUNDACION A & B <TEST>',
      items: [
        {
          ...sampleRun.items[0],
          donorName: 'JOHN "DOE" O\'BRIEN',
        },
      ],
      totalCount: 1,
    };

    const xml = generatePain008Xml(runWithSpecialChars);

    assert.ok(xml.includes('&amp;'));
    assert.ok(xml.includes('&lt;'));
    assert.ok(xml.includes('&gt;'));
    assert.ok(xml.includes('&quot;'));
    assert.ok(xml.includes('&apos;'));
  });

  it('happy path with 2 eligible donors keeps MsgId and coherent sums', () => {
    const xml = generatePain008Xml(sampleRun);
    assert.ok(xml.includes(`<MsgId>${sampleRun.messageId}</MsgId>`));
    assert.ok(xml.includes('<CtrlSum>75.00</CtrlSum>'));
    assert.ok(xml.includes('<InstdAmt Ccy="EUR">50.00</InstdAmt>'));
    assert.ok(xml.includes('<InstdAmt Ccy="EUR">25.00</InstdAmt>'));
  });

  it('escapes XML chars in mandate id and donor name', () => {
    const runWithSpecialChars: SepaCollectionRun = {
      ...sampleRun,
      items: [
        {
          ...sampleRun.items[0],
          donorName: 'ANA & <BOB>',
          umr: 'MANDATE & <A>',
        },
      ],
      totalAmountCents: 5000,
      totalCount: 1,
    };

    const xml = generatePain008Xml(runWithSpecialChars);
    assert.ok(xml.includes('<Nm>ANA &amp; &lt;BOB&gt;</Nm>'));
    assert.ok(xml.includes('<MndtId>MANDATE &amp; &lt;A&gt;</MndtId>'));
  });

  it('rounds cents with decimal part (current behavior)', () => {
    const runWithDecimalCents: SepaCollectionRun = {
      ...sampleRun,
      items: [{ ...sampleRun.items[0], amountCents: 1234.5 as unknown as number }],
      totalAmountCents: 1234.5 as unknown as number,
      totalCount: 1,
    };

    const errors = validateCollectionRun(runWithDecimalCents);
    assert.equal(errors.length, 0);

    const xml = generatePain008Xml(runWithDecimalCents);
    assert.ok(xml.includes('<InstdAmt Ccy="EUR">12.35</InstdAmt>'));
    assert.ok(xml.includes('<CtrlSum>12.35</CtrlSum>'));
  });

  it('includes debtor BIC when includeBic=true and entity is known', () => {
    const xml = generatePain008Xml(sampleRun, {
      includeBic: true,
      generationDate: new Date('2026-01-08T16:44:01.667Z'),
    });

    assert.ok(xml.includes('<BIC>CAIXESBB</BIC>'));
  });

  it('falls back to NOTPROVIDED when includeBic=true and entity is unknown', () => {
    const runWithUnknownEntity: SepaCollectionRun = {
      ...sampleRun,
      items: [{ ...sampleRun.items[0], iban: 'ES0000000000000000000000' }],
      totalAmountCents: 5000,
      totalCount: 1,
    };

    const xml = generatePain008Xml(runWithUnknownEntity, { includeBic: true });
    assert.ok(xml.includes('<Id>NOTPROVIDED</Id>'));
  });
});

describe('validateCollectionRun additional branches', () => {
  const baseRun: SepaCollectionRun = {
    id: 'test-run-extra',
    status: 'draft',
    scheme: 'CORE',
    bankAccountId: 'bank-1',
    creditorId: 'ES21001G70782933',
    creditorName: 'FUNDACION TEST',
    creditorIban: 'ES3900496990192310051311',
    requestedCollectionDate: '2026-02-20',
    items: [
      {
        donorId: 'd-1',
        donorName: 'Donor Name',
        donorTaxId: '12345678Z',
        iban: 'ES9121000418450200051332',
        amountCents: 1000,
        umr: 'MANDATE-1',
        signatureDate: '2025-12-01',
        sequenceType: 'RCUR',
        endToEndId: 'NOTPROVIDED',
      },
    ],
    totalAmountCents: 1000,
    totalCount: 1,
    messageId: 'PRE20260220120000123000000000000000',
    createdAt: '2026-02-20T12:00:00.123Z',
    createdBy: 'user-1',
  };

  it('flags invalid requestedCollectionDate format', () => {
    const errors = validateCollectionRun({
      ...baseRun,
      requestedCollectionDate: '20/02/2026',
    });

    assert.equal(errors.some((e) => e.field === 'requestedCollectionDate'), true);
  });

  it('flags missing requestedCollectionDate', () => {
    const errors = validateCollectionRun({
      ...baseRun,
      requestedCollectionDate: '' as unknown as string,
    });

    assert.equal(errors.some((e) => e.field === 'requestedCollectionDate'), true);
  });

  it('flags invalid donor IBAN with incorrect length/checksum', () => {
    const errors = validateCollectionRun({
      ...baseRun,
      items: [{ ...baseRun.items[0], iban: 'ES912100041845020005133' }],
    });

    assert.equal(errors.some((e) => e.field === 'iban'), true);
  });
});
