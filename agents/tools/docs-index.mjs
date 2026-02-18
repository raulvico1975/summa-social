import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..', '..');
const docsDir = path.join(repoRoot, 'docs');
const outputFile = '/tmp/docs-index.json';

async function findMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const sortedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const files = [];

  for (const entry of sortedEntries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function toUnixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function validateMarkdown(content) {
  return {
    hasH1: /^#\s+\S/m.test(content),
    hasH2: /^##\s+\S/m.test(content),
  };
}

async function main() {
  const docsStat = await fs.stat(docsDir).catch(() => null);
  if (!docsStat || !docsStat.isDirectory()) {
    throw new Error(`Docs directory not found: ${docsDir}`);
  }

  const mdFiles = await findMarkdownFiles(docsDir);
  const report = [];

  for (const file of mdFiles) {
    const content = await fs.readFile(file, 'utf8');
    const { hasH1, hasH2 } = validateMarkdown(content);
    report.push({
      file: toUnixPath(path.relative(docsDir, file)),
      hasH1,
      hasH2,
    });
  }

  await fs.writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Indexed ${report.length} markdown files -> ${outputFile}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
