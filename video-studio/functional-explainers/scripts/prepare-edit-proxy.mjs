#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    asset: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--input' || token === '--output' || token === '--asset') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        fail(`Missing value for ${token}.`);
      }
      args[token.slice(2)] = value;
      index += 1;
      continue;
    }

    if (token === '--help' || token === '-h') {
      console.log(
        [
          'Usage: node video-studio/functional-explainers/scripts/prepare-edit-proxy.mjs --input <video> --output <proxy.mp4> --asset <asset.json>',
          '',
          'Creates a product-film working proxy with denser keyframes and writes a small metadata asset alongside it.',
        ].join('\n'),
      );
      process.exit(0);
    }

    fail(`Unknown argument: ${token}`);
  }

  if (!args.input || !args.output || !args.asset) {
    fail('Arguments --input, --output, and --asset are required.');
  }

  return args;
}

function run(command, description) {
  const result = spawnSync(command[0], command.slice(1), {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    fail(`${description} failed.\n${result.stderr || result.stdout}`.trim());
  }

  return result.stdout;
}

function readProbe(jsonText, description) {
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    fail(`${description}: invalid ffprobe JSON. ${error.message}`);
  }
}

function readFirstVideoStream(probe) {
  const stream = probe?.streams?.find((entry) => Number.isFinite(entry?.width) && Number.isFinite(entry?.height));
  if (!stream) {
    fail('ffprobe did not return a video stream.');
  }

  return stream;
}

function parseFrameRate(value) {
  if (typeof value !== 'string' || !value.includes('/')) {
    return null;
  }

  const [numeratorRaw, denominatorRaw] = value.split('/');
  const numerator = Number.parseFloat(numeratorRaw);
  const denominator = Number.parseFloat(denominatorRaw);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);
  const assetPath = path.resolve(args.asset);

  const sourceProbe = readProbe(
    run(
      [
        'ffprobe',
        '-v',
        'error',
        '-show_entries',
        'stream=width,height,r_frame_rate:format=duration',
        '-of',
        'json',
        inputPath,
      ],
      'ffprobe source video',
    ),
    'ffprobe source video',
  );
  const sourceStream = readFirstVideoStream(sourceProbe);
  const sourceDuration = Number.parseFloat(sourceProbe?.format?.duration || '0');
  const sourceFrameRate = parseFrameRate(sourceStream.r_frame_rate) || 30;
  const proxyWidth = Math.min(sourceStream.width, 1920);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(path.dirname(assetPath), { recursive: true });

  run(
    [
      'ffmpeg',
      '-y',
      '-i',
      inputPath,
      '-vf',
      `scale=${proxyWidth}:-2:flags=lanczos`,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '30',
      '-g',
      '30',
      '-keyint_min',
      '30',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      outputPath,
    ],
    'ffmpeg proxy transcode',
  );

  const proxyProbe = readProbe(
    run(
      [
        'ffprobe',
        '-v',
        'error',
        '-show_entries',
        'stream=width,height,r_frame_rate:format=duration',
        '-of',
        'json',
        outputPath,
      ],
      'ffprobe proxy video',
    ),
    'ffprobe proxy video',
  );
  const proxyStream = readFirstVideoStream(proxyProbe);
  const proxyDuration = Number.parseFloat(proxyProbe?.format?.duration || '0');
  const proxyFrameRate = parseFrameRate(proxyStream.r_frame_rate) || 30;

  const asset = {
    kind: 'product-film-proxy',
    createdAt: new Date().toISOString(),
    sourcePath: path.relative(process.cwd(), inputPath),
    proxyPath: path.relative(process.cwd(), outputPath),
    source: {
      width: sourceStream.width,
      height: sourceStream.height,
      durationSeconds: Number(sourceDuration.toFixed(2)),
      fps: Number(sourceFrameRate.toFixed(2)),
    },
    proxy: {
      width: proxyStream.width,
      height: proxyStream.height,
      durationSeconds: Number(proxyDuration.toFixed(2)),
      fps: Number(proxyFrameRate.toFixed(2)),
      gopFrames: 30,
    },
  };

  await fs.writeFile(assetPath, `${JSON.stringify(asset, null, 2)}\n`, 'utf8');
}

main().catch((error) => {
  console.error(`[prepare-edit-proxy] ERROR: ${error.message}`);
  process.exit(1);
});
