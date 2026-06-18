import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDocumentReviewIncidentsCsv,
  normalizeDocumentReviewRows,
  type DocumentReviewDetection,
} from '@/lib/document-review';
import type { JustificationRow } from '@/lib/project-justification-rows';

function buildRow(overrides: Partial<JustificationRow> = {}): JustificationRow {
  return {
    order: 1,
    txId: 'tx-1',
    dateExpense: '2026-06-10',
    paymentDate: null,
    counterpartyName: 'Proveedor Local',
    concept: 'Compra material',
    budgetLineCode: 'A1',
    budgetLineName: 'Materials',
    budgetLineId: 'line-1',
    amountTotalEUR: 100,
    amountAssignedEUR: 100,
    documentName: '001_2026.06.10_Proveedor_100,00EUR_Compra.pdf',
    zipPathCronologic: '02_cronologic/001_2026.06.10_Proveedor_100,00EUR_Compra.pdf',
    zipPathPerPartida: '01_per_partida/A1_Materials/001_2026.06.10_Proveedor_100,00EUR_Compra.pdf',
    documentUrl: null,
    documents: [],
    source: 'offBank',
    categoryName: 'Materials',
    ...overrides,
  };
}

function detection(overrides: Partial<DocumentReviewDetection>): DocumentReviewDetection {
  return {
    docType: 'invoice',
    confidence: 0.92,
    ...overrides,
  };
}

test('flags rows without linked documents', () => {
  const rows = normalizeDocumentReviewRows({
    rows: [buildRow()],
  });

  assert.equal(rows[0].status, 'missing');
  assert.deepEqual(rows[0].incidents.map((item) => item.code), ['missing_document']);
});

test('flags off-bank invoice without payment proof', () => {
  const row = buildRow({
    documents: [
      {
        documentName: 'factura.pdf',
        documentUrl: 'https://storage.local/factura.pdf',
        storagePath: 'organizations/org/offBankExpenses/1/factura.pdf',
        zipPathCronologic: '02_cronologic/factura.pdf',
        zipPathPerPartida: '01_per_partida/A1/factura.pdf',
      },
    ],
  });

  const rows = normalizeDocumentReviewRows({ rows: [row] });

  assert.equal(rows[0].status, 'missing');
  assert.equal(rows[0].documents[0].detectedType, 'invoice');
  assert.ok(rows[0].incidents.some((item) => item.code === 'missing_payment_proof'));
});

test('accepts a bank row with invoice when policy counts bank movement as payment proof', () => {
  const row = buildRow({
    source: 'bank',
    documents: [
      {
        documentName: 'factura.pdf',
        documentUrl: 'https://storage.local/factura.pdf',
        storagePath: 'organizations/org/transactions/tx-1/factura.pdf',
        zipPathCronologic: '02_cronologic/factura.pdf',
        zipPathPerPartida: '01_per_partida/A1/factura.pdf',
      },
    ],
  });

  const rows = normalizeDocumentReviewRows({ rows: [row] });

  assert.equal(rows[0].status, 'complete');
  assert.equal(rows[0].incidents.length, 0);
});

test('flags a bank row with invoice when policy does not count bank movement as payment proof', () => {
  const row = buildRow({
    source: 'bank',
    documents: [
      {
        documentName: 'factura.pdf',
        documentUrl: 'https://storage.local/factura.pdf',
        storagePath: 'organizations/org/transactions/tx-1/factura.pdf',
        zipPathCronologic: '02_cronologic/factura.pdf',
        zipPathPerPartida: '01_per_partida/A1/factura.pdf',
      },
    ],
  });

  const rows = normalizeDocumentReviewRows({
    rows: [row],
    policy: { bankTransactionCountsAsPaymentProof: false },
  });

  assert.equal(rows[0].status, 'missing');
  assert.ok(rows[0].incidents.some((item) => item.code === 'missing_payment_proof'));
});

test('flags unknown documents and missing primary support', () => {
  const row = buildRow({
    documents: [
      {
        documentName: 'document.pdf',
        documentUrl: 'https://storage.local/document.pdf',
        storagePath: null,
        zipPathCronologic: '02_cronologic/document.pdf',
        zipPathPerPartida: '01_per_partida/A1/document.pdf',
      },
    ],
  });

  const rows = normalizeDocumentReviewRows({ rows: [row] });
  const incidentCodes = rows[0].incidents.map((item) => item.code);

  assert.equal(rows[0].documents[0].detectedType, 'unknown');
  assert.ok(incidentCodes.includes('unknown_doc_type'));
  assert.ok(incidentCodes.includes('missing_invoice'));
});

test('uses supplied detections for mismatch checks', () => {
  const storagePath = 'organizations/org/offBankExpenses/1/factura.pdf';
  const row = buildRow({
    documents: [
      {
        documentName: 'factura.pdf',
        documentUrl: 'https://storage.local/factura.pdf',
        storagePath,
        zipPathCronologic: '02_cronologic/factura.pdf',
        zipPathPerPartida: '01_per_partida/A1/factura.pdf',
      },
      {
        documentName: 'comprovant_pagament.pdf',
        documentUrl: 'https://storage.local/comprovant.pdf',
        storagePath: 'organizations/org/offBankExpenses/1/comprovant.pdf',
        zipPathCronologic: '02_cronologic/comprovant.pdf',
        zipPathPerPartida: '01_per_partida/A1/comprovant.pdf',
      },
    ],
  });

  const rows = normalizeDocumentReviewRows({
    rows: [row],
    projectStartDate: '2026-01-01',
    projectEndDate: '2026-12-31',
    detectionsByDocumentKey: {
      [storagePath]: detection({
        fields: {
          amount: { value: 120, confidence: 0.95, evidence: 'Total 120,00' },
          invoiceDate: { value: '2025-12-31', confidence: 0.9, evidence: '31/12/2025' },
          supplierName: { value: 'Un altre proveidor', confidence: 0.9, evidence: 'Un altre proveidor' },
        },
      }),
    },
  });

  const incidentCodes = rows[0].incidents.map((item) => item.code);

  assert.equal(rows[0].status, 'inconsistent');
  assert.ok(incidentCodes.includes('amount_mismatch'));
  assert.ok(incidentCodes.includes('date_mismatch'));
  assert.ok(incidentCodes.includes('supplier_mismatch'));
});

test('uses persisted AI detections from justification documents after reload', () => {
  const storagePath = 'organizations/org/offBankExpenses/1/factura.pdf';
  const row = buildRow({
    documents: [
      {
        documentName: 'document.pdf',
        documentUrl: 'https://storage.local/factura.pdf',
        storagePath,
        aiDocumentReview: detection({
          docType: 'invoice',
          fields: {
            amount: { value: 100, confidence: 0.94, evidence: 'TOTAL 100,00' },
          },
          model: 'gpt-5-mini',
          provider: 'openai',
          processedAt: '2026-06-18T10:00:00.000Z',
          errors: [],
        }),
        zipPathCronologic: '02_cronologic/document.pdf',
        zipPathPerPartida: '01_per_partida/A1/document.pdf',
      },
    ],
  });

  const rows = normalizeDocumentReviewRows({ rows: [row] });

  assert.equal(rows[0].documents[0].detectedType, 'invoice');
  assert.equal(rows[0].documents[0].model, 'gpt-5-mini');
  assert.deepEqual(rows[0].incidents.map((item) => item.code), ['missing_payment_proof']);
});

test('flags duplicate documents across rows', () => {
  const sharedDocument = {
    documentName: 'factura.pdf',
    documentUrl: 'https://storage.local/shared.pdf',
    storagePath: 'organizations/org/offBankExpenses/shared.pdf',
    zipPathCronologic: '02_cronologic/factura.pdf',
    zipPathPerPartida: '01_per_partida/A1/factura.pdf',
  };

  const rows = normalizeDocumentReviewRows({
    rows: [
      buildRow({ order: 1, txId: 'tx-1', documents: [sharedDocument], source: 'bank' }),
      buildRow({ order: 2, txId: 'tx-2', documents: [sharedDocument], source: 'bank' }),
    ],
  });

  assert.ok(rows[0].incidents.some((item) => item.code === 'duplicate_suspected'));
  assert.ok(rows[1].incidents.some((item) => item.code === 'duplicate_suspected'));
});

test('requires payroll support documents when payroll is detected', () => {
  const row = buildRow({
    source: 'bank',
    documents: [
      {
        documentName: 'nomina_juny.pdf',
        documentUrl: 'https://storage.local/nomina.pdf',
        storagePath: null,
        zipPathCronologic: '02_cronologic/nomina.pdf',
        zipPathPerPartida: '01_per_partida/A1/nomina.pdf',
      },
    ],
  });

  const rows = normalizeDocumentReviewRows({ rows: [row] });
  const missingPayrollSupport = rows[0].incidents.filter((item) => item.code === 'missing_payroll_support');

  assert.equal(rows[0].documents[0].detectedType, 'payroll');
  assert.equal(missingPayrollSupport.length, 3);
});

test('exports document review incidents as ordered csv rows', () => {
  const rows = normalizeDocumentReviewRows({
    rows: [
      buildRow({
        order: 2,
        txId: 'off-2',
        source: 'offBank',
        counterpartyName: 'Proveedor, Local',
        concept: 'Compra "material"\nurgent',
        documents: [],
      }),
      buildRow({
        order: 1,
        txId: 'bank-1',
        source: 'bank',
        documents: [
          {
            documentName: 'factura, abril.pdf',
            documentUrl: 'https://storage.local/factura.pdf',
            storagePath: 'organizations/org/transactions/bank-1/factura.pdf',
            zipPathCronologic: '02_cronologic/factura.pdf',
            zipPathPerPartida: '01_per_partida/A1/factura.pdf',
          },
        ],
      }),
    ],
  });

  const csv = buildDocumentReviewIncidentsCsv(rows);
  const records = csv.split(/\n(?=\d,)/);

  assert.equal(records[0], 'order,source,txId,dateExpense,paymentDate,budgetLine,counterpartyName,concept,amountAssignedEUR,documentCount,reviewStatus,incidentCodes,primaryIncident,recommendedAction,documents');
  assert.match(records[1], /^1,bank,bank-1,/);
  assert.match(records[1], /complete,,,No action,/);
  assert.match(records[1], /"factura, abril\.pdf \[invoice\]"/);
  assert.match(records[2], /^2,offBank,off-2,/);
  assert.match(records[2], /missing_document/);
  assert.match(records[2], /"Proveedor, Local"/);
  assert.match(records[2], /"Compra ""material""\nurgent"/);
});

test('exports multiple incidents and keeps rows without documents', () => {
  const rows = normalizeDocumentReviewRows({
    rows: [
      buildRow({
        order: 1,
        documents: [
          {
            documentName: 'document.pdf',
            documentUrl: 'https://storage.local/document.pdf',
            storagePath: null,
            zipPathCronologic: '02_cronologic/document.pdf',
            zipPathPerPartida: '01_per_partida/A1/document.pdf',
          },
        ],
      }),
      buildRow({
        order: 2,
        txId: 'off-2',
        documents: [],
      }),
    ],
  });

  const csv = buildDocumentReviewIncidentsCsv(rows);

  assert.match(csv, /unknown_doc_type\|missing_invoice/);
  assert.match(csv, /1,offBank,tx-1,/);
  assert.match(csv, /2,offBank,off-2,/);
  assert.match(csv, /missing_document/);
});
