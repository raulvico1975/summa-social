/**
 * Genera fitxers de demo per a importadors
 *
 * Executa: npx tsx src/scripts/demo/generate-demo-files.ts
 *
 * Genera:
 * - remesa-quotes-demo.csv (SEPA IN - 8 socis)
 * - devolucions-banc-demo.csv (3 devolucions)
 * - stripe-payout-demo.csv (6 donacions + fee)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  FIRST_NAMES,
  LAST_NAMES,
  createSeededRandom,
  pickRandom,
  generateNIF,
  generateIBAN,
} from './demo-data';

const SEED = 42; // Mateix seed que demo-generators.ts
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'demo-files');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Replica exactament la generació de donants del seed per obtenir els mateixos valors
function generateDonorsData(count: number) {
  const random = createSeededRandom(SEED);
  const donors: Array<{
    name: string;
    taxId: string;
    iban: string;
    isCompany: boolean;
  }> = [];

  for (let i = 0; i < count; i++) {
    const isCompany = random() < 0.2;
    const isRecurring = random() < 0.6;

    let name: string;
    let taxId: string;

    if (isCompany) {
      // Saltar els camps que es generen per empreses
      const _prefix = ['Serveis', 'Gestió', 'Innovació', 'Taller'][Math.floor(random() * 4)];
      const _suffix = ['Mediterrani', 'Catalunya', 'Pirineus', 'Costa'][Math.floor(random() * 4)];
      name = `${_prefix} ${_suffix}`;
      // CIF
      const letters = 'ABCDEFGHJKLMNPQRSUVW';
      const letter = letters[Math.floor(random() * letters.length)];
      const num = Math.floor(random() * 10000000);
      const control = Math.floor(random() * 10);
      taxId = `${letter}${num.toString().padStart(7, '0')}${control}`;
    } else {
      const firstName = pickRandom(FIRST_NAMES, random);
      const lastName1 = pickRandom(LAST_NAMES, random);
      const lastName2 = pickRandom(LAST_NAMES, random);
      name = `${firstName} ${lastName1} ${lastName2}`;
      taxId = generateNIF(random);
    }

    // Generar IBAN només si és recurrent (igual que el seed)
    const iban = isRecurring ? generateIBAN(random) : '';

    // Consumir els altres camps per mantenir la seqüència
    random(); // phone
    random(); random(); random(); // address, city parts
    random(); // memberSince

    donors.push({ name, taxId, iban, isCompany });
  }

  return donors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generadors de fitxers
// ─────────────────────────────────────────────────────────────────────────────

function generateRemesaQuotesCSV(): string {
  const donors = generateDonorsData(20); // Necessitem els primers 8
  // Filtrar només donants amb IBAN (recurrents) i agafar els primers 8
  const donorsWithIban = donors.filter(d => d.iban);
  const sepaDonors = donorsWithIban.slice(0, 8);
  const amounts = [10, 12, 15, 20, 25, 30, 35, 50];

  // Format CSV compatible amb remittance-splitter
  // Columnes: Nom, DNI/CIF, IBAN, Import
  const lines = [
    'Nom;DNI/CIF;IBAN;Import',
  ];

  sepaDonors.forEach((donor, i) => {
    // Format import europeu: 10,00
    const amount = amounts[i].toFixed(2).replace('.', ',');
    lines.push(`${donor.name};${donor.taxId};${donor.iban};${amount}`);
  });

  return lines.join('\n');
}

function generateDevolucionsCSV(): string {
  const donors = generateDonorsData(20);
  // Agafem 3 donants amb IBAN per les devolucions
  const returnDonors = donors.filter(d => d.iban).slice(0, 3);

  // Format CSV compatible amb return-importer
  // Columnes detectables: cuenta de adeudo (IBAN), importe, fecha, nombre cliente, motivo devolución
  const lines = [
    'cuenta de adeudo;importe;fecha;nombre cliente;motivo devolucion',
  ];

  const reasons = ['MS02 - Insuficient saldo', 'AC01 - Compte tancat', 'MD01 - Sense mandat'];
  const amounts = [25.50, 15.00, 35.00];
  const currentYear = new Date().getFullYear();

  returnDonors.forEach((donor, i) => {
    const amount = amounts[i].toFixed(2).replace('.', ',');
    const date = `15/0${i + 1}/${currentYear}`;
    lines.push(`${donor.iban};${amount};${date};${donor.name};${reasons[i]}`);
  });

  return lines.join('\n');
}

function generateStripeCsv(): string {
  // Format oficial Stripe CSV
  // id,Created date (UTC),Amount,Fee,Net,Status,Transfer,Customer Email,Description,Amount Refunded

  const donors = generateDonorsData(20);
  // Donants 9-14 (índexs 8-13) per Stripe (no coincideixen amb SEPA)
  const stripeDonors = donors.slice(8, 14);
  const amounts = [25, 50, 75, 100, 150, 200];
  const currentYear = new Date().getFullYear();

  const lines = [
    'id,Created date (UTC),Amount,Fee,Net,Status,Transfer,Customer Email,Description,Amount Refunded',
  ];

  const transferId = 'po_demo_payout_001';
  let totalGross = 0;
  let totalFees = 0;

  stripeDonors.forEach((donor, i) => {
    const chargeId = `ch_demo_charge_${String(i + 1).padStart(3, '0')}`;
    const amount = amounts[i];
    const fee = parseFloat((amount * 0.029 + 0.25).toFixed(2)); // ~3% + 0.25€
    const net = parseFloat((amount - fee).toFixed(2));
    totalGross += amount;
    totalFees += fee;

    // Email: normalize name
    const email = donor.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.')
      + '@example.demo';

    lines.push(
      `${chargeId},${currentYear}-06-01 10:${String(i * 10).padStart(2, '0')}:00,${amount.toFixed(2)},${fee.toFixed(2)},${net.toFixed(2)},succeeded,${transferId},${email},Donacio online,0`
    );
  });

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  console.log('[generate-demo-files] Generant fitxers demo...');

  ensureDir(OUTPUT_DIR);

  // 1. Remesa quotes socis (SEPA IN)
  const remesaCsv = generateRemesaQuotesCSV();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'remesa-quotes-demo.csv'), remesaCsv, 'utf-8');
  console.log('  - remesa-quotes-demo.csv (8 socis)');

  // 2. Devolucions banc
  const devolucions = generateDevolucionsCSV();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'devolucions-banc-demo.csv'), devolucions, 'utf-8');
  console.log('  - devolucions-banc-demo.csv (3 devolucions)');

  // 3. Stripe payout
  const stripeCsv = generateStripeCsv();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'stripe-payout-demo.csv'), stripeCsv, 'utf-8');
  console.log('  - stripe-payout-demo.csv (6 donacions)');

  console.log('[generate-demo-files] Completat!');
  console.log(`  Fitxers a: ${OUTPUT_DIR}`);
}

main();
