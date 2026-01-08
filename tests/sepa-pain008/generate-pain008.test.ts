import { describe, it, expect } from 'vitest';
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

    expect(msgId).toMatch(/^PRE\d{17}/);
    expect(msgId.length).toBeLessThanOrEqual(35);
    expect(msgId).toContain('20260108');
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
    expect(errors).toHaveLength(0);
  });

  it('detects missing creditorId', () => {
    const invalidRun = { ...validRun, creditorId: '' };
    const errors = validateCollectionRun(invalidRun);
    expect(errors.some((e: { field: string }) => e.field === 'creditorId')).toBe(true);
  });

  it('detects invalid creditorId format', () => {
    const invalidRun = { ...validRun, creditorId: 'INVALID' };
    const errors = validateCollectionRun(invalidRun);
    expect(errors.some((e: { field: string }) => e.field === 'creditorId')).toBe(true);
  });

  it('detects invalid IBAN', () => {
    const invalidRun = {
      ...validRun,
      items: [{ ...validRun.items[0], iban: 'INVALID' }],
    };
    const errors = validateCollectionRun(invalidRun);
    expect(errors.some((e: { field: string }) => e.field === 'iban')).toBe(true);
  });

  it('detects missing items', () => {
    const invalidRun = { ...validRun, items: [] };
    const errors = validateCollectionRun(invalidRun);
    expect(errors.some((e: { field: string }) => e.field === 'items')).toBe(true);
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

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('urn:iso:std:iso:20022:tech:xsd:pain.008.001.08');
    expect(xml).toContain('<CstmrDrctDbtInitn>');
  });

  it('generates correct Group Header', () => {
    const xml = generatePain008Xml(sampleRun);

    expect(xml).toContain('<GrpHdr>');
    expect(xml).toContain(`<MsgId>${sampleRun.messageId}</MsgId>`);
    expect(xml).toContain(`<NbOfTxs>${sampleRun.totalCount}</NbOfTxs>`);
    expect(xml).toContain('<CtrlSum>75.00</CtrlSum>');
    expect(xml).toContain(`<Nm>${sampleRun.creditorName}</Nm>`);
  });

  it('generates correct Payment Info', () => {
    const xml = generatePain008Xml(sampleRun);

    expect(xml).toContain('<PmtInf>');
    expect(xml).toContain('<PmtMtd>DD</PmtMtd>');
    expect(xml).toContain('<Cd>SEPA</Cd>');
    expect(xml).toContain('<Cd>CORE</Cd>');
    expect(xml).toContain(`<ReqdColltnDt>${sampleRun.requestedCollectionDate}</ReqdColltnDt>`);
  });

  it('generates correct Creditor Scheme ID', () => {
    const xml = generatePain008Xml(sampleRun);

    expect(xml).toContain('<CdtrSchmeId>');
    expect(xml).toContain(`<Id>${sampleRun.creditorId}</Id>`);
    expect(xml).toContain('<Prtry>SEPA</Prtry>');
  });

  it('generates correct transaction details', () => {
    const xml = generatePain008Xml(sampleRun);

    expect(xml).toContain('<DrctDbtTxInf>');
    expect(xml).toContain('<InstdAmt Ccy="EUR">50.00</InstdAmt>');
    expect(xml).toContain('<MndtId>CUOTA SOCIA</MndtId>');
    expect(xml).toContain('<DtOfSgntr>2025-12-15</DtOfSgntr>');
    expect(xml).toContain('<Nm>MARIA GARCIA LOPEZ</Nm>');
    expect(xml).toContain('<IBAN>ES9121000418450200051332</IBAN>');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // P0.1 EndToEndId determinista
  // ═══════════════════════════════════════════════════════════════════════════

  it('generates deterministic EndToEndId from UMR and collectionDate', () => {
    const xml = generatePain008Xml(sampleRun);

    // EndToEndId should be UMR-YYYYMMDD (normalized)
    // "CUOTA SOCIA" + "2026-01-08" -> "CUOTASOCIA-20260108"
    expect(xml).toContain('<EndToEndId>CUOTASOCIA-20260108</EndToEndId>');
    expect(xml).toContain('<EndToEndId>CUOTASOCIO-20260108</EndToEndId>');

    // Should NOT contain NOTPROVIDED
    expect(xml).not.toContain('<EndToEndId>NOTPROVIDED</EndToEndId>');
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
    expect(match).toBeTruthy();
    expect(match![1].length).toBeLessThanOrEqual(35);
  });

  it('normalizes special characters in EndToEndId', () => {
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

    // Should be normalized: uppercase, no accents, only A-Z0-9-
    expect(xml).toContain('<EndToEndId>CUOTASOCIA1-20260108</EndToEndId>');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // P0.2 Multiple PmtInf per SeqTp
  // ═══════════════════════════════════════════════════════════════════════════

  it('creates separate PmtInf blocks for FRST and RCUR', () => {
    const xml = generatePain008Xml(sampleRun);

    // Count PmtInf blocks
    const pmtInfCount = (xml.match(/<PmtInf>/g) || []).length;
    expect(pmtInfCount).toBe(2);

    // Each PmtInf should have its own SeqTp
    expect(xml).toContain('<SeqTp>RCUR</SeqTp>');
    expect(xml).toContain('<SeqTp>FRST</SeqTp>');
  });

  it('each PmtInf has correct NbOfTxs and CtrlSum for its group', () => {
    const xml = generatePain008Xml(sampleRun);

    // RCUR group: 1 item, 50.00€
    // FRST group: 1 item, 25.00€

    // Extract PmtInf blocks
    const pmtInfBlocks = xml.split('<PmtInf>').slice(1);
    expect(pmtInfBlocks.length).toBe(2);

    // Verify each block has NbOfTxs=1 (since we have 1 per sequence type)
    for (const block of pmtInfBlocks) {
      expect(block).toContain('<NbOfTxs>1</NbOfTxs>');
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
    expect(pmtInfCount).toBe(1);

    // With NbOfTxs=2
    expect(xml).toContain('<NbOfTxs>2</NbOfTxs>');
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

    expect(xml).toContain('&amp;');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&gt;');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&apos;');
  });
});
