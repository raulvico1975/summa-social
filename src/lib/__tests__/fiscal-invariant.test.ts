/**
 * Tests unitaris per als invariants fiscals A1-A3
 *
 * Executa amb: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  assertFiscalTxCanBeSaved,
  isFiscalTxValid,
  type FiscalTxCandidate,
} from '../fiscal/assertFiscalInvariant';

// =============================================================================
// HELPERS
// =============================================================================

const mockContext = {
  orgId: 'test-org',
  operation: 'createReturn' as const,
  route: '/test',
  // No passem firestore per evitar reportar incidents en tests
};

// =============================================================================
// TESTS: A1 - contactId segons tipus
// =============================================================================

describe('A1: contactId segons tipus', () => {
  describe('Returns', () => {
    it('llença error si return sense contactId (null)', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'return',
        amount: -100,
        contactId: null,
      };

      assert.throws(
        () => assertFiscalTxCanBeSaved(tx, mockContext),
        /A1_VIOLATED.*contactId/
      );
    });

    it('llença error si return sense contactId (undefined)', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'return',
        amount: -100,
        // contactId undefined
      };

      assert.throws(
        () => assertFiscalTxCanBeSaved(tx, mockContext),
        /A1_VIOLATED/
      );
    });

    it('passa si return amb contactId', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'return',
        amount: -100,
        contactId: 'donor-123',
      };

      assert.doesNotThrow(() => assertFiscalTxCanBeSaved(tx, mockContext));
    });
  });

  describe('Remittance IN (quotes positives)', () => {
    it('llença error si remittance IN sense contactId', () => {
      const tx: FiscalTxCandidate = {
        source: 'remittance',
        amount: 100, // positiu = quota IN
        contactId: null,
      };

      assert.throws(
        () => assertFiscalTxCanBeSaved(tx, mockContext),
        /A1_VIOLATED.*Remittance IN/
      );
    });

    it('passa si remittance IN amb contactId', () => {
      const tx: FiscalTxCandidate = {
        source: 'remittance',
        amount: 100,
        contactId: 'donor-123',
      };

      assert.doesNotThrow(() => assertFiscalTxCanBeSaved(tx, mockContext));
    });

    it('no valida contactId per remittance OUT (negatiu)', () => {
      // Remittance OUT (negatiu) no requereix contactId obligatori
      const tx: FiscalTxCandidate = {
        source: 'remittance',
        amount: -100, // negatiu = no és quota IN
        contactId: null,
      };

      // No hauria de fallar per A1 (remittance OUT no requereix contactId)
      assert.doesNotThrow(() => assertFiscalTxCanBeSaved(tx, mockContext));
    });
  });

  describe('Fees', () => {
    it('llença error si fee amb contactId', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'fee',
        amount: -10,
        contactId: 'donor-123', // MAI ha de tenir contactId
      };

      assert.throws(
        () => assertFiscalTxCanBeSaved(tx, mockContext),
        /A1_VIOLATED.*must NOT have contactId/
      );
    });

    it('passa si fee sense contactId', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'fee',
        amount: -10,
        contactId: null,
      };

      assert.doesNotThrow(() => assertFiscalTxCanBeSaved(tx, mockContext));
    });
  });

  describe('Stripe donations (excepció controlada)', () => {
    it('passa si stripe donation sense contactId', () => {
      const tx: FiscalTxCandidate = {
        source: 'stripe',
        transactionType: 'donation',
        amount: 100,
        contactId: null, // Permès per Stripe
      };

      assert.doesNotThrow(() => assertFiscalTxCanBeSaved(tx, mockContext));
    });

    it('passa si stripe donation amb contactId', () => {
      const tx: FiscalTxCandidate = {
        source: 'stripe',
        transactionType: 'donation',
        amount: 100,
        contactId: 'donor-123',
      };

      assert.doesNotThrow(() => assertFiscalTxCanBeSaved(tx, mockContext));
    });
  });
});

// =============================================================================
// TESTS: A2 - Coherència de signes (amount)
// =============================================================================

describe('A2: Coherència de signes (amount)', () => {
  describe('Returns', () => {
    it('llença error si return amb amount positiu', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'return',
        amount: 100, // Ha de ser negatiu!
        contactId: 'donor-123',
      };

      assert.throws(
        () => assertFiscalTxCanBeSaved(tx, mockContext),
        /A2_VIOLATED.*negative/
      );
    });

    it('llença error si return amb amount zero', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'return',
        amount: 0,
        contactId: 'donor-123',
      };

      assert.throws(
        () => assertFiscalTxCanBeSaved(tx, mockContext),
        /A2_VIOLATED/
      );
    });

    it('passa si return amb amount negatiu', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'return',
        amount: -100,
        contactId: 'donor-123',
      };

      assert.doesNotThrow(() => assertFiscalTxCanBeSaved(tx, mockContext));
    });
  });

  describe('Donations', () => {
    it('llença error si donation amb amount negatiu', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'donation',
        amount: -100, // Ha de ser positiu!
        contactId: 'donor-123',
      };

      assert.throws(
        () => assertFiscalTxCanBeSaved(tx, mockContext),
        /A2_VIOLATED.*positive/
      );
    });

    it('llença error si donation amb amount zero', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'donation',
        amount: 0,
        contactId: 'donor-123',
      };

      assert.throws(
        () => assertFiscalTxCanBeSaved(tx, mockContext),
        /A2_VIOLATED/
      );
    });

    it('passa si donation amb amount positiu', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'donation',
        amount: 100,
        contactId: 'donor-123',
      };

      assert.doesNotThrow(() => assertFiscalTxCanBeSaved(tx, mockContext));
    });
  });

  describe('Fees', () => {
    it('llença error si fee amb amount positiu', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'fee',
        amount: 10, // Ha de ser negatiu!
        contactId: null,
      };

      assert.throws(
        () => assertFiscalTxCanBeSaved(tx, mockContext),
        /A2_VIOLATED.*negative/
      );
    });

    it('llença error si fee amb amount zero', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'fee',
        amount: 0,
        contactId: null,
      };

      assert.throws(
        () => assertFiscalTxCanBeSaved(tx, mockContext),
        /A2_VIOLATED/
      );
    });

    it('passa si fee amb amount negatiu', () => {
      const tx: FiscalTxCandidate = {
        transactionType: 'fee',
        amount: -10,
        contactId: null,
      };

      assert.doesNotThrow(() => assertFiscalTxCanBeSaved(tx, mockContext));
    });
  });
});

// =============================================================================
// TESTS: isFiscalTxValid (versió soft)
// =============================================================================

describe('isFiscalTxValid', () => {
  it('retorna true per transacció vàlida', () => {
    const tx: FiscalTxCandidate = {
      transactionType: 'return',
      amount: -100,
      contactId: 'donor-123',
    };

    assert.strictEqual(isFiscalTxValid(tx), true);
  });

  it('retorna false per transacció invàlida', () => {
    const tx: FiscalTxCandidate = {
      transactionType: 'return',
      amount: 100, // Invalid: positiu
      contactId: 'donor-123',
    };

    assert.strictEqual(isFiscalTxValid(tx), false);
  });
});

// =============================================================================
// TESTS: Casos combinats
// =============================================================================

describe('Casos combinats', () => {
  it('valida return complet correctament', () => {
    const tx: FiscalTxCandidate = {
      transactionType: 'return',
      amount: -50.25,
      contactId: 'donor-abc',
      source: 'remittance',
    };

    assert.doesNotThrow(() => assertFiscalTxCanBeSaved(tx, mockContext));
  });

  it('falla en el primer invariant violat (A1 abans d\'A2)', () => {
    const tx: FiscalTxCandidate = {
      transactionType: 'return',
      amount: 100, // Violació A2
      contactId: null, // Violació A1
    };

    // Hauria de fallar primer per A1
    assert.throws(
      () => assertFiscalTxCanBeSaved(tx, mockContext),
      /A1_VIOLATED/
    );
  });
});
