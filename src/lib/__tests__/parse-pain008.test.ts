import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { isPain008File, parsePain008 } from '../sepa/pain008/parse-pain008';

type FakeElement = {
  namespaceURI: string;
  textContent: string;
  children: FakeElement[];
  getElementsByTagName: (tagName: string) => FakeElement[];
  getElementsByTagNameNS: (_ns: string, tagName: string) => FakeElement[];
};

function element(tagName: string, textContent = '', children: FakeElement[] = []): FakeElement {
  const el: FakeElement = {
    namespaceURI: 'urn:iso:std:iso:20022:tech:xsd:pain.008.001.02',
    textContent,
    children,
    getElementsByTagName(name: string) {
      const out: FakeElement[] = [];
      const visit = (node: FakeElement) => {
        for (const child of node.children) {
          if ((child as unknown as { tagName?: string }).tagName === name) {
            out.push(child);
          }
          visit(child);
        }
      };
      visit(el);
      return out;
    },
    getElementsByTagNameNS(_ns: string, name: string) {
      return this.getElementsByTagName(name);
    },
  };

  (el as unknown as { tagName: string }).tagName = tagName;
  return el;
}

function docFromRoot(root: FakeElement, parserError?: string) {
  return {
    documentElement: root,
    querySelector(selector: string) {
      if (selector !== 'parsererror' || !parserError) return null;
      return { textContent: parserError };
    },
  };
}

function buildValidRoot(withMismatch = false): FakeElement {
  const grpHdr = element('GrpHdr', '', [
    element('MsgId', 'PRE202604150001'),
    element('NbOfTxs', withMismatch ? '3' : '2'),
    element('CtrlSum', withMismatch ? '80.00' : '30.50'),
    element('InitgPty', '', [
      element('Nm', 'Associacio Test'),
      element('Id', '', [
        element('OrgId', '', [
          element('Othr', '', [
            element('Id', 'ES21001G70782933'),
          ]),
        ]),
      ]),
    ]),
  ]);

  const tx1 = element('DrctDbtTxInf', '', [
    element('PmtId', '', [element('EndToEndId', 'NOTPROVIDED')]),
    element('InstdAmt', '10.20'),
    element('DrctDbtTx', '', [
      element('MndtRltdInf', '', [
        element('MndtId', 'MANDATE-001'),
        element('DtOfSgntr', '2024-01-15'),
      ]),
    ]),
    element('Dbtr', '', [element('Nm', 'Donant U')]),
    element('DbtrAcct', '', [element('IBAN', 'es91 2100 0418 4502 0005 1332')]),
    element('RmtInf', '', [element('Ustrd', 'Quota abril')]),
  ]);

  const tx2 = element('DrctDbtTxInf', '', [
    element('PmtId', '', [element('EndToEndId', 'E2E-002')]),
    element('InstdAmt', '20.30'),
    element('DrctDbtTx', '', [
      element('MndtRltdInf', '', [
        element('MndtId', 'MANDATE-002'),
        element('DtOfSgntr', '2024-02-20'),
      ]),
    ]),
    element('Dbtr', '', [element('Nm', 'Donant Dos')]),
    element('DbtrAcct', '', [element('IBAN', 'ES66 2100 0418 4012 3456 7891')]),
    element('RmtInf', '', [element('Ustrd', 'Quota abril')]),
  ]);

  const pmtInf = element('PmtInf', '', [
    element('ReqdColltnDt', '2026-04-20'),
    element('PmtTpInf', '', [element('SeqTp', 'RCUR')]),
    element('CdtrAcct', '', [element('IBAN', 'ES3900496990192310051311')]),
    tx1,
    tx2,
  ]);

  return element('Document', '', [
    element('CstmrDrctDbtInitn', '', [grpHdr, pmtInf]),
  ]);
}

const OriginalDOMParser = (globalThis as unknown as { DOMParser?: unknown }).DOMParser;

class FakeDOMParser {
  parseFromString(xml: string) {
    if (xml.includes('__PARSER_ERROR__')) {
      return docFromRoot(buildValidRoot(false), 'XML mal format');
    }

    if (xml.includes('__MISMATCH__')) {
      return docFromRoot(buildValidRoot(true));
    }

    return docFromRoot(buildValidRoot(false));
  }
}

before(() => {
  (globalThis as unknown as { DOMParser: unknown }).DOMParser = FakeDOMParser;
});

after(() => {
  if (OriginalDOMParser === undefined) {
    delete (globalThis as unknown as { DOMParser?: unknown }).DOMParser;
    return;
  }

  (globalThis as unknown as { DOMParser: unknown }).DOMParser = OriginalDOMParser;
});

describe('isPain008File', () => {
  it('detects valid pain.008 hints', () => {
    assert.equal(isPain008File('<Document>pain.008.001.02</Document>'), true);
    assert.equal(isPain008File('<PmtMtd>DD</PmtMtd><DrctDbtTxInf/>'), true);
  });

  it('returns false for unrelated content', () => {
    assert.equal(isPain008File('hello world'), false);
  });
});

describe('parsePain008', () => {
  it('parses valid XML into coherent structure', () => {
    const parsed = parsePain008('__VALID__');

    assert.equal(parsed.transactionCount, 2);
    assert.equal(parsed.totalAmount, 30.5);
    assert.equal(parsed.messageId, 'PRE202604150001');
    assert.equal(parsed.creditorName, 'Associacio Test');
    assert.equal(parsed.creditorId, 'ES21001G70782933');
    assert.equal(parsed.creditorIban, 'ES3900496990192310051311');
    assert.equal(parsed.collectionDate, '2026-04-20');
    assert.equal(parsed.collections[0].debtorIban, 'ES9121000418450200051332');
    assert.equal(parsed.collections[0].sequenceType, 'RCUR');
    assert.equal(parsed.collections[0].mandateId, 'MANDATE-001');
    assert.equal(parsed.collections[1].endToEndId, 'E2E-002');
    assert.equal(parsed.warnings.length, 0);
  });

  it('throws controlled error on parsererror', () => {
    assert.throws(() => parsePain008('__PARSER_ERROR__'), /Error parsejant XML/);
  });

  it('adds warnings when CtrlSum or NbOfTxs mismatch header', () => {
    const parsed = parsePain008('__MISMATCH__');
    assert.equal(parsed.warnings.length >= 1, true);
    assert.equal(parsed.warnings.some((warning) => warning.includes('no coincideix')), true);
  });
});
