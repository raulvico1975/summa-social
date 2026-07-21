import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('el paquet de Functions carrega la sortida compilada real i neteja residus abans del build', () => {
  const functionsPackage = JSON.parse(
    readFileSync(join(process.cwd(), 'functions', 'package.json'), 'utf8')
  ) as { main?: string; scripts?: { build?: string } };
  const functionsTsconfig = JSON.parse(
    readFileSync(join(process.cwd(), 'functions', 'tsconfig.json'), 'utf8')
  ) as { compilerOptions?: { rootDir?: string; outDir?: string } };

  assert.equal(functionsPackage.main, 'lib/functions/src/index.js');
  assert.match(functionsPackage.scripts?.build ?? '', /rmSync\('lib'/);
  assert.match(functionsPackage.scripts?.build ?? '', /require\('\.\/lib\/functions\/src\/index\.js'\)/);
  assert.equal(functionsTsconfig.compilerOptions?.rootDir, '..');
  assert.equal(functionsTsconfig.compilerOptions?.outDir, 'lib');
});
