import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildRenderPlan,
  loadExplainerManifests,
} from '../manifest-utils.mjs';

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function createWorkspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'summa-functional-explainers-'));
  const repoRoot = root;
  const manifestsDir = path.join(root, 'video-studio', 'functional-explainers', 'manifests');

  await fs.mkdir(path.join(root, 'scripts', 'demo'), { recursive: true });
  await fs.writeFile(path.join(root, 'scripts', 'demo', 'record-alpha.ts'), 'export {};\n', 'utf8');
  await fs.writeFile(path.join(root, 'scripts', 'demo', 'record-beta.mjs'), 'export {};\n', 'utf8');
  await fs.writeFile(
    path.join(root, 'scripts', 'demo', 'postproduce-demo-video.mjs'),
    'export {};\n',
    'utf8',
  );

  await writeJson(path.join(manifestsDir, '02-beta.json'), {
    id: 'beta',
    recordingScript: 'scripts/demo/record-beta.mjs',
    recordingArgs: ['--quality', 'commercial'],
    storyboardSlug: 'beta-story',
    variant: 'es',
    outputDefaults: {
      recordingOutputDir: 'output/playwright/beta',
      recordingVideoPath: 'output/playwright/beta/beta.mp4',
      finalOutputPath: 'output/functional-explainers/beta.es.mp4',
    },
    notes: 'beta note',
  });

  await writeJson(path.join(manifestsDir, '01-alpha.json'), {
    id: 'alpha',
    recordingScript: 'scripts/demo/record-alpha.ts',
    recordingArgs: ['--base-url', 'http://localhost:9002/demo'],
    storyboardPath: 'scripts/demo/video-storyboards/alpha-story.mjs',
    outputDefaults: {
      recordingOutputDir: 'output/playwright/alpha',
      recordingVideoPath: 'output/playwright/alpha/alpha.mp4',
      finalOutputPath: 'output/functional-explainers/alpha.ca.mp4',
    },
    notes: ['alpha note 1', 'alpha note 2'],
  });

  return { root, repoRoot, manifestsDir };
}

test('loadExplainerManifests discovers and sorts manifests by id', async () => {
  const { repoRoot, manifestsDir } = await createWorkspace();
  const manifests = await loadExplainerManifests(manifestsDir, repoRoot);

  assert.deepEqual(manifests.map((manifest) => manifest.id), ['alpha', 'beta']);
  assert.deepEqual(manifests[0].notes, ['alpha note 1', 'alpha note 2']);
  assert.deepEqual(manifests[1].notes, ['beta note']);
  assert.equal(manifests[0].storyboardSlug, 'alpha-story');
  assert.equal(manifests[0].variant, 'ca');
  assert.equal(manifests[0].outputDefaults.finalOutputPath, 'output/functional-explainers/alpha.ca.mp4');
  assert.equal(manifests[1].outputDefaults.recordingVideoPath, 'output/playwright/beta/beta.mp4');
});

test('buildRenderPlan wires the manifest into deterministic commands', async () => {
  const { repoRoot, manifestsDir } = await createWorkspace();
  const manifests = await loadExplainerManifests(manifestsDir, repoRoot);
  const manifest = manifests.find((entry) => entry.id === 'alpha');

  const plan = await buildRenderPlan(manifest, repoRoot);

  assert.deepEqual(plan, [
    {
      name: 'recording',
      description: 'Record alpha',
      cwd: repoRoot,
      command: [
        'node',
        '--import',
        'tsx',
        'scripts/demo/record-alpha.ts',
        '--base-url',
        'http://localhost:9002/demo',
        '--output',
        'output/playwright/alpha',
      ],
    },
    {
      name: 'postproduction',
      description: 'Postproduce alpha',
      cwd: repoRoot,
      command: [
        'node',
        'scripts/demo/postproduce-demo-video.mjs',
        '--storyboard',
        'alpha-story',
        '--input',
        'output/playwright/alpha/alpha.mp4',
        '--output',
        'output/functional-explainers/alpha.ca.mp4',
        '--variant',
        'ca',
      ],
    },
  ]);
});
