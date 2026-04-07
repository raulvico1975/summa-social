#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const args = process.argv.slice(2);
const forceUpload = args.includes('--force');
const forceMatches = [];

for (let index = 0; index < args.length; index += 1) {
  if (args[index] !== '--match') continue;
  const value = args[index + 1];
  if (!value) {
    console.error('Missing value for --match');
    process.exit(1);
  }
  forceMatches.push(value);
  index += 1;
}

const accountId = process.env.CF_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CF_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;

if (!accountId || !apiToken) {
  console.error(
    'Missing Cloudflare credentials. Run this script through scripts/cloudflare/with-keychain-cloudflare-env.sh or export CF_ACCOUNT_ID/CF_API_TOKEN.'
  );
  process.exit(1);
}

const projectRoot = process.cwd();
const featuresDir = path.join(projectRoot, 'public', 'visuals', 'web', 'features-v3');
const outputFile = path.join(projectRoot, 'src', 'data', 'home-feature-stream-videos.ts');
const creatorId = 'summa-social-home-features';
const execFile = promisify(execFileCallback);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cloudflareJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Cloudflare request failed (${response.status}) for ${url}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(`Cloudflare API error for ${url}: ${JSON.stringify(json.errors ?? [])}`);
  }

  return json.result;
}

async function listExistingVideo(fileName) {
  const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`);
  url.searchParams.set('video_name', fileName);

  const result = await cloudflareJson(url.toString());
  const candidates = (result ?? [])
    .filter((entry) => entry?.meta?.name === fileName)
    .sort((left, right) => {
      if ((left.readyToStream ? 1 : 0) !== (right.readyToStream ? 1 : 0)) {
        return (right.readyToStream ? 1 : 0) - (left.readyToStream ? 1 : 0);
      }

      return new Date(right.created ?? 0).getTime() - new Date(left.created ?? 0).getTime();
    });

  return candidates[0] ?? null;
}

async function createDirectUpload(fileName, publicPath) {
  return cloudflareJson(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: 60,
        requireSignedURLs: false,
        allowedOrigins: [],
        creator: creatorId,
        meta: {
          name: fileName,
          sourcePath: publicPath,
          purpose: 'summa-social-home-functionalities',
        },
      }),
    }
  );
}

async function uploadVideo(uploadUrl, filePath) {
  const fileName = path.basename(filePath);
  await execFile('curl', [
    '--silent',
    '--show-error',
    '--fail',
    '--request',
    'POST',
    uploadUrl,
    '--form',
    `file=@${filePath};type=video/mp4;filename=${fileName}`,
  ]);
}

function shouldForceFile(fileName) {
  if (!forceUpload) return false;
  if (forceMatches.length === 0) return true;
  return forceMatches.some((token) => fileName.includes(token));
}

async function createOrReuseReadyVideo(fileName, publicPath, filePath, { force = false } = {}) {
  if (force) {
    process.stdout.write(`  forcing new upload for ${fileName}\n`);
    const upload = await createDirectUpload(fileName, publicPath);
    await uploadVideo(upload.uploadURL, filePath);
    return await waitUntilReady(upload.uid);
  }

  const existing = await listExistingVideo(fileName);
  if (existing?.readyToStream) {
    return existing;
  }

  const existingState = existing?.status?.state ?? null;

  if (
    existing &&
    !existing.readyToStream &&
    existingState !== 'pendingupload' &&
    existingState !== 'error'
  ) {
    return waitUntilReady(existing.uid);
  }

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      process.stdout.write(`  upload attempt ${attempt}/3 for ${fileName}\n`);
      const upload = await createDirectUpload(fileName, publicPath);
      await uploadVideo(upload.uploadURL, filePath);
      return await waitUntilReady(upload.uid);
    } catch (error) {
      lastError = error;
      process.stdout.write(`  upload retry for ${fileName}: ${error instanceof Error ? error.message : String(error)}\n`);
      await sleep(1500);
    }
  }

  throw lastError ?? new Error(`Failed to upload ${fileName}`);
}

async function waitUntilReady(videoUid) {
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    const result = await cloudflareJson(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoUid}`
    );

    if (result.readyToStream) {
      return result;
    }

    process.stdout.write(
      `  waiting ${videoUid} (${result.status?.state ?? 'unknown'}) attempt ${attempt}/120\n`
    );
    await sleep(2000);
  }

  throw new Error(`Timed out waiting for Stream video ${videoUid}`);
}

function extractCustomerCode(playbackUrl) {
  const hostname = new URL(playbackUrl).hostname;
  const match = hostname.match(/^customer-([^.]+)\.cloudflarestream\.com$/);
  if (!match) {
    throw new Error(`Could not extract customer code from ${playbackUrl}`);
  }
  return match[1];
}

function renderModule(customerCode, entries) {
  const renderedEntries = Object.entries(entries)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([publicPath, entry]) => {
      return `  '${publicPath}': {\n    uid: '${entry.uid}',\n    duration: ${entry.duration},\n    width: ${entry.width},\n    height: ${entry.height},\n    preview: '${entry.preview}',\n    thumbnail: '${entry.thumbnail}',\n  },`;
    })
    .join('\n');

  return `export const HOME_FEATURE_STREAM_CUSTOMER_CODE = '${customerCode}';\n\nexport const HOME_FEATURE_STREAMS = {\n${renderedEntries}\n} as const;\n`;
}

const files = (await fs.readdir(featuresDir))
  .filter((fileName) => fileName.endsWith('_loop_4k.mp4'))
  .sort((left, right) => left.localeCompare(right));

if (files.length === 0) {
  console.error('No *_loop_4k.mp4 files found under public/visuals/web/features-v3');
  process.exit(1);
}

const outputEntries = {};
let customerCode = null;

for (const fileName of files) {
  const filePath = path.join(featuresDir, fileName);
  const publicPath = `/visuals/web/features-v3/${fileName}`;
  const forceThisFile = shouldForceFile(fileName);

  process.stdout.write(`sync ${fileName}${forceThisFile ? ' (force)' : ''}\n`);
  const video = await createOrReuseReadyVideo(fileName, publicPath, filePath, {
    force: forceThisFile,
  });

  customerCode ??= extractCustomerCode(video.playback.hls);
  outputEntries[publicPath] = {
    uid: video.uid,
    duration: video.duration ?? 0,
    width: video.input?.width ?? 0,
    height: video.input?.height ?? 0,
    preview: video.preview ?? '',
    thumbnail: video.thumbnail ?? '',
  };
}

if (!customerCode) {
  throw new Error('Failed to resolve Cloudflare Stream customer code.');
}

await fs.mkdir(path.dirname(outputFile), { recursive: true });
await fs.writeFile(outputFile, renderModule(customerCode, outputEntries), 'utf8');

process.stdout.write(`\nWrote ${outputFile}\n`);
