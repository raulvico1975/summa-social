// scripts/demo/seed-cli.ts
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

type DemoMode = 'short' | 'work';

function loadEnvFile(envPath: string) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    // DEMO: mai injectar GOOGLE_APPLICATION_CREDENTIALS (forcem ADC)
    if (key === 'GOOGLE_APPLICATION_CREDENTIALS') continue;
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseMode(argv: string[]): DemoMode {
  const i = argv.indexOf('--mode');
  if (i !== -1) {
    const v = argv[i + 1] as DemoMode | undefined;
    if (v === 'short' || v === 'work') return v;
  }
  return 'short';
}

async function main() {
  const repoRoot = process.cwd();
  const envDemoPath = path.join(repoRoot, '.env.demo');
  loadEnvFile(envDemoPath);

  // Força env demo (coherent amb la resta del sistema)
  process.env.APP_ENV = process.env.APP_ENV || 'demo';
  process.env.NEXT_PUBLIC_APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || 'demo';

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!projectId || !storageBucket) {
    console.error('[demo:seed] ERROR: Falta config Firebase DEMO a .env.demo (PROJECT_ID / STORAGE_BUCKET).');
    process.exit(1);
  }

  const mode = parseMode(process.argv);

  // DEMO: forçar ADC i ignorar qualsevol service account local
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('[demo:seed] Ignorant GOOGLE_APPLICATION_CREDENTIALS en DEMO (forçant ADC)');
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  try {
    if (getApps().length === 0) {
      initializeApp({
        credential: applicationDefault(),
        projectId,
        storageBucket,
      });
    }

    const db = getFirestore();
    const bucket = getStorage().bucket();

    const { runDemoSeed } = await import('../../src/scripts/demo/seed-demo');

    console.log(`[demo:seed] Iniciant seed DEMO (${mode})...`);
    const counts = await runDemoSeed(db as any, bucket as any, mode);

    console.log('[demo:seed] OK:', counts);
    process.exit(0);
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[demo:seed] ERROR:', msg);

    if (msg.includes('Could not load the default credentials') || msg.includes('default credentials')) {
      console.error(
        '[demo:seed] HINT: executa una vegada:\n' +
        '  gcloud auth application-default login\n' +
        'i torna a provar.'
      );
    }

    process.exit(1);
  }
}

void main();
