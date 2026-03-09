import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  buildBotProblemsReport,
  executeAnalyzeBotLogsCli,
  toBotQuestionLogRecord,
} from '../../../scripts/support/analyze-bot-logs'

test('buildBotProblemsReport computes fallback and coverage candidates', () => {
  const report = buildBotProblemsReport(
    [
      toBotQuestionLogRecord('hash-fallback', {
        messageRaw: 'remesa no quadra',
        messageNormalized: 'remesa no quadra',
        lang: 'ca',
        resultMode: 'fallback',
        cardIdOrFallbackId: 'fallback-remittances-unclear',
        bestCardId: 'guide-remittances',
        confidenceBand: 'low',
        decisionReason: 'specific_case_fallback',
        intent: 'operational',
        count: 12,
        helpfulYes: 1,
        helpfulNo: 5,
        fallbackCount: 4,
        answerCount: 1,
      }),
      toBotQuestionLogRecord('hash-helpful', {
        messageRaw: 'on pujo factures',
        messageNormalized: 'on pujo factures',
        lang: 'ca',
        resultMode: 'card',
        cardIdOrFallbackId: 'guide-attach-document',
        bestCardId: 'guide-attach-document',
        confidenceBand: 'high',
        decisionReason: 'high_confidence_match',
        intent: 'operational',
        count: 8,
        helpfulYes: 2,
        helpfulNo: 1,
        answerCount: 3,
      }),
    ],
    {
      orgId: 'org-test',
      days: 90,
      generatedAt: '2026-03-07T12:00:00.000Z',
    }
  )

  assert.equal(report.topFallback[0]?.normalizedQueryHash, 'hash-fallback')
  assert.equal(report.topFallback[0]?.fallbackRate, 0.8)
  assert.equal(report.topFallback[0]?.fallbackRateStatus, 'ok')
  assert.equal(report.topNotHelpful[0]?.normalizedQueryHash, 'hash-fallback')
  assert.equal(report.recommendedCoverageCandidates.length, 2)
})

test('buildBotProblemsReport marks unavailable metrics as insufficient_data when history is not reconstructible', () => {
  const report = buildBotProblemsReport(
    [
      toBotQuestionLogRecord('hash-no-signal', {
        messageRaw: 'duplicats extracte bancari',
        messageNormalized: 'duplicats extracte bancari',
        lang: 'ca',
        resultMode: 'fallback',
        cardIdOrFallbackId: 'fallback-no-answer',
        count: 3,
      }),
    ],
    {
      orgId: 'org-test',
      days: 90,
      generatedAt: '2026-03-07T12:00:00.000Z',
    }
  )

  assert.equal(report.topReformulations.status, 'insufficient_data')
  assert.equal(report.topClarifyAbandonment.status, 'insufficient_data')
  assert.equal(report.topFallback.length, 0)
  assert.equal(report.topHighFrequency[0]?.fallbackRate, null)
  assert.equal(report.topHighFrequency[0]?.fallbackRateStatus, 'insufficient_data')
  assert.equal(report.topHighFrequency[0]?.notHelpfulRate, null)
  assert.equal(report.topHighFrequency[0]?.notHelpfulRateStatus, 'insufficient_data')
  assert.equal(report.topHighFrequency[0]?.reformulationRate, null)
  assert.equal(report.topHighFrequency[0]?.clarifyAbandonmentRate, null)
})

test('executeAnalyzeBotLogsCli creates the reports directory and writes the report to disk', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'support-bot-report-'))

  try {
    const { report, absoluteOutPath } = await executeAnalyzeBotLogsCli(
      ['--org', 'org-test'],
      {
        cwd,
        loadRecords: async () => [
          toBotQuestionLogRecord('hash-fallback', {
            messageRaw: 'remesa no quadra',
            messageNormalized: 'remesa no quadra',
            lang: 'ca',
            resultMode: 'fallback',
            cardIdOrFallbackId: 'fallback-remittances-unclear',
            count: 2,
            fallbackCount: 1,
            answerCount: 1,
          }),
        ],
      }
    )

    const written = JSON.parse(await readFile(absoluteOutPath, 'utf8')) as { orgId: string; sourceCollection: string }
    assert.equal(written.orgId, 'org-test')
    assert.equal(written.sourceCollection, 'organizations/org-test/supportBotQuestions')
    assert.equal(report.orgId, 'org-test')
    assert.equal(absoluteOutPath, join(cwd, 'reports', 'bot-top-problems.json'))
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
