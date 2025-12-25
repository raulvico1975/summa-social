// src/lib/__tests__/build-document-filename.test.ts
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  formatDateForFilename,
  normalizeConcept,
  buildDocumentFilename,
} from '../build-document-filename';

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT DATE FOR FILENAME
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatDateForFilename', () => {
  it('should convert YYYY-MM-DD to YYYY.MM.DD', () => {
    assert.strictEqual(formatDateForFilename('2024-03-15'), '2024.03.15');
    assert.strictEqual(formatDateForFilename('2023-12-01'), '2023.12.01');
    assert.strictEqual(formatDateForFilename('2025-01-31'), '2025.01.31');
  });

  it('should return today date for invalid format', () => {
    // Note: Since we can't easily mock Date in node:test, we just verify format
    const result = formatDateForFilename('invalid');
    assert.match(result, /^\d{4}\.\d{2}\.\d{2}$/);

    const result2 = formatDateForFilename('2024/03/15');
    assert.match(result2, /^\d{4}\.\d{2}\.\d{2}$/);

    const result3 = formatDateForFilename('');
    assert.match(result3, /^\d{4}\.\d{2}\.\d{2}$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZE CONCEPT
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeConcept', () => {
  it('should convert to lowercase', () => {
    assert.strictEqual(normalizeConcept('COMPRA MATERIAL'), 'compra_material');
  });

  it('should remove accents', () => {
    assert.strictEqual(normalizeConcept("Compra d'àcid"), 'compra_d_acid');
    assert.strictEqual(normalizeConcept('Recepció'), 'recepcio');
    assert.strictEqual(normalizeConcept('Cafè i café'), 'cafe_i_cafe');
    assert.strictEqual(normalizeConcept('Ñoño'), 'nono');
  });

  it('should replace non-alphanumeric with underscore', () => {
    assert.strictEqual(normalizeConcept('Compra - material'), 'compra_material');
    assert.strictEqual(normalizeConcept('Factura #123'), 'factura_123');
    assert.strictEqual(normalizeConcept('A/B test'), 'a_b_test');
  });

  it('should collapse multiple underscores', () => {
    assert.strictEqual(normalizeConcept('Compra    material'), 'compra_material');
    assert.strictEqual(normalizeConcept('A---B___C'), 'a_b_c');
  });

  it('should trim leading/trailing underscores', () => {
    assert.strictEqual(normalizeConcept('  Compra material  '), 'compra_material');
    assert.strictEqual(normalizeConcept('---test---'), 'test');
  });

  it('should truncate to 40 characters', () => {
    const longText = 'a'.repeat(50);
    const result = normalizeConcept(longText);
    assert.ok(result.length <= 40, `Result length ${result.length} exceeds 40`);
  });

  it('should not end with underscore after truncation', () => {
    const text = 'a'.repeat(39) + ' b';
    const result = normalizeConcept(text);
    assert.ok(!result.endsWith('_'), `Result "${result}" ends with underscore`);
  });

  it('should return "document" for empty input', () => {
    assert.strictEqual(normalizeConcept(''), 'document');
    assert.strictEqual(normalizeConcept('   '), 'document');
  });

  it('should handle special characters from various languages', () => {
    // Note: German ß becomes 'ss' after NFD normalization
    assert.strictEqual(normalizeConcept('Müller'), 'muller');
    assert.strictEqual(normalizeConcept('Çatal'), 'catal');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT FILENAME
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildDocumentFilename', () => {
  it('should combine date, concept and extension', () => {
    const result = buildDocumentFilename({
      dateISO: '2024-03-15',
      concept: 'Compra material oficina',
      originalName: 'factura.pdf',
    });
    assert.strictEqual(result, '2024.03.15_compra_material_oficina.pdf');
  });

  it('should preserve original file extension in lowercase', () => {
    const result = buildDocumentFilename({
      dateISO: '2024-01-01',
      concept: 'Test',
      originalName: 'image.JPG',
    });
    assert.strictEqual(result, '2024.01.01_test.jpg');
  });

  it('should handle files without extension', () => {
    const result = buildDocumentFilename({
      dateISO: '2024-01-01',
      concept: 'Test',
      originalName: 'noextension',
    });
    assert.strictEqual(result, '2024.01.01_test');
  });

  it('should take only last extension for complex filenames', () => {
    const result = buildDocumentFilename({
      dateISO: '2024-01-01',
      concept: 'Test',
      originalName: 'document.tar.gz',
    });
    assert.strictEqual(result, '2024.01.01_test.gz');
  });

  it('should use "document" fallback for empty concept', () => {
    const result = buildDocumentFilename({
      dateISO: '2024-03-15',
      concept: '',
      originalName: 'file.pdf',
    });
    assert.strictEqual(result, '2024.03.15_document.pdf');
  });

  it('should handle real-world example with long concept', () => {
    const result = buildDocumentFilename({
      dateISO: '2024-12-25',
      concept: "Compra d'equipament per al taller de formació - Senegal",
      originalName: 'IMG_20241225_143022.jpg',
    });
    // Truncated to 40 chars: "compra_d_equipament_per_al_taller_de_for" (40 chars exactly)
    assert.strictEqual(result, '2024.12.25_compra_d_equipament_per_al_taller_de_for.jpg');
  });
});
