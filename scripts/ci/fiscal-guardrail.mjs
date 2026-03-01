#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesAny(filePath, patterns) {
  return patterns.some((pattern) => globToRegex(pattern).test(filePath));
}

function resolveChangedFiles() {
  const candidates = ['origin/prod...HEAD', 'prod...HEAD'];
  for (const ref of candidates) {
    const output = run(`git diff --name-only ${ref} --diff-filter=ACMRT`);
    if (output !== null) {
      const files = output.split('\n').map((line) => line.trim()).filter(Boolean);
      return { ref, files };
    }
  }

  const fallback = run('git diff --name-only HEAD~1...HEAD --diff-filter=ACMRT');
  if (fallback !== null) {
    const files = fallback.split('\n').map((line) => line.trim()).filter(Boolean);
    return { ref: 'HEAD~1...HEAD', files };
  }

  return { ref: 'unknown', files: [] };
}

const repoRoot = process.cwd();
const configPath = path.join(repoRoot, 'scripts', 'fiscal-paths.json');

if (!fs.existsSync(configPath)) {
  console.error('[fiscal-guardrail] Missing scripts/fiscal-paths.json');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const fiscalPaths = Array.isArray(config.fiscalPaths) ? config.fiscalPaths : [];
const evidencePaths = Array.isArray(config.evidencePaths) ? config.evidencePaths : [];

if (fiscalPaths.length === 0 || evidencePaths.length === 0) {
  console.error('[fiscal-guardrail] Invalid scripts/fiscal-paths.json (empty patterns)');
  process.exit(1);
}

const { ref, files } = resolveChangedFiles();
console.log(`[fiscal-guardrail] diff base: ${ref}`);

if (files.length === 0) {
  console.log('[fiscal-guardrail] No changed files. OK');
  process.exit(0);
}

const fiscalTouched = files.filter((filePath) => matchesAny(filePath, fiscalPaths));

if (fiscalTouched.length === 0) {
  if (process.env.ALLOW_NON_FISCAL_OVERRIDE === '1') {
    const reason = (process.env.NON_FISCAL_OVERRIDE_REASON || '').trim();
    if (!reason) {
      console.error('[fiscal-guardrail] ALLOW_NON_FISCAL_OVERRIDE=1 requires NON_FISCAL_OVERRIDE_REASON');
      process.exit(1);
    }
    console.log(`[fiscal-guardrail] Non-fiscal override accepted: ${reason}`);
  } else {
    console.log('[fiscal-guardrail] No fiscal paths touched. OK');
  }
  process.exit(0);
}

const evidenceTouched = files.filter((filePath) => matchesAny(filePath, evidencePaths));
if (evidenceTouched.length === 0) {
  console.error('[fiscal-guardrail] FAIL: fiscal paths changed without tests/docs evidence');
  console.error('[fiscal-guardrail] Fiscal files:');
  for (const filePath of fiscalTouched) {
    console.error(`  - ${filePath}`);
  }
  console.error('[fiscal-guardrail] Required: change at least one path in:');
  for (const pattern of evidencePaths) {
    console.error(`  - ${pattern}`);
  }
  process.exit(1);
}

console.log(`[fiscal-guardrail] Fiscal files touched: ${fiscalTouched.length}`);
console.log(`[fiscal-guardrail] Evidence files touched: ${evidenceTouched.length}`);
console.log('[fiscal-guardrail] OK');
