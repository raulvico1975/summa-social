import { type Firestore } from 'firebase-admin/firestore'

export type ControlStatus = 'ok' | 'warning' | 'critical'
export type AlertPolicy = 'conservative'

export type GlobalStatusCardId = 'system' | 'incidents' | 'content' | 'translations'

export interface GlobalStatusCard {
  id: GlobalStatusCardId
  title: string
  status: ControlStatus
  headline: string
  detail?: string
  count?: number
  date?: string | null
}

export interface EntityRow {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'pending'
  createdAt: string | null
  lastActivityAt: string | null
  taxId?: string
}

export interface KbBotSummary {
  kbUpdatedAt: string | null
  botTotalQuestions: number
  botTodayQuestions: number
  botTodayMethod: 'distinct_last_seen_today'
  topTopics: Array<{ topic: string; count: number }>
}

export interface CommunicationSummary {
  status: ControlStatus
  latestPublished: Array<{
    id: string
    title: string
    publishedAt: string | null
  }>
  latestPublishedAt: string | null
  pendingDrafts: number
}

export interface ThresholdsApplied {
  policy: AlertPolicy
  system: {
    criticalIfOpenAtLeast: number
    criticalIfHasCriticalOpen: boolean
    warningIfOpenAtLeast: number
  }
  content: {
    warningAfterDays: number
    criticalAfterDays: number
  }
  translations: {
    warningAfterDays: number
    criticalAfterDays: number
  }
  communication: {
    warningAfterDays: number
    criticalAfterDays: number
    warningDrafts: number
    criticalDrafts: number
  }
}

export interface AdminControlTowerSummary {
  generatedAt: string
  alertPolicy: AlertPolicy
  globalStatus: {
    cards: GlobalStatusCard[]
  }
  entities: EntityRow[]
  kbBotSummary: KbBotSummary
  communicationSummary: CommunicationSummary
  thresholdsApplied: ThresholdsApplied
}

const DAY_MS = 24 * 60 * 60 * 1000

export const CONTROL_TOWER_THRESHOLDS: ThresholdsApplied = {
  policy: 'conservative',
  system: {
    criticalIfOpenAtLeast: 3,
    criticalIfHasCriticalOpen: true,
    warningIfOpenAtLeast: 1,
  },
  content: {
    warningAfterDays: 45,
    criticalAfterDays: 90,
  },
  translations: {
    warningAfterDays: 60,
    criticalAfterDays: 120,
  },
  communication: {
    warningAfterDays: 45,
    criticalAfterDays: 90,
    warningDrafts: 5,
    criticalDrafts: 10,
  },
}

function isFiniteDate(date: Date): boolean {
  return Number.isFinite(date.getTime())
}

function toIsoOrNull(value: unknown): string | null {
  if (!value) return null

  if (typeof value === 'string') {
    const d = new Date(value)
    return isFiniteDate(d) ? d.toISOString() : null
  }

  if (value instanceof Date) {
    return isFiniteDate(value) ? value.toISOString() : null
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeToDate = (value as { toDate?: () => Date }).toDate
    if (typeof maybeToDate === 'function') {
      const d = maybeToDate()
      return isFiniteDate(d) ? d.toISOString() : null
    }
  }

  return null
}

function formatDateCaShort(iso: string | null): string {
  if (!iso) return 'sense data'
  const d = new Date(iso)
  if (!isFiniteDate(d)) return 'sense data'
  return d.toLocaleDateString('ca-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function evaluateSystemStatus(openIncidents: number, hasCriticalOpen: boolean): ControlStatus {
  if (hasCriticalOpen || openIncidents >= CONTROL_TOWER_THRESHOLDS.system.criticalIfOpenAtLeast) {
    return 'critical'
  }
  if (openIncidents >= CONTROL_TOWER_THRESHOLDS.system.warningIfOpenAtLeast) {
    return 'warning'
  }
  return 'ok'
}

export function evaluateStalenessStatus(
  updatedAtIso: string | null,
  warningAfterDays: number,
  criticalAfterDays: number,
  now: Date = new Date()
): ControlStatus {
  if (!updatedAtIso) return 'critical'

  const date = new Date(updatedAtIso)
  if (!isFiniteDate(date)) return 'critical'

  const ageDays = Math.floor((now.getTime() - date.getTime()) / DAY_MS)
  if (ageDays > criticalAfterDays) return 'critical'
  if (ageDays > warningAfterDays) return 'warning'
  return 'ok'
}

export function evaluateCommunicationStatus(
  latestPublishedAtIso: string | null,
  pendingDrafts: number,
  now: Date = new Date()
): ControlStatus {
  const ageStatus = evaluateStalenessStatus(
    latestPublishedAtIso,
    CONTROL_TOWER_THRESHOLDS.communication.warningAfterDays,
    CONTROL_TOWER_THRESHOLDS.communication.criticalAfterDays,
    now
  )

  if (
    !latestPublishedAtIso ||
    ageStatus === 'critical' ||
    pendingDrafts > CONTROL_TOWER_THRESHOLDS.communication.criticalDrafts
  ) {
    return 'critical'
  }

  if (
    ageStatus === 'warning' ||
    pendingDrafts > CONTROL_TOWER_THRESHOLDS.communication.warningDrafts
  ) {
    return 'warning'
  }

  return 'ok'
}

const TOPIC_RULES: Array<{ topic: string; patterns: RegExp[] }> = [
  { topic: 'Model 182', patterns: [/\bmodel\s*182\b/i, /\bmodelo\s*182\b/i, /\b182\b/i] },
  { topic: 'Stripe', patterns: [/\bstripe\b/i] },
  { topic: 'Remeses', patterns: [/\bremesa\b/i, /\bremeses\b/i, /\bsepa\b/i, /\bpain\b/i] },
  { topic: 'Model 347', patterns: [/\bmodel\s*347\b/i, /\bmodelo\s*347\b/i, /\b347\b/i] },
  { topic: 'Devolucions', patterns: [/\bdevolucio\b/i, /\bdevoluci[óo]n\b/i, /\bimpagat\b/i] },
]

export function inferBotTopic(rawText: string): string {
  const normalized = String(rawText || '')
  for (const rule of TOPIC_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.topic
    }
  }
  return 'Altres'
}

export async function buildAdminControlTowerSummary(
  db: Firestore
): Promise<AdminControlTowerSummary> {
  const now = new Date()

  const [
    incidentsSnap,
    supportKbSnap,
    i18nSnap,
    orgsSnap,
    botQuestionsSnap,
    publishedSnap,
    draftsSnap,
  ] = await Promise.all([
    db.collection('systemIncidents').where('status', '==', 'OPEN').get(),
    db.doc('system/supportKb').get(),
    db.doc('system/i18n').get(),
    db.collection('organizations').orderBy('createdAt', 'desc').get(),
    db.collectionGroup('supportBotQuestions').get(),
    db.collection('productUpdates').orderBy('publishedAt', 'desc').limit(30).get(),
    db.collection('productUpdateDrafts').where('status', '==', 'draft').get(),
  ])

  const openIncidents = incidentsSnap.docs.length
  const hasCriticalOpen = incidentsSnap.docs.some((doc) => doc.data()?.severity === 'CRITICAL')
  const systemStatus = evaluateSystemStatus(openIncidents, hasCriticalOpen)

  const kbUpdatedAt = toIsoOrNull(
    supportKbSnap.data()?.updatedAt ??
      supportKbSnap.data()?.publishedAt ??
      supportKbSnap.data()?.draftUpdatedAt
  )

  const i18nUpdatedAt = toIsoOrNull(i18nSnap.data()?.updatedAt)

  const contentStatus = evaluateStalenessStatus(
    kbUpdatedAt,
    CONTROL_TOWER_THRESHOLDS.content.warningAfterDays,
    CONTROL_TOWER_THRESHOLDS.content.criticalAfterDays,
    now
  )

  const translationsStatus = evaluateStalenessStatus(
    i18nUpdatedAt,
    CONTROL_TOWER_THRESHOLDS.translations.warningAfterDays,
    CONTROL_TOWER_THRESHOLDS.translations.criticalAfterDays,
    now
  )

  const entities: EntityRow[] = orgsSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>
    const createdAt = toIsoOrNull(data.createdAt)
    const lastActivityAt = toIsoOrNull(data.updatedAt) ?? createdAt

    return {
      id: doc.id,
      name: String(data.name ?? '—'),
      slug: String(data.slug ?? doc.id),
      status: (data.status as EntityRow['status']) ?? 'pending',
      ...(typeof data.taxId === 'string' ? { taxId: data.taxId } : {}),
      createdAt,
      lastActivityAt,
    }
  })

  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  let botTotalQuestions = 0
  let botTodayQuestions = 0
  const topicCounts = new Map<string, number>()

  for (const doc of botQuestionsSnap.docs) {
    const data = doc.data() as Record<string, unknown>
    const count = Number(data.count)
    const weight = Number.isFinite(count) && count > 0 ? Math.round(count) : 1

    botTotalQuestions += weight

    const lastSeenAtIso = toIsoOrNull(data.lastSeenAt)
    if (lastSeenAtIso && new Date(lastSeenAtIso) >= startOfTodayUtc) {
      // Fase ràpida: aproximació operativa de "avui" amb docs tocats avui.
      botTodayQuestions += 1
    }

    const sample = [data.messageRaw, data.cardIdOrFallbackId, data.bestCardId]
      .filter(Boolean)
      .join(' ')
    const topic = inferBotTopic(sample)

    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + weight)
  }

  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic, count]) => ({ topic, count }))

  const latestPublished = publishedSnap.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>
      if (data.isActive === false) return null
      return {
        id: doc.id,
        title: String(data.title ?? 'Sense títol'),
        publishedAt: toIsoOrNull(data.publishedAt),
      }
    })
    .filter((item): item is { id: string; title: string; publishedAt: string | null } => item !== null)
    .slice(0, 3)

  const latestPublishedAt = latestPublished[0]?.publishedAt ?? null
  const pendingDrafts = draftsSnap.size
  const communicationStatus = evaluateCommunicationStatus(latestPublishedAt, pendingDrafts, now)

  const globalStatusCards: GlobalStatusCard[] = [
    {
      id: 'system',
      title: 'Sistema',
      status: systemStatus,
      headline:
        systemStatus === 'ok'
          ? 'Tot funciona correctament'
          : systemStatus === 'warning'
            ? 'Atenció operativa'
            : 'Alerta real activa',
      ...(hasCriticalOpen ? { detail: 'Hi ha incidències crítiques obertes' } : {}),
    },
    {
      id: 'incidents',
      title: 'Incidències',
      status: systemStatus,
      headline: `${openIncidents} obertes`,
      count: openIncidents,
    },
    {
      id: 'content',
      title: 'Contingut',
      status: contentStatus,
      headline: kbUpdatedAt ? `KB actualitzada ${formatDateCaShort(kbUpdatedAt)}` : 'KB pendent de publicar',
      date: kbUpdatedAt,
    },
    {
      id: 'translations',
      title: 'Traduccions',
      status: translationsStatus,
      headline: i18nUpdatedAt ? `Publicades ${formatDateCaShort(i18nUpdatedAt)}` : 'Sense publicació',
      date: i18nUpdatedAt,
    },
  ]

  return {
    generatedAt: now.toISOString(),
    alertPolicy: 'conservative',
    globalStatus: {
      cards: globalStatusCards,
    },
    entities,
    kbBotSummary: {
      kbUpdatedAt,
      botTotalQuestions,
      botTodayQuestions,
      botTodayMethod: 'distinct_last_seen_today',
      topTopics,
    },
    communicationSummary: {
      status: communicationStatus,
      latestPublished,
      latestPublishedAt,
      pendingDrafts,
    },
    thresholdsApplied: CONTROL_TOWER_THRESHOLDS,
  }
}
