import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_VIDEO_SUBDIR = 'animations'
const DEFAULT_POSTER_SUBDIR = 'optimized'

export type VideoStudioBrandSummary = {
  id: string
  name: string
  defaultLocales: string[]
  captionStyle: string
  doodlesCount: number
}

export type VideoStudioPresetSummary = {
  id: string
  label: string
  surfaces: string[]
  aspectRatio: string
  minDurationSeconds: number | null
  maxDurationSeconds: number | null
  captionsMode: string
  includeIntro: boolean
  includeOutro: boolean
  goal: string
}

export type VideoStudioProjectDiagnostic = {
  level: 'ok' | 'warn' | 'error'
  message: string
}

export type VideoStudioProjectSummary = {
  slug: string
  title: string
  brand: string
  preset: string
  status: string
  objective: string
  audience: string
  locales: string[]
  targets: Array<{ surface: string; locale: string }>
  workflow: {
    hasBaseVideo: boolean
    canRender: boolean
    rendered: boolean
    canPublish: boolean
    published: boolean
  }
  nextAction: {
    label: string
    reason: string
    codexPrompt: string
  }
  diagnostics: VideoStudioProjectDiagnostic[]
  paths: {
    projectFile: string
    inputPath: string | null
    artifactDir: string | null
    publicDir: string | null
    posterPath: string | null
  }
  timestamps: {
    lastRenderedAt: string | null
    lastPublishedAt: string | null
  }
  publishedVariants: string[]
}

export type VideoStudioPromptSummary = {
  id: string
  title: string
  prompt: string
}

export type VideoStudioSummary = {
  interfaceRecommendation: {
    primary: string
    reason: string
  }
  telegramRecommendation: {
    recommended: boolean
    reason: string
  }
  brands: VideoStudioBrandSummary[]
  presets: VideoStudioPresetSummary[]
  projects: VideoStudioProjectSummary[]
  starterPrompts: VideoStudioPromptSummary[]
  paths: {
    foundationDoc: string
    nonTechnicalGuide: string
    studioRoot: string
  }
}

type BrandConfig = {
  id: string
  name: string
  defaultLocales?: string[]
  defaultCaptionStyle?: string
  motionAssets?: {
    doodles?: string[]
  }
}

type PresetConfig = {
  id: string
  label: string
  surfaces?: string[]
  aspectRatio?: string
  durationSeconds?: {
    min?: number
    max?: number
  }
  captionsMode?: string
  includeIntro?: boolean
  includeOutro?: boolean
  goal?: string
}

type ProjectConfig = {
  slug: string
  title?: string
  brand: string
  preset: string
  status?: string
  objective?: string
  audience?: string
  locales?: string[]
  targets?: Array<{ surface: string; locale: string }>
  recording?: {
    script?: string
    sourceScenario?: string
    sourceVideo?: string
  }
  storyboard?: {
    slug?: string
    captionsMode?: string
  }
  render?: {
    mode?: string
    storyboardSlug?: string
    captionStyle?: string
    inputPath?: string
    variants?: string[]
    lastRenderedAt?: string
    renderedVariants?: string[]
    renderedArtifactDir?: string
  }
  publish?: {
    publicDir?: string
    landingSlug?: string
    fileBase?: string
    copyCaptions?: boolean
    generatePoster?: boolean
    posterTimeSeconds?: number
    videoSubdir?: string
    posterSubdir?: string
    lastPublishedAt?: string
    publishedVariants?: string[]
    lastPublicDir?: string
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

function listFiles(dirPath: string, predicate: (fileName: string) => boolean): string[] {
  if (!fs.existsSync(dirPath)) return []

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => path.join(dirPath, entry.name))
    .sort()
}

function listBrandFiles(brandsDir: string): string[] {
  if (!fs.existsSync(brandsDir)) return []

  return fs
    .readdirSync(brandsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(brandsDir, entry.name, 'brand.json'))
    .filter((filePath) => fs.existsSync(filePath))
    .sort()
}

function listProjectFiles(projectsDir: string): string[] {
  if (!fs.existsSync(projectsDir)) return []

  return fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(projectsDir, entry.name, 'project.json'))
    .filter((filePath) => fs.existsSync(filePath))
    .sort()
}

function toAbsolutePath(rootDir: string, repoPath: string | undefined): string | null {
  if (!repoPath) return null
  return path.isAbsolute(repoPath) ? repoPath : path.join(rootDir, repoPath)
}

function toRepoPath(rootDir: string, repoPath: string | undefined): string | null {
  const absolutePath = toAbsolutePath(rootDir, repoPath)
  if (!absolutePath) return null
  return path.relative(rootDir, absolutePath) || '.'
}

function existsAtRepoPath(rootDir: string, repoPath: string | undefined): boolean {
  const absolutePath = toAbsolutePath(rootDir, repoPath)
  return Boolean(absolutePath && fs.existsSync(absolutePath))
}

function resolveProjectVariants(project: ProjectConfig): string[] {
  const renderVariants = Array.isArray(project.render?.variants) ? project.render?.variants.filter(Boolean) : []
  const locales = Array.isArray(project.locales) ? project.locales.filter(Boolean) : []
  const variants = renderVariants.length > 0 ? renderVariants : locales

  if (variants.length === 0) {
    return ['ca']
  }

  return [...new Set(variants)]
}

function resolveProjectInputPath(project: ProjectConfig): string | null {
  if (project.render?.inputPath) return project.render.inputPath
  if (project.recording?.sourceVideo) return project.recording.sourceVideo
  if (project.recording?.sourceScenario) {
    return `output/playwright/${project.recording.sourceScenario}/${project.recording.sourceScenario}.mp4`
  }
  return null
}

function resolveStoryboardSlug(project: ProjectConfig): string | null {
  return project.render?.storyboardSlug || project.storyboard?.slug || null
}

function resolveArtifactDir(project: ProjectConfig): string | null {
  if (project.render?.renderedArtifactDir) return project.render.renderedArtifactDir
  if (project.recording?.sourceScenario) {
    return `output/playwright/${project.recording.sourceScenario}`
  }
  return null
}

function resolveRenderedVariantPaths(rootDir: string, project: ProjectConfig, variant: string) {
  const artifactDir = resolveArtifactDir(project)
  const storyboardSlug = resolveStoryboardSlug(project)
  if (!artifactDir || !storyboardSlug) return null

  const baseDir = toAbsolutePath(rootDir, artifactDir)
  if (!baseDir) return null

  return {
    mp4: path.join(baseDir, `${storyboardSlug}.${variant}.mp4`),
    srt: path.join(baseDir, `${storyboardSlug}.${variant}.srt`),
    vtt: path.join(baseDir, `${storyboardSlug}.${variant}.vtt`),
  }
}

function getPublishFileBase(project: ProjectConfig): string {
  return project.publish?.fileBase || project.slug
}

function resolvePublishedVariantPaths(rootDir: string, project: ProjectConfig, variant: string) {
  const publicDir = toAbsolutePath(rootDir, project.publish?.publicDir)
  if (!publicDir) return null

  const animationsDir = path.join(publicDir, project.publish?.videoSubdir || DEFAULT_VIDEO_SUBDIR)
  const fileBase = getPublishFileBase(project)

  return {
    mp4: path.join(animationsDir, `${fileBase}-${variant}.mp4`),
    vtt: path.join(animationsDir, `${fileBase}-${variant}.vtt`),
  }
}

function resolvePosterPath(rootDir: string, project: ProjectConfig): string | null {
  const publicDir = toAbsolutePath(rootDir, project.publish?.publicDir)
  if (!publicDir) return null

  const optimizedDir = path.join(publicDir, project.publish?.posterSubdir || DEFAULT_POSTER_SUBDIR)
  return path.join(optimizedDir, `${getPublishFileBase(project)}-poster.webp`)
}

function addDiagnostic(
  diagnostics: VideoStudioProjectDiagnostic[],
  level: VideoStudioProjectDiagnostic['level'],
  message: string
) {
  diagnostics.push({ level, message })
}

function buildProjectPrompt(
  project: ProjectConfig,
  action: 'complete' | 'record' | 'render' | 'publish' | 'refresh'
): { label: string; reason: string; codexPrompt: string } {
  const locales = resolveProjectVariants(project).join(' i ')

  if (action === 'refresh') {
    return {
      label: 'Refrescar la peça si canvia el producte',
      reason: 'Els assets ja estan publicats. Ara toca només mantenir-los alineats amb la realitat del producte i el copy.',
      codexPrompt: `Revisa el projecte de Video Studio ${project.slug}, comprova si el producte o el copy han canviat i, si cal, regenera, renderitza i republica les variants ${locales} mantenint l estil premium de Summa.`,
    }
  }

  if (action === 'publish') {
    return {
      label: 'Publicar la peça a web',
      reason: 'La peça ja existeix localment i només falta copiar-la a les rutes públiques perquè la web la pugui servir.',
      codexPrompt: `Publica el projecte de Video Studio ${project.slug} i deixa actualitzats els assets web per a les variants ${locales}, amb poster i captions si estan disponibles.`,
    }
  }

  if (action === 'render') {
    return {
      label: 'Renderitzar les variants finals',
      reason: 'La gravació base i el relat ja estan prou definits per convertir-los en peces finals preparades per web.',
      codexPrompt: `Renderitza el projecte de Video Studio ${project.slug} en les variants ${locales} i deixa llestos els MP4, captions i poster si toca.`,
    }
  }

  if (action === 'record') {
    return {
      label: 'Generar la gravació base',
      reason: 'Encara falta la captura base del producte. Un cop feta, el projecte ja podrà passar al render final.',
      codexPrompt: `Genera la gravacio base del projecte de Video Studio ${project.slug}, valida que serveixi per les variants ${locales} i deixa el projecte llest per renderitzar i publicar.`,
    }
  }

  return {
    label: 'Completar el projecte',
    reason: 'Encara falten peces bàsiques del relat o de la configuració abans de poder executar-lo de punta a punta.',
    codexPrompt: `Completa el projecte de Video Studio ${project.slug}: defineix relat, storyboard, gravacio base i desti public, amb criteri comercial i reutilitzable per Summa.`,
  }
}

function buildProjectSummary(rootDir: string, filePath: string): VideoStudioProjectSummary {
  const project = readJson<ProjectConfig>(filePath)
  const variants = resolveProjectVariants(project)
  const inputPath = resolveProjectInputPath(project)
  const storyboardSlug = resolveStoryboardSlug(project)
  const artifactDir = resolveArtifactDir(project)
  const publicDir = project.publish?.publicDir || null
  const diagnostics: VideoStudioProjectDiagnostic[] = []

  const hasObjective = Boolean(project.objective?.trim())
  const hasPublicDir = Boolean(publicDir)
  const hasBaseVideo = existsAtRepoPath(rootDir, inputPath ?? undefined)
  const storyboardReady = Boolean(
    storyboardSlug && existsAtRepoPath(rootDir, `scripts/demo/video-storyboards/${storyboardSlug}.mjs`)
  )
  const renderModeReady = (project.render?.mode || 'storyboard') === 'storyboard'
  const canRender = hasBaseVideo && storyboardReady && renderModeReady

  const renderedVariants = variants.filter((variant) => {
    const paths = resolveRenderedVariantPaths(rootDir, project, variant)
    return Boolean(paths && fs.existsSync(paths.mp4))
  })
  const rendered = variants.length > 0 && renderedVariants.length === variants.length
  const canPublish = rendered && hasPublicDir

  const publishedVariants = variants.filter((variant) => {
    const paths = resolvePublishedVariantPaths(rootDir, project, variant)
    return Boolean(paths && fs.existsSync(paths.mp4))
  })
  const published = variants.length > 0 && publishedVariants.length === variants.length
  const posterPath = resolvePosterPath(rootDir, project)

  if (hasObjective) {
    addDiagnostic(diagnostics, 'ok', 'Objectiu de la peça definit.')
  } else {
    addDiagnostic(diagnostics, 'warn', 'Falta concretar l objectiu comercial o funcional del projecte.')
  }

  if (hasBaseVideo) {
    addDiagnostic(diagnostics, 'ok', `Video base disponible a ${inputPath}.`)
  } else if (project.recording?.script) {
    addDiagnostic(diagnostics, 'warn', `Falta generar el video base. El projecte ja apunta al script ${project.recording.script}.`)
  } else {
    addDiagnostic(diagnostics, 'warn', 'Falta definir i generar la gravacio base del producte.')
  }

  if (storyboardReady) {
    addDiagnostic(diagnostics, 'ok', `Storyboard disponible: ${storyboardSlug}.`)
  } else {
    addDiagnostic(diagnostics, 'warn', 'Falta un storyboard executable o no existeix encara.')
  }

  if (rendered) {
    addDiagnostic(diagnostics, 'ok', `Variants renderitzades: ${renderedVariants.join(', ')}.`)
  } else if (canRender) {
    addDiagnostic(diagnostics, 'warn', 'El projecte ja es pot renderitzar, pero encara no hi ha peces finals locals.')
  } else if (!renderModeReady) {
    addDiagnostic(diagnostics, 'error', 'El mode de render definit encara no esta suportat pel Video Studio.')
  }

  if (published) {
    addDiagnostic(diagnostics, 'ok', `Assets publicats a web per a ${publishedVariants.join(', ')}.`)
  } else if (canPublish) {
    addDiagnostic(diagnostics, 'warn', 'La peça ja es pot publicar, pero encara no s ha copiat a les rutes publiques.')
  } else if (!hasPublicDir) {
    addDiagnostic(diagnostics, 'warn', 'Falta definir on s ha de publicar la peça a la web.')
  }

  const nextAction =
    published
      ? buildProjectPrompt(project, 'refresh')
      : !hasObjective || !storyboardReady || !hasPublicDir
        ? buildProjectPrompt(project, 'complete')
        : !hasBaseVideo
          ? buildProjectPrompt(project, 'record')
          : !rendered
            ? buildProjectPrompt(project, 'render')
            : buildProjectPrompt(project, 'publish')

  return {
    slug: project.slug,
    title: project.title ?? project.slug,
    brand: project.brand,
    preset: project.preset,
    status: project.status ?? 'draft',
    objective: project.objective ?? '',
    audience: project.audience ?? 'n/a',
    locales: project.locales ?? [],
    targets: project.targets ?? [],
    workflow: {
      hasBaseVideo,
      canRender,
      rendered,
      canPublish,
      published,
    },
    nextAction,
    diagnostics,
    paths: {
      projectFile: path.relative(rootDir, filePath) || '.',
      inputPath: toRepoPath(rootDir, inputPath ?? undefined),
      artifactDir,
      publicDir,
      posterPath: posterPath ? path.relative(rootDir, posterPath) : null,
    },
    timestamps: {
      lastRenderedAt: project.render?.lastRenderedAt ?? null,
      lastPublishedAt: project.publish?.lastPublishedAt ?? null,
    },
    publishedVariants,
  }
}

function sortProjects(projects: VideoStudioProjectSummary[]): VideoStudioProjectSummary[] {
  const order: Record<string, number> = {
    draft: 0,
    ready: 1,
    rendered: 2,
    published: 3,
  }

  return [...projects].sort((a, b) => {
    const statusDiff = (order[a.status] ?? 99) - (order[b.status] ?? 99)
    if (statusDiff !== 0) return statusDiff
    return a.slug.localeCompare(b.slug)
  })
}

export function buildVideoStudioSummary(rootDir = process.cwd()): VideoStudioSummary {
  const studioRoot = path.join(rootDir, 'studio')
  const brandsDir = path.join(studioRoot, 'brands')
  const presetsDir = path.join(studioRoot, 'presets')
  const projectsDir = path.join(studioRoot, 'projects')

  const brands = listBrandFiles(brandsDir).map((filePath) => {
    const brand = readJson<BrandConfig>(filePath)
    return {
      id: brand.id,
      name: brand.name,
      defaultLocales: brand.defaultLocales ?? [],
      captionStyle: brand.defaultCaptionStyle ?? 'n/a',
      doodlesCount: brand.motionAssets?.doodles?.length ?? 0,
    }
  })

  const presets = listFiles(presetsDir, (fileName) => fileName.endsWith('.json')).map((filePath) => {
    const preset = readJson<PresetConfig>(filePath)
    return {
      id: preset.id,
      label: preset.label,
      surfaces: preset.surfaces ?? [],
      aspectRatio: preset.aspectRatio ?? '16:9',
      minDurationSeconds: preset.durationSeconds?.min ?? null,
      maxDurationSeconds: preset.durationSeconds?.max ?? null,
      captionsMode: preset.captionsMode ?? 'overlay',
      includeIntro: Boolean(preset.includeIntro),
      includeOutro: Boolean(preset.includeOutro),
      goal: preset.goal ?? '',
    }
  })

  const projects = sortProjects(listProjectFiles(projectsDir).map((filePath) => buildProjectSummary(rootDir, filePath)))

  return {
    interfaceRecommendation: {
      primary: 'Centre intern de Video Studio + Codex',
      reason:
        'Es la via mes clara per a una persona no tecnica: llenguatge natural, projectes guiats i menys friccio que una orquestracio per Telegram.',
    },
    telegramRecommendation: {
      recommended: false,
      reason:
        'Octavi i Telegram ja porten altres fluxos. Per peces audiovisuals amb variants, assets i revisio, avui no es la superficie mes neta ni mes escalable.',
    },
    brands,
    presets,
    projects,
    starterPrompts: [
      {
        id: 'landing',
        title: 'Video per landing',
        prompt:
          'Vull un video curt per landing sobre [funcionalitat], en catala i castella, amb estil premium Summa. Prepara gravacio base, storyboard, export web i poster.',
      },
      {
        id: 'home',
        title: 'Video comercial per la home',
        prompt:
          'Necessito una peça comercial per la home de Summa, de 20-30 segons, amb to molt clar, premium i orientat a captar interès en pocs segons.',
      },
      {
        id: 'social',
        title: 'Adaptacio per xarxes',
        prompt:
          'Agafa aquesta peça i adapta-la a formats de xarxes: square i vertical, amb captions cremades i ritme mes directe.',
      },
    ],
    paths: {
      foundationDoc: 'docs/operations/VIDEO-STUDIO-FOUNDATION.md',
      nonTechnicalGuide: 'docs/operations/VIDEO-STUDIO-US-NO-TECNIC.md',
      studioRoot: 'studio',
    },
  }
}
