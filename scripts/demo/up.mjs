// scripts/demo/up.mjs
import { spawn, execSync } from 'node:child_process';
import process from 'node:process';
import http from 'node:http';

function parseMode(argv) {
  const i = argv.indexOf('--mode');
  if (i !== -1) {
    const v = argv[i + 1];
    if (v === 'short' || v === 'work') return v;
  }
  return 'short';
}

function killPort9002IfNeeded() {
  try {
    const pids = execSync('lsof -ti :9002', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);

    if (pids.length === 0) return;

    console.log(`[demo:up] Port 9002 ocupat. Aturant PID(s): ${pids.join(', ')}`);
    for (const pid of pids) {
      try { execSync(`kill -9 ${pid}`); } catch {}
    }
  } catch {
    // lsof pot retornar exit code 1 si no hi ha PIDs — OK
  }
}

function waitForServer(url = 'http://localhost:9002', timeoutMs = 20000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Timeout esperant servidor DEMO a localhost:9002'));
        return;
      }

      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });

      req.on('error', () => setTimeout(tick, 300));
    };

    tick();
  });
}

function openBrowser(url) {
  try {
    execSync(`open "${url}"`);
  } catch {
    console.log(`[demo:up] Obre manualment: ${url}`);
  }
}

function runSeed(mode) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      ['--import', 'tsx', 'scripts/demo/seed-cli.ts', '--mode', mode],
      { stdio: 'inherit' }
    );

    child.on('exit', (code) => {
      if (code === 0) resolve(true);
      else reject(new Error(`Seed DEMO ha fallat (exit ${code})`));
    });
  });
}

async function main() {
  const mode = parseMode(process.argv);
  console.log(`[demo:up] Mode: ${mode}`);

  killPort9002IfNeeded();

  console.log('[demo:up] Arrencant servidor DEMO...');
  const dev = spawn('node', ['scripts/run-demo-dev.mjs'], { stdio: 'inherit' });

  const stop = () => {
    try { dev.kill('SIGINT'); } catch {}
    process.exit(0);
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  try {
    await waitForServer('http://localhost:9002');
    console.log('[demo:up] Servidor OK. Executant seed...');
    await runSeed(mode);
    console.log('[demo:up] Obrint navegador...');
    openBrowser('http://localhost:9002/demo');

    console.log('[demo:up] DEMO a punt. (Ctrl+C per aturar)');
  } catch (e) {
    console.error('[demo:up] ERROR:', e?.message || e);
    stop();
  }
}

await main();
