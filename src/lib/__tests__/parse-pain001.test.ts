import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { isPain001File, parsePain001 } from '../sepa/parse-pain001';

type FakeElement = {
  namespaceURI: string;
  textContent: string;
  children: FakeElement[];
  getElementsByTagName: (tagName: string) => FakeElement[];
  getElementsByTagNameNS: (_ns: string, tagName: string) => FakeElement[];
};

function element(tagName: string, textContent = '', children: FakeElement[] = []): FakeElement {
  const el: FakeElement = {
    namespaceURI: 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.03',
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
    element('NbOfTxs', withMismatch ? '3' : '2'),
    element('CtrlSum', withMismatch ? '99.99' : '30.50'),
  ]);

  const tx1 = element('CdtTrfTxInf', '', [
    element('Amt', '', [element('InstdAmt', '10.20')]),
    element('Cdtr', '', [element('Nm', 'Creditor One')]),
    element('CdtrAcct', '', [element('IBAN', 'es91 2100 0418 4502 0005 1332')]),
    element('RmtInf', '', [element('Ustrd', 'Concepte 1')]),
    element('PmtId', '', [element('EndToEndId', 'E2E-1')]),
  ]);

  const tx2 = element('CdtTrfTxInf', '', [
    element('Amt', '', [element('InstdAmt', '20.30')]),
    element('Cdtr', '', [element('Nm', 'Creditor Two')]),
    element('CdtrAcct', '', [element('IBAN', 'ES66 2100 0418 4012 3456 7891')]),
    element('RmtInf', '', [element('Ustrd', '')]),
    element('PmtId', '', [element('EndToEndId', 'E2E-2')]),
  ]);

  const pmtInf = element('PmtInf', '', [
    element('ReqdExctnDt', '2026-03-10'),
    element('Dbtr', '', [element('Nm', 'Associacio Test')]),
    element('DbtrAcct', '', [element('IBAN', 'ES3900496990192310051311')]),
    tx1,
    tx2,
  ]);

  return element('Document', '', [grpHdr, pmtInf]);
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

describe('isPain001File', () => {
  it('detects valid pain.001 hints', () => {
    assert.equal(isPain001File('<Document>pain.001.001.03</Document>'), true);
    assert.equal(isPain001File('<PmtInf><CdtTrfTxInf/></PmtInf>'), true);
  });

  it('returns false for unrelated content', () => {
    assert.equal(isPain001File('hello world'), false);
  });
});

describe('parsePain001', () => {
  it('parses valid XML into coherent structure', () => {
    const parsed = parsePain001('__VALID__');

    assert.equal(parsed.transactionCount, 2);
    assert.equal(parsed.totalAmount, 30.5);
    assert.equal(parsed.debtorName, 'Associacio Test');
    assert.equal(parsed.debtorIban, 'ES3900496990192310051311');
    assert.equal(parsed.executionDate, '2026-03-10');
    assert.equal(parsed.payments[0].creditorIban, 'ES9121000418450200051332');
    assert.equal(parsed.payments[1].concept, 'E2E-2');
    assert.equal(parsed.warnings.length, 0);
  });

  it('throws controlled error on parsererror', () => {
    assert.throws(() => parsePain001('__PARSER_ERROR__'), /Error parsejant XML/);
  });

  it('adds warnings when CtrlSum or NbOfTxs mismatch header', () => {
    const parsed = parsePain001('__MISMATCH__');
    assert.equal(parsed.warnings.length >= 1, true);
    assert.equal(parsed.warnings.some((w) => w.includes('no coincideix')), true);
  });
});
