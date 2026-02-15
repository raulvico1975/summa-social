import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWeeklyTasks,
  canCloseChecklistWeek,
  getIsoWeekId,
} from '../editorial/weekly-checklist'

test('getIsoWeekId retorna format estable YYYY-Www', () => {
  const weekId = getIsoWeekId(new Date('2026-02-15T12:00:00.000Z'))
  assert.match(weekId, /^\d{4}-W\d{2}$/)
})

test('canCloseChecklistWeek bloqueja tancament si falta decisio', () => {
  const tasks = buildWeeklyTasks({
    coverage: {
      totalGuides: 40,
      fullyPublishedGuides: 12,
      guidesWithDraft: 6,
      missingPublishedByLang: { ca: 5, es: 7, fr: 9, pt: 11 },
    },
    translationReviewPendingCount: 3,
    guidesWithDraftCount: 6,
    topTopics: [],
  })

  const canCloseEmpty = canCloseChecklistWeek({ tasks, decisions: {} })
  assert.equal(canCloseEmpty, false)

  const decisions: Record<string, { decision: 'done' | 'postponed' | 'discarded'; note: string; decidedBy: string; decidedAtIso: string }> = {}
  for (const task of tasks) {
    decisions[task.id] = {
      decision: 'done',
      note: '',
      decidedBy: 'uid',
      decidedAtIso: new Date().toISOString(),
    }
  }

  const canCloseDone = canCloseChecklistWeek({ tasks, decisions })
  assert.equal(canCloseDone, true)
})

test('canCloseChecklistWeek exigeix motiu en ajornat o descartat', () => {
  const tasks = buildWeeklyTasks({
    coverage: {
      totalGuides: 10,
      fullyPublishedGuides: 5,
      guidesWithDraft: 2,
      missingPublishedByLang: { ca: 1, es: 1, fr: 1, pt: 1 },
    },
    translationReviewPendingCount: 0,
    guidesWithDraftCount: 2,
    topTopics: [],
  })

  const decisions: Record<string, { decision: 'done' | 'postponed' | 'discarded'; note: string; decidedBy: string; decidedAtIso: string }> = {}
  for (const task of tasks) {
    decisions[task.id] = {
      decision: 'done',
      note: '',
      decidedBy: 'uid',
      decidedAtIso: new Date().toISOString(),
    }
  }

  const firstTaskId = tasks[0]?.id ?? 'coverage'
  decisions[firstTaskId] = {
    decision: 'postponed',
    note: '',
    decidedBy: 'uid',
    decidedAtIso: new Date().toISOString(),
  }

  assert.equal(canCloseChecklistWeek({ tasks, decisions }), false)

  decisions[firstTaskId] = {
    decision: 'postponed',
    note: 'No hi ha finestra aquesta setmana',
    decidedBy: 'uid',
    decidedAtIso: new Date().toISOString(),
  }

  assert.equal(canCloseChecklistWeek({ tasks, decisions }), true)
})
