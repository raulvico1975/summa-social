#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

const TASKS = [
  {
    slug: 'gestio-projectes-justificacio',
    clips: [
      'public/media/features/projectes-justificacio/video/pressupost-partides-loop.mp4',
      'public/media/features/projectes-justificacio/video/assignacio-despeses-loop.mp4',
      'public/media/features/projectes-justificacio/video/captura-terreny-loop.mp4',
      'public/media/features/projectes-justificacio/video/export-financador-loop.mp4',
    ],
    outputVideo: 'public/media/landing-pages/gestio-projectes-justificacio/video/gestio-projectes-bloc.mp4',
    outputPoster: 'public/media/landing-pages/gestio-projectes-justificacio/stills/gestio-projectes-bloc-poster.webp',
    posterSource: 'public/media/features/projectes-justificacio/stills/pressupost-partides-start.webp',
  },
  {
    slug: 'control-visibilitat-entitats',
    clips: [
      'public/media/features/dashboard/video/dashboard-loop.mp4',
      'public/media/features/control-visibilitat-entitats/video/informe-junta-loop.mp4',
      'public/media/features/control-visibilitat-entitats/video/exportacio-dades-loop.mp4',
    ],
    outputVideo: 'public/media/landing-pages/control-visibilitat-entitats/video/control-visibilitat-bloc.mp4',
    outputPoster: 'public/media/landing-pages/control-visibilitat-entitats/stills/control-visibilitat-bloc-poster.webp',
    posterSource: 'public/media/features/dashboard/stills/dashboard-start.webp',
  },
];

function fail(message) {
  console.error(`[build-block-landing-compilations] ERROR: ${message}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    fail(result.stderr || `${command} failed`);
  }

  return result.stdout.trim();
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function buildConcatVideo(task) {
  for (const clip of task.clips) {
    if (!fs.existsSync(path.join(ROOT, clip))) {
      fail(`Missing clip for ${task.slug}: ${clip}`);
    }
  }

  ensureDir(task.outputVideo);
  ensureDir(task.outputPoster);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summa-block-landing-'));
  const listPath = path.join(tempDir, `${task.slug}.txt`);
  const listContent = task.clips
    .map((clip) => `file '${path.join(ROOT, clip).replace(/'/g, "'\\''")}'`)
    .join('\n');

  fs.writeFileSync(listPath, `${listContent}\n`, 'utf8');

  run('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    path.join(ROOT, task.outputVideo),
  ]);

  fs.copyFileSync(path.join(ROOT, task.posterSource), path.join(ROOT, task.outputPoster));
  fs.rmSync(tempDir, { recursive: true, force: true });
}

for (const task of TASKS) {
  buildConcatVideo(task);
  console.log(`[build-block-landing-compilations] built ${task.slug}`);
}
