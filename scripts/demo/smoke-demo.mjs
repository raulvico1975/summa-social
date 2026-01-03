#!/usr/bin/env node
/**
 * Smoke test per validar l'entorn DEMO
 *
 * Executa: npm run demo:smoke
 *
 * Valida:
 * 1. NEXT_PUBLIC_APP_ENV === 'demo'
 * 2. El servidor respon
 * 3. L'endpoint GET /api/internal/demo/seed retorna info
 *
 * Nota: El test complet de seed requereix autenticació.
 * Aquest smoke només valida que l'entorn està configurat.
 */

import { spawn } from 'child_process';

// Colors per output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logCheck(name, passed) {
  const icon = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`  ${icon} ${name}`, color);
  return passed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validacions
// ─────────────────────────────────────────────────────────────────────────────

async function checkEnvVar() {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
  return logCheck(
    `NEXT_PUBLIC_APP_ENV === 'demo' (actual: '${appEnv}')`,
    appEnv === 'demo'
  );
}

async function checkServerRunning(port = 9002) {
  try {
    const response = await fetch(`http://localhost:${port}/`, { method: 'HEAD' });
    return logCheck(
      `Servidor respon a localhost:${port} (status: ${response.status})`,
      response.status < 500
    );
  } catch (err) {
    return logCheck(`Servidor respon a localhost:${port} (error: ${err.code || err.message})`, false);
  }
}

async function checkSeedEndpoint(port = 9002) {
  try {
    const response = await fetch(`http://localhost:${port}/api/internal/demo/seed`);
    const data = await response.json();

    const hasEndpoint = data.endpoint === '/api/internal/demo/seed';
    const hasBody = data.body?.demoMode?.includes('short');

    return logCheck(
      `Endpoint seed info OK (demoMode: ${data.body?.demoMode || 'missing'})`,
      hasEndpoint && hasBody
    );
  } catch (err) {
    return logCheck(`Endpoint seed info (error: ${err.message})`, false);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants esperats
// ─────────────────────────────────────────────────────────────────────────────

const EXPECTED_COUNTS = {
  short: {
    transactions: 100,
    pdfs: 20,
    donors: 50,
    suppliers: 20,
    workers: 8,
    projects: 4,
    offBankExpenses: 30,
    expenseLinks: 20,
  },
  work: {
    // Work té anomalies afegides
    transactionsMin: 100, // base + duplicats + pendents + traçabilitat
    pdfs: 20,
  },
};

function printExpectedCounts() {
  log('\n📊 Volums esperats:', 'cyan');
  log('  Mode Short:', 'yellow');
  Object.entries(EXPECTED_COUNTS.short).forEach(([k, v]) => {
    log(`    ${k}: ${v}`);
  });
  log('  Mode Work:', 'yellow');
  log('    (base Short + 3 duplicats + 5 pendents + 3 traçabilitat)');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  log('\n🔍 DEMO Smoke Test\n', 'cyan');

  let allPassed = true;
  const port = process.env.PORT || 9002;

  // 1. Environment
  log('1. Variables d\'entorn:', 'yellow');
  allPassed = await checkEnvVar() && allPassed;

  // 2. Servidor
  log('\n2. Servidor:', 'yellow');
  const serverRunning = await checkServerRunning(port);
  allPassed = serverRunning && allPassed;

  // 3. Endpoint (només si servidor funciona)
  if (serverRunning) {
    log('\n3. Endpoint seed:', 'yellow');
    allPassed = await checkSeedEndpoint(port) && allPassed;
  } else {
    log('\n3. Endpoint seed:', 'yellow');
    log('  ⚠ Skipped (servidor no disponible)', 'yellow');
  }

  // 4. Mostrar volums esperats
  printExpectedCounts();

  // Resultat final
  log('\n' + '─'.repeat(50), 'cyan');
  if (allPassed) {
    log('✓ Smoke test PASSED', 'green');
    log('\nPer validar el seed complet:', 'yellow');
    log('  1. npm run dev:demo');
    log('  2. Login a /admin');
    log('  3. Regenerar Short/Work');
    log('  4. Verificar volums a la resposta\n');
    process.exit(0);
  } else {
    log('✗ Smoke test FAILED', 'red');
    log('\nAssegura\'t que:', 'yellow');
    log('  1. Estàs executant amb .env.demo (npm run dev:demo)');
    log('  2. El servidor està arrencat\n');
    process.exit(1);
  }
}

main().catch((err) => {
  log(`\n✗ Error inesperat: ${err.message}`, 'red');
  process.exit(1);
});
