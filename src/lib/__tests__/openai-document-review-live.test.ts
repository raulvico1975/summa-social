import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeDocumentWithOpenAI,
  resolveOpenAiApiKey,
  resolveOpenAiDocumentReviewModel,
  type DocumentReviewDetection,
  type DocumentReviewDocType,
} from '@/lib/document-review';

function loadLocalEnv(): void {
  if (!fs.existsSync('.env.local')) return;
  const lines = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

async function pdfBase64(lines: string[]): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = 18;
  for (const line of lines) {
    doc.text(line, 18, y);
    y += 8;
  }
  return Buffer.from(doc.output('arraybuffer')).toString('base64');
}

function baseRowContext(overrides: Partial<Parameters<typeof analyzeDocumentWithOpenAI>[0]['rowContext']> = {}) {
  return {
    source: 'offBank' as const,
    dateExpense: '2026-06-18',
    paymentDate: null,
    counterpartyName: 'Proveedor Local SL',
    concept: 'Compra material formativo',
    amountAssignedEUR: 100,
    amountTotalEUR: 100,
    budgetLineCode: 'B2',
    budgetLineName: 'Material fungible',
    ...overrides,
  };
}

async function analyzeFixture(params: {
  filename: string;
  lines: string[];
  rowContext?: Partial<Parameters<typeof analyzeDocumentWithOpenAI>[0]['rowContext']>;
}): Promise<DocumentReviewDetection> {
  return analyzeDocumentWithOpenAI({
    apiKey: resolveOpenAiApiKey(),
    model: resolveOpenAiDocumentReviewModel(),
    file: {
      filename: params.filename,
      contentType: 'application/pdf',
      base64: await pdfBase64(params.lines),
    },
    rowContext: baseRowContext(params.rowContext),
    timeoutMs: 90_000,
  });
}

function expectDocType(actual: DocumentReviewDocType, expected: DocumentReviewDocType): void {
  assert.equal(actual, expected);
}

loadLocalEnv();

const runLive = process.env.RUN_OPENAI_DOCUMENT_REVIEW_LIVE === '1';

test('live OpenAI document review classifies controlled demo documents', {
  skip: runLive ? false : 'set RUN_OPENAI_DOCUMENT_REVIEW_LIVE=1 to run live OpenAI checks',
  timeout: 180_000,
}, async () => {
  assert.ok(resolveOpenAiApiKey(), 'OPENAI_API_KEY is required for live document review checks');

  const invoice = await analyzeFixture({
    filename: 'factura-proveedor-local.pdf',
    lines: [
      'FACTURA F-2026-0042',
      'Proveedor: Proveedor Local SL',
      'CIF: B12345678',
      'Fecha factura: 17/06/2026',
      'Concepto: Compra material formativo',
      'Base imponible: 82,64 EUR',
      'IVA: 17,36 EUR',
      'TOTAL FACTURA: 100,00 EUR',
    ],
  });
  expectDocType(invoice.docType, 'invoice');
  assert.equal(invoice.fields?.amount?.value, 100);
  assert.equal(invoice.fields?.invoiceDate?.value, '2026-06-17');

  const paymentProof = await analyzeFixture({
    filename: 'comprovant-transferencia.pdf',
    lines: [
      'COMPROBANTE DE TRANSFERENCIA EJECUTADA',
      'Ordenante: Asociacion Demo',
      'Beneficiario: Proveedor Local SL',
      'IBAN beneficiario: ES00 0000 0000 0000 0000 0000',
      'Fecha de pago: 18/06/2026',
      'Concepto: Pago factura F-2026-0042',
      'Importe transferido: 100,00 EUR',
    ],
    rowContext: { paymentDate: '2026-06-18' },
  });
  expectDocType(paymentProof.docType, 'payment_proof');
  assert.equal(paymentProof.fields?.paymentDate?.value, '2026-06-18');
  assert.equal(paymentProof.fields?.amount?.value, 100);

  const payroll = await analyzeFixture({
    filename: 'nomina-juny.pdf',
    lines: [
      'NOMINA JUNIO 2026',
      'Empresa: Asociacion Demo',
      'Trabajadora: Maria Perez Garcia',
      'NIF: 12345678Z',
      'Periodo de liquidacion: 01/06/2026 - 30/06/2026',
      'Liquido a percibir: 1.250,50 EUR',
    ],
    rowContext: {
      counterpartyName: 'Maria Perez Garcia',
      concept: 'Nomina juny',
      amountAssignedEUR: 1250.5,
      amountTotalEUR: 1250.5,
    },
  });
  expectDocType(payroll.docType, 'payroll');
  assert.equal(payroll.fields?.amount?.value, 1250.5);

  const internalNote = await analyzeFixture({
    filename: 'nota-local.pdf',
    lines: [
      'ACTA DE ENTREGA DE MATERIAL',
      'La coordinadora local confirma la entrega de materiales al taller comunitario.',
      'Fecha: 19/06/2026',
      'No consta factura ni comprobante bancario en este documento.',
    ],
    rowContext: {
      counterpartyName: '',
      concept: 'Acta local entrega material',
      amountAssignedEUR: null,
      amountTotalEUR: null,
    },
  });
  assert.ok(['local_support', 'unknown'].includes(internalNote.docType));

  console.log(JSON.stringify({
    model: resolveOpenAiDocumentReviewModel(),
    invoice: { docType: invoice.docType, amount: invoice.fields?.amount?.value, date: invoice.fields?.invoiceDate?.value },
    paymentProof: { docType: paymentProof.docType, amount: paymentProof.fields?.amount?.value, paymentDate: paymentProof.fields?.paymentDate?.value },
    payroll: { docType: payroll.docType, amount: payroll.fields?.amount?.value },
    internalNote: { docType: internalNote.docType, confidence: internalNote.confidence },
  }));
});
