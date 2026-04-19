import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const MANIFEST_FILE_EXTENSION = '.json';
const REQUIRED_OUTPUT_KEYS = ['recordingOutputDir', 'recordingVideoPath', 'finalOutputPath'];

export function getRepoRootFromScriptDir(scriptDir) {
  return path.resolve(scriptDir, '..', '..', '..');
}

export function getFunctionalExplainersRootFromScriptDir(scriptDir) {
  return path.resolve(scriptDir, '..');
}

export function getDefaultManifestsDir(scriptDir) {
  return path.join(getFunctionalExplainersRootFromScriptDir(scriptDir), 'manifests');
}

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeString(value, label, context) {
  if (typeof value !== 'string') {
    fail(`${context}: ${label} must be a string.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    fail(`${context}: ${label} cannot be empty.`);
  }

  return trimmed;
}

function normalizeStringArray(value, label, context) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    fail(`${context}: ${label} must be an array of strings.`);
  }

  const normalized = value.map((entry, index) => {
    if (typeof entry !== 'string') {
      fail(`${context}: ${label}[${index}] must be a string.`);
    }

    const trimmed = entry.trim();
    if (!trimmed) {
      fail(`${context}: ${label}[${index}] cannot be empty.`);
    }

    return trimmed;
  });

  return normalized;
}

function readStringField(value, keys) {
  for (const key of keys) {
    if (typeof value?.[key] === 'string') {
      return value[key];
    }
  }

  return null;
}

function deriveSlugFromPath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    return null;
  }

  return path.basename(filePath.trim(), path.extname(filePath.trim()));
}

function normalizeOutputDefaults(value, context) {
  if (!isPlainObject(value)) {
    fail(`${context}: output defaults must be an object.`);
  }

  const legacyRecordingOutput = readStringField(value, ['recordingOutput', 'recording']);
  const recordingOutputDirRaw =
    readStringField(value, ['recordingOutputDir', 'recordingDir']) ||
    (legacyRecordingOutput ? path.dirname(legacyRecordingOutput) : null);
  const recordingVideoPathRaw =
    readStringField(value, ['recordingVideoPath', 'recordingVideo']) ||
    legacyRecordingOutput;
  const finalOutputPathRaw =
    readStringField(value, ['finalOutputPath', 'finalOutput', 'final']);

  if (!recordingOutputDirRaw || !recordingVideoPathRaw || !finalOutputPathRaw) {
    const missing = REQUIRED_OUTPUT_KEYS.filter((key) => {
      if (key === 'recordingOutputDir') return !recordingOutputDirRaw;
      if (key === 'recordingVideoPath') return !recordingVideoPathRaw;
      return !finalOutputPathRaw;
    });
    fail(`${context}: output defaults missing ${missing.join(' and ')}.`);
  }

  const editProxyPathRaw = readStringField(value, ['editProxyPath', 'editorialProxyPath']);
  const editAssetPathRaw = readStringField(value, ['editAssetPath', 'editorialAssetPath']);
  if ((editProxyPathRaw && !editAssetPathRaw) || (!editProxyPathRaw && editAssetPathRaw)) {
    fail(`${context}: output defaults must declare editProxyPath and editAssetPath together.`);
  }

  return {
    recordingOutputDir: normalizeString(recordingOutputDirRaw, 'recordingOutputDir', context),
    recordingVideoPath: normalizeString(recordingVideoPathRaw, 'recordingVideoPath', context),
    finalOutputPath: normalizeString(finalOutputPathRaw, 'finalOutputPath', context),
    editProxyPath: editProxyPathRaw
      ? normalizeString(editProxyPathRaw, 'editProxyPath', context)
      : null,
    editAssetPath: editAssetPathRaw
      ? normalizeString(editAssetPathRaw, 'editAssetPath', context)
      : null,
  };
}

function normalizeNotes(value, context) {
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (!Array.isArray(value)) {
    fail(`${context}: notes must be a string or array of strings.`);
  }

  return value.map((entry, index) => {
    if (typeof entry !== 'string') {
      fail(`${context}: notes[${index}] must be a string.`);
    }

    const trimmed = entry.trim();
    if (!trimmed) {
      fail(`${context}: notes[${index}] cannot be empty.`);
    }

    return trimmed;
  });
}

async function readManifestFile(filePath) {
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read manifest ${filePath}: ${error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`Manifest ${filePath} must contain a JSON object.`);
  }

  const context = `Manifest ${filePath}`;
  const id = normalizeString(readStringField(parsed, ['id', 'briefId', 'brief_id']) ?? parsed.slug, 'id', context);
  const recordingScript = normalizeString(
    readStringField(parsed, ['recordingScript', 'recording_script']),
    'recordingScript',
    context,
  );
  const recordingArgs = normalizeStringArray(
    parsed.recordingArgs ?? parsed.recording_args,
    'recordingArgs',
    context,
  );
  const storyboardPath = readStringField(parsed, ['storyboardPath', 'storyboard_path']);
  const storyboardSlugRaw =
    readStringField(parsed, ['storyboardSlug', 'storyboard_slug']) ||
    deriveSlugFromPath(storyboardPath) ||
    readStringField(parsed, ['slug']);
  const storyboardSlug = normalizeString(storyboardSlugRaw, 'storyboardSlug', context);
  const outputDefaults = normalizeOutputDefaults(parsed.outputDefaults ?? parsed.output ?? parsed, context);
  const variant = normalizeString(
    readStringField(parsed, ['variant']) ||
      readStringField(parsed.renderer, ['defaultVariant']) ||
      (Array.isArray(parsed.renderer?.variants) && typeof parsed.renderer.variants[0] === 'string'
        ? parsed.renderer.variants[0]
        : 'ca'),
    'variant',
    context,
  );
  const notes = normalizeNotes(parsed.notes, context);

  return {
    id,
    recordingScript,
    recordingArgs,
    storyboardSlug,
    variant,
    outputDefaults,
    notes,
    sourcePath: filePath,
  };
}

export async function loadExplainerManifests(manifestsDir, repoRoot) {
  let entries;
  try {
    entries = await fs.readdir(manifestsDir, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Unable to read manifests directory ${manifestsDir}: ${error.message}`);
  }

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(MANIFEST_FILE_EXTENSION))
    .map((entry) => path.join(manifestsDir, entry.name))
    .sort((left, right) => left.localeCompare(right));

  const manifests = [];
  const seenIds = new Set();

  for (const filePath of files) {
    const manifest = await readManifestFile(filePath);
    if (seenIds.has(manifest.id)) {
      throw new Error(`Duplicate manifest id "${manifest.id}" in ${filePath}.`);
    }

    manifests.push({
      ...manifest,
      resolvedRecordingScript: repoRoot ? path.resolve(repoRoot, manifest.recordingScript) : null,
    });
    seenIds.add(manifest.id);
  }

  manifests.sort((left, right) => left.id.localeCompare(right.id) || left.sourcePath.localeCompare(right.sourcePath));
  return manifests;
}

function assertNoOutputOverride(args, context) {
  if (args.includes('--output')) {
    fail(`${context}: recordingArgs cannot include --output because the manifest output defaults provide it.`);
  }
}

function assertScriptExists(scriptPath, context) {
  return fs
    .stat(scriptPath)
    .then((stats) => {
      if (!stats.isFile()) {
        throw new Error(`${context}: expected ${scriptPath} to be a file.`);
      }
    })
    .catch((error) => {
      throw new Error(`${context}: missing script ${scriptPath}. ${error.message}`);
    });
}

export async function buildRenderPlan(manifest, repoRoot) {
  const context = `Manifest ${manifest.id}`;
  const recordingScriptPath = manifest.resolvedRecordingScript || path.resolve(repoRoot, manifest.recordingScript);
  const postproductionScriptPath = path.join(repoRoot, 'scripts', 'demo', 'postproduce-demo-video.mjs');

  await assertScriptExists(recordingScriptPath, context);
  await assertScriptExists(postproductionScriptPath, context);
  assertNoOutputOverride(manifest.recordingArgs, context);

  const recordingCommand = manifest.recordingScript.endsWith('.ts')
    ? ['node', '--import', 'tsx', manifest.recordingScript, ...manifest.recordingArgs]
    : ['node', manifest.recordingScript, ...manifest.recordingArgs];
  const recordingCommandWithOutput = [
    ...recordingCommand,
    '--output',
    manifest.outputDefaults.recordingOutputDir,
  ];

  const postproductionCommand = [
    'node',
    'scripts/demo/postproduce-demo-video.mjs',
    '--storyboard',
    manifest.storyboardSlug,
    '--input',
    manifest.outputDefaults.recordingVideoPath,
    '--output',
    manifest.outputDefaults.finalOutputPath,
    '--variant',
    manifest.variant,
  ];

  const plan = [
    {
      name: 'recording',
      command: recordingCommandWithOutput,
      cwd: repoRoot,
      description: `Record ${manifest.id}`,
    },
  ];

  if (manifest.outputDefaults.editProxyPath && manifest.outputDefaults.editAssetPath) {
    plan.push({
      name: 'working-proxy',
      command: [
        'node',
        'video-studio/functional-explainers/scripts/prepare-edit-proxy.mjs',
        '--input',
        manifest.outputDefaults.recordingVideoPath,
        '--output',
        manifest.outputDefaults.editProxyPath,
        '--asset',
        manifest.outputDefaults.editAssetPath,
      ],
      cwd: repoRoot,
      description: `Prepare product-film working proxy for ${manifest.id}`,
    });
  }

  plan.push({
    name: 'postproduction',
    command: postproductionCommand,
    cwd: repoRoot,
    description: `Postproduce ${manifest.id}`,
  });

  return plan;
}

function shellQuote(value) {
  if (value === '') return "''";
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function formatCommand(command) {
  return command.map((part) => shellQuote(part)).join(' ');
}

export async function runPlan(plan, { dryRun = false } = {}) {
  for (let index = 0; index < plan.length; index += 1) {
    const step = plan[index];
    const prefix = `[${index + 1}/${plan.length}] ${step.description}`;
    if (dryRun) {
      console.log(`${prefix}: ${formatCommand(step.command)}`);
      continue;
    }

    console.log(`${prefix}...`);
    const result = spawnSync(step.command[0], step.command.slice(1), {
      cwd: step.cwd,
      stdio: 'inherit',
      encoding: 'utf8',
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(`${step.description} failed with exit code ${result.status}.`);
    }
  }
}

export function summarizeManifest(manifest) {
  return {
    id: manifest.id,
    variant: manifest.variant,
    storyboardSlug: manifest.storyboardSlug,
    recordingScript: manifest.recordingScript,
    recordingArgs: manifest.recordingArgs,
    recordingOutputDir: manifest.outputDefaults.recordingOutputDir,
    recordingVideoPath: manifest.outputDefaults.recordingVideoPath,
    finalOutputPath: manifest.outputDefaults.finalOutputPath,
    editProxyPath: manifest.outputDefaults.editProxyPath,
    editAssetPath: manifest.outputDefaults.editAssetPath,
    notes: manifest.notes,
    sourcePath: manifest.sourcePath,
  };
}
