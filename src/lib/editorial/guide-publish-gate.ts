import { isGuideIdInCatalog } from './guide-catalog'

export type PublishLang = 'ca' | 'es' | 'fr' | 'pt'

export type GuidePatch = {
  title: string
  whatHappens: string
  stepByStep: string[]
  commonErrors: string[]
  howToCheck: string[]
  whenToEscalate: string[]
  cta: string
}

export type GuidePublishPatchByLang = {
  ca: GuidePatch
  es: GuidePatch
  fr: GuidePatch
  pt: GuidePatch
}

export type GuidePublishGateError = {
  field: string
  rule: string
  message: string
}

export type GuidePublishGateResult = {
  ok: boolean
  errors: GuidePublishGateError[]
}

export type GuidePublishGateInput = {
  guideId: string
  patchByLang: GuidePublishPatchByLang
}

const PLACEHOLDER_RE = /\b(TODO|PENDENT|TRADUIR|AUTOTRANSLATED)\b/i

const MIN_TITLE_LENGTH = 6
const MIN_BLOCK_LENGTH = 20
const MIN_CTA_LENGTH = 6
const MIN_LANG_HITS = 2
const MIN_FR_PT_LENGTH_RATIO = 0.7
const MAX_SIMILARITY_WITH_CA = 0.9

const CONTENT_BLOCK_FIELDS = [
  'whatHappens',
  'stepByStep',
  'commonErrors',
  'howToCheck',
  'whenToEscalate',
] as const

type ContentBlockField = (typeof CONTENT_BLOCK_FIELDS)[number]

const FR_HINTS = new Set(['le', 'la', 'les', 'des', 'pour', 'avec', 'est', 'une'])
const PT_HINTS = new Set(['para', 'nao', 'com', 'uma', 'os'])
const PT_PATTERN_RE = /(ção|ções|cao|coes)/i

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return normalizeForCompare(text)
    .split(/[^a-z0-9]+/)
    .map(token => token.trim())
    .filter(Boolean)
}

function toTokenSet(text: string): Set<string> {
  return new Set(tokenize(text))
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  if (a.size === 0 || b.size === 0) return 0

  let intersection = 0
  for (const item of a) {
    if (b.has(item)) intersection += 1
  }

  const union = a.size + b.size - intersection
  if (union === 0) return 0
  return intersection / union
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asTrimmedStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const items: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return null
    const trimmed = item.trim()
    if (!trimmed) return null
    items.push(trimmed)
  }
  if (items.length === 0) return null
  return items
}

function getContentBlockText(patch: GuidePatch, block: ContentBlockField): string {
  if (block === 'whatHappens') return patch.whatHappens.trim()
  return patch[block].join(' ').trim()
}

function countLanguageHints(text: string, lang: 'fr' | 'pt'): number {
  const tokens = toTokenSet(text)
  let hits = 0

  if (lang === 'fr') {
    for (const token of tokens) {
      if (FR_HINTS.has(token)) hits += 1
    }
    return hits
  }

  for (const token of tokens) {
    if (PT_HINTS.has(token)) hits += 1
  }
  if (PT_PATTERN_RE.test(text)) hits += 1
  return hits
}

function hasPlaceholder(value: string): boolean {
  return PLACEHOLDER_RE.test(value)
}

function validatePatchShape(lang: PublishLang, value: unknown): GuidePublishGateError[] {
  const errors: GuidePublishGateError[] = []

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push({
      field: `${lang}`,
      rule: 'shape',
      message: `Patch de ${lang} invàlid`,
    })
    return errors
  }

  const patch = value as Record<string, unknown>

  const title = asTrimmedString(patch.title)
  if (!title) {
    errors.push({ field: `${lang}.title`, rule: 'required', message: 'title obligatori' })
  } else if (title.length < MIN_TITLE_LENGTH) {
    errors.push({
      field: `${lang}.title`,
      rule: 'min_length',
      message: `title massa curt (min ${MIN_TITLE_LENGTH})`,
    })
  }

  const whatHappens = asTrimmedString(patch.whatHappens)
  if (!whatHappens) {
    errors.push({
      field: `${lang}.whatHappens`,
      rule: 'required',
      message: 'whatHappens obligatori',
    })
  } else if (whatHappens.length < MIN_BLOCK_LENGTH) {
    errors.push({
      field: `${lang}.whatHappens`,
      rule: 'min_length',
      message: `whatHappens massa curt (min ${MIN_BLOCK_LENGTH})`,
    })
  }

  for (const arrayField of ['stepByStep', 'commonErrors', 'howToCheck', 'whenToEscalate'] as const) {
    const list = asTrimmedStringArray(patch[arrayField])
    if (!list) {
      errors.push({
        field: `${lang}.${arrayField}`,
        rule: 'required',
        message: `${arrayField} obligatori i ha de ser array no buit`,
      })
      continue
    }

    const merged = list.join(' ').trim()
    if (merged.length < MIN_BLOCK_LENGTH) {
      errors.push({
        field: `${lang}.${arrayField}`,
        rule: 'min_length',
        message: `${arrayField} massa curt (min ${MIN_BLOCK_LENGTH})`,
      })
    }
  }

  const cta = asTrimmedString(patch.cta)
  if (!cta) {
    errors.push({ field: `${lang}.cta`, rule: 'required', message: 'cta obligatori' })
  } else if (cta.length < MIN_CTA_LENGTH) {
    errors.push({
      field: `${lang}.cta`,
      rule: 'min_length',
      message: `cta massa curt (min ${MIN_CTA_LENGTH})`,
    })
  }

  return errors
}

function toGuidePatchUnsafe(value: unknown): GuidePatch {
  const patch = value as Record<string, unknown>
  return {
    title: String(patch.title ?? '').trim(),
    whatHappens: String(patch.whatHappens ?? '').trim(),
    stepByStep: (patch.stepByStep as string[]).map(item => String(item).trim()),
    commonErrors: (patch.commonErrors as string[]).map(item => String(item).trim()),
    howToCheck: (patch.howToCheck as string[]).map(item => String(item).trim()),
    whenToEscalate: (patch.whenToEscalate as string[]).map(item => String(item).trim()),
    cta: String(patch.cta ?? '').trim(),
  }
}

function addPlaceholderErrors(lang: PublishLang, patch: GuidePatch, errors: GuidePublishGateError[]): void {
  const scalarFields: Array<keyof Pick<GuidePatch, 'title' | 'whatHappens' | 'cta'>> = [
    'title',
    'whatHappens',
    'cta',
  ]

  for (const field of scalarFields) {
    const value = patch[field]
    if (hasPlaceholder(value)) {
      errors.push({
        field: `${lang}.${field}`,
        rule: 'placeholder_forbidden',
        message: `Placeholder prohibit a ${lang}.${field}`,
      })
    }
  }

  for (const field of ['stepByStep', 'commonErrors', 'howToCheck', 'whenToEscalate'] as const) {
    const values = patch[field]
    for (const value of values) {
      if (hasPlaceholder(value)) {
        errors.push({
          field: `${lang}.${field}`,
          rule: 'placeholder_forbidden',
          message: `Placeholder prohibit a ${lang}.${field}`,
        })
        break
      }
    }
  }
}

export function runGuidePublishGate(input: GuidePublishGateInput): GuidePublishGateResult {
  const errors: GuidePublishGateError[] = []

  if (!isGuideIdInCatalog(input.guideId)) {
    errors.push({
      field: 'guideId',
      rule: 'catalog',
      message: `guideId fora de cataleg: ${input.guideId}`,
    })
  }

  const shapeErrors: GuidePublishGateError[] = []
  const patchByLang = input.patchByLang as Record<PublishLang, unknown>
  const langs: PublishLang[] = ['ca', 'es', 'fr', 'pt']

  for (const lang of langs) {
    shapeErrors.push(...validatePatchShape(lang, patchByLang[lang]))
  }

  errors.push(...shapeErrors)

  if (shapeErrors.length > 0) {
    return { ok: false, errors }
  }

  const patches = {
    ca: toGuidePatchUnsafe(patchByLang.ca),
    es: toGuidePatchUnsafe(patchByLang.es),
    fr: toGuidePatchUnsafe(patchByLang.fr),
    pt: toGuidePatchUnsafe(patchByLang.pt),
  }

  addPlaceholderErrors('ca', patches.ca, errors)
  addPlaceholderErrors('es', patches.es, errors)
  addPlaceholderErrors('fr', patches.fr, errors)
  addPlaceholderErrors('pt', patches.pt, errors)

  for (const block of CONTENT_BLOCK_FIELDS) {
    const caText = getContentBlockText(patches.ca, block)
    const caLength = caText.length

    for (const lang of ['fr', 'pt'] as const) {
      const targetText = getContentBlockText(patches[lang], block)
      const targetLength = targetText.length
      if (caLength > 0 && targetLength < Math.ceil(caLength * MIN_FR_PT_LENGTH_RATIO)) {
        errors.push({
          field: `${lang}.${block}`,
          rule: 'relative_length',
          message: `${lang}.${block} massa curt respecte ca.${block}`,
        })
      }

      const normalizedTarget = normalizeForCompare(targetText)
      const normalizedCa = normalizeForCompare(caText)
      if (normalizedTarget === normalizedCa) {
        errors.push({
          field: `${lang}.${block}`,
          rule: 'literal_copy',
          message: `${lang}.${block} no pot ser copia literal de ca.${block}`,
        })
      }

      const similarity = jaccardSimilarity(toTokenSet(targetText), toTokenSet(caText))
      if (similarity >= MAX_SIMILARITY_WITH_CA) {
        errors.push({
          field: `${lang}.${block}`,
          rule: 'too_similar',
          message: `${lang}.${block} massa similar a ca.${block}`,
        })
      }

      const langHits = countLanguageHints(targetText, lang)
      if (langHits < MIN_LANG_HITS) {
        errors.push({
          field: `${lang}.${block}`,
          rule: 'language_heuristic',
          message: `${lang}.${block} no arriba al llindar minim de deteccio de llengua`,
        })
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}
