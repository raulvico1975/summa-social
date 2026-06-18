import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_OPENAI_DOCUMENT_REVIEW_MODEL,
  OpenAiDocumentReviewError,
  analyzeDocumentWithOpenAI,
  buildOpenAiDocumentReviewPayload,
  inferDocumentReviewContentType,
  isAllowedDocumentReviewStoragePath,
  isSupportedDocumentReviewContentType,
  parseOpenAiDocumentReviewDetection,
} from '@/lib/document-review';

type PayloadContentItem = Record<string, unknown>;

const rowContext = {
  source: 'offBank' as const,
  dateExpense: '2026-06-18',
  paymentDate: null,
  counterpartyName: 'Proveedor Local',
  concept: 'Compra material',
  amountAssignedEUR: 100,
  amountTotalEUR: 100,
  budgetLineCode: 'A1',
  budgetLineName: 'Materials',
};

function modelOutput() {
  return {
    docType: 'invoice',
    confidence: 0.91,
    fields: {
      invoiceNumber: { value: 'F-24', confidence: 0.9, evidence: 'Factura F-24' },
      invoiceDate: { value: '2026-06-17', confidence: 0.86, evidence: '17/06/2026' },
      paymentDate: { value: null, confidence: null, evidence: null },
      amount: { value: 100, confidence: 0.88, evidence: '100,00 EUR' },
      supplierName: { value: 'Proveedor Local', confidence: 0.92, evidence: 'Proveedor Local' },
      supplierTaxId: { value: null, confidence: null, evidence: null },
    },
    errors: [],
  };
}

test('builds OpenAI document review payload with store disabled and file input', () => {
  const payload = buildOpenAiDocumentReviewPayload({
    apiKey: 'test-key',
    model: 'gpt-test',
    file: {
      filename: 'factura.pdf',
      contentType: 'application/pdf',
      base64: 'JVBERi0=',
    },
    rowContext,
  });

  assert.equal(payload.model, 'gpt-test');
  assert.equal(payload.store, false);
  const text = payload.text as { format: { type: string } };
  assert.deepEqual(text.format.type, 'json_schema');
  const input = (payload.input as Array<{ content: PayloadContentItem[] }>)[0];
  assert.equal(input.content[1].type, 'input_file');
  assert.equal(input.content[1].filename, 'factura.pdf');
  assert.match(String(input.content[1].file_data), /^data:application\/pdf;base64,/);
  assert.match(String(input.content[0].text), /No inventis imports/);
  assert.match(String(input.content[0].text), /payment_proof/);
});

test('uses available default model unless env overrides it', () => {
  const payload = buildOpenAiDocumentReviewPayload({
    apiKey: 'test-key',
    file: {
      filename: 'factura.pdf',
      contentType: 'application/pdf',
      base64: 'JVBERi0=',
    },
    rowContext,
  });

  assert.equal(DEFAULT_OPENAI_DOCUMENT_REVIEW_MODEL, 'gpt-5-mini');
  assert.equal(payload.model, 'gpt-5-mini');
});

test('builds OpenAI document review payload with image input for images', () => {
  const payload = buildOpenAiDocumentReviewPayload({
    apiKey: 'test-key',
    model: 'gpt-test',
    file: {
      filename: 'ticket.jpg',
      contentType: 'image/jpeg',
      base64: '/9j/',
    },
    rowContext,
  });

  const input = (payload.input as Array<{ content: PayloadContentItem[] }>)[0];
  assert.equal(input.content[1].type, 'input_image');
  assert.match(String(input.content[1].image_url), /^data:image\/jpeg;base64,/);
});

test('parses OpenAI document review structured output', () => {
  const detection = parseOpenAiDocumentReviewDetection({
    response: { output_text: JSON.stringify(modelOutput()) },
    model: 'gpt-test',
    processedAt: '2026-06-18T10:00:00.000Z',
  });

  assert.equal(detection.provider, 'openai');
  assert.equal(detection.model, 'gpt-test');
  assert.equal(detection.processedAt, '2026-06-18T10:00:00.000Z');
  assert.equal(detection.docType, 'invoice');
  assert.equal(detection.fields?.amount?.value, 100);
  assert.equal(detection.fields?.supplierName?.value, 'Proveedor Local');
});

test('analyzes a document through injected fetch without real OpenAI call', async () => {
  const calls: Array<{ url: string; payload: Record<string, unknown> }> = [];
  const detection = await analyzeDocumentWithOpenAI({
    apiKey: 'test-key',
    model: 'gpt-test',
    file: {
      filename: 'factura.pdf',
      contentType: 'application/pdf',
      base64: 'JVBERi0=',
    },
    rowContext,
    now: () => '2026-06-18T10:00:00.000Z',
    fetchImpl: async (url, init) => {
      calls.push({ url, payload: JSON.parse(init.body) });
      return {
        ok: true,
        status: 200,
        async json() {
          return { output_text: JSON.stringify(modelOutput()) };
        },
        async text() {
          return '';
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.store, false);
  assert.equal(detection.docType, 'invoice');
  assert.equal(detection.provider, 'openai');
});

test('maps OpenAI quota errors to explicit error code', async () => {
  await assert.rejects(
    analyzeDocumentWithOpenAI({
      apiKey: 'test-key',
      model: 'gpt-test',
      file: {
        filename: 'factura.pdf',
        contentType: 'application/pdf',
        base64: 'JVBERi0=',
      },
      rowContext,
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        async json() {
          return { error: { message: 'quota exceeded' } };
        },
        async text() {
          return '';
        },
      }),
    }),
    (error: unknown) => error instanceof OpenAiDocumentReviewError && error.code === 'QUOTA_EXCEEDED'
  );
});

test('validates document review storage paths and content types', () => {
  assert.equal(isAllowedDocumentReviewStoragePath('organizations/org-1/offBankExpenses/e1/factura.pdf', 'org-1'), true);
  assert.equal(isAllowedDocumentReviewStoragePath('organizations/org-2/offBankExpenses/e1/factura.pdf', 'org-1'), false);
  assert.equal(isAllowedDocumentReviewStoragePath('organizations/org-1/secrets/e1/factura.pdf', 'org-1'), false);

  assert.equal(inferDocumentReviewContentType({
    contentType: null,
    filename: 'factura.pdf',
    storagePath: 'organizations/org-1/offBankExpenses/e1/factura.pdf',
    buffer: Buffer.from('%PDF-1.7'),
  }), 'application/pdf');
  assert.equal(inferDocumentReviewContentType({
    contentType: 'application/octet-stream',
    filename: 'factura.docx',
    storagePath: 'organizations/org-1/offBankExpenses/e1/factura.docx',
    buffer: Buffer.from('PK'),
  }), null);

  assert.equal(isSupportedDocumentReviewContentType('application/pdf'), true);
  assert.equal(isSupportedDocumentReviewContentType('image/jpeg'), true);
  assert.equal(isSupportedDocumentReviewContentType('image/png'), true);
  assert.equal(isSupportedDocumentReviewContentType('image/webp'), true);
  assert.equal(isSupportedDocumentReviewContentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), false);
  assert.equal(isSupportedDocumentReviewContentType('image/gif'), false);
});
