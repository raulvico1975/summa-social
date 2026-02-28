import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const auditDir = resolve('tmp/test-audit');
const summaryPath = resolve(auditDir, 'node-test-coverage.txt');
const rawCoverageDir = resolve(auditDir, 'coverage');

mkdirSync(rawCoverageDir, { recursive: true });

const ATTEMPTS = [
  {
    label: '--coverage',
    args: [
      '--import',
      'tsx',
      '--test',
      '--coverage',
      '--test-reporter=spec',
      'src/lib/__tests__/*.test.ts',
      'tests/sepa-pain008/*.test.ts',
    ],
    withRawCoverage: true,
  },
  {
    label: '--experimental-test-coverage',
    args: [
      '--import',
      'tsx',
      '--test',
      '--experimental-test-coverage',
      '--test-reporter=spec',
      'src/lib/__tests__/*.test.ts',
      'tests/sepa-pain008/*.test.ts',
    ],
    withRawCoverage: true,
  },
  {
    label: 'without coverage (fallback)',
    args: [
      '--import',
      'tsx',
      '--test',
      '--test-reporter=spec',
      'src/lib/__tests__/*.test.ts',
      'tests/sepa-pain008/*.test.ts',
    ],
    withRawCoverage: false,
    note: '[test:coverage] Coverage unavailable on this Node runtime. Executed tests without coverage.',
  },
];

function unsupportedCoverageOption(output) {
  return (
    output.includes('bad option: --coverage') ||
    output.includes('bad option: --experimental-test-coverage') ||
    output.includes('Unknown or unexpected option')
  );
}

let selected = null;
let output = '';
let statusCode = 1;

for (let i = 0; i < ATTEMPTS.length; i += 1) {
  const attempt = ATTEMPTS[i];
  const env = attempt.withRawCoverage
    ? { ...process.env, NODE_V8_COVERAGE: rawCoverageDir }
    : { ...process.env };

  const run = spawnSync(process.execPath, attempt.args, {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
  });

  if (run.error) {
    throw run.error;
  }

  const runOutput = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  const unsupported = attempt.withRawCoverage && unsupportedCoverageOption(runOutput);
  const isLastAttempt = i === ATTEMPTS.length - 1;

  if (unsupported && !isLastAttempt) {
    continue;
  }

  selected = attempt;
  output = runOutput;
  statusCode = run.status ?? 1;
  break;
}

if (!selected) {
  selected = ATTEMPTS[ATTEMPTS.length - 1];
  output = '';
  statusCode = 1;
}

const headerLines = [`[test:coverage] Runner mode: ${selected.label}`];
if (selected.note) {
  headerLines.push(selected.note);
}
headerLines.push(`[test:coverage] Coverage summary: ${summaryPath}`);
if (selected.withRawCoverage) {
  headerLines.push(`[test:coverage] Raw coverage dir: ${rawCoverageDir}`);
}

const finalOutput = `${headerLines.join('\n')}\n${output}`;

writeFileSync(summaryPath, finalOutput, 'utf8');
process.stdout.write(finalOutput);

process.exit(statusCode);
