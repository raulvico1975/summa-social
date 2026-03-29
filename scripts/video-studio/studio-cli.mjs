#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const STUDIO_DIR = path.join(ROOT_DIR, 'studio');
const BRANDS_DIR = path.join(STUDIO_DIR, 'brands');
const PRESETS_DIR = path.join(STUDIO_DIR, 'presets');
const PROJECTS_DIR = path.join(STUDIO_DIR, 'projects');
const TEMPLATES_DIR = path.join(STUDIO_DIR, 'templates');
const DEMO_DIR = path.join(ROOT_DIR, 'scripts', 'demo');
const STORYBOARD_DIR = path.join(DEMO_DIR, 'video-storyboards');

function fail(message) {
  console.error(`[video-studio] ERROR: ${message}`);
  process.exit(1);
}

function log(message = '') {
  console.log(message);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(dirPath, entry.name))
    .sort();
}

function listBrandFiles() {
  if (!fs.existsSync(BRANDS_DIR)) return [];

  return fs
    .readdirSync(BRANDS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(BRANDS_DIR, entry.name, 'brand.json'))
    .filter((filePath) => fs.existsSync(filePath))
    .sort();
}

function loadBrands() {
  return listBrandFiles().map((filePath) => {
    const brand = readJson(filePath);
    return { ...brand, _filePath: filePath };
  });
}

function loadPresets() {
  return listJsonFiles(PRESETS_DIR).map((filePath) => {
    const preset = readJson(filePath);
    return { ...preset, _filePath: filePath };
  });
}

function loadProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  return fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(PROJECTS_DIR, entry.name, 'project.json'))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => {
      const project = readJson(filePath);
      return { ...project, _filePath: filePath };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function listRecordScripts() {
  if (!fs.existsSync(DEMO_DIR)) return [];

  return fs
    .readdirSync(DEMO_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('record-') && entry.name.endsWith('.mjs'))
    .map((entry) => entry.name)
    .sort();
}

function listStoryboards() {
  if (!fs.existsSync(STORYBOARD_DIR)) return [];

  return fs
    .readdirSync(STORYBOARD_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mjs'))
    .map((entry) => entry.name)
    .sort();
}

function commandExists(command) {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], {
    cwd: ROOT_DIR,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  return result.status === 0;
}

function parseFlag(flagName) {
  const index = process.argv.indexOf(flagName);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function relativePath(filePath) {
  return path.relative(ROOT_DIR, filePath) || '.';
}

function printUsage() {
  log('Summa Video Studio');
  log('');
  log('Comandes:');
  log('  summary');
  log('  doctor');
  log('  list-brands');
  log('  list-presets');
  log('  list-projects');
  log('  init-project --slug <slug> --brand <brand> --preset <preset> [--title <title>]');
}

function summary() {
  const brands = loadBrands();
  const presets = loadPresets();
  const projects = loadProjects();
  const recordScripts = listRecordScripts();
  const storyboards = listStoryboards();

  log('Summa Video Studio Foundation');
  log('');
  log(`Brands: ${brands.length}`);
  log(`Presets: ${presets.length}`);
  log(`Projects: ${projects.length}`);
  log(`Record scripts: ${recordScripts.length}`);
  log(`Storyboards: ${storyboards.length}`);
  log('');
  log('Seguent pas recomanat:');
  log('  npm run video:doctor');
  log('  npm run video:studio -- init-project --slug summa-home-promo --brand summa --preset home-hero --title "Home hero comercial"');
}

function listBrandsCommand() {
  const brands = loadBrands();

  if (!brands.length) {
    log('No hi ha marques configurades.');
    return;
  }

  for (const brand of brands) {
    const doodles = Array.isArray(brand.motionAssets?.doodles) ? brand.motionAssets.doodles.length : 0;
    log(`${brand.id}: ${brand.name}`);
    log(`  locales: ${(brand.defaultLocales || []).join(', ')}`);
    log(`  caption style: ${brand.defaultCaptionStyle || 'n/a'}`);
    log(`  doodles: ${doodles}`);
  }
}

function listPresetsCommand() {
  const presets = loadPresets();

  if (!presets.length) {
    log('No hi ha presets configurats.');
    return;
  }

  for (const preset of presets) {
    log(`${preset.id}: ${preset.label}`);
    log(`  aspecte: ${preset.aspectRatio}`);
    log(`  durada: ${preset.durationSeconds?.min ?? '?'}-${preset.durationSeconds?.max ?? '?'}s`);
    log(`  captions: ${preset.captionsMode}`);
    log(`  intro/outro: ${preset.includeIntro ? 'si' : 'no'}/${preset.includeOutro ? 'si' : 'no'}`);
  }
}

function listProjectsCommand() {
  const projects = loadProjects();

  if (!projects.length) {
    log('No hi ha projectes creats encara.');
    return;
  }

  for (const project of projects) {
    log(`${project.slug}: ${project.title || '(sense titol)'}`);
    log(`  brand: ${project.brand}`);
    log(`  preset: ${project.preset}`);
    log(`  status: ${project.status}`);
  }
}

function doctor() {
  const requiredBinaries = ['ffmpeg', 'ffprobe'];
  const optionalBinaries = ['magick', 'cwebp'];
  const requiredFiles = [
    path.join(ROOT_DIR, 'scripts', 'demo', 'postproduce-demo-video.mjs'),
    path.join(ROOT_DIR, 'docs', 'operations', 'DEMO-GRAVACIONS-PLAYBOOK.md'),
  ];

  let hasErrors = false;

  log('Video Studio doctor');
  log('');

  for (const binary of requiredBinaries) {
    const ok = commandExists(binary);
    log(`${ok ? 'OK ' : 'ERR'} binari requerit: ${binary}`);
    if (!ok) hasErrors = true;
  }

  for (const binary of optionalBinaries) {
    const ok = commandExists(binary);
    log(`${ok ? 'OK ' : 'WARN'} binari opcional: ${binary}`);
  }

  for (const filePath of requiredFiles) {
    const ok = fs.existsSync(filePath);
    log(`${ok ? 'OK ' : 'ERR'} fitxer base: ${relativePath(filePath)}`);
    if (!ok) hasErrors = true;
  }

  const brands = loadBrands();
  for (const brand of brands) {
    const assetPaths = [
      brand.logoPath,
      brand.introClips?.ca,
      brand.introClips?.es,
      brand.outroClips?.ca,
      brand.outroClips?.es,
      ...(Array.isArray(brand.motionAssets?.doodles) ? brand.motionAssets.doodles : []),
    ].filter(Boolean);

    for (const assetPath of assetPaths) {
      const fullPath = path.join(ROOT_DIR, assetPath);
      const ok = fs.existsSync(fullPath);
      log(`${ok ? 'OK ' : 'ERR'} asset ${brand.id}: ${assetPath}`);
      if (!ok) hasErrors = true;
    }
  }

  log('');
  if (hasErrors) {
    fail('Doctor amb errors.');
  }

  log('Tot el minim necessari hi es.');
}

function initProject() {
  const slug = parseFlag('--slug');
  const brandId = parseFlag('--brand');
  const presetId = parseFlag('--preset');
  const title = parseFlag('--title') || slug;

  if (!slug) fail('Falta --slug');
  if (!brandId) fail('Falta --brand');
  if (!presetId) fail('Falta --preset');

  const brands = loadBrands();
  const presets = loadPresets();
  const brand = brands.find((entry) => entry.id === brandId);
  const preset = presets.find((entry) => entry.id === presetId);

  if (!brand) fail(`No existeix la marca ${brandId}`);
  if (!preset) fail(`No existeix el preset ${presetId}`);

  const projectDir = path.join(PROJECTS_DIR, slug);
  const projectFile = path.join(projectDir, 'project.json');
  const briefFile = path.join(projectDir, 'BRIEF.md');

  if (fs.existsSync(projectFile)) {
    fail(`Ja existeix el projecte ${relativePath(projectFile)}`);
  }

  ensureDir(projectDir);

  const project = {
    slug,
    brand: brand.id,
    preset: preset.id,
    title,
    status: 'draft',
    objective: '',
    audience: 'web visitors',
    locales: brand.defaultLocales || ['ca'],
    recording: {
      script: '',
      sourceScenario: '',
      notes: [],
    },
    storyboard: {
      slug: '',
      captionsMode: preset.captionsMode || 'overlay',
    },
    targets: (brand.defaultLocales || ['ca']).map((locale) => ({
      surface: preset.surfaces?.[0] || 'landing',
      locale,
    })),
    brandAssets: {
      intro: Boolean(preset.includeIntro),
      outro: Boolean(preset.includeOutro),
      doodles: [],
    },
    publish: {
      publicDir: '',
      landingSlug: '',
    },
  };

  const brief = [
    '# Video Brief',
    '',
    `Tema: ${title}`,
    '',
    'Objectiu:',
    '',
    'Audiencia:',
    '',
    `On es fara servir: ${(preset.surfaces || []).join(', ')}`,
    '',
    `Idiomes: ${(brand.defaultLocales || []).join(', ')}`,
    '',
    `Durada orientativa: ${preset.durationSeconds?.min ?? '?'}-${preset.durationSeconds?.max ?? '?'}s`,
    '',
    'Pantalles o flux a mostrar:',
    '1.',
    '2.',
    '3.',
    '',
    'Resultat final que s ha de veure:',
    '',
    'To visual:',
    '',
    'Notes de marca o copy:',
    '',
  ].join('\n');

  writeJson(projectFile, project);
  fs.writeFileSync(briefFile, `${brief}\n`, 'utf8');

  log(`Projecte creat: ${relativePath(projectFile)}`);
  log(`Brief creat: ${relativePath(briefFile)}`);
}

const command = process.argv[2] || 'summary';

switch (command) {
  case 'summary':
    summary();
    break;
  case 'doctor':
    doctor();
    break;
  case 'list-brands':
    listBrandsCommand();
    break;
  case 'list-presets':
    listPresetsCommand();
    break;
  case 'list-projects':
    listProjectsCommand();
    break;
  case 'init-project':
    initProject();
    break;
  case 'help':
  case '--help':
  case '-h':
    printUsage();
    break;
  default:
    fail(`Comanda no suportada: ${command}`);
}
