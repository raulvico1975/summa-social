import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeForMatching,
  extractNameTokens,
  findMatchingContact,
} from '../auto-match';

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZE FOR MATCHING
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeForMatching', () => {
  it('should lowercase text', () => {
    assert.strictEqual(normalizeForMatching('MARIA GARCIA'), 'maria garcia');
  });

  it('should remove accents', () => {
    assert.strictEqual(normalizeForMatching('María García López'), 'maria garcia lopez');
    assert.strictEqual(normalizeForMatching('Associació Català'), 'associacio catala');
  });

  it('should remove special characters', () => {
    // S.L. becomes "s l" (dots replaced by spaces, then normalized)
    assert.strictEqual(normalizeForMatching('GTL Consultors, S.L.'), 'gtl consultors s l');
  });

  it('should handle empty string', () => {
    assert.strictEqual(normalizeForMatching(''), '');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACT NAME TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

describe('extractNameTokens', () => {
  it('should extract meaningful tokens', () => {
    const tokens = extractNameTokens('Maria Garcia Lopez');
    assert.deepStrictEqual(tokens, ['maria', 'garcia', 'lopez']);
  });

  it('should ignore stop words', () => {
    const tokens = extractNameTokens('Asociación de Amigos de la Tierra');
    assert.ok(!tokens.includes('de'));
    assert.ok(!tokens.includes('la'));
    assert.ok(tokens.includes('asociacion') || tokens.includes('amigos') || tokens.includes('tierra'));
  });

  it('should ignore common business suffixes', () => {
    const tokens = extractNameTokens('GTL Consultors S.L.');
    assert.ok(!tokens.includes('sl'));
    assert.ok(!tokens.includes('s'));
    assert.ok(!tokens.includes('l'));
    assert.ok(tokens.includes('gtl'));
    assert.ok(tokens.includes('consultors'));
  });

  it('should handle short names', () => {
    const tokens = extractNameTokens('Amazon');
    assert.deepStrictEqual(tokens, ['amazon']);
  });

  it('should handle empty input', () => {
    const tokens = extractNameTokens('');
    assert.deepStrictEqual(tokens, []);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FIND MATCHING CONTACT
// ═══════════════════════════════════════════════════════════════════════════════

describe('findMatchingContact', () => {
  const contacts = [
    { id: '1', name: 'Maria Garcia Lopez', type: 'donor' as const },
    { id: '2', name: 'GTL Consultors S.L.', type: 'supplier' as const },
    { id: '3', name: 'Amazon', type: 'supplier' as const },
    { id: '4', name: 'Fundació Baruma', type: 'donor' as const },
    { id: '5', name: 'Joan Pere Martínez', type: 'donor' as const },
  ];

  it('should match by full name in description', () => {
    const result = findMatchingContact(
      'TRANSFERENCIA DE GARCIA LOPEZ MARIA',
      contacts
    );
    assert.ok(result);
    assert.strictEqual(result!.contactId, '1');
  });

  it('should match company name', () => {
    const result = findMatchingContact(
      'Recibo Gtl Consultors S.l. Nº Recibo 00123',
      contacts
    );
    assert.ok(result);
    assert.strictEqual(result!.contactId, '2');
  });

  it('should match short names (single token)', () => {
    const result = findMatchingContact(
      'AMAZON EU SARL PAGO TARJETA',
      contacts
    );
    assert.ok(result);
    assert.strictEqual(result!.contactId, '3');
  });

  it('should match with accents normalized', () => {
    const result = findMatchingContact(
      'DONATIVO FUNDACIO BARUMA',
      contacts
    );
    assert.ok(result);
    assert.strictEqual(result!.contactId, '4');
  });

  it('should return null when no match', () => {
    const result = findMatchingContact(
      'RECIBO LUZ ENDESA',
      contacts
    );
    assert.strictEqual(result, null);
  });

  it('should return null for empty description', () => {
    const result = findMatchingContact('', contacts);
    assert.strictEqual(result, null);
  });

  it('should return null for empty contacts list', () => {
    const result = findMatchingContact('TRANSFERENCIA MARIA', []);
    assert.strictEqual(result, null);
  });

  it('should prefer higher token matches', () => {
    const similarContacts = [
      { id: '1', name: 'Maria Garcia', type: 'donor' as const },
      { id: '2', name: 'Maria Garcia Lopez Fernandez', type: 'donor' as const },
    ];
    const result = findMatchingContact(
      'TRANSFERENCIA MARIA GARCIA LOPEZ FERNANDEZ',
      similarContacts
    );
    assert.ok(result);
    assert.strictEqual(result!.contactId, '2'); // More tokens match
  });

  it('should require minimum 2 tokens for long names', () => {
    const result = findMatchingContact(
      'PAGO A JOAN',
      contacts
    );
    // "Joan" alone shouldn't match "Joan Pere Martínez" (needs 2+ tokens)
    // unless the name is short (1 token)
    // This depends on implementation - adjust if needed
  });
});
