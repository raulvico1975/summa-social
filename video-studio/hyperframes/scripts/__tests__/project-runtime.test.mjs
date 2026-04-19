import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createRuntimeProject, listRenderablePieces } from '../project-runtime.mjs';

const projectRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);

test('listRenderablePieces returns the authored marketing compositions', async () => {
  const pieces = await listRenderablePieces(projectRoot);

  assert.deepEqual(
    pieces.map((piece) => piece.id),
    ['06-importacio-extracte-editorial-16x9', '07-importacio-extracte-product-film-16x9'],
  );
});

test('createRuntimeProject builds a temporary render root without mutating the repo', async () => {
  const runtimeRoot = await createRuntimeProject(projectRoot, '07-importacio-extracte-product-film-16x9');

  const indexHtml = await fs.readFile(path.join(runtimeRoot, 'index.html'), 'utf8');

  assert.match(indexHtml, /data-composition-id="07-importacio-extracte-product-film-16x9"/);
  assert.match(indexHtml, /data-composition-src="compositions\/07-importacio-extracte-product-film-16x9\.html"/);

  const stats = await fs.lstat(path.join(runtimeRoot, 'compositions'));
  assert.equal(stats.isSymbolicLink(), true);

  const outputStats = await fs.lstat(path.join(runtimeRoot, 'output'));
  assert.equal(outputStats.isSymbolicLink(), true);

  assert.equal(runtimeRoot.startsWith(os.tmpdir()), true);
});
