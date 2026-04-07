import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const FEATURES_DIR = path.join(ROOT, 'public', 'visuals', 'web', 'features-v3');
const SOURCE_SUFFIX = '_loop_4k.mp4';
const OUTPUT_SUFFIX = '_loop_720p.mp4';

function formatMegabytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function runFfmpeg(args) {
  const result = spawnSync('ffmpeg', args, {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`ffmpeg ha fallat amb codi ${result.status ?? 'desconegut'}`);
  }
}

const sourceFiles = readdirSync(FEATURES_DIR)
  .filter((file) => file.endsWith(SOURCE_SUFFIX))
  .sort();

if (sourceFiles.length === 0) {
  console.error('[home-video-optimize] No he trobat cap fitxer *_loop_4k.mp4');
  process.exit(1);
}

let totalSourceBytes = 0;
let totalOutputBytes = 0;
let encodedCount = 0;
let skippedCount = 0;

for (const fileName of sourceFiles) {
  const sourcePath = path.join(FEATURES_DIR, fileName);
  const outputPath = path.join(FEATURES_DIR, fileName.replace(SOURCE_SUFFIX, OUTPUT_SUFFIX));
  const sourceStats = statSync(sourcePath);
  totalSourceBytes += sourceStats.size;

  const outputExists = (() => {
    try {
      return statSync(outputPath);
    } catch {
      return null;
    }
  })();

  if (outputExists && outputExists.mtimeMs >= sourceStats.mtimeMs) {
    totalOutputBytes += outputExists.size;
    skippedCount += 1;
    console.log(`[home-video-optimize] Skip ${path.basename(outputPath)} (${formatMegabytes(outputExists.size)})`);
    continue;
  }

  console.log(`[home-video-optimize] Encode ${fileName} -> ${path.basename(outputPath)}`);

  runFfmpeg([
    '-y',
    '-i',
    sourcePath,
    '-vf',
    "scale='min(1280,iw)':-2:flags=lanczos,fps=24",
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '28',
    '-movflags',
    '+faststart',
    outputPath,
  ]);

  const outputStats = statSync(outputPath);
  totalOutputBytes += outputStats.size;
  encodedCount += 1;

  console.log(
    `[home-video-optimize] Done ${path.basename(outputPath)} ${formatMegabytes(sourceStats.size)} -> ${formatMegabytes(outputStats.size)}`
  );
}

console.log(
  `[home-video-optimize] Resum: ${sourceFiles.length} fitxers, ${encodedCount} encodats, ${skippedCount} reutilitzats`
);
console.log(
  `[home-video-optimize] Pes total: ${formatMegabytes(totalSourceBytes)} -> ${formatMegabytes(totalOutputBytes)}`
);
