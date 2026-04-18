import path from 'node:path';

import { listRenderablePieces } from './project-runtime.mjs';

const projectRoot = path.resolve(import.meta.dirname, '..');
const pieces = await listRenderablePieces(projectRoot);

for (const piece of pieces) {
  console.log(`${piece.id}\t${piece.width}x${piece.height}\t${piece.duration}s`);
}
