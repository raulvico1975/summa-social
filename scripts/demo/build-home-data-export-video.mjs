#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, 'output', 'playwright', 'data-export-home');
const SHARE_SUMMARY_SCREEN = path.join(INPUT_DIR, 'data-export-share-summary.png');
const PDF_PAGE_SCREEN = path.join(INPUT_DIR, 'data-export-pdf-page.png');
const OUTPUT_VIDEO = path.join(ROOT, 'public', 'visuals', 'web', 'features-v3', 'block6_exportacio_dades_loop_4k.mp4');
const OUTPUT_POSTER = path.join(ROOT, 'public', 'visuals', 'web', 'features-v3', 'block6_exportacio_dades_start_4k.webp');
const OUTPUT_ARTIFACT = path.join(INPUT_DIR, 'data-export-home.mp4');
const OUTPUT_ARTIFACT_POSTER = path.join(INPUT_DIR, 'data-export-home-poster.webp');
const TMP_VIDEO = `${OUTPUT_VIDEO}.tmp.mp4`;
const BUTTON_ZOOM_CROP = 'crop=1760:990:80:90';
const PDF_SCENE_DURATION = 4.8;

function fail(message) {
  console.error(`[build-home-data-export-video] ERROR: ${message}`);
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

for (const input of [SHARE_SUMMARY_SCREEN, PDF_PAGE_SCREEN]) {
  if (!fs.existsSync(input)) {
    fail(`Falta la captura ${path.basename(input)}. Executa primer videos:home:capture:data-export.`);
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
  `[1:v]${BUTTON_ZOOM_CROP},scale=3840:2160:flags=lanczos,setsar=1,format=yuv420p[v1]`,
  `[0:v]scale=3840:2160:flags=lanczos,setsar=1,format=yuv420p,boxblur=20:2,eq=brightness=-0.06:saturation=0.9[v2bg]`,
  `[2:v]zoompan=z='min(1.035,1+on*0.00022)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(PDF_SCENE_DURATION * 30)}:s=2000x1414:fps=30,trim=duration=${PDF_SCENE_DURATION},scale=1450:-1:flags=lanczos,setsar=1,format=rgba[v2doc]`,
  `[v2bg][v2doc]overlay=(W-w)/2:(H-h)/2+28:format=auto[v2]`,
  `[v0][v1]xfade=transition=fade:duration=0.45:offset=1.55[s1]`,
  `[s1][v2]xfade=transition=fade:duration=0.70:offset=3.10[vout]`,
].join(';');

run(ffmpeg, [
  '-y',
  '-loop',
  '1',
  '-t',
  '2.45',
  '-i',
  SHARE_SUMMARY_SCREEN,
  '-loop',
  '1',
  '-t',
  '1.95',
  '-i',
  SHARE_SUMMARY_SCREEN,
  '-loop',
  '1',
  '-t',
  `${PDF_SCENE_DURATION}`,
  '-i',
  PDF_PAGE_SCREEN,
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
  '-loop',
  '1',
  '-t',
  '1',
  '-i',
  SHARE_SUMMARY_SCREEN,
  '-loop',
  '1',
  '-t',
  '1',
  '-i',
  PDF_PAGE_SCREEN,
  '-filter_complex',
  [
    `[0:v]scale=3840:2160:flags=lanczos,setsar=1,format=yuv420p,boxblur=20:2,eq=brightness=-0.06:saturation=0.9[bg]`,
    `[1:v]scale=1450:-1:flags=lanczos,setsar=1,format=rgba[doc]`,
    `[bg][doc]overlay=(W-w)/2:(H-h)/2+28:format=auto[poster]`,
  ].join(';'),
  '-map',
  '[poster]',
  '-frames:v',
  '1',
  OUTPUT_POSTER,
]);

fs.copyFileSync(OUTPUT_POSTER, OUTPUT_ARTIFACT_POSTER);

console.log(`[build-home-data-export-video] Vídeo: ${OUTPUT_VIDEO}`);
console.log(`[build-home-data-export-video] Poster: ${OUTPUT_POSTER}`);
