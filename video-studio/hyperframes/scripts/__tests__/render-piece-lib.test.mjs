import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHyperframesRenderCommand,
  parseRenderPieceArgs,
} from '../render-piece-lib.mjs';

test('parseRenderPieceArgs extracts the piece id, delivery profile, and passthrough args', () => {
  const parsed = parseRenderPieceArgs([
    '06-importacio-extracte-editorial-16x9',
    '--profile',
    'web-premium',
    '--output',
    '/tmp/out.mp4',
    '--workers',
    '4',
  ]);

  assert.deepEqual(parsed, {
    pieceId: '06-importacio-extracte-editorial-16x9',
    profile: 'web-premium',
    passthrough: ['--output', '/tmp/out.mp4', '--workers', '4'],
  });
});

test('buildHyperframesRenderCommand expands the web-premium profile into stable encoder flags', () => {
  const command = buildHyperframesRenderCommand('/tmp/runtime', {
    profile: 'web-premium',
    passthrough: ['--output', '/tmp/out.mp4'],
  });

  assert.deepEqual(command, [
    'npx',
    'hyperframes',
    'render',
    '/tmp/runtime',
    '--quality',
    'high',
    '--video-bitrate',
    '10M',
    '--output',
    '/tmp/out.mp4',
  ]);
});

test('buildHyperframesRenderCommand rejects conflicting quality flags when a profile is active', () => {
  assert.throws(
    () =>
      buildHyperframesRenderCommand('/tmp/runtime', {
        profile: 'web-premium',
        passthrough: ['--quality', 'draft'],
      }),
    /cannot be combined with --quality, --crf, or --video-bitrate/,
  );
});
