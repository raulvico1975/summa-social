import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getAdminDb } from '../../src/lib/api/admin-sdk'

type ConfidenceBand = 'high' | 'medium' | 'low'
type IntentType = 'operational' | 'informational'
type MetricStatus = 'ok' | 'insufficient_data'

export type BotQuestionLogRecord = {
  normalizedQueryHash: string
  messageRaw: string
  messageNormalized: string
  lang: string
  resultMode: 'card' | 'fallback'
  cardIdOrFallbackId: string | null
  bestCardId: string | null
  confidenceBand: ConfidenceBand | null
  decisionReason: string | null
  intent: IntentType | null
  count: number
  helpfulYes: number
  helpfulNo: number
  clarifyShownCount: number
  clarifySelectedCount: number
  clarifyAbandonedCount: number
  reformulatedAfterFallbackCount: number
  reformulatedAfterClarifyCount: number
  answerCount: number
  clarifyCount: number
  fallbackCount: number
  createdAt?: string | null
  lastSeenAt?: string | null
}

export type ProblemMetric = {
  normalizedQueryHash: string
  messageRaw: string
  messageNormalized: string
  lang: string
  count: number
  fallbackRate: number | null
  fallbackRateStatus?: MetricStatus
  fallbackRateBasis?: 'prospective_counters' | 'historical_not_reconstructible'
  notHelpfulRate: number | null
  notHelpfulRateStatus?: MetricStatus
  reformulationRate: number | null
  reformulationRateStatus?: MetricStatus
  clarifyAbandonmentRate: number | null
  clarifyAbandonmentRateStatus?: MetricStatus
  cardIdOrFallbackId: string | null
  bestCardId: string | null
  confidenceBand: ConfidenceBand | null
  decisionReason: string | null
  intent: IntentType | null
}

export type BotProblemsReport = {
  generatedAt: string
  orgId: string
  days: number
  sourceCollection: string
  topFallback: ProblemMetric[]
  topNotHelpful: ProblemMetric[]
  topHighFrequency: ProblemMetric[]
  topReformulations: {
    status: MetricStatus
    items: ProblemMetric[]
  }
  topClarifyAbandonment: {
    status: MetricStatus
    items: ProblemMetric[]
  }
  recommendedCoverageCandidates: ProblemMetric[]
}

type BuildReportOptions = {
  generatedAt?: string
  orgId: string
  days: number
}

type AnalyzeBotLogsCliDeps = {
  cwd?: string
  loadRecords?: (orgId: string, days: number) => Promise<BotQuestionLogRecord[]>
}

export type AnalyzeBotLogsExecutionResult = {
  report: BotProblemsReport
  absoluteOutPath: string
}

function parseInteger(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseArgs(argv: string[]): { orgId: string; days: number; outPath: string } {
  let orgId = ''
  let days = 90
  let outPath = 'reports/bot-top-problems.json'

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--org') {
      orgId = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg.startsWith('--org=')) {
      orgId = arg.slice('--org='.length)
      continue
    }
    if (arg === '--days') {
      days = parseInteger(argv[index + 1], 90)
      index += 1
      continue
    }
    if (arg.startsWith('--days=')) {
      days = parseInteger(arg.slice('--days='.length), 90)
      continue
    }
    if (arg === '--out') {
      outPath = argv[index + 1] ?? outPath
      index += 1
      continue
    }
    if (arg.startsWith('--out=')) {
      outPath = arg.slice('--out='.length)
    }
  }

  if (!orgId.trim()) {
    throw new Error('Missing required argument: --org <orgId>')
  }

  return {
    orgId: orgId.trim(),
    days,
    outPath,
  }
}

function toIsoDate(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const maybeTimestamp = value as { toDate?: () => Date }
  if (typeof maybeTimestamp.toDate !== 'function') return null
  const date = maybeTimestamp.toDate()
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function toBotQuestionLogRecord(
  normalizedQueryHash: string,
  data: Record<string, unknown>
): BotQuestionLogRecord {
  return {
    normalizedQueryHash,
    messageRaw: String(data.messageRaw ?? ''),
    messageNormalized: String(data.messageNormalized ?? ''),
    lang: String(data.lang ?? 'ca'),
    resultMode: data.resultMode === 'card' ? 'card' : 'fallback',
    cardIdOrFallbackId: typeof data.cardIdOrFallbackId === 'string' ? data.cardIdOrFallbackId : null,
    bestCardId: typeof data.bestCardId === 'string' ? data.bestCardId : null,
    confidenceBand: (data.confidenceBand ?? data.retrievalConfidence ?? null) as ConfidenceBand | null,
    decisionReason: typeof data.decisionReason === 'string' ? data.decisionReason : null,
    intent: data.intent === 'operational' ? 'operational' : data.intent === 'informational' ? 'informational' : null,
    count: Number(data.count ?? 0) || 0,
    helpfulYes: Number(data.helpfulYes ?? 0) || 0,
    helpfulNo: Number(data.helpfulNo ?? 0) || 0,
    clarifyShownCount: Number(data.clarifyShownCount ?? 0) || 0,
    clarifySelectedCount: Number(data.clarifySelectedCount ?? 0) || 0,
    clarifyAbandonedCount: Number(data.clarifyAbandonedCount ?? 0) || 0,
    reformulatedAfterFallbackCount: Number(data.reformulatedAfterFallbackCount ?? 0) || 0,
    reformulatedAfterClarifyCount: Number(data.reformulatedAfterClarifyCount ?? 0) || 0,
    answerCount: Number(data.answerCount ?? 0) || 0,
    clarifyCount: Number(data.clarifyCount ?? 0) || 0,
    fallbackCount: Number(data.fallbackCount ?? 0) || 0,
    createdAt: toIsoDate(data.createdAt),
    lastSeenAt: toIsoDate(data.lastSeenAt),
  }
}

function buildMetric(record: BotQuestionLogRecord): ProblemMetric {
  const helpfulTotal = record.helpfulYes + record.helpfulNo
  const modeTotal = record.answerCount + record.clarifyCount + record.fallbackCount
  const reformulationCount = record.reformulatedAfterFallbackCount + record.reformulatedAfterClarifyCount
  const hasReformulationSignal = reformulationCount > 0
  const hasClarifySignal =
    record.clarifyShownCount > 0 ||
    record.clarifySelectedCount > 0 ||
    record.clarifyAbandonedCount > 0
  const hasHelpfulSignal = helpfulTotal > 0
  const hasProspectiveModeSignal = modeTotal > 0

  return {
    normalizedQueryHash: record.normalizedQueryHash,
    messageRaw: record.messageRaw,
    messageNormalized: record.messageNormalized,
    lang: record.lang,
    count: record.count,
    fallbackRate: hasProspectiveModeSignal ? record.fallbackCount / modeTotal : null,
    fallbackRateStatus: hasProspectiveModeSignal ? 'ok' : 'insufficient_data',
    fallbackRateBasis: hasProspectiveModeSignal ? 'prospective_counters' : 'historical_not_reconstructible',
    notHelpfulRate: hasHelpfulSignal ? record.helpfulNo / helpfulTotal : null,
    notHelpfulRateStatus: hasHelpfulSignal ? 'ok' : 'insufficient_data',
    reformulationRate: hasReformulationSignal && record.count > 0 ? reformulationCount / record.count : null,
    reformulationRateStatus: hasReformulationSignal ? 'ok' : 'insufficient_data',
    clarifyAbandonmentRate: hasClarifySignal && record.clarifyShownCount > 0
      ? record.clarifyAbandonedCount / record.clarifyShownCount
      : null,
    clarifyAbandonmentRateStatus: hasClarifySignal ? 'ok' : 'insufficient_data',
    cardIdOrFallbackId: record.cardIdOrFallbackId,
    bestCardId: record.bestCardId,
    confidenceBand: record.confidenceBand,
    decisionReason: record.decisionReason,
    intent: record.intent,
  }
}

function compareByCountThenMessage(a: ProblemMetric, b: ProblemMetric): number {
  if (b.count !== a.count) return b.count - a.count
  return a.messageNormalized.localeCompare(b.messageNormalized)
}

function compareByRateThenCount(
  field: 'fallbackRate' | 'notHelpfulRate' | 'reformulationRate' | 'clarifyAbandonmentRate'
): (a: ProblemMetric, b: ProblemMetric) => number {
  return (a, b) => {
    const left = a[field] ?? -1
    const right = b[field] ?? -1
    if (right !== left) return right - left
    return compareByCountThenMessage(a, b)
  }
}

function dedupeMetrics(metrics: ProblemMetric[]): ProblemMetric[] {
  const map = new Map<string, ProblemMetric>()
  for (const metric of metrics) {
    if (!map.has(metric.normalizedQueryHash)) {
      map.set(metric.normalizedQueryHash, metric)
    }
  }
  return Array.from(map.values())
}

export function buildBotProblemsReport(
  records: BotQuestionLogRecord[],
  options: BuildReportOptions
): BotProblemsReport {
  const metrics = records.map(buildMetric)

  const topFallback = metrics
    .filter(metric => metric.fallbackRate != null && metric.fallbackRate > 0)
    .sort(compareByRateThenCount('fallbackRate'))
    .slice(0, 15)

  const topNotHelpful = metrics
    .filter(metric => metric.notHelpfulRate != null && metric.notHelpfulRate > 0)
    .sort(compareByRateThenCount('notHelpfulRate'))
    .slice(0, 10)

  const topHighFrequency = [...metrics]
    .sort(compareByCountThenMessage)
    .slice(0, 15)

  const reformulationCandidates = metrics
    .filter(metric => metric.reformulationRate != null)
    .sort(compareByRateThenCount('reformulationRate'))
    .slice(0, 15)

  const clarifyCandidates = metrics
    .filter(metric => metric.clarifyAbandonmentRate != null)
    .sort(compareByRateThenCount('clarifyAbandonmentRate'))
    .slice(0, 15)

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    orgId: options.orgId,
    days: options.days,
    sourceCollection: `organizations/${options.orgId}/supportBotQuestions`,
    topFallback,
    topNotHelpful,
    topHighFrequency,
    topReformulations: {
      status: reformulationCandidates.length > 0 ? 'ok' : 'insufficient_data',
      items: reformulationCandidates,
    },
    topClarifyAbandonment: {
      status: clarifyCandidates.length > 0 ? 'ok' : 'insufficient_data',
      items: clarifyCandidates,
    },
    recommendedCoverageCandidates: dedupeMetrics([
      ...topFallback,
      ...topNotHelpful,
      ...topHighFrequency,
    ]).slice(0, 40),
  }
}

function normalizeLoadError(orgId: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (
    /Firebase config incompleta|Missing FIREBASE_STORAGE_BUCKET|Could not load the default credentials|credential/i.test(message)
  ) {
    return new Error(`Cannot analyze support bot logs for org "${orgId}": missing Firebase Admin credentials or config (${message})`)
  }
  return new Error(`Cannot analyze support bot logs for org "${orgId}": ${message}`)
}

async function loadBotQuestionLogRecords(orgId: string, days: number): Promise<BotQuestionLogRecord[]> {
  try {
    const db = getAdminDb()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const snapshot = await db
      .collection(`organizations/${orgId}/supportBotQuestions`)
      .where('lastSeenAt', '>=', cutoff)
      .get()

    return snapshot.docs.map(doc => toBotQuestionLogRecord(doc.id, doc.data() as Record<string, unknown>))
  } catch (error) {
    throw normalizeLoadError(orgId, error)
  }
}

export async function writeBotProblemsReport(report: BotProblemsReport, outPath: string, cwd = process.cwd()): Promise<string> {
  const absoluteOutPath = resolve(cwd, outPath)
  await mkdir(dirname(absoluteOutPath), { recursive: true })
  await writeFile(absoluteOutPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return absoluteOutPath
}

export async function executeAnalyzeBotLogsCli(
  argv: string[],
  deps: AnalyzeBotLogsCliDeps = {}
): Promise<AnalyzeBotLogsExecutionResult> {
  const { orgId, days, outPath } = parseArgs(argv)
  const records = await (deps.loadRecords ?? loadBotQuestionLogRecords)(orgId, days)
  const report = buildBotProblemsReport(records, { orgId, days })
  const absoluteOutPath = await writeBotProblemsReport(report, outPath, deps.cwd)

  return { report, absoluteOutPath }
}

export async function runAnalyzeBotLogsCli(argv: string[], deps: AnalyzeBotLogsCliDeps = {}): Promise<BotProblemsReport> {
  const { report } = await executeAnalyzeBotLogsCli(argv, deps)
  return report
}

const isMainModule = process.argv[1] != null && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMainModule) {
  executeAnalyzeBotLogsCli(process.argv.slice(2))
    .then(({ report, absoluteOutPath }) => {
      console.log(
        JSON.stringify(
          {
            out: absoluteOutPath,
            orgId: report.orgId,
            recommendedCoverageCandidates: report.recommendedCoverageCandidates.length,
          },
          null,
          2
        )
      )
    })
    .catch(error => {
      console.error('[analyze-bot-logs] error:', (error as Error)?.message ?? error)
      process.exitCode = 1
    })
}
