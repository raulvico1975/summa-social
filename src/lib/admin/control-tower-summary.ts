import { type Firestore } from 'firebase-admin/firestore'
import {
  FISCAL_PENDING_REVIEW_ALERT_TYPE,
  getCurrentFiscalYear,
  isAlertExpired,
  type AdminAlertStatus,
} from '@/lib/admin/admin-alerts'
import { calculateS9FiscalCoherence } from '@/lib/fiscal/sentinels/s9-fiscal-coherence'

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
  s9: EntityS9Summary
}

export interface EntityS9Summary {
  year: number
  pendingCount: number
  pendingAmountCents: number
  diagnosisTextCa: string
  actionTextCa: string
  alertStatus: AdminAlertStatus | null
  alertId: string | null
  alertExpiresAt: string | null
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
const ENTITY_ACTIVITY_QUERY_PLAN = [
  { collection: 'transactions', fields: ['updatedAt', 'createdAt', 'date'] },
  { collection: 'importRuns', fields: ['createdAt', 'updatedAt'] },
  { collection: 'remittances', fields: ['updatedAt', 'createdAt'] },
  { collection: 'expenseReports', fields: ['updatedAt', 'submittedAt', 'createdAt'] },
  { collection: 'contacts', fields: ['updatedAt', 'createdAt'] },
] as const

const S9_FISCAL_CATEGORY_NAME_KEYS = new Set([
  'donations',
  'memberfees',
  'donaciones',
  'cuotassocios',
  'quotesdesocis',
  'quotes',
])

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
    const maybeTimestamp = value as { toDate?: () => Date }
    if (typeof maybeTimestamp.toDate === 'function') {
      // Important: call as method to preserve `this` on Firestore Timestamp.
      const d = maybeTimestamp.toDate()
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
}

function inferFiscalIncomeCategoryIds(
  categoryDocs: Array<Record<string, unknown>>,
  orgConfiguredIds: string[]
): string[] {
  const result = new Set(orgConfiguredIds)

  for (const categoryDoc of categoryDocs) {
    const categoryId = typeof categoryDoc.id === 'string' ? categoryDoc.id : null
    const categoryName = typeof categoryDoc.name === 'string' ? categoryDoc.name : null

    if (!categoryId || !categoryName) continue

    if (S9_FISCAL_CATEGORY_NAME_KEYS.has(normalizeKey(categoryName))) {
      result.add(categoryId)
    }
  }

  return Array.from(result)
}

function normalizeS9AlertStatus(rawStatus: unknown, expiresAt: unknown, now: Date): AdminAlertStatus {
  if (rawStatus === 'read') return 'read'
  if (rawStatus === 'expired') return 'expired'

  if (rawStatus === 'open') {
    return isAlertExpired(expiresAt, now) ? 'expired' : 'open'
  }

  return isAlertExpired(expiresAt, now) ? 'expired' : 'open'
}

function resolveS9AlertState(
  alerts: Array<{ id: string; data: Record<string, unknown> }>,
  fiscalYear: number,
  now: Date
): {
  alertStatus: AdminAlertStatus | null
  alertId: string | null
  alertExpiresAt: string | null
} {
  let latestAlert: {
    id: string
    createdAt: string | null
    status: AdminAlertStatus
    expiresAt: string | null
  } | null = null

  for (const alert of alerts) {
    const payload = alert.data.payload as Record<string, unknown> | undefined
    const alertYear = Number(payload?.year)
    if (!Number.isFinite(alertYear) || alertYear !== fiscalYear) {
      continue
    }

    const createdAtIso = toIsoOrNull(alert.data.createdAt)
    const expiresAtIso = toIsoOrNull(alert.data.expiresAt)
    const normalizedStatus = normalizeS9AlertStatus(alert.data.status, alert.data.expiresAt, now)

    if (!latestAlert) {
      latestAlert = {
        id: alert.id,
        createdAt: createdAtIso,
        status: normalizedStatus,
        expiresAt: expiresAtIso,
      }
      continue
    }

    const latestTime = latestAlert.createdAt ? new Date(latestAlert.createdAt).getTime() : -1
    const currentTime = createdAtIso ? new Date(createdAtIso).getTime() : -1

    if (currentTime > latestTime) {
      latestAlert = {
        id: alert.id,
        createdAt: createdAtIso,
        status: normalizedStatus,
        expiresAt: expiresAtIso,
      }
    }
  }

  if (!latestAlert) {
    return {
      alertStatus: null,
      alertId: null,
      alertExpiresAt: null,
    }
  }

  return {
    alertStatus: latestAlert.status,
    alertId: latestAlert.id,
    alertExpiresAt: latestAlert.expiresAt,
  }
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

export function pickMostRecentIso(
  candidates: Array<string | null | undefined>
): string | null {
  let latestMs: number | null = null
  for (const candidate of candidates) {
    if (!candidate) continue
    const date = new Date(candidate)
    const time = date.getTime()
    if (!Number.isFinite(time)) continue
    if (latestMs === null || time > latestMs) {
      latestMs = time
    }
  }
  return latestMs === null ? null : new Date(latestMs).toISOString()
}

async function queryMostRecentFieldIso(
  db: Firestore,
  orgId: string,
  collectionName: string,
  fields: readonly string[]
): Promise<string | null> {
  for (const field of fields) {
    try {
      const snap = await db
        .collection(`organizations/${orgId}/${collectionName}`)
        .orderBy(field, 'desc')
        .limit(1)
        .get()
      const iso = toIsoOrNull(snap.docs[0]?.get(field))
      if (iso) return iso
    } catch {
      // Ignore source-level errors to keep summary available with partial data.
    }
  }
  return null
}

async function resolveEntityLastActivity(
  db: Firestore,
  orgId: string,
  baseCandidates: Array<string | null | undefined>
): Promise<string | null> {
  const sourceCandidates = await Promise.all(
    ENTITY_ACTIVITY_QUERY_PLAN.map((plan) =>
      queryMostRecentFieldIso(db, orgId, plan.collection, plan.fields)
    )
  )
  return pickMostRecentIso([...baseCandidates, ...sourceCandidates])
}

async function buildEntityS9Summary(
  db: Firestore,
  orgId: string,
  fiscalYear: number,
  now: Date,
  orgConfiguredFiscalCategoryIds: string[]
): Promise<EntityS9Summary> {
  const yearStart = `${fiscalYear}-01-01`
  const nextYearStart = `${fiscalYear + 1}-01-01`

  const [categoriesSnap, transactionsSnap, alertsSnap] = await Promise.all([
    db.collection(`organizations/${orgId}/categories`).get(),
    db
      .collection(`organizations/${orgId}/transactions`)
      .where('date', '>=', yearStart)
      .where('date', '<', nextYearStart)
      .get(),
    db
      .collection(`organizations/${orgId}/adminAlerts`)
      .where('type', '==', FISCAL_PENDING_REVIEW_ALERT_TYPE)
      .get(),
  ])

  const categoryDocs = categoriesSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }))

  const fiscalIncomeCategoryIds = inferFiscalIncomeCategoryIds(
    categoryDocs,
    orgConfiguredFiscalCategoryIds
  )

  const transactions = transactionsSnap.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>
      const amount = Number(data.amount)
      const date = typeof data.date === 'string' ? data.date : ''
      if (!Number.isFinite(amount) || !date) return null

      const transactionType: 'normal' | 'return' | 'return_fee' | 'donation' | 'fee' | undefined =
        data.transactionType === 'normal' ||
        data.transactionType === 'return' ||
        data.transactionType === 'return_fee' ||
        data.transactionType === 'donation' ||
        data.transactionType === 'fee'
          ? data.transactionType
          : undefined

      const contactType: 'donor' | 'supplier' | 'employee' | undefined =
        data.contactType === 'donor' ||
        data.contactType === 'supplier' ||
        data.contactType === 'employee'
          ? data.contactType
          : undefined

      const source: 'bank' | 'remittance' | 'manual' | 'stripe' | undefined =
        data.source === 'bank' ||
        data.source === 'remittance' ||
        data.source === 'manual' ||
        data.source === 'stripe'
          ? data.source
          : undefined

      const fiscalKind: 'donation' | 'non_fiscal' | 'pending_review' | null =
        data.fiscalKind === 'donation' ||
        data.fiscalKind === 'non_fiscal' ||
        data.fiscalKind === 'pending_review'
          ? data.fiscalKind
          : null

      return {
        id: doc.id,
        date,
        amount,
        category: typeof data.category === 'string' ? data.category : null,
        contactId: typeof data.contactId === 'string' ? data.contactId : null,
        contactType,
        source,
        transactionType,
        archivedAt: typeof data.archivedAt === 'string' ? data.archivedAt : null,
        fiscalKind,
      }
    })
    .filter((tx): tx is NonNullable<typeof tx> => tx !== null)

  const s9 = calculateS9FiscalCoherence(transactions, { fiscalIncomeCategoryIds })
  const alertState = resolveS9AlertState(
    alertsSnap.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as Record<string, unknown>,
    })),
    fiscalYear,
    now
  )

  return {
    year: fiscalYear,
    pendingCount: s9.pendingCount,
    pendingAmountCents: s9.pendingAmountCents,
    diagnosisTextCa: s9.diagnosisTextCa,
    actionTextCa: s9.actionTextCa,
    alertStatus: alertState.alertStatus,
    alertId: alertState.alertId,
    alertExpiresAt: alertState.alertExpiresAt,
  }
}

export async function buildAdminControlTowerSummary(
  db: Firestore
): Promise<AdminControlTowerSummary> {
  const now = new Date()
  const currentFiscalYear = getCurrentFiscalYear(now)

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

  const entitiesBase = orgsSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>
    const createdAt = toIsoOrNull(data.createdAt)

    return {
      id: doc.id,
      name: String(data.name ?? '—'),
      slug: String(data.slug ?? doc.id),
      status: (data.status as EntityRow['status']) ?? 'pending',
      ...(typeof data.taxId === 'string' ? { taxId: data.taxId } : {}),
      createdAt,
      orgUpdatedAt: toIsoOrNull(data.updatedAt),
      configuredFiscalCategoryIds: normalizeStringArray(data.fiscalIncomeCategoryIds ?? data.fiscalCategoryIds),
    }
  })

  const entities: EntityRow[] = await Promise.all(
    entitiesBase.map(async (entity) => {
      const [lastActivityAt, s9] = await Promise.all([
        resolveEntityLastActivity(db, entity.id, [
          entity.orgUpdatedAt,
          entity.createdAt,
        ]),
        buildEntityS9Summary(
          db,
          entity.id,
          currentFiscalYear,
          now,
          entity.configuredFiscalCategoryIds
        ),
      ])

      return {
        id: entity.id,
        name: entity.name,
        slug: entity.slug,
        status: entity.status,
        ...(entity.taxId ? { taxId: entity.taxId } : {}),
        createdAt: entity.createdAt,
        lastActivityAt: lastActivityAt ?? entity.createdAt,
        s9,
      }
    })
  )

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
