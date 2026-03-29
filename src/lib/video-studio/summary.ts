import fs from 'node:fs'
import path from 'node:path'

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

export type VideoStudioProjectSummary = {
  slug: string
  title: string
  brand: string
  preset: string
  status: string
  locales: string[]
  targets: Array<{ surface: string; locale: string }>
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
  locales?: string[]
  targets?: Array<{ surface: string; locale: string }>
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

  const projects = listProjectFiles(projectsDir).map((filePath) => {
    const project = readJson<ProjectConfig>(filePath)
    return {
      slug: project.slug,
      title: project.title ?? project.slug,
      brand: project.brand,
      preset: project.preset,
      status: project.status ?? 'draft',
      locales: project.locales ?? [],
      targets: project.targets ?? [],
    }
  })

  return {
    interfaceRecommendation: {
      primary: 'Centre intern de Video Studio + Codex',
      reason:
        'Es la via mes clara per a una persona no tecnica: llenguatge natural, control de marca i menys friccio que una orquestracio per Telegram.',
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
      studioRoot: 'studio',
    },
  }
}
