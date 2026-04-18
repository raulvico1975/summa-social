#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  buildRenderPlan,
  getDefaultManifestsDir,
  getRepoRootFromScriptDir,
  loadExplainerManifests,
  runPlan,
} from './manifest-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = getRepoRootFromScriptDir(scriptDir);

function parseArgs(argv) {
  const args = {
    manifestId: null,
    manifestsDir: null,
    dryRun: false,
    skipRecording: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--skip-recording') {
      args.skipRecording = true;
      continue;
    }

    if (token === '--manifests-dir') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('Missing value for --manifests-dir.');
      }
      args.manifestsDir = value;
      index += 1;
      continue;
    }

    if (!args.manifestId && !token.startsWith('--')) {
      args.manifestId = token;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function usage() {
  return [
    'Usage: node video-studio/functional-explainers/scripts/render-explainer.mjs <manifest-id> [--dry-run] [--skip-recording] [--manifests-dir <dir>]',
    '',
    'Renders one functional-explainer manifest by running the existing demo recording and postproduction scripts.',
  ].join('\n');
}

function summarizeManifest(manifest) {
  return [
    `id: ${manifest.id}`,
    `variant: ${manifest.variant}`,
    `storyboardSlug: ${manifest.storyboardSlug}`,
    `recordingScript: ${manifest.recordingScript}`,
    `recordingArgs: ${manifest.recordingArgs.join(' ') || '(none)'}`,
    `recordingOutputDir: ${manifest.outputDefaults.recordingOutputDir}`,
    `recordingVideoPath: ${manifest.outputDefaults.recordingVideoPath}`,
    `finalOutputPath: ${manifest.outputDefaults.finalOutputPath}`,
    `notes: ${manifest.notes.join(' | ') || '(none)'}`,
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.manifestId) {
    console.log(usage());
    return;
  }

  const manifestsDir = args.manifestsDir || getDefaultManifestsDir(scriptDir);
  const manifests = await loadExplainerManifests(manifestsDir, repoRoot);
  const manifest = manifests.find((entry) => entry.id === args.manifestId);

  if (!manifest) {
    const available = manifests.map((entry) => entry.id).join(', ');
    throw new Error(`Unknown manifest "${args.manifestId}". Available: ${available || '(none)'}.`);
  }

  console.log(summarizeManifest(manifest));
  const plan = (await buildRenderPlan(manifest, repoRoot)).filter(
    (step) => !(args.skipRecording && step.name === 'recording'),
  );

  if (args.dryRun) {
    console.log('dry-run: no commands executed');
  } else {
    await fs.mkdir(path.join(repoRoot, manifest.outputDefaults.recordingOutputDir), { recursive: true });
    await fs.mkdir(path.dirname(path.join(repoRoot, manifest.outputDefaults.finalOutputPath)), {
      recursive: true,
    });
  }

  await runPlan(plan, { dryRun: args.dryRun });
}

main().catch((error) => {
  console.error(`[render-explainer] ERROR: ${error.message}`);
  process.exit(1);
});
