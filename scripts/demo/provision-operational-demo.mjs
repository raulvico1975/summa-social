#!/usr/bin/env node
/**
 * Provisiona l'acces de la demo operativa.
 *
 * Ús:
 *   npm run demo:provision
 *   npm run demo:provision -- --base-url https://.../demo
 *
 * Per defecte:
 * - Força entorn demo.
 * - Executa seed mode work.
 * - Crea/actualitza l'usuari demo a Firebase Auth.
 * - Dona rol admin dins organizations/demo-org.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const DEMO_ORG_ID = 'demo-org';
const DEFAULT_EMAIL = 'demo@summa-social.demo';
const DEFAULT_PASSWORD = 'SummaDemo2026';
const DEFAULT_DISPLAY_NAME = 'Usuari Demo Summa';

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const env = {};
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function applyEnvFile(envPath) {
  const fileEnv = parseEnvFile(envPath);
  for (const [key, value] of Object.entries(fileEnv)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function normalizeMode(value) {
  if (value === 'short' || value === 'work') return value;
  return 'work';
}

function fail(message) {
  console.error(`[demo:provision] ERROR: ${message}`);
  process.exit(1);
}

function guardDemoProject(projectId) {
  if (!projectId) {
    fail('Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID a .env.demo.');
  }

  if (projectId === 'summa-social') {
    fail('Projecte de produccio detectat. Provisionament cancel·lat.');
  }

  if (!projectId.includes('demo') && !hasArg('--allow-non-demo-project')) {
    fail(
      `Projecte "${projectId}" no sembla demo. Usa --allow-non-demo-project només si és intencionat.`
    );
  }
}

function runSeed(mode) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'scripts/demo/seed-cli.ts', '--mode', mode],
      {
        env: process.env,
        stdio: 'inherit',
      }
    );

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`El seed demo ha fallat amb exit ${code}.`));
    });
  });
}

async function ensureDemoUser({ auth, db, email, password, displayName }) {
  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, {
      password,
      displayName,
      emailVerified: true,
      disabled: false,
    });
    userRecord = await auth.getUser(userRecord.uid);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error;
    }

    userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
      disabled: false,
    });
  }

  const nowIso = new Date().toISOString();
  const uid = userRecord.uid;

  await Promise.all([
    db.doc(`users/${uid}`).set(
      {
        displayName,
        email,
        role: 'admin',
        organizationId: DEMO_ORG_ID,
        defaultOrganizationId: DEMO_ORG_ID,
        organizations: [DEMO_ORG_ID],
        updatedAt: nowIso,
        isDemoData: true,
      },
      { merge: true }
    ),
    db.doc(`organizations/${DEMO_ORG_ID}/members/${uid}`).set(
      {
        userId: uid,
        email,
        displayName,
        role: 'admin',
        joinedAt: nowIso,
        invitationId: 'operational-demo-provision',
        isDemoData: true,
      },
      { merge: true }
    ),
  ]);

  return { uid, email, password };
}

async function main() {
  const envDemoPath = path.join(process.cwd(), '.env.demo');
  applyEnvFile(envDemoPath);

  process.env.APP_ENV = process.env.APP_ENV || 'demo';
  process.env.NEXT_PUBLIC_APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || 'demo';

  if (process.env.APP_ENV !== 'demo' || process.env.NEXT_PUBLIC_APP_ENV !== 'demo') {
    fail('APP_ENV i NEXT_PUBLIC_APP_ENV han de ser "demo".');
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  guardDemoProject(projectId);

  if (!storageBucket) {
    fail('Falta NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET a .env.demo.');
  }

  const mode = normalizeMode(readArg('--mode'));
  const email = (readArg('--email') || process.env.DEMO_USER_EMAIL || DEFAULT_EMAIL)
    .toLowerCase()
    .trim();
  const password = readArg('--password') || process.env.DEMO_USER_PASSWORD || DEFAULT_PASSWORD;
  const displayName = readArg('--display-name') || process.env.DEMO_USER_DISPLAY_NAME || DEFAULT_DISPLAY_NAME;
  const baseUrl = readArg('--base-url') || process.env.DEMO_BASE_URL || null;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  if (!hasArg('--skip-seed')) {
    console.log(`[demo:provision] Executant seed demo (${mode})...`);
    await runSeed(mode);
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
  }

  const auth = getAuth();
  const db = getFirestore();
  const credentials = await ensureDemoUser({
    auth,
    db,
    email,
    password,
    displayName,
  });

  console.log('[demo:provision] OK');
  console.log(`URL: ${baseUrl || '(configura DEMO_BASE_URL o passa --base-url)'}`);
  console.log(`Usuari: ${credentials.email}`);
  console.log(`Contrasenya: ${credentials.password}`);
  console.log(`UID: ${credentials.uid}`);
}

main().catch((error) => {
  fail(error?.message || String(error));
});
