#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, 'output', 'playwright', 'project-expense-assignment-home');
const CLOSED_SCREEN = path.join(INPUT_DIR, 'project-expense-assignment-closed.png');
const OPEN_SCREEN = path.join(INPUT_DIR, 'project-expense-assignment-open.png');
const OUTPUT_VIDEO = path.join(ROOT, 'public', 'visuals', 'web', 'features-v3', 'block5_assignacio_despeses_loop_4k.mp4');
const OUTPUT_POSTER = path.join(ROOT, 'public', 'visuals', 'web', 'features-v3', 'block5_assignacio_despeses_start_4k.webp');
const TMP_VIDEO = `${OUTPUT_VIDEO}.tmp.mp4`;

function fail(message) {
  console.error(`[build-home-project-expense-assignment-video] ERROR: ${message}`);
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

if (!fs.existsSync(CLOSED_SCREEN) || !fs.existsSync(OPEN_SCREEN)) {
  fail('Falten les captures closed/open del bloc. Executa primer videos:home:capture:project-expense-assignment.');
}

const ffmpeg = commandPath('ffmpeg');
if (!ffmpeg) {
  fail('No he trobat ffmpeg al sistema.');
}

fs.mkdirSync(path.dirname(OUTPUT_VIDEO), { recursive: true });
fs.mkdirSync(path.dirname(OUTPUT_POSTER), { recursive: true });

const focusX = 3840 * 0.60;
const focusY = 2160 * 0.38;
const startZoom = 1.0;
const endZoom = 1.18;
const zoomExpr = `min(${endZoom.toFixed(2)},${startZoom.toFixed(2)}+on*0.0025)`;
const fixedZoom = `${endZoom.toFixed(2)}`;
const xExpr = `max(min(${focusX.toFixed(2)}-(3840/${zoomExpr}/2),3840-3840/${zoomExpr}),0)`;
const yExpr = `max(min(${focusY.toFixed(2)}-(2160/${zoomExpr}/2),2160-2160/${zoomExpr}),0)`;
const xFixedExpr = `max(min(${focusX.toFixed(2)}-(3840/${fixedZoom}/2),3840-3840/${fixedZoom}),0)`;
const yFixedExpr = `max(min(${focusY.toFixed(2)}-(2160/${fixedZoom}/2),2160-2160/${fixedZoom}),0)`;

run(ffmpeg, [
  '-y',
  '-loop',
  '1',
  '-i',
  CLOSED_SCREEN,
  '-loop',
  '1',
  '-i',
  OPEN_SCREEN,
  '-filter_complex',
  [
    `[0:v]scale=3840:2160,zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=72:s=3840x2160:fps=30,trim=duration=2.4,setsar=1[v0]`,
    `[1:v]scale=3840:2160,zoompan=z='${fixedZoom}':x='${xFixedExpr}':y='${yFixedExpr}':d=84:s=3840x2160:fps=30,trim=duration=2.8,setsar=1[v1]`,
    `[v0][v1]xfade=transition=fade:duration=0.45:offset=1.85,format=yuv420p[vout]`,
  ].join(';'),
  '-map',
  '[vout]',
  '-an',
  '-c:v',
  'h264_videotoolbox',
  '-r',
  '30',
  '-b:v',
  '18M',
  '-maxrate',
  '24M',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  TMP_VIDEO,
]);

fs.renameSync(TMP_VIDEO, OUTPUT_VIDEO);

run(ffmpeg, [
  '-y',
  '-i',
  OPEN_SCREEN,
  '-vf',
  'scale=3840:2160:flags=lanczos',
  '-frames:v',
  '1',
  OUTPUT_POSTER,
]);

console.log(`[build-home-project-expense-assignment-video] Vídeo: ${OUTPUT_VIDEO}`);
console.log(`[build-home-project-expense-assignment-video] Poster: ${OUTPUT_POSTER}`);
