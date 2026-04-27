#!/usr/bin/env node

import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_ENV_FILE = '.env.local';
const KEY_NAME = 'RESEND_API_KEY';

function printUsage() {
  console.error('Ús: node scripts/set-resend-key.mjs [--env-file .env.local] <nova-clau>');
  console.error('     printf "%s" "<nova-clau>" | node scripts/set-resend-key.mjs [--env-file .env.local] --stdin');
}

function parseArgs(argv) {
  const args = [...argv];
  let envFile = DEFAULT_ENV_FILE;
  let readFromStdin = false;
  const positionals = [];

  while (args.length > 0) {
    const current = args.shift();
    if (!current) continue;

    if (current === '--env-file') {
      const nextValue = args.shift();
      if (!nextValue) {
        throw new Error('--env-file requereix un path');
      }
      envFile = nextValue;
      continue;
    }

    if (current === '--stdin') {
      readFromStdin = true;
      continue;
    }

    if (current === '--help' || current === '-h') {
      printUsage();
      process.exit(0);
    }

    positionals.push(current);
  }

  if (readFromStdin && positionals.length > 0) {
    throw new Error('Passa la clau per argument o per stdin, pero no per les dues vies alhora');
  }

  if (!readFromStdin && positionals.length !== 1) {
    throw new Error('Cal passar exactament una clau nova');
  }

  return {
    envFile,
    readFromStdin,
    keyValue: readFromStdin ? '' : positionals[0],
  };
}

function readStdin() {
  return new Promise((resolveValue, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolveValue(chunks.join('')));
    process.stdin.on('error', reject);
  });
}

function normalizeSecret(rawValue) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error('La clau esta buida');
  }

  if (/\s/.test(trimmed)) {
    throw new Error('La clau no pot contenir espais ni salts de linia interns');
  }

  if (!trimmed.startsWith('re_')) {
    throw new Error('La clau no sembla una API key valida de Resend (ha de començar per "re_")');
  }

  return trimmed;
}

function upsertEnvVar(fileContent, key, value) {
  const lines = fileContent.split(/\r?\n/);
  let replaced = false;

  const nextLines = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      replaced = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!replaced) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== '') {
      nextLines.push('');
    }
    nextLines.push(`${key}=${value}`);
  }

  return `${nextLines.join('\n').replace(/\n+$/, '\n')}`;
}

function writeFileAtomic(targetPath, content) {
  const tmpPath = `${targetPath}.tmp`;
  writeFileSync(tmpPath, content, 'utf8');
  renameSync(tmpPath, targetPath);

  try {
    chmodSync(targetPath, 0o600);
  } catch {
    // Best effort: en alguns entorns el chmod pot no ser rellevant.
  }
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[set-resend-key] ${error instanceof Error ? error.message : String(error)}`);
    printUsage();
    process.exit(1);
  }

  const rawValue = parsed.readFromStdin ? await readStdin() : parsed.keyValue;
  const secret = normalizeSecret(rawValue);

  const targetPath = resolve(process.cwd(), parsed.envFile);
  const previousContent = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : '';
  const nextContent = upsertEnvVar(previousContent, KEY_NAME, secret);

  writeFileAtomic(targetPath, nextContent);

  console.log(`[set-resend-key] ${KEY_NAME} actualitzada a ${targetPath}`);
}

main().catch((error) => {
  console.error(`[set-resend-key] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
