import { writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const summaryPath = resolve('tmp/test-audit/node-test-coverage.txt');
const outPath = resolve('tmp/test-audit/coverage-surface.txt');
const srcRoot = resolve('src');

function walk(dir, results) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, results);
      continue;
    }

    if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) {
      continue;
    }
    if (fullPath.endsWith('.test.ts') || fullPath.endsWith('.test.tsx') || fullPath.endsWith('.spec.ts') || fullPath.endsWith('.spec.tsx')) {
      continue;
    }

    results.push(`src/${relative(srcRoot, fullPath).replaceAll('\\', '/')}`);
  }
}

function parseCoveredFiles(text) {
  const covered = [];
  const lines = text.split(/\r?\n/);
  let inCoverageTable = false;
  const pathStack = {};

  for (const rawLine of lines) {
    if (rawLine.includes('start of coverage report')) {
      inCoverageTable = true;
      continue;
    }
    if (rawLine.includes('end of coverage report')) {
      inCoverageTable = false;
      break;
    }
    if (!inCoverageTable || !rawLine.startsWith('ℹ ')) {
      continue;
    }

    const line = rawLine.slice(2);
    const [left] = line.split('|');
    if (!left) {
      continue;
    }

    const indent = (left.match(/^\s*/) || [''])[0].length;
    const name = left.trim();
    if (!name || name === 'file' || name === 'src' || name === 'all files') {
      continue;
    }

    if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      let fullPath = 'src';
      for (let i = 1; i < indent; i += 1) {
        if (pathStack[i]) {
          fullPath += `/${pathStack[i]}`;
        }
      }
      fullPath += `/${name}`;
      covered.push(fullPath);
      continue;
    }

    pathStack[indent] = name;
    for (let i = indent + 1; i < 24; i += 1) {
      delete pathStack[i];
    }
  }

  return [...new Set(covered)];
}

const srcFiles = [];
if (existsSync(srcRoot)) {
  walk(srcRoot, srcFiles);
}

if (!existsSync(summaryPath)) {
  const message = 'surface metric unavailable (missing coverage summary)';
  console.log(message);
  writeFileSync(outPath, `${message}\n`, 'utf8');
  process.exit(0);
}

const summaryText = await readFile(summaryPath, 'utf8');
const coveredFiles = parseCoveredFiles(summaryText);

if (coveredFiles.length === 0 || srcFiles.length === 0) {
  const message = 'surface metric unavailable';
  console.log(message);
  writeFileSync(outPath, `${message}\n`, 'utf8');
  process.exit(0);
}

const srcSet = new Set(srcFiles);
const executedCount = coveredFiles.filter((file) => srcSet.has(file)).length;
const ratio = srcFiles.length > 0 ? ((executedCount / srcFiles.length) * 100).toFixed(2) : '0.00';
const line = `executedFiles/src = ${executedCount}/${srcFiles.length} (${ratio}%)`;

console.log(line);
writeFileSync(outPath, `${line}\n`, 'utf8');
