import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function parseRequiredAttribute(html, attributeName, context) {
  const pattern = new RegExp(`${attributeName}="([^"]+)"`);
  const match = html.match(pattern);
  if (!match) {
    throw new Error(`Missing ${attributeName} in ${context}`);
  }

  return match[1];
}

function buildRuntimeEntry(piece) {
  return `<!doctype html>
<html lang="ca">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${piece.width}, height=${piece.height}" />
    <link rel="icon" href="data:," />
    <title>Summa Social Hyperframes — ${piece.id}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        width: ${piece.width}px;
        height: ${piece.height}px;
        overflow: hidden;
        background: #f1ede4;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="summa-social-root"
      data-start="0"
      data-duration="${piece.duration}"
      data-width="${piece.width}"
      data-height="${piece.height}"
    >
      <div
        id="summa-piece-root"
        data-composition-id="${piece.id}"
        data-composition-src="${piece.src}"
        data-start="0"
        data-duration="${piece.duration}"
        data-track-index="0"
        data-width="${piece.width}"
        data-height="${piece.height}"
      ></div>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      window.__timelines["summa-social-root"] = tl;
    </script>
  </body>
</html>
`;
}

async function ensureSymlink(targetPath, linkPath) {
  await fs.symlink(targetPath, linkPath, 'dir');
}

async function ensureFileSymlink(targetPath, linkPath) {
  await fs.symlink(targetPath, linkPath, 'file');
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readCompositionPiece(projectRoot, filename) {
  const filePath = path.join(projectRoot, 'compositions', filename);
  const html = await fs.readFile(filePath, 'utf8');
  const id = parseRequiredAttribute(html, 'data-composition-id', filename);
  const width = Number.parseInt(parseRequiredAttribute(html, 'data-width', filename), 10);
  const height = Number.parseInt(parseRequiredAttribute(html, 'data-height', filename), 10);
  const duration = Number.parseFloat(parseRequiredAttribute(html, 'data-duration', filename));

  return {
    id,
    filename,
    src: `compositions/${filename}`,
    width,
    height,
    duration,
  };
}

export async function listRenderablePieces(projectRoot) {
  const compositionsDir = path.join(projectRoot, 'compositions');
  const entries = await fs.readdir(compositionsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => entry.name)
    .sort();

  const pieces = [];
  for (const filename of files) {
    pieces.push(await readCompositionPiece(projectRoot, filename));
  }

  return pieces;
}

export async function resolveRenderablePiece(projectRoot, pieceId) {
  const pieces = await listRenderablePieces(projectRoot);
  const piece = pieces.find((entry) => entry.id === pieceId);

  if (!piece) {
    const available = pieces.map((entry) => entry.id).join(', ');
    throw new Error(`Unknown composition "${pieceId}". Available: ${available}`);
  }

  return piece;
}

export async function createRuntimeProject(projectRoot, pieceId) {
  const piece = await resolveRenderablePiece(projectRoot, pieceId);
  const runtimeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'summa-hyperframes-'));
  const preferredOutputRoot = path.join(projectRoot, 'output');
  const fallbackOutputRoot = path.resolve(projectRoot, '..', '..', 'output');

  await ensureSymlink(path.join(projectRoot, 'assets'), path.join(runtimeRoot, 'assets'));
  await ensureSymlink(path.join(projectRoot, 'compositions'), path.join(runtimeRoot, 'compositions'));
  if (await pathExists(preferredOutputRoot)) {
    await ensureSymlink(preferredOutputRoot, path.join(runtimeRoot, 'output'));
  } else if (await pathExists(fallbackOutputRoot)) {
    await ensureSymlink(fallbackOutputRoot, path.join(runtimeRoot, 'output'));
  }
  await ensureFileSymlink(
    path.join(projectRoot, 'hyperframes.json'),
    path.join(runtimeRoot, 'hyperframes.json'),
  );
  await ensureFileSymlink(path.join(projectRoot, 'meta.json'), path.join(runtimeRoot, 'meta.json'));
  await fs.writeFile(path.join(runtimeRoot, 'index.html'), buildRuntimeEntry(piece), 'utf8');

  return runtimeRoot;
}
