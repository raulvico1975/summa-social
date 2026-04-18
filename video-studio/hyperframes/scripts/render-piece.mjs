import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createRuntimeProject } from './project-runtime.mjs';
import { buildHyperframesRenderCommand, parseRenderPieceArgs } from './render-piece-lib.mjs';

function fail(message) {
  console.error(message);
  process.exit(1);
}

const parsedArgs = parseRenderPieceArgs(process.argv.slice(2));
const { pieceId, profile, passthrough } = parsedArgs;
if (!pieceId) {
  fail('Usage: npm run video:render:piece -- <composition-id> [--profile web-premium] [hyperframes render args]');
}

const projectRoot = path.resolve(import.meta.dirname, '..');
const runtimeRoot = await createRuntimeProject(projectRoot, pieceId);
let cleanedUp = false;

async function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  await fs.rm(runtimeRoot, { recursive: true, force: true });
}

let command;
try {
  command = buildHyperframesRenderCommand(runtimeRoot, { profile, passthrough });
} catch (error) {
  await cleanup();
  fail(error.message);
}

const child = spawn(command[0], command.slice(1), { cwd: projectRoot, stdio: 'inherit' });

child.on('exit', async (code, signal) => {
  await cleanup();
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
