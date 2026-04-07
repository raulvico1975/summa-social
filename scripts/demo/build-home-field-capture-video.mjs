#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, 'output', 'playwright', 'field-capture-home');
const MOBILE_READY = path.join(INPUT_DIR, 'field-capture-mobile-ready.png');
const MOBILE_SAVED = path.join(INPUT_DIR, 'field-capture-mobile-saved.png');
const DESKTOP_REGISTERED = path.join(INPUT_DIR, 'field-capture-desktop-registered.png');
const OUTPUT_VIDEO = path.join(ROOT, 'public', 'visuals', 'web', 'features-v3', 'block5_captura_terreny_loop_4k.mp4');
const OUTPUT_POSTER = path.join(ROOT, 'public', 'visuals', 'web', 'features-v3', 'block5_captura_terreny_start_4k.webp');
const TMP_VIDEO = `${OUTPUT_VIDEO}.tmp.mp4`;
const OUTPUT_ARTIFACT_VIDEO = path.join(INPUT_DIR, 'field-capture-home.mp4');
const OUTPUT_ARTIFACT_POSTER = path.join(INPUT_DIR, 'field-capture-home-poster.webp');

function fail(message) {
  console.error(`[build-home-field-capture-video] ERROR: ${message}`);
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

for (const requiredPath of [MOBILE_READY, MOBILE_SAVED, DESKTOP_REGISTERED]) {
  if (!fs.existsSync(requiredPath)) {
    fail(`Falta l'artefacte ${requiredPath}. Executa primer videos:home:capture:field-capture.`);
  }
}

const ffmpeg = commandPath('ffmpeg');
if (!ffmpeg) {
  fail('No he trobat ffmpeg al sistema.');
}

fs.mkdirSync(path.dirname(OUTPUT_VIDEO), { recursive: true });
fs.mkdirSync(INPUT_DIR, { recursive: true });

run(ffmpeg, [
  '-y',
  '-loop',
  '1',
  '-i',
  MOBILE_READY,
  '-loop',
  '1',
  '-i',
  MOBILE_SAVED,
  '-loop',
  '1',
  '-i',
  DESKTOP_REGISTERED,
  '-filter_complex',
  [
    "color=c=#f3f7fb:s=3840x2160:d=2.2:r=30[base1]",
    "color=c=#eef4fb:s=3840x2160:d=1.8:r=30[base2]",
    `[0:v]scale=-1:1840[m0]`,
    `[1:v]scale=-1:1840[m1]`,
    `[2:v]scale=3840:2160,zoompan=z='1.08':x='600':y='120':d=84:s=3840x2160:fps=30,trim=duration=2.8[scene3]`,
    `[base1][m0]overlay=x='520+sin(t*1.8)*14':y='160+sin(t*1.3)*10':eval=frame[scene1]`,
    `[base2][m1]overlay=x='520+sin(t*1.6)*12':y='160+sin(t*1.5)*8':eval=frame[scene2]`,
    `[scene1][scene2]xfade=transition=fade:duration=0.35:offset=1.85[x1]`,
    `[x1][scene3]xfade=transition=fade:duration=0.40:offset=3.25,format=yuv420p[vout]`,
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
fs.copyFileSync(OUTPUT_VIDEO, OUTPUT_ARTIFACT_VIDEO);

run(ffmpeg, [
  '-y',
  '-i',
  MOBILE_READY,
  '-vf',
  'scale=-1:2160:flags=lanczos',
  '-frames:v',
  '1',
  OUTPUT_POSTER,
]);

fs.copyFileSync(OUTPUT_POSTER, OUTPUT_ARTIFACT_POSTER);

console.log(`[build-home-field-capture-video] Vídeo: ${OUTPUT_VIDEO}`);
console.log(`[build-home-field-capture-video] Poster: ${OUTPUT_POSTER}`);
