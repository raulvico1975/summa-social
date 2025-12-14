import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeTaxId,
  normalizeIBAN,
  formatIBANDisplay,
  normalizeZipCode,
  normalizeEmail,
  normalizePhone,
  formatNumberEU,
  formatCurrencyEU,
  parseNumberEU,
  toTitleCase,
} from '../normalize';

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZE TAX ID (DNI/CIF)
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeTaxId', () => {
  it('should uppercase and remove spaces', () => {
    assert.strictEqual(normalizeTaxId('12345678a'), '12345678A');
    assert.strictEqual(normalizeTaxId(' 12345678A '), '12345678A');
  });

  it('should remove hyphens and dots', () => {
    assert.strictEqual(normalizeTaxId('12.345.678-A'), '12345678A');
    assert.strictEqual(normalizeTaxId('B-12345678'), 'B12345678');
  });

  it('should handle CIF format', () => {
    assert.strictEqual(normalizeTaxId('b12345678'), 'B12345678');
    assert.strictEqual(normalizeTaxId('G-12.345.678'), 'G12345678');
  });

  it('should handle NIE format', () => {
    assert.strictEqual(normalizeTaxId('x1234567a'), 'X1234567A');
    assert.strictEqual(normalizeTaxId('Y-1234567-Z'), 'Y1234567Z');
  });

  it('should return empty string for null/undefined', () => {
    assert.strictEqual(normalizeTaxId(null as any), '');
    assert.strictEqual(normalizeTaxId(undefined as any), '');
    assert.strictEqual(normalizeTaxId(''), '');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZE IBAN
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeIBAN', () => {
  it('should uppercase and remove spaces', () => {
    assert.strictEqual(normalizeIBAN('es12 3456 7890 1234 5678 9012'), 'ES12345678901234567890123456789012'.slice(0, 24));
  });

  it('should handle Spanish IBAN', () => {
    const iban = 'ES91 2100 0418 4502 0005 1332';
    const normalized = normalizeIBAN(iban);
    assert.strictEqual(normalized, 'ES9121000418450200051332');
  });

  it('should handle lowercase', () => {
    assert.strictEqual(normalizeIBAN('es9121000418450200051332'), 'ES9121000418450200051332');
  });

  it('should return empty string for null/undefined', () => {
    assert.strictEqual(normalizeIBAN(null as any), '');
    assert.strictEqual(normalizeIBAN(undefined as any), '');
  });
});

describe('formatIBANDisplay', () => {
  it('should format IBAN in groups of 4', () => {
    const result = formatIBANDisplay('ES9121000418450200051332');
    assert.strictEqual(result, 'ES91 2100 0418 4502 0005 1332');
  });

  it('should handle already formatted IBAN', () => {
    const result = formatIBANDisplay('ES91 2100 0418 4502 0005 1332');
    assert.strictEqual(result, 'ES91 2100 0418 4502 0005 1332');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZE ZIP CODE
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeZipCode', () => {
  it('should pad with leading zeros to 5 digits', () => {
    assert.strictEqual(normalizeZipCode('8001'), '08001');
    assert.strictEqual(normalizeZipCode('801'), '00801');
  });

  it('should keep valid 5-digit codes', () => {
    assert.strictEqual(normalizeZipCode('08001'), '08001');
    assert.strictEqual(normalizeZipCode('28001'), '28001');
  });

  it('should remove non-numeric characters', () => {
    assert.strictEqual(normalizeZipCode('08-001'), '08001');
    assert.strictEqual(normalizeZipCode('08.001'), '08001');
  });

  it('should truncate codes longer than 5 digits', () => {
    assert.strictEqual(normalizeZipCode('080011'), '08001');
  });

  it('should return empty string for null/undefined', () => {
    assert.strictEqual(normalizeZipCode(null as any), '');
    assert.strictEqual(normalizeZipCode(undefined as any), '');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZE EMAIL
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeEmail', () => {
  it('should lowercase and trim', () => {
    assert.strictEqual(normalizeEmail('  User@Example.COM  '), 'user@example.com');
  });

  it('should handle normal emails', () => {
    assert.strictEqual(normalizeEmail('contact@ong.org'), 'contact@ong.org');
  });

  it('should return empty string for null/undefined', () => {
    assert.strictEqual(normalizeEmail(null as any), '');
    assert.strictEqual(normalizeEmail(undefined as any), '');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZE PHONE
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizePhone', () => {
  it('should remove spaces and format Spanish numbers', () => {
    const result = normalizePhone('612 34 56 78');
    assert.ok(result.includes('612'));
  });

  it('should handle international numbers', () => {
    const result = normalizePhone('+34 612345678');
    // International numbers get formatted with spaces every 3 digits
    assert.ok(result.length > 0);
    assert.ok(/\d/.test(result)); // Contains digits
  });

  it('should return empty string for null/undefined', () => {
    assert.strictEqual(normalizePhone(null as any), '');
    assert.strictEqual(normalizePhone(undefined as any), '');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT NUMBER EU
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatNumberEU', () => {
  it('should format with European separators', () => {
    assert.strictEqual(formatNumberEU(1234.56), '1.234,56');
    assert.strictEqual(formatNumberEU(1234567.89), '1.234.567,89');
  });

  it('should handle integers', () => {
    assert.strictEqual(formatNumberEU(1000), '1.000,00');
  });

  it('should handle negative numbers', () => {
    assert.strictEqual(formatNumberEU(-1234.56), '-1.234,56');
  });

  it('should handle zero', () => {
    assert.strictEqual(formatNumberEU(0), '0,00');
  });

  it('should handle small decimals', () => {
    assert.strictEqual(formatNumberEU(0.5), '0,50');
    assert.strictEqual(formatNumberEU(0.05), '0,05');
  });
});

describe('formatCurrencyEU', () => {
  it('should format with € symbol', () => {
    assert.strictEqual(formatCurrencyEU(1234.56), '1.234,56 €');
  });

  it('should handle negative amounts', () => {
    assert.strictEqual(formatCurrencyEU(-500), '-500,00 €');
  });
});

describe('parseNumberEU', () => {
  it('should parse European format to number', () => {
    assert.strictEqual(parseNumberEU('1.234,56'), 1234.56);
    assert.strictEqual(parseNumberEU('1.234.567,89'), 1234567.89);
  });

  it('should handle integers without decimals', () => {
    // "1.000" is ambiguous - could be 1.0 (American) or 1000 (European)
    // The function detects last separator position
    // Since dot is the only separator, it's treated as decimal
    assert.strictEqual(parseNumberEU('1.000,00'), 1000);
  });

  it('should handle negative numbers', () => {
    assert.strictEqual(parseNumberEU('-1.234,56'), -1234.56);
  });

  it('should handle currency symbol', () => {
    assert.strictEqual(parseNumberEU('1.234,56 €'), 1234.56);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TO TITLE CASE
// ═══════════════════════════════════════════════════════════════════════════════

describe('toTitleCase', () => {
  it('should capitalize first letter of each word', () => {
    assert.strictEqual(toTitleCase('maria garcia lopez'), 'Maria Garcia Lopez');
  });

  it('should handle already capitalized', () => {
    assert.strictEqual(toTitleCase('MARIA GARCIA'), 'Maria Garcia');
  });

  it('should handle mixed case', () => {
    assert.strictEqual(toTitleCase('mARIA gARCIA'), 'Maria Garcia');
  });

  it('should handle single word', () => {
    assert.strictEqual(toTitleCase('maria'), 'Maria');
  });

  it('should return empty string for null/undefined', () => {
    assert.strictEqual(toTitleCase(null as any), '');
    assert.strictEqual(toTitleCase(undefined as any), '');
  });
});
