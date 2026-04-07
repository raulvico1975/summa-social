#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, 'output', 'playwright', 'dashboard-control-demo');
const START_SCREEN = path.join(INPUT_DIR, 'dashboard-start.png');
const OVERVIEW_SCREEN = path.join(INPUT_DIR, 'dashboard-overview.png');
const CATEGORIES_SCREEN = path.join(INPUT_DIR, 'dashboard-categories.png');
const OUTPUT_VIDEO = path.join(ROOT, 'public', 'visuals', 'web', 'features-v3', 'block6_dashboard_loop_4k.mp4');
const OUTPUT_POSTER = path.join(ROOT, 'public', 'visuals', 'web', 'features-v3', 'block6_dashboard_start_4k.webp');
const OUTPUT_ARTIFACT = path.join(INPUT_DIR, 'dashboard-home.mp4');
const TMP_VIDEO = `${OUTPUT_VIDEO}.tmp.mp4`;

function fail(message) {
  console.error(`[build-home-dashboard-video] ERROR: ${message}`);
  process.exit(1);
}

function commandPath(name) {
  const result = spawnSync('bash', ['-lc', `command -v ${name}`], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} failed`);
  }
}

for (const input of [START_SCREEN, OVERVIEW_SCREEN, CATEGORIES_SCREEN]) {
  if (!fs.existsSync(input)) {
    fail(`Falta la captura ${path.basename(input)}. Executa primer scripts/demo/record-dashboard-control.mjs.`);
  }
}

const ffmpeg = commandPath('ffmpeg');
if (!ffmpeg) {
  fail('No he trobat ffmpeg al sistema.');
}

fs.mkdirSync(path.dirname(OUTPUT_VIDEO), { recursive: true });
fs.mkdirSync(path.dirname(OUTPUT_POSTER), { recursive: true });

const filter = [
  `[0:v]scale=3840:2160:flags=lanczos,setsar=1,format=yuv420p[v0]`,
  `[1:v]scale=3840:2160:flags=lanczos,setsar=1,format=yuv420p[v1]`,
  `[2:v]scale=3840:2160:flags=lanczos,setsar=1,format=yuv420p[v2]`,
  `[3:v]scale=3840:2160:flags=lanczos,setsar=1,format=yuv420p[v3]`,
  `[v0][v1]xfade=transition=fade:duration=0.45:offset=0.70[step1]`,
  `[step1][v2]xfade=transition=slideup:duration=0.90:offset=1.80[step2]`,
  `[step2][v3]xfade=transition=slidedown:duration=0.80:offset=3.55[vout]`,
].join(';');

run(ffmpeg, [
  '-y',
  '-loop',
  '1',
  '-t',
  '1.15',
  '-i',
  START_SCREEN,
  '-loop',
  '1',
  '-t',
  '2.10',
  '-i',
  OVERVIEW_SCREEN,
  '-loop',
  '1',
  '-t',
  '2.55',
  '-i',
  CATEGORIES_SCREEN,
  '-loop',
  '1',
  '-t',
  '1.45',
  '-i',
  OVERVIEW_SCREEN,
  '-filter_complex',
  filter,
  '-map',
  '[vout]',
  '-an',
  '-c:v',
  'libx264',
  '-preset',
  'slow',
  '-r',
  '30',
  '-b:v',
  '18M',
  '-minrate',
  '18M',
  '-maxrate',
  '24M',
  '-bufsize',
  '36M',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  TMP_VIDEO,
]);

fs.renameSync(TMP_VIDEO, OUTPUT_VIDEO);
fs.copyFileSync(OUTPUT_VIDEO, OUTPUT_ARTIFACT);

run(ffmpeg, [
  '-y',
  '-i',
  START_SCREEN,
  '-vf',
  'scale=3840:2160:flags=lanczos',
  '-frames:v',
  '1',
  OUTPUT_POSTER,
]);

console.log(`[build-home-dashboard-video] Vídeo: ${OUTPUT_VIDEO}`);
console.log(`[build-home-dashboard-video] Poster: ${OUTPUT_POSTER}`);
