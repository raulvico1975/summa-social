// src/lib/expense-reports/generate-pdf.ts
// Generador de PDF per liquidacions de despeses

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyEU } from '@/lib/normalize';
import type { ExpenseReport, ExpenseReportBeneficiary } from './types';
import type { PendingDocument } from '@/lib/pending-documents';
import type { Organization, Contact, Category } from '@/lib/data';

// =============================================================================
// TYPES
// =============================================================================

export interface PdfLabels {
  title: string;
  reference: string;
  reason: string;
  beneficiary: string;
  noBeneficiary: string;
  contactNotFound: string;
  iban: string;
  period: string;
  expenses: string;
  tableDate: string;
  tableConcept: string;
  tableCategory: string;
  tableAmount: string;
  total: string;
  attachments: string;
  mileage: string;
  mileageDesc: (params: { km: number; rate: number }) => string;
  generatedBy: string;
}

export interface GenerateExpenseReportPdfParams {
  report: ExpenseReport;
  receipts: PendingDocument[];
  organization: Organization;
  beneficiaryContact: Contact | null; // Si és employee o contact
  categories: Category[];
  labels: PdfLabels;
}

export interface GenerateExpenseReportPdfResult {
  pdf: jsPDF;
  blob: Blob;
  filename: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function getBeneficiaryText(
  beneficiary: ExpenseReportBeneficiary | null,
  contact: Contact | null,
  labels: PdfLabels
): { name: string; iban: string } {
  if (!beneficiary) return { name: labels.noBeneficiary, iban: '' };

  switch (beneficiary.kind) {
    case 'employee':
    case 'contact':
      return {
        name: contact?.name ?? labels.contactNotFound,
        iban: contact?.iban ?? '',
      };
    case 'manual':
      return {
        name: beneficiary.name,
        iban: beneficiary.iban,
      };
    default:
      return { name: '', iban: '' };
  }
}

function getCategoryName(
  categoryId: string | null,
  categories: Category[]
): string {
  if (!categoryId) return '';
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.name ?? '';
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

export function generateExpenseReportPdf(
  params: GenerateExpenseReportPdfParams
): GenerateExpenseReportPdfResult {
  const { report, receipts, organization, beneficiaryContact, categories, labels } = params;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPÇALERA
  // ═══════════════════════════════════════════════════════════════════════════

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(labels.title, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(organization.name, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(9);
  doc.text(`CIF: ${organization.taxId}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Línia separadora
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // DADES DE LA LIQUIDACIÓ
  // ═══════════════════════════════════════════════════════════════════════════

  const beneficiaryInfo = getBeneficiaryText(report.beneficiary, beneficiaryContact, labels);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${labels.reference}:`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(report.id, margin + 30, y);
  y += 6;

  if (report.title) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${labels.reason}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(report.title, margin + 30, y);
    y += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.text(`${labels.beneficiary}:`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(beneficiaryInfo.name, margin + 30, y);
  y += 6;

  if (beneficiaryInfo.iban) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${labels.iban}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(beneficiaryInfo.iban, margin + 30, y);
    y += 6;
  }

  const dateRange =
    report.dateFrom || report.dateTo
      ? `${formatDate(report.dateFrom)} - ${formatDate(report.dateTo)}`
      : '—';
  doc.setFont('helvetica', 'bold');
  doc.text(`${labels.period}:`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dateRange, margin + 30, y);
  y += 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // TAULA DE DESPESES
  // ═══════════════════════════════════════════════════════════════════════════

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(labels.expenses, margin, y);
  y += 6;

  // Preparar files de la taula
  const tableRows: (string | number)[][] = [];

  // Tiquets
  receipts.forEach((receipt) => {
    tableRows.push([
      formatDate(receipt.invoiceDate),
      receipt.file.filename,
      getCategoryName(receipt.categoryId, categories),
      formatCurrencyEU(receipt.amount ?? 0),
    ]);
  });

  // Quilometratge
  if (report.mileage?.km && report.mileage.rateEurPerKm) {
    const mileageAmount = report.mileage.km * report.mileage.rateEurPerKm;
    const mileageDescription = report.mileage.description
      ? `${labels.mileage}: ${report.mileage.description}`
      : `${labels.mileage}: ${labels.mileageDesc({ km: report.mileage.km, rate: report.mileage.rateEurPerKm })}`;
    tableRows.push([
      formatDate(report.dateFrom),
      mileageDescription,
      getCategoryName(report.mileage.categoryId, categories),
      formatCurrencyEU(mileageAmount),
    ]);
  }

  // Dibuixar taula
  autoTable(doc, {
    startY: y,
    head: [[labels.tableDate, labels.tableConcept, labels.tableCategory, labels.tableAmount]],
    body: tableRows,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40 },
      3: { cellWidth: 30, halign: 'right' },
    },
    foot: [['', '', labels.total, formatCurrencyEU(report.totalAmount)]],
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
    },
  });

  // Obtenir Y després de la taula
  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  y = tableEndY + 15;

  // ═══════════════════════════════════════════════════════════════════════════
  // ANNEXOS (LLISTA)
  // ═══════════════════════════════════════════════════════════════════════════

  if (receipts.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(labels.attachments, margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    receipts.forEach((receipt, index) => {
      const line = `${index + 1}. ${receipt.file.filename} — ${formatDate(receipt.invoiceDate)} — ${formatCurrencyEU(receipt.amount ?? 0)}`;
      doc.text(line, margin, y);
      y += 5;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PEU
  // ═══════════════════════════════════════════════════════════════════════════

  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 15;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.setDrawColor(200);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.text(
    `${labels.generatedBy} — Ref: ${report.id}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.setTextColor(0);

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  const filename = `liquidacio_${report.id}.pdf`;
  const blob = doc.output('blob');

  return { pdf: doc, blob, filename };
}
