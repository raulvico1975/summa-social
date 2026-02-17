#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ENV_LOCAL_PATH = join(ROOT, '.env.local');
const ENV_DEMO_PATH = join(ROOT, '.env.demo');

function parseEnvFile(path) {
  if (!existsSync(path)) return {};

  const out = {};
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;

    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

function pickValue(key, localVars, demoVars, isDemo) {
  const fromProcess = process.env[key];
  if (typeof fromProcess === 'string' && fromProcess.trim()) return fromProcess.trim();

  if (isDemo) {
    const fromDemo = demoVars[key];
    if (typeof fromDemo === 'string' && fromDemo.trim()) return fromDemo.trim();
  }

  const fromLocal = localVars[key];
  if (typeof fromLocal === 'string' && fromLocal.trim()) return fromLocal.trim();

  return '';
}

const localVars = parseEnvFile(ENV_LOCAL_PATH);
const demoVars = parseEnvFile(ENV_DEMO_PATH);
const isDemo =
  String(process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || '').trim().toLowerCase() === 'demo';

const requiredKeys = isDemo
  ? [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
    ]
  : ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_API_KEY'];

const missing = requiredKeys.filter((key) => !pickValue(key, localVars, demoVars, isDemo));

if (missing.length > 0) {
  const targetFile = isDemo ? '.env.demo' : '.env.local';
  console.error(`[build-env] Falten variables requerides per executar "npm run build" (${isDemo ? 'demo' : 'standard'}).`);
  for (const key of missing) {
    console.error(`[build-env] - ${key}`);
  }
  console.error(`[build-env] Defineix-les a ${targetFile} o com variables d'entorn al shell/CI.`);
  process.exit(1);
}

console.log(`[build-env] OK (${isDemo ? 'demo' : 'standard'}): variables mínimes presents.`);
