import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createRuntimeProject } from './project-runtime.mjs';

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [, , pieceId, ...passthrough] = process.argv;
if (!pieceId) {
  fail('Usage: npm run video:render:piece -- <composition-id> [hyperframes render args]');
}

const projectRoot = path.resolve(import.meta.dirname, '..');
const runtimeRoot = await createRuntimeProject(projectRoot, pieceId);
let cleanedUp = false;

async function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  await fs.rm(runtimeRoot, { recursive: true, force: true });
}

const child = spawn('npx', ['hyperframes', 'render', runtimeRoot, ...passthrough], {
  cwd: projectRoot,
  stdio: 'inherit',
});

child.on('exit', async (code, signal) => {
  await cleanup();
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
