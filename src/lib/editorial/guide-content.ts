export type EditorialLang = 'ca' | 'es' | 'fr' | 'pt'

export type EditorialGuidePatch = {
  title: string
  whatHappens: string
  stepByStep: string[]
  commonErrors: string[]
  howToCheck: string[]
  whenToEscalate: string[]
  cta: string
}

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function cleanList(values: string[]): string[] {
  return values.map(cleanText).filter(Boolean)
}

function putArray(
  target: Record<string, string>,
  prefix: string,
  values: string[]
): void {
  for (let i = 0; i < values.length; i++) {
    target[`${prefix}.${i}`] = values[i]
  }
}

function formatCardText(lang: EditorialLang, patch: EditorialGuidePatch): string {
  const introLabel: Record<EditorialLang, string> = {
    ca: 'Què vol dir:',
    es: 'Qué significa:',
    fr: 'Que signifie:',
    pt: 'O que significa:',
  }

  const stepsLabel: Record<EditorialLang, string> = {
    ca: 'Pas a pas:',
    es: 'Paso a paso:',
    fr: 'Pas à pas:',
    pt: 'Passo a passo:',
  }

  const helpLabel: Record<EditorialLang, string> = {
    ca: "Segurament t'ajudarà:",
    es: 'Seguramente te ayudará:',
    fr: 'Cela vous aidera sûrement:',
    pt: 'Isso vai te ajudar:',
  }

  const helpfulLine =
    patch.howToCheck[0] ||
    patch.commonErrors[0] ||
    patch.whenToEscalate[0] ||
    patch.stepByStep[0] ||
    patch.whatHappens

  const stepsLine = cleanList(patch.stepByStep).join(' → ')

  return [
    `${introLabel[lang]} ${cleanText(patch.whatHappens)}`,
    `${stepsLabel[lang]}\n${stepsLine}`,
    `${helpLabel[lang]} ${cleanText(helpfulLine)}`,
  ].join('\n\n')
}

export function buildPublishedFlatPatch(args: {
  guideId: string
  lang: EditorialLang
  patch: EditorialGuidePatch
}): Record<string, string> {
  const { guideId, lang, patch } = args
  const title = cleanText(patch.title)
  const whatHappens = cleanText(patch.whatHappens)
  const stepByStep = cleanList(patch.stepByStep)
  const commonErrors = cleanList(patch.commonErrors)
  const howToCheck = cleanList(patch.howToCheck)
  const whenToEscalate = cleanList(patch.whenToEscalate)
  const cta = cleanText(patch.cta)
  const prefix = `guides.${guideId}`

  const flatPatch: Record<string, string> = {
    [`${prefix}.title`]: title,
    [`${prefix}.whatHappens`]: whatHappens,
    [`${prefix}.summary`]: whatHappens,
    [`${prefix}.intro`]: whatHappens,
    [`${prefix}.whatIs`]: whatHappens,
    [`${prefix}.cardText`]: formatCardText(lang, {
      title,
      whatHappens,
      stepByStep,
      commonErrors,
      howToCheck,
      whenToEscalate,
      cta,
    }),
    [`${prefix}.costlyError`]: commonErrors[0] ?? '',
    [`guides.cta.${guideId}`]: cta,
  }

  putArray(flatPatch, `${prefix}.stepByStep`, stepByStep)
  putArray(flatPatch, `${prefix}.commonErrors`, commonErrors)
  putArray(flatPatch, `${prefix}.howToCheck`, howToCheck)
  putArray(flatPatch, `${prefix}.whenToEscalate`, whenToEscalate)

  // Legacy keys consumed by Hub/Bot runtime
  putArray(flatPatch, `${prefix}.lookFirst`, stepByStep)
  putArray(flatPatch, `${prefix}.steps`, stepByStep)
  putArray(flatPatch, `${prefix}.then`, howToCheck)
  putArray(flatPatch, `${prefix}.doNext`, whenToEscalate)
  putArray(flatPatch, `${prefix}.notResolved`, whenToEscalate)
  putArray(flatPatch, `${prefix}.checkBeforeExport`, howToCheck)
  putArray(flatPatch, `${prefix}.avoid`, commonErrors)
  putArray(flatPatch, `${prefix}.dontFixYet`, commonErrors)
  putArray(flatPatch, `${prefix}.tip`, howToCheck)

  return flatPatch
}

export function buildDraftFlatPatch(args: {
  guideId: string
  patch: EditorialGuidePatch
}): Record<string, string> {
  const { guideId, patch } = args
  const prefix = `guidesDraft.${guideId}`
  const title = cleanText(patch.title)
  const whatHappens = cleanText(patch.whatHappens)
  const stepByStep = cleanList(patch.stepByStep)
  const commonErrors = cleanList(patch.commonErrors)
  const howToCheck = cleanList(patch.howToCheck)
  const whenToEscalate = cleanList(patch.whenToEscalate)
  const cta = cleanText(patch.cta)

  const flatPatch: Record<string, string> = {
    [`${prefix}.title`]: title,
    [`${prefix}.whatHappens`]: whatHappens,
    [`${prefix}.cta`]: cta,
  }

  putArray(flatPatch, `${prefix}.stepByStep`, stepByStep)
  putArray(flatPatch, `${prefix}.commonErrors`, commonErrors)
  putArray(flatPatch, `${prefix}.howToCheck`, howToCheck)
  putArray(flatPatch, `${prefix}.whenToEscalate`, whenToEscalate)

  return flatPatch
}

function readArrayFromFlat(
  source: Record<string, string>,
  prefix: string,
  max = 40
): string[] {
  const values: string[] = []
  for (let i = 0; i < max; i++) {
    const value = source[`${prefix}.${i}`]
    if (!value) break
    const trimmed = value.trim()
    if (trimmed) values.push(trimmed)
  }
  return values
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
  }
  return ''
}

function firstArrayWithValues(candidates: string[][]): string[] {
  for (const candidate of candidates) {
    if (candidate.length > 0) return candidate
  }
  return []
}

export function readGuidePatchFromFlat(args: {
  source: Record<string, string>
  guideId: string
  namespace: 'guides' | 'guidesDraft'
}): EditorialGuidePatch | null {
  const { source, guideId, namespace } = args
  const prefix = `${namespace}.${guideId}`

  const title = firstNonEmpty(source[`${prefix}.title`])
  const whatHappens = firstNonEmpty(
    source[`${prefix}.whatHappens`],
    source[`${prefix}.summary`],
    source[`${prefix}.intro`],
    source[`${prefix}.whatIs`]
  )

  const stepByStep = firstArrayWithValues([
    readArrayFromFlat(source, `${prefix}.stepByStep`),
    readArrayFromFlat(source, `${prefix}.steps`),
    readArrayFromFlat(source, `${prefix}.lookFirst`),
  ])

  const commonErrors = firstArrayWithValues([
    readArrayFromFlat(source, `${prefix}.commonErrors`),
    readArrayFromFlat(source, `${prefix}.avoid`),
    readArrayFromFlat(source, `${prefix}.dontFixYet`),
  ])

  const howToCheck = firstArrayWithValues([
    readArrayFromFlat(source, `${prefix}.howToCheck`),
    readArrayFromFlat(source, `${prefix}.checkBeforeExport`),
    readArrayFromFlat(source, `${prefix}.then`),
  ])

  const whenToEscalate = firstArrayWithValues([
    readArrayFromFlat(source, `${prefix}.whenToEscalate`),
    readArrayFromFlat(source, `${prefix}.notResolved`),
    readArrayFromFlat(source, `${prefix}.doNext`),
  ])

  const cta =
    namespace === 'guidesDraft'
      ? firstNonEmpty(source[`${prefix}.cta`])
      : firstNonEmpty(source[`guides.cta.${guideId}`])

  const hasAnyValue =
    Boolean(title) ||
    Boolean(whatHappens) ||
    stepByStep.length > 0 ||
    commonErrors.length > 0 ||
    howToCheck.length > 0 ||
    whenToEscalate.length > 0 ||
    Boolean(cta)

  if (!hasAnyValue) return null

  return {
    title,
    whatHappens,
    stepByStep,
    commonErrors,
    howToCheck,
    whenToEscalate,
    cta,
  }
}
