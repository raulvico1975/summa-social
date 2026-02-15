import { GUIDE_CATALOG, type GuideDomain } from '@/lib/editorial/guide-catalog'
import type { EditorialLang } from '@/lib/editorial/guide-content'

export type GuideCoverageStatus = {
  complete: boolean
  missingFields: string[]
}

export type GuideCoverageRow = {
  guideId: string
  domain: GuideDomain
  byLang: Record<
    EditorialLang,
    {
      published: GuideCoverageStatus
      draft: GuideCoverageStatus
    }
  >
  publishedCompleteAllLangs: boolean
  hasAnyDraft: boolean
}

export type GuideCoverageSummary = {
  totalGuides: number
  fullyPublishedGuides: number
  guidesWithDraft: number
  missingPublishedByLang: Record<EditorialLang, number>
}

function missingFieldsForNamespace(args: {
  source: Record<string, string>
  guideId: string
  namespace: 'guides' | 'guidesDraft'
}): string[] {
  const { source, guideId, namespace } = args
  const prefix = `${namespace}.${guideId}`
  const missing: string[] = []

  const expectedKeys =
    namespace === 'guides'
      ? [
          `${prefix}.title`,
          `${prefix}.whatHappens`,
          `${prefix}.stepByStep.0`,
          `${prefix}.commonErrors.0`,
          `${prefix}.howToCheck.0`,
          `${prefix}.whenToEscalate.0`,
          `guides.cta.${guideId}`,
        ]
      : [
          `${prefix}.title`,
          `${prefix}.whatHappens`,
          `${prefix}.stepByStep.0`,
          `${prefix}.commonErrors.0`,
          `${prefix}.howToCheck.0`,
          `${prefix}.whenToEscalate.0`,
          `${prefix}.cta`,
        ]

  for (const key of expectedKeys) {
    const value = source[key]
    if (typeof value !== 'string' || value.trim().length === 0) {
      missing.push(key)
    }
  }

  return missing
}

export function buildGuideCoverage(args: {
  i18nByLang: Record<EditorialLang, Record<string, string>>
}): { summary: GuideCoverageSummary; rows: GuideCoverageRow[] } {
  const { i18nByLang } = args
  const missingPublishedByLang: Record<EditorialLang, number> = {
    ca: 0,
    es: 0,
    fr: 0,
    pt: 0,
  }

  const rows: GuideCoverageRow[] = GUIDE_CATALOG.map(item => {
    const byLang = {
      ca: {
        published: { complete: false, missingFields: [] as string[] },
        draft: { complete: false, missingFields: [] as string[] },
      },
      es: {
        published: { complete: false, missingFields: [] as string[] },
        draft: { complete: false, missingFields: [] as string[] },
      },
      fr: {
        published: { complete: false, missingFields: [] as string[] },
        draft: { complete: false, missingFields: [] as string[] },
      },
      pt: {
        published: { complete: false, missingFields: [] as string[] },
        draft: { complete: false, missingFields: [] as string[] },
      },
    }

    for (const lang of ['ca', 'es', 'fr', 'pt'] as const) {
      const source = i18nByLang[lang]
      const missingPublished = missingFieldsForNamespace({
        source,
        guideId: item.id,
        namespace: 'guides',
      })
      const missingDraft = missingFieldsForNamespace({
        source,
        guideId: item.id,
        namespace: 'guidesDraft',
      })

      byLang[lang] = {
        published: {
          complete: missingPublished.length === 0,
          missingFields: missingPublished,
        },
        draft: {
          complete: missingDraft.length === 0,
          missingFields: missingDraft,
        },
      }

      if (missingPublished.length > 0) {
        missingPublishedByLang[lang] += 1
      }
    }

    const publishedCompleteAllLangs =
      byLang.ca.published.complete &&
      byLang.es.published.complete &&
      byLang.fr.published.complete &&
      byLang.pt.published.complete

    const hasAnyDraft =
      byLang.ca.draft.complete ||
      byLang.es.draft.complete ||
      byLang.fr.draft.complete ||
      byLang.pt.draft.complete

    return {
      guideId: item.id,
      domain: item.domain,
      byLang,
      publishedCompleteAllLangs,
      hasAnyDraft,
    }
  })

  const summary: GuideCoverageSummary = {
    totalGuides: rows.length,
    fullyPublishedGuides: rows.filter(row => row.publishedCompleteAllLangs).length,
    guidesWithDraft: rows.filter(row => row.hasAnyDraft).length,
    missingPublishedByLang,
  }

  return { summary, rows }
}
