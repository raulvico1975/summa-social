#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, 'output', 'playwright', 'summa-home-promo');
const TMP_DIR = path.join(ROOT_DIR, 'tmp', 'summa-home-promo');
const OUTPUT_VIDEO_PATH = path.join(OUTPUT_DIR, 'summa-home-promo.mp4');
const SUMMARY_PATH = path.join(OUTPUT_DIR, 'recording-summary.json');
const DEFAULT_FPS = 25;
const DEFAULT_CRF = 18;
const DEFAULT_PRESET = 'medium';
const DEFAULT_TRANSITION_SECONDS = 0.36;
const OUTPUT_DIMENSIONS = { width: 1920, height: 1080 };

const CLIPS = [
  {
    name: 'conciliacio',
    source: 'public/visuals/landings/conciliacio-bancaria-ong/animations/conciliacio-bancaria-demo-ca.mp4',
    sourceStart: 4.0,
    sourceEnd: 11.8,
  },
  {
    name: 'donants',
    source: 'public/visuals/landings/control-donacions-ong/animations/control-donacions-demo-ca.mp4',
    sourceStart: 7.8,
    sourceEnd: 15.0,
  },
  {
    name: 'remeses',
    source: 'public/visuals/landings/remeses-sepa/animations/remeses-sepa-demo-ca.mp4',
    sourceStart: 6.5,
    sourceEnd: 14.3,
  },
  {
    name: 'fiscalitat',
    source: 'public/visuals/landings/model-182/animations/model-182-demo-ca.mp4',
    sourceStart: 2.2,
    sourceEnd: 10.1,
  },
];

function fail(message) {
  console.error(`[summa-home-promo] ERROR: ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[summa-home-promo] ${message}`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} ha fallat`);
  }

  return result;
}

function findBinary(name) {
  const result = spawnSync('bash', ['-lc', `command -v ${name}`], {
    cwd: ROOT_DIR,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.status !== 0) return null;
  return result.stdout.trim() || null;
}

function formatSeconds(seconds) {
  return Number(seconds.toFixed(2)).toString();
}

function probeVideo(ffprobePath, inputPath) {
  const result = run(ffprobePath, [
    '-v',
    'error',
    '-show_entries',
    'stream=width,height:format=duration',
    '-of',
    'json',
    inputPath,
  ]);

  const parsed = JSON.parse(result.stdout);
  const stream = parsed.streams?.[0];
  const duration = Number(parsed.format?.duration);

  if (!stream?.width || !stream?.height || !Number.isFinite(duration)) {
    fail(`No s han pogut llegir les metadades de ${inputPath}`);
  }

  return {
    width: Number(stream.width),
    height: Number(stream.height),
    durationSeconds: duration,
  };
}

function renderNormalizedSegment(ffmpegPath, clip, outputPath) {
  const inputPath = path.join(ROOT_DIR, clip.source);
  if (!fs.existsSync(inputPath)) {
    fail(`No existeix el clip font: ${clip.source}`);
  }

  if (!Number.isFinite(clip.sourceStart) || !Number.isFinite(clip.sourceEnd) || clip.sourceEnd <= clip.sourceStart) {
    fail(`Segment invalid per al clip ${clip.name}`);
  }

  run(ffmpegPath, [
    '-y',
    '-i',
    inputPath,
    '-filter:v',
    [
      `trim=start=${formatSeconds(clip.sourceStart)}:end=${formatSeconds(clip.sourceEnd)}`,
      'setpts=PTS-STARTPTS',
      `fps=${DEFAULT_FPS}`,
      `scale=${OUTPUT_DIMENSIONS.width}:${OUTPUT_DIMENSIONS.height}:force_original_aspect_ratio=decrease`,
      `pad=${OUTPUT_DIMENSIONS.width}:${OUTPUT_DIMENSIONS.height}:(ow-iw)/2:(oh-ih)/2:color=0xf8fafc`,
      'setsar=1',
    ].join(','),
    '-an',
    '-r',
    String(DEFAULT_FPS),
    '-c:v',
    'libx264',
    '-preset',
    DEFAULT_PRESET,
    '-crf',
    String(DEFAULT_CRF),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath,
  ]);

  return {
    name: clip.name,
    source: clip.source,
    sourceStart: clip.sourceStart,
    sourceEnd: clip.sourceEnd,
    durationSeconds: Number((clip.sourceEnd - clip.sourceStart).toFixed(2)),
    outputPath,
  };
}

function crossfadeClips(ffmpegPath, clips, outputPath) {
  if (clips.length === 0) {
    fail('Cal almenys un clip per compondre la promo.');
  }

  if (clips.length === 1) {
    run(ffmpegPath, [
      '-y',
      '-i',
      clips[0].outputPath,
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      DEFAULT_PRESET,
      '-crf',
      String(DEFAULT_CRF),
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ]);

    return {
      durationSeconds: clips[0].durationSeconds,
      transitions: [],
    };
  }

  let currentDuration = clips[0].durationSeconds;
  let currentLabel = '[0:v]';
  const filterSegments = [];
  const transitions = [];

  for (let index = 1; index < clips.length; index += 1) {
    const previousClip = clips[index - 1];
    const nextClip = clips[index];
    const transitionSeconds = Number(
      Math.min(
        DEFAULT_TRANSITION_SECONDS,
        Math.max(previousClip.durationSeconds - 0.12, 0.12),
        Math.max(nextClip.durationSeconds - 0.12, 0.12)
      ).toFixed(2)
    );
    const offsetSeconds = Number(Math.max(0, currentDuration - transitionSeconds).toFixed(2));
    const outputLabel = index === clips.length - 1 ? '[v]' : `[v${index}]`;

    filterSegments.push(
      `${currentLabel}[${index}:v]xfade=transition=fade:duration=${formatSeconds(transitionSeconds)}:offset=${formatSeconds(offsetSeconds)}${outputLabel}`
    );
    transitions.push({
      from: previousClip.name,
      to: nextClip.name,
      durationSeconds: transitionSeconds,
    });

    currentLabel = outputLabel;
    currentDuration = currentDuration + nextClip.durationSeconds - transitionSeconds;
  }

  run(ffmpegPath, [
    '-y',
    ...clips.flatMap((clip) => ['-i', clip.outputPath]),
    '-an',
    '-filter_complex',
    filterSegments.join(';'),
    '-map',
    '[v]',
    '-c:v',
    'libx264',
    '-preset',
    DEFAULT_PRESET,
    '-crf',
    String(DEFAULT_CRF),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath,
  ]);

  return {
    durationSeconds: Number(currentDuration.toFixed(2)),
    transitions,
  };
}

function main() {
  const ffmpegPath = findBinary('ffmpeg');
  const ffprobePath = findBinary('ffprobe');

  if (!ffmpegPath || !ffprobePath) {
    fail('Calen ffmpeg i ffprobe per generar la promo de la home.');
  }

  ensureDir(OUTPUT_DIR);
  resetDir(TMP_DIR);

  const normalizedClips = CLIPS.map((clip, index) => {
    const normalizedPath = path.join(TMP_DIR, `${String(index + 1).padStart(2, '0')}-${clip.name}.mp4`);
    log(`Normalitzant ${clip.name}...`);
    return renderNormalizedSegment(ffmpegPath, clip, normalizedPath);
  });

  log('Composant la promo mare de la home...');
  const composition = crossfadeClips(ffmpegPath, normalizedClips, OUTPUT_VIDEO_PATH);
  const finalMeta = probeVideo(ffprobePath, OUTPUT_VIDEO_PATH);

  const summary = {
    scenario: 'summa-home-promo',
    mode: 'montage',
    outputVideoPath: path.relative(ROOT_DIR, OUTPUT_VIDEO_PATH),
    durationSeconds: Number(finalMeta.durationSeconds.toFixed(2)),
    dimensions: OUTPUT_DIMENSIONS,
    transitionSeconds: DEFAULT_TRANSITION_SECONDS,
    createdAt: new Date().toISOString(),
    clips: normalizedClips.map((clip) => ({
      name: clip.name,
      source: clip.source,
      sourceStart: clip.sourceStart,
      sourceEnd: clip.sourceEnd,
      durationSeconds: clip.durationSeconds,
    })),
    transitions: composition.transitions,
  };

  fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  log(`Video base generat: ${OUTPUT_VIDEO_PATH}`);
  log(`Durada final: ${formatSeconds(finalMeta.durationSeconds)}s`);
}

main();
