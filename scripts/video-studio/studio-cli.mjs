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
const POSTPRODUCE_SCRIPT = path.join(DEMO_DIR, 'postproduce-demo-video.mjs');
const DEFAULT_VIDEO_SUBDIR = 'animations';
const DEFAULT_POSTER_SUBDIR = 'optimized';
const DEFAULT_POSTER_TIME_SECONDS = 2;

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

function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
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
  const result = run('bash', ['-lc', `command -v ${command}`]);

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

function toAbsolutePath(repoPath) {
  if (!repoPath) return null;
  return path.isAbsolute(repoPath) ? repoPath : path.join(ROOT_DIR, repoPath);
}

function fileExists(repoPath) {
  const fullPath = toAbsolutePath(repoPath);
  return fullPath ? fs.existsSync(fullPath) : false;
}

function findBrandById(brandId) {
  return loadBrands().find((brand) => brand.id === brandId) ?? null;
}

function findPresetById(presetId) {
  return loadPresets().find((preset) => preset.id === presetId) ?? null;
}

function loadProjectBySlug(slug) {
  const projectFile = path.join(PROJECTS_DIR, slug, 'project.json');
  if (!fs.existsSync(projectFile)) {
    fail(`No existeix el projecte ${slug}`);
  }

  const project = readJson(projectFile);
  return {
    ...project,
    _filePath: projectFile,
    _dirPath: path.dirname(projectFile),
  };
}

function saveProject(project) {
  const { _filePath, _dirPath, ...persisted } = project;
  writeJson(_filePath, persisted);
}

function resolveProjectVariants(project) {
  const explicitVariants = Array.isArray(project.render?.variants) ? project.render.variants.filter(Boolean) : [];
  const locales = Array.isArray(project.locales) ? project.locales.filter(Boolean) : [];
  const variants = explicitVariants.length > 0 ? explicitVariants : locales;

  if (variants.length === 0) {
    return ['ca'];
  }

  return [...new Set(variants)];
}

function toVariantArg(variants) {
  if (variants.length === 2 && variants.includes('ca') && variants.includes('es')) {
    return 'all';
  }

  if (variants.length === 1) {
    return variants[0];
  }

  fail(`No s ha pogut convertir la combinacio de variants: ${variants.join(', ')}`);
}

function resolveProjectInputPath(project, variant = null) {
  if (variant && project.render?.inputByVariant?.[variant]) {
    return project.render.inputByVariant[variant];
  }

  if (project.render?.inputPath) {
    return project.render.inputPath;
  }

  if (project.recording?.sourceVideo) {
    return project.recording.sourceVideo;
  }

  if (project.recording?.sourceScenario) {
    return `output/playwright/${project.recording.sourceScenario}/${project.recording.sourceScenario}.mp4`;
  }

  return '';
}

function resolveRenderStoryboardSlug(project) {
  return project.render?.storyboardSlug || project.storyboard?.slug || '';
}

function resolveProjectArtifactDir(project) {
  const scenario = project.recording?.sourceScenario;
  if (!scenario) return '';
  return `output/playwright/${scenario}`;
}

function resolveRenderedVariantPaths(project, variant) {
  const artifactDir = resolveProjectArtifactDir(project);
  const storyboardSlug = resolveRenderStoryboardSlug(project);
  if (!artifactDir || !storyboardSlug) {
    return null;
  }

  return {
    mp4: path.join(ROOT_DIR, artifactDir, `${storyboardSlug}.${variant}.mp4`),
    srt: path.join(ROOT_DIR, artifactDir, `${storyboardSlug}.${variant}.srt`),
    vtt: path.join(ROOT_DIR, artifactDir, `${storyboardSlug}.${variant}.vtt`),
  };
}

function getPublishFileBase(project) {
  return project.publish?.fileBase || project.slug;
}

function getPublishPublicDir(project) {
  return project.publish?.publicDir || '';
}

function getRenderCommandHint(project) {
  return `npm run video:studio -- render-project --slug ${project.slug}`;
}

function getRecordCommandHint(project) {
  if (!project.recording?.script) return null;
  const args = Array.isArray(project.recording.args) ? project.recording.args : [];
  return `node ${project.recording.script}${args.length > 0 ? ` ${args.join(' ')}` : ''}`;
}

function addFinding(findings, level, message) {
  findings.push({ level, message });
}

function validateProject(project) {
  const findings = [];
  let readyForRender = true;
  let readyForPublish = true;

  const brand = findBrandById(project.brand);
  const preset = findPresetById(project.preset);
  const storyboardSlug = resolveRenderStoryboardSlug(project);
  const inputPath = resolveProjectInputPath(project);
  const renderMode = project.render?.mode || 'storyboard';
  const publishPublicDir = getPublishPublicDir(project);
  const variants = resolveProjectVariants(project);

  if (!brand) {
    addFinding(findings, 'error', `Marca inexistent: ${project.brand}`);
    readyForRender = false;
    readyForPublish = false;
  } else {
    addFinding(findings, 'ok', `Marca valida: ${brand.name}`);
  }

  if (!preset) {
    addFinding(findings, 'error', `Preset inexistent: ${project.preset}`);
    readyForRender = false;
    readyForPublish = false;
  } else {
    addFinding(findings, 'ok', `Preset valid: ${preset.label}`);
  }

  if (renderMode !== 'storyboard') {
    addFinding(findings, 'error', `Mode de render no suportat encara: ${renderMode}`);
    readyForRender = false;
  }

  if (!storyboardSlug) {
    addFinding(findings, 'error', 'Falta render.storyboardSlug');
    readyForRender = false;
  } else {
    const storyboardPath = path.join(STORYBOARD_DIR, `${storyboardSlug}.mjs`);
    if (!fs.existsSync(storyboardPath)) {
      addFinding(findings, 'error', `Storyboard inexistent: ${relativePath(storyboardPath)}`);
      readyForRender = false;
    } else {
      addFinding(findings, 'ok', `Storyboard valid: ${storyboardSlug}`);
    }
  }

  if (!inputPath) {
    addFinding(findings, 'error', 'No s ha definit cap video base per renderitzar');
    readyForRender = false;
  } else if (!fileExists(inputPath)) {
    readyForRender = false;
    addFinding(findings, 'warn', `Falta el video base: ${inputPath}`);
    const recordHint = getRecordCommandHint(project);
    if (recordHint) {
      addFinding(findings, 'info', `Per generar-lo: ${recordHint}`);
    }
  } else {
    addFinding(findings, 'ok', `Video base disponible: ${inputPath}`);
  }

  if (project.render?.inputByVariant) {
    for (const variant of variants) {
      const variantInputPath = resolveProjectInputPath(project, variant);
      if (!variantInputPath) {
        readyForRender = false;
        addFinding(findings, 'error', `Falta video base per la variant ${variant}`);
      } else if (!fileExists(variantInputPath)) {
        readyForRender = false;
        addFinding(findings, 'warn', `Falta el video base de ${variant}: ${variantInputPath}`);
      } else {
        addFinding(findings, 'ok', `Video base de ${variant} disponible: ${variantInputPath}`);
      }
    }
  }

  if (project.recording?.script) {
    if (!fileExists(project.recording.script)) {
      addFinding(findings, 'warn', `Script de gravacio no trobat: ${project.recording.script}`);
    } else {
      addFinding(findings, 'ok', `Script de gravacio disponible: ${project.recording.script}`);
    }
  }

  if (!project.recording?.sourceScenario) {
    addFinding(findings, 'warn', 'Falta recording.sourceScenario; les rutes d artefactes quedaran menys consistents');
  }

  if (!publishPublicDir) {
    readyForPublish = false;
    addFinding(findings, 'warn', 'Falta publish.publicDir');
  } else {
    const publishDirAbsolute = toAbsolutePath(publishPublicDir);
    addFinding(findings, 'ok', `Directori public configurat: ${publishPublicDir}`);
    const parentDir = path.dirname(publishDirAbsolute);
    if (!fs.existsSync(parentDir)) {
      readyForPublish = false;
      addFinding(findings, 'error', `No existeix el directori pare de publicacio: ${relativePath(parentDir)}`);
    }
  }

  if (!project.publish?.fileBase) {
    addFinding(findings, 'warn', `Falta publish.fileBase; s usara ${project.slug}`);
  } else {
    addFinding(findings, 'ok', `Base de fitxers publica: ${project.publish.fileBase}`);
  }

  for (const variant of variants) {
    const rendered = resolveRenderedVariantPaths(project, variant);
    if (!rendered) {
      readyForPublish = false;
      continue;
    }

    if (!fs.existsSync(rendered.mp4)) {
      readyForPublish = false;
      addFinding(findings, 'warn', `Encara no existeix l artefacte renderitzat per ${variant}: ${relativePath(rendered.mp4)}`);
    }
  }

  return {
    brand,
    preset,
    storyboardSlug,
    inputPath,
    publishPublicDir,
    variants,
    readyForRender,
    readyForPublish,
    findings,
  };
}

function printFindings(findings) {
  for (const finding of findings) {
    const prefix =
      finding.level === 'ok' ? 'OK ' :
      finding.level === 'warn' ? 'WARN' :
      finding.level === 'error' ? 'ERR' :
      'INFO';
    log(`${prefix} ${finding.message}`);
  }
}

function describeProject(project, validation) {
  log(`${project.slug}: ${project.title || '(sense titol)'}`);
  log(`  brand: ${project.brand}`);
  log(`  preset: ${project.preset}`);
  log(`  status: ${project.status || 'draft'}`);
  log(`  locales: ${(project.locales || []).join(', ') || 'n/a'}`);
  log(`  storyboard: ${validation.storyboardSlug || 'n/a'}`);
  log(`  input: ${validation.inputPath || 'n/a'}`);
  log(`  public dir: ${validation.publishPublicDir || 'n/a'}`);
  log(`  ready render: ${validation.readyForRender ? 'si' : 'no'}`);
  log(`  ready publish: ${validation.readyForPublish ? 'si' : 'no'}`);
  if (project.render?.lastRenderedAt) {
    log(`  last render: ${project.render.lastRenderedAt}`);
  }
  if (project.publish?.lastPublishedAt) {
    log(`  last publish: ${project.publish.lastPublishedAt}`);
  }
}

function copyFileEnsuringDir(sourcePath, destinationPath) {
  ensureDir(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

function createPosterFromVideo(videoPath, outputWebpPath, posterTimeSeconds) {
  if (!commandExists('ffmpeg')) {
    fail('Cal ffmpeg per generar posters.');
  }

  if (!commandExists('cwebp')) {
    fail('Cal cwebp per generar posters en WebP.');
  }

  const tmpDir = path.join(ROOT_DIR, 'tmp', 'video-studio-poster');
  resetDir(tmpDir);
  const framePath = path.join(tmpDir, 'poster-frame.png');

  let result = run('ffmpeg', [
    '-y',
    '-ss',
    String(posterTimeSeconds),
    '-i',
    videoPath,
    '-frames:v',
    '1',
    framePath,
  ]);

  if (result.status !== 0 || !fs.existsSync(framePath)) {
    result = run('ffmpeg', [
      '-y',
      '-i',
      videoPath,
      '-frames:v',
      '1',
      framePath,
    ]);
  }

  if (result.status !== 0 || !fs.existsSync(framePath)) {
    fail(result.stderr || 'No s ha pogut generar el frame del poster.');
  }

  const webpResult = run('cwebp', ['-quiet', '-q', '85', framePath, '-o', outputWebpPath]);
  if (webpResult.status !== 0) {
    fail(webpResult.stderr || 'No s ha pogut convertir el poster a WebP.');
  }
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
  log('  show-project --slug <slug>');
  log('  validate-project --slug <slug>');
  log('  render-project --slug <slug> [--publish]');
  log('  publish-project --slug <slug>');
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

function showProjectCommand() {
  const slug = parseFlag('--slug');
  if (!slug) fail('Falta --slug');

  const project = loadProjectBySlug(slug);
  const validation = validateProject(project);

  describeProject(project, validation);
  log('');
  printFindings(validation.findings);
  log('');

  if (!validation.readyForRender) {
    log('Seguent pas recomanat: validar o generar el video base.');
    const recordHint = getRecordCommandHint(project);
    if (recordHint) {
      log(`  ${recordHint}`);
    }
    return;
  }

  log(`Seguent pas recomanat: ${getRenderCommandHint(project)}`);
}

function validateProjectCommand() {
  const slug = parseFlag('--slug');
  if (!slug) fail('Falta --slug');

  const project = loadProjectBySlug(slug);
  const validation = validateProject(project);

  log(`Validacio del projecte ${slug}`);
  log('');
  printFindings(validation.findings);
  log('');
  log(`Render llest: ${validation.readyForRender ? 'si' : 'no'}`);
  log(`Publicacio llesta: ${validation.readyForPublish ? 'si' : 'no'}`);
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

function runNodeScript(scriptPath, args) {
  const result = run('node', [scriptPath, ...args]);

  if (result.stdout.trim()) {
    log(result.stdout.trim());
  }

  if (result.status !== 0) {
    fail(result.stderr.trim() || `Ha fallat ${relativePath(scriptPath)}`);
  }
}

function renderProjectCommand() {
  const slug = parseFlag('--slug');
  if (!slug) fail('Falta --slug');

  const project = loadProjectBySlug(slug);
  const validation = validateProject(project);

  if (!validation.readyForRender) {
    printFindings(validation.findings);
    fail(`El projecte ${slug} encara no esta llest per renderitzar.`);
  }

  const storyboardSlug = validation.storyboardSlug;
  const variants = validation.variants;
  const captionStyle = project.render?.captionStyle || findBrandById(project.brand)?.defaultCaptionStyle || 'summa-subtitle';

  log(`Renderitzant projecte ${slug}...`);
  for (const variant of variants) {
    const args = [
      POSTPRODUCE_SCRIPT,
      '--storyboard',
      storyboardSlug,
      '--variant',
      variant,
      '--caption-style',
      captionStyle,
      '--input',
      resolveProjectInputPath(project, variant),
    ];

    const renderEncoding = project.render?.encoding;
    if (renderEncoding?.crf !== undefined) {
      args.push('--crf', String(renderEncoding.crf));
    }
    if (renderEncoding?.preset) {
      args.push('--preset', String(renderEncoding.preset));
    }

    runNodeScript(POSTPRODUCE_SCRIPT, args.slice(1));
  }

  project.status = process.argv.includes('--publish') ? 'published' : 'rendered';
  project.render = {
    ...project.render,
    lastRenderedAt: new Date().toISOString(),
    renderedVariants: variants,
    renderedArtifactDir: resolveProjectArtifactDir(project),
  };
  saveProject(project);

  if (process.argv.includes('--publish')) {
    publishProject(slug);
  }
}

function publishProject(slug) {
  const project = loadProjectBySlug(slug);
  const validation = validateProject(project);

  if (!validation.publishPublicDir) {
    fail(`El projecte ${slug} no te publish.publicDir configurat.`);
  }

  const publicDir = toAbsolutePath(validation.publishPublicDir);
  const animationsDir = path.join(publicDir, project.publish?.videoSubdir || DEFAULT_VIDEO_SUBDIR);
  const optimizedDir = path.join(publicDir, project.publish?.posterSubdir || DEFAULT_POSTER_SUBDIR);
  const fileBase = getPublishFileBase(project);
  const variants = validation.variants;

  ensureDir(animationsDir);
  ensureDir(optimizedDir);

  for (const variant of variants) {
    const rendered = resolveRenderedVariantPaths(project, variant);
    if (!rendered || !fs.existsSync(rendered.mp4)) {
      fail(`No existeix el video renderitzat de ${variant}. Executa primer render-project.`);
    }

    const destMp4 = path.join(animationsDir, `${fileBase}-${variant}.mp4`);
    copyFileEnsuringDir(rendered.mp4, destMp4);
    log(`Publicat video ${variant}: ${relativePath(destMp4)}`);

    if (project.publish?.copyCaptions !== false && fs.existsSync(rendered.vtt)) {
      const destVtt = path.join(animationsDir, `${fileBase}-${variant}.vtt`);
      copyFileEnsuringDir(rendered.vtt, destVtt);
      log(`Publicades captions ${variant}: ${relativePath(destVtt)}`);
    }
  }

  if (project.publish?.generatePoster !== false) {
    const primaryVariant = variants.includes('ca') ? 'ca' : variants[0];
    const source = resolveRenderedVariantPaths(project, primaryVariant);
    if (!source || !fs.existsSync(source.mp4)) {
      fail('No hi ha cap video base per generar el poster.');
    }

    const posterPath = path.join(optimizedDir, `${fileBase}-poster.webp`);
    createPosterFromVideo(
      source.mp4,
      posterPath,
      Number(project.publish?.posterTimeSeconds ?? DEFAULT_POSTER_TIME_SECONDS)
    );
    log(`Publicat poster: ${relativePath(posterPath)}`);
  }

  project.status = 'published';
  project.publish = {
    ...project.publish,
    lastPublishedAt: new Date().toISOString(),
    publishedVariants: variants,
    lastPublicDir: validation.publishPublicDir,
  };
  saveProject(project);
}

function publishProjectCommand() {
  const slug = parseFlag('--slug');
  if (!slug) fail('Falta --slug');
  publishProject(slug);
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
      sourceVideo: '',
      args: [],
      notes: [],
    },
    storyboard: {
      slug: '',
      captionsMode: preset.captionsMode || 'overlay',
    },
    render: {
      mode: 'storyboard',
      storyboardSlug: '',
      captionStyle: brand.defaultCaptionStyle || 'summa-subtitle',
      inputPath: '',
      variants: brand.defaultLocales || ['ca'],
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
      fileBase: '',
      copyCaptions: true,
      generatePoster: true,
      posterTimeSeconds: 2,
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
  case 'show-project':
    showProjectCommand();
    break;
  case 'validate-project':
    validateProjectCommand();
    break;
  case 'render-project':
    renderProjectCommand();
    break;
  case 'publish-project':
    publishProjectCommand();
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
