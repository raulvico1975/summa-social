#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(process.cwd(), 'src');
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const T_CALL_REGEX = /(^|[^A-Za-z0-9_])t\(\s*["']/g;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!CODE_EXTENSIONS.has(path.extname(entry.name))) continue;
    files.push(fullPath);
  }

  return files;
}

function findViolations(content) {
  const lines = content.split('\n');
  const matches = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const regex = new RegExp(T_CALL_REGEX.source, 'g');
    let match;
    while ((match = regex.exec(line)) !== null) {
      const col = match.index + match[1].length + 1;
      matches.push({
        line: i + 1,
        col,
        snippet: line.trim(),
      });
    }
  }

  return matches;
}

async function main() {
  let files = [];
  try {
    files = await walk(SRC_DIR);
  } catch (error) {
    console.error('[i18n] ERROR: no s\'ha pogut llegir src/:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const violations = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const found = findViolations(content);
    for (const issue of found) {
      violations.push({
        file: path.relative(process.cwd(), file),
        ...issue,
      });
    }
  }

  if (violations.length > 0) {
    console.error('[i18n] ERROR: ús prohibit de t("...") o t(\'...\') detectat.')
    console.error('[i18n] Usa tr("...") per text nou o t.xxx.yyy per legacy.')
    for (const v of violations) {
      console.error(`- ${v.file}:${v.line}:${v.col}  ${v.snippet}`);
    }
    process.exit(1);
  }

  console.log('[i18n] OK: no s\'ha detectat cap t("...") ni t(\'...\').');
}

await main();
