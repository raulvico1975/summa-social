#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  getDefaultManifestsDir,
  getRepoRootFromScriptDir,
  loadExplainerManifests,
  summarizeManifest,
} from './manifest-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = getRepoRootFromScriptDir(scriptDir);

function parseArgs(argv) {
  const args = {
    manifestsDir: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      args.help = true;
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

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function usage() {
  return [
    'Usage: node video-studio/functional-explainers/scripts/list-explainers.mjs [--manifests-dir <dir>]',
    '',
    'Lists functional-explainer manifests from video-studio/functional-explainers/manifests.',
  ].join('\n');
}

function printTable(manifests) {
  console.log([
    'id',
    'variant',
    'storyboardSlug',
    'recordingScript',
    'recordingOutputDir',
    'recordingVideoPath',
    'finalOutputPath',
    'notes',
  ].join('\t'));
  for (const manifest of manifests) {
    console.log([
      manifest.id,
      manifest.variant,
      manifest.storyboardSlug,
      manifest.recordingScript,
      manifest.recordingOutputDir,
      manifest.recordingVideoPath,
      manifest.finalOutputPath,
      manifest.notes.join(' | '),
    ].join('\t'));
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  const manifestsDir = args.manifestsDir || getDefaultManifestsDir(scriptDir);
  const manifests = await loadExplainerManifests(manifestsDir, repoRoot);

  if (manifests.length === 0) {
    throw new Error(`No manifest files found in ${manifestsDir}.`);
  }

  printTable(manifests.map(summarizeManifest));
}

main().catch((error) => {
  console.error(`[list-explainers] ERROR: ${error.message}`);
  process.exit(1);
});
