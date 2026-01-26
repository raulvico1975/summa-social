// ═══════════════════════════════════════════════════════════════════════════════
// TESTS - Model 182 AEAT Format
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  encodeLatin1,
  sanitizeAlpha,
  invertName,
  formatNIF,
  formatPhone,
  formatAmount,
  padZeros,
  calculateDeductionPct,
  calculateRecurrence,
  generateModel182AEATFile,
  RecordBuilder,
  type DonationReportRow,
} from '../model182-aeat';
import type { Organization } from '../data';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - formatNIF (validació estricta, mai maquilla)
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatNIF', () => {
  it('retorna value correcte per NIF de 9 chars vàlid (CIF)', () => {
    const result = formatNIF('B12345678');
    assert.strictEqual(result.value, 'B12345678');
    assert.strictEqual(result.error, null);
  });

  it('retorna value correcte per NIF de 9 chars vàlid (DNI)', () => {
    const result = formatNIF('12345678A');
    assert.strictEqual(result.value, '12345678A');
    assert.strictEqual(result.error, null);
  });

  it('retorna error per NIF de 8 chars (massa curt)', () => {
    const result = formatNIF('B1234567');
    assert.strictEqual(result.value, '000000000');
    assert.ok(result.error?.includes('longitud incorrecta (8)'));
  });

  it('neteja guions i retorna correctament si longitud final és 9', () => {
    const result = formatNIF('B-12345678');
    assert.strictEqual(result.value, 'B12345678');
    assert.strictEqual(result.error, null);
  });

  it('neteja punts i retorna correctament si longitud final és 9', () => {
    const result = formatNIF('B.1234.5678');
    assert.strictEqual(result.value, 'B12345678');
    assert.strictEqual(result.error, null);
  });

  it('retorna error per NIF buit', () => {
    const result = formatNIF('');
    assert.strictEqual(result.value, '000000000');
    assert.strictEqual(result.error, 'NIF buit');
  });

  it('retorna error per NIF amb només espais', () => {
    const result = formatNIF('   ');
    assert.strictEqual(result.value, '000000000');
    assert.strictEqual(result.error, 'NIF buit');
  });

  it('retorna error per NIF amb caràcters invàlids', () => {
    const result = formatNIF('B1234567ñ');
    assert.strictEqual(result.value, '000000000');
    assert.ok(result.error?.includes('caràcters invàlids'));
  });

  it('retorna error per undefined', () => {
    const result = formatNIF(undefined);
    assert.strictEqual(result.value, '000000000');
    assert.strictEqual(result.error, 'NIF buit');
  });

  it('retorna error per null', () => {
    const result = formatNIF(null);
    assert.strictEqual(result.value, '000000000');
    assert.strictEqual(result.error, 'NIF buit');
  });

  it('converteix a majúscules', () => {
    const result = formatNIF('b12345678');
    assert.strictEqual(result.value, 'B12345678');
    assert.strictEqual(result.error, null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - formatPhone (robust amb prefixos)
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatPhone', () => {
  it('retorna telèfon de 9 dígits directament', () => {
    assert.strictEqual(formatPhone('612345678'), '612345678');
  });

  it('elimina prefix +34', () => {
    assert.strictEqual(formatPhone('+34612345678'), '612345678');
  });

  it('elimina prefix 34 (11 dígits)', () => {
    assert.strictEqual(formatPhone('34612345678'), '612345678');
  });

  it('elimina espais i prefix 0034', () => {
    assert.strictEqual(formatPhone('0034 612 345 678'), '612345678');
  });

  it('elimina espais entre dígits', () => {
    assert.strictEqual(formatPhone('612 34 56 78'), '612345678');
  });

  it('retorna zeros per telèfon massa curt', () => {
    assert.strictEqual(formatPhone('12345'), '000000000');
  });

  it('retorna zeros per telèfon buit', () => {
    assert.strictEqual(formatPhone(''), '000000000');
  });

  it('retorna zeros per undefined', () => {
    assert.strictEqual(formatPhone(undefined), '000000000');
  });

  it('retorna zeros per null', () => {
    assert.strictEqual(formatPhone(null), '000000000');
  });

  it('elimina guions i parèntesis', () => {
    assert.strictEqual(formatPhone('(612) 345-678'), '612345678');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - invertName
// ═══════════════════════════════════════════════════════════════════════════════

describe('invertName', () => {
  it('inverteix "Maria Garcia López" a "Garcia López Maria"', () => {
    assert.strictEqual(invertName('Maria Garcia López'), 'Garcia López Maria');
  });

  it('retorna nom sense canvis si només té una paraula', () => {
    assert.strictEqual(invertName('Joan'), 'Joan');
  });

  it('retorna string buit per undefined', () => {
    assert.strictEqual(invertName(undefined), '');
  });

  it('retorna string buit per null', () => {
    assert.strictEqual(invertName(null), '');
  });

  it('gestiona múltiples espais', () => {
    assert.strictEqual(invertName('Maria   Garcia   López'), 'Garcia López Maria');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - sanitizeAlpha
// ═══════════════════════════════════════════════════════════════════════════════

describe('sanitizeAlpha', () => {
  it('elimina accents: "García" → "GARCIA"', () => {
    const result = sanitizeAlpha('García', 10);
    assert.strictEqual(result.trim(), 'GARCIA');
  });

  it('converteix a majúscules i elimina caràcters especials', () => {
    const result = sanitizeAlpha('Núñez-Pérez', 15);
    assert.strictEqual(result.trim(), 'NUNEZ PEREZ');
  });

  it('només permet A-Z 0-9 espai', () => {
    const result = sanitizeAlpha('Test@123#', 10);
    assert.strictEqual(result.trim(), 'TEST 123');
  });

  it('talla a maxLen i fa padding amb espais', () => {
    const result = sanitizeAlpha('ABCDEFGHIJ', 5);
    assert.strictEqual(result, 'ABCDE');
    assert.strictEqual(result.length, 5);
  });

  it('fa padding amb espais si és més curt', () => {
    const result = sanitizeAlpha('AB', 5);
    assert.strictEqual(result, 'AB   ');
    assert.strictEqual(result.length, 5);
  });

  it('retorna espais per undefined', () => {
    const result = sanitizeAlpha(undefined, 5);
    assert.strictEqual(result, '     ');
    assert.strictEqual(result.length, 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - calculateDeductionPct (IRPF vs IS)
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateDeductionPct', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // PERSONA FÍSICA (IRPF)
  // ─────────────────────────────────────────────────────────────────────────────
  it('PF: 200€ → 80% (primers 250€)', () => {
    assert.strictEqual(calculateDeductionPct(200, 'individual', false), '08000');
  });

  it('PF: 250€ → 80% (límit exacte)', () => {
    assert.strictEqual(calculateDeductionPct(250, 'individual', false), '08000');
  });

  it('PF: 300€ no recurrent → 40%', () => {
    assert.strictEqual(calculateDeductionPct(300, 'individual', false), '04000');
  });

  it('PF: 300€ recurrent → 45%', () => {
    assert.strictEqual(calculateDeductionPct(300, 'individual', true), '04500');
  });

  it('PF: 1000€ no recurrent → 40%', () => {
    assert.strictEqual(calculateDeductionPct(1000, 'individual', false), '04000');
  });

  it('PF: 1000€ recurrent → 45%', () => {
    assert.strictEqual(calculateDeductionPct(1000, 'individual', true), '04500');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PERSONA JURÍDICA (IS)
  // ─────────────────────────────────────────────────────────────────────────────
  it('PJ: 1000€ no recurrent → 40%', () => {
    assert.strictEqual(calculateDeductionPct(1000, 'company', false), '04000');
  });

  it('PJ: 1000€ recurrent → 50%', () => {
    assert.strictEqual(calculateDeductionPct(1000, 'company', true), '05000');
  });

  it('PJ: 200€ no recurrent → 40% (no aplica 80% a PJ)', () => {
    assert.strictEqual(calculateDeductionPct(200, 'company', false), '04000');
  });

  it('PJ: 200€ recurrent → 50%', () => {
    assert.strictEqual(calculateDeductionPct(200, 'company', true), '05000');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - calculateRecurrence
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateRecurrence', () => {
  it('retorna "1" si valor1>0 i valor2>0 (recurrent)', () => {
    assert.strictEqual(calculateRecurrence(100, 100), '1');
  });

  it('retorna "2" si valor1=0 i valor2=0 (no recurrent)', () => {
    assert.strictEqual(calculateRecurrence(0, 0), '2');
  });

  it('retorna " " si només un any té import', () => {
    assert.strictEqual(calculateRecurrence(100, 0), ' ');
    assert.strictEqual(calculateRecurrence(0, 100), ' ');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - formatAmount
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatAmount', () => {
  it('formata import amb decimals implícits', () => {
    assert.strictEqual(formatAmount(1234.56, 15), '000000000123456');
  });

  it('formata import enter', () => {
    assert.strictEqual(formatAmount(100, 13), '0000000010000');
  });

  it('arrodoneix correctament', () => {
    assert.strictEqual(formatAmount(99.999, 10), '0000010000');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - padZeros
// ═══════════════════════════════════════════════════════════════════════════════

describe('padZeros', () => {
  it("afegeix zeros a l'esquerra", () => {
    assert.strictEqual(padZeros(42, 5), '00042');
  });

  it('no talla si ja té la longitud', () => {
    assert.strictEqual(padZeros(12345, 5), '12345');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - encodeLatin1
// ═══════════════════════════════════════════════════════════════════════════════

describe('encodeLatin1', () => {
  it('converteix caràcter a caràcter a bytes', () => {
    const result = encodeLatin1('ABC');
    assert.strictEqual(result.error, null);
    assert.strictEqual(result.bytes.length, 3);
    assert.strictEqual(result.bytes[0], 65); // A
    assert.strictEqual(result.bytes[1], 66); // B
    assert.strictEqual(result.bytes[2], 67); // C
  });

  it('falla amb error si char > 255 (emoji)', () => {
    const result = encodeLatin1('Test 😀');
    assert.notStrictEqual(result.error, null);
    assert.ok(result.error?.includes('no vàlid per ISO-8859-1'));
    assert.strictEqual(result.bytes.length, 0);
  });

  it('accepta caràcters Latin-1 vàlids (ñ, ü, etc.)', () => {
    const result = encodeLatin1('ñüé');
    assert.strictEqual(result.error, null);
    assert.strictEqual(result.bytes.length, 3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GENERACIÓ FITXER COMPLET
// ═══════════════════════════════════════════════════════════════════════════════

describe('generateModel182AEATFile', () => {
  const validOrganization: Organization = {
    id: 'test-org',
    name: 'Entitat Test S.L.',
    slug: 'test',
    taxId: 'G12345678',
    status: 'active',
    createdAt: '2024-01-01',
    createdBy: 'admin',
    phone: '612345678',
    signatoryName: 'Maria Garcia López',
    signatoryRole: 'Presidenta',
  };

  const validDonors: DonationReportRow[] = [
    {
      donor: {
        name: 'Joan Prat Soler',
        taxId: '12345678A',
        zipCode: '08001',
        donorType: 'individual',
      },
      totalAmount: 500,
      previousYearAmount: 300,
      twoYearsAgoAmount: 200,
    },
    {
      donor: {
        name: 'Empresa Example S.L.',
        taxId: 'B87654321',
        zipCode: '28001',
        donorType: 'company',
      },
      totalAmount: 1000,
      previousYearAmount: 0,
      twoYearsAgoAmount: 0,
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // LONGITUD REGISTRES
  // ─────────────────────────────────────────────────────────────────────────────

  it('genera registre tipus 1 de exactament 250 caràcters', () => {
    const result = generateModel182AEATFile(validOrganization, validDonors, 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    assert.strictEqual(lines[0].length, 250);
    assert.strictEqual(lines[0].startsWith('1182'), true);
  });

  it('genera registre tipus 2 de exactament 250 caràcters', () => {
    const result = generateModel182AEATFile(validOrganization, validDonors, 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    assert.strictEqual(lines[1].length, 250);
    assert.strictEqual(lines[1].startsWith('2182'), true);
  });

  it('fitxer complet amb 2 donants: 3 línies de 250 chars + CRLF', () => {
    const result = generateModel182AEATFile(validOrganization, validDonors, 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n');
    // 3 línies + 1 buit al final (per l'últim CRLF)
    assert.strictEqual(lines.length, 4);
    assert.strictEqual(lines[0].length, 250);
    assert.strictEqual(lines[1].length, 250);
    assert.strictEqual(lines[2].length, 250);
    assert.strictEqual(lines[3], ''); // Després de l'últim CRLF
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // NATURALESA F/J
  // ─────────────────────────────────────────────────────────────────────────────

  it('donorType "individual" genera "F" a posició 105', () => {
    const result = generateModel182AEATFile(validOrganization, [validDonors[0]], 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    // Posició 105 (1-indexed) = índex 104 (0-indexed)
    assert.strictEqual(lines[1][104], 'F');
  });

  it('donorType "company" genera "J" a posició 105', () => {
    const result = generateModel182AEATFile(validOrganization, [validDonors[1]], 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    assert.strictEqual(lines[1][104], 'J');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // NOM DECLARAT - PF invertit, PJ tal qual
  // ─────────────────────────────────────────────────────────────────────────────

  it('PF: nom invertit (cognoms + nom)', () => {
    const pfDonor: DonationReportRow = {
      donor: {
        name: 'Maria García López',
        taxId: '12345678A',
        zipCode: '08001',
        donorType: 'individual',
      },
      totalAmount: 100,
    };
    const result = generateModel182AEATFile(validOrganization, [pfDonor], 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    // Posicions 36-75 (1-indexed) = índexs 35-74 (0-indexed)
    const nomDeclarat = lines[1].substring(35, 75).trim();
    // Ha de ser "GARCIA LOPEZ MARIA" (invertit)
    assert.ok(nomDeclarat.startsWith('GARCIA LOPEZ'), `Esperat cognoms primer, rebut: ${nomDeclarat}`);
    assert.ok(nomDeclarat.includes('MARIA'), `Esperat nom al final, rebut: ${nomDeclarat}`);
  });

  it('PJ: nom NO invertit (denominació social tal qual)', () => {
    const pjDonor: DonationReportRow = {
      donor: {
        name: 'Marmotte Petite S.L.',
        taxId: 'B12345678',
        zipCode: '08001',
        donorType: 'company',
      },
      totalAmount: 1000,
    };
    const result = generateModel182AEATFile(validOrganization, [pjDonor], 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    const nomDeclarat = lines[1].substring(35, 75).trim();
    // Ha de ser "MARMOTTE PETITE S L" (tal qual, sense invertir)
    // NO ha de tenir "S L" al mig com si fos cognom
    assert.ok(nomDeclarat.startsWith('MARMOTTE'), `Esperat denominació sense invertir, rebut: ${nomDeclarat}`);
    assert.ok(!nomDeclarat.startsWith('S L'), `NO ha d'estar invertit, rebut: ${nomDeclarat}`);
    assert.ok(!nomDeclarat.startsWith('PETITE'), `NO ha d'estar invertit, rebut: ${nomDeclarat}`);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDACIÓ BLOQUEJANT - ORGANITZACIÓ
  // ─────────────────────────────────────────────────────────────────────────────

  it('error bloquejant si org.taxId invàlid', () => {
    const invalidOrg = { ...validOrganization, taxId: 'B123' };
    const result = generateModel182AEATFile(invalidOrg, validDonors, 2024);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors[0].includes('CIF'));
    assert.strictEqual(result.content, '');
  });

  it('error bloquejant si org.name buit', () => {
    const invalidOrg = { ...validOrganization, name: '' };
    const result = generateModel182AEATFile(invalidOrg, validDonors, 2024);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some((e) => e.includes('denominació')));
    assert.strictEqual(result.content, '');
  });

  it('error bloquejant si org.signatoryName buit', () => {
    const invalidOrg = { ...validOrganization, signatoryName: '' };
    const result = generateModel182AEATFile(validOrganization, validDonors, 2024);
    // Arreglo: usar invalidOrg, no validOrganization
    const result2 = generateModel182AEATFile(invalidOrg, validDonors, 2024);
    assert.ok(result2.errors.length > 0);
    assert.ok(result2.errors.some((e) => e.includes('contacte')));
    assert.strictEqual(result2.content, '');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPORT PARCIAL AMB EXCLUSIONS - Donants invàlids s'exclouen
  // ─────────────────────────────────────────────────────────────────────────────

  it('2 donants, 1 invàlid → fitxer amb 1 registre tipus 2, excludedCount=1', () => {
    const mixedDonors: DonationReportRow[] = [
      {
        donor: {
          name: 'Donant Valid',
          taxId: '12345678A',
          zipCode: '08001',
          donorType: 'individual',
        },
        totalAmount: 100,
      },
      {
        donor: {
          name: 'Donant Invalid',
          taxId: '', // NIF buit
          zipCode: '08001',
          donorType: 'individual',
        },
        totalAmount: 50,
      },
    ];
    const result = generateModel182AEATFile(validOrganization, mixedDonors, 2024);

    // No hi ha errors bloquejants (org és vàlida)
    assert.strictEqual(result.errors.length, 0);
    // Hi ha 1 donant inclòs i 1 exclòs
    assert.strictEqual(result.includedCount, 1);
    assert.strictEqual(result.excludedCount, 1);
    // L'exclòs ha de contenir el nom i el motiu
    assert.ok(result.excluded.some((e) => e.includes('Donant Invalid') && e.includes('NIF buit')));
    // El fitxer conté registre tipus 2
    assert.ok(result.content.includes('2182'));
    // Només 1 registre tipus 2 (1 línia tipus 2)
    const lines = result.content.split('\r\n').filter((l) => l.startsWith('2182'));
    assert.strictEqual(lines.length, 1);
  });

  it('donant amb múltiples errors → tots els motius a excluded', () => {
    const donorWithMultipleErrors: DonationReportRow[] = [
      {
        donor: {
          name: 'Donant Molt Invàlid',
          taxId: '', // NIF buit
          zipCode: '', // CP incomplet
          // donorType absent
        },
        totalAmount: 100,
      },
    ];
    const result = generateModel182AEATFile(validOrganization, donorWithMultipleErrors, 2024);

    // Cap donant vàlid → error
    assert.ok(result.errors.some((e) => e.includes('Cap donant vàlid')));
    assert.strictEqual(result.content, '');
    assert.strictEqual(result.includedCount, 0);
    assert.strictEqual(result.excludedCount, 1);
    // L'exclusió ha de contenir els 3 motius
    const exclusionMsg = result.excluded[0];
    assert.ok(exclusionMsg.includes('NIF buit'));
    assert.ok(exclusionMsg.includes('codi postal incomplet'));
    assert.ok(exclusionMsg.includes('tipus (F/J) absent'));
  });

  it('tots invàlids → includedCount=0, error "Cap donant vàlid"', () => {
    const allInvalidDonors: DonationReportRow[] = [
      {
        donor: {
          name: 'Bad1',
          taxId: '',
          zipCode: '08001',
          donorType: 'individual',
        },
        totalAmount: 100,
      },
      {
        donor: {
          name: 'Bad2',
          taxId: '123', // longitud incorrecta
          zipCode: '',
          donorType: 'individual',
        },
        totalAmount: 50,
      },
    ];
    const result = generateModel182AEATFile(validOrganization, allInvalidDonors, 2024);

    assert.strictEqual(result.includedCount, 0);
    assert.strictEqual(result.excludedCount, 2);
    assert.ok(result.errors.some((e) => e.includes('Cap donant vàlid per exportar')));
    assert.strictEqual(result.content, '');
  });

  it('error org → bloquejant, no processa donants', () => {
    const badOrg = { ...validOrganization, taxId: 'invalid' };
    const result = generateModel182AEATFile(badOrg, validDonors, 2024);

    assert.ok(result.errors.length > 0);
    assert.strictEqual(result.content, '');
    // Els excluded han de ser 0 perquè no es processen donants si org és invàlida
    assert.strictEqual(result.excludedCount, 0);
  });

  it('genera fitxer amb tots els donants vàlids si no hi ha errors', () => {
    const result = generateModel182AEATFile(validOrganization, validDonors, 2024);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.excludedCount, 0);
    assert.strictEqual(result.includedCount, 2);
    assert.ok(result.content.length > 0);
    assert.ok(result.content.includes('1182'));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CAMPS ESPECÍFICS
  // ─────────────────────────────────────────────────────────────────────────────

  it("inclou el NIF de l'organització al registre tipus 1", () => {
    const result = generateModel182AEATFile(validOrganization, validDonors, 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    // Posicions 9-17 (1-indexed) = índexs 8-16 (0-indexed)
    const nifDeclarant = lines[0].substring(8, 17);
    assert.strictEqual(nifDeclarant, 'G12345678');
  });

  it('inclou el total de donants al registre tipus 1', () => {
    const result = generateModel182AEATFile(validOrganization, validDonors, 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    // Posicions 136-144 (1-indexed) = índexs 135-143 (0-indexed)
    const totalDonants = lines[0].substring(135, 144);
    assert.strictEqual(totalDonants, '000000002');
  });

  it("inclou l'any d'exercici correctament", () => {
    const result = generateModel182AEATFile(validOrganization, validDonors, 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    // Posicions 5-8 (1-indexed) = índexs 4-7 (0-indexed)
    const exercici = lines[0].substring(4, 8);
    assert.strictEqual(exercici, '2024');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // JUSTIFICANT - Format 182 + any + 6 dígits aleatoris (error 1011 AEAT)
  // ─────────────────────────────────────────────────────────────────────────────

  it('justificant NO és tot zeros (error 1011 AEAT)', () => {
    const result = generateModel182AEATFile(validOrganization, validDonors, 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    // Posicions 108-120 (1-indexed) = índexs 107-119 (0-indexed)
    const justificant = lines[0].substring(107, 120);
    assert.notStrictEqual(justificant, '0000000000000', 'El justificant no pot ser tot zeros');
  });

  it('justificant comença per "182" i té 13 caràcters', () => {
    const result = generateModel182AEATFile(validOrganization, validDonors, 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    const justificant = lines[0].substring(107, 120);
    assert.strictEqual(justificant.length, 13);
    assert.ok(justificant.startsWith('182'), `El justificant ha de començar per "182", rebut: ${justificant}`);
  });

  it("justificant conté l'any d'exercici (posicions 4-7)", () => {
    const result = generateModel182AEATFile(validOrganization, validDonors, 2024);
    assert.strictEqual(result.errors.length, 0);

    const lines = result.content.split('\r\n').filter((l) => l.length > 0);
    const justificant = lines[0].substring(107, 120);
    // Format: 182 + YYYY + 6 dígits → l'any és a posicions 3-6 (0-indexed dins justificant)
    const anyJustificant = justificant.substring(3, 7);
    assert.strictEqual(anyJustificant, '2024');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RECORD BUILDER - Asserts de rang
// ═══════════════════════════════════════════════════════════════════════════════

describe('RecordBuilder', () => {
  it('llença error si startPos < 1', () => {
    assert.throws(() => new RecordBuilder().setRange(0, 'test'));
  });

  it('llença error si valor excedeix 250', () => {
    // Posició 248 + 4 chars = posicions 248-251 (excedeix 250)
    assert.throws(() => new RecordBuilder().setRange(248, '1234'));
  });

  it('accepta valor que acaba exactament a posició 250', () => {
    // Posició 248 + 3 chars = posicions 248-250 (exacte)
    assert.doesNotThrow(() => new RecordBuilder().setRange(248, '123'));
  });
});
