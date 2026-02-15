import type { GuideCoverageSummary } from '@/lib/editorial/guide-coverage'

export type EditorialChecklistDecision = 'done' | 'postponed' | 'discarded'

export type EditorialChecklistTask = {
  id: string
  title: string
  hint: string
  metric: number
  required: boolean
}

export type EditorialChecklistState = {
  weekId: string
  status: 'open' | 'closed'
  tasks: EditorialChecklistTask[]
  decisions: Record<
    string,
    {
      decision: EditorialChecklistDecision
      note: string
      decidedBy: string
      decidedAtIso: string
    }
  >
  canCloseWeek: boolean
}

export function getIsoWeekId(inputDate = new Date()): string {
  const date = new Date(Date.UTC(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function buildWeeklyTasks(args: {
  coverage: GuideCoverageSummary
  translationReviewPendingCount: number
  guidesWithDraftCount: number
  topTopics: string[]
}): EditorialChecklistTask[] {
  const { coverage, translationReviewPendingCount, guidesWithDraftCount, topTopics } = args

  const totalMissing = Object.values(coverage.missingPublishedByLang).reduce((acc, value) => acc + value, 0)
  const mainTopic = topTopics[0] ?? 'sense tema destacat'

  const tasks: EditorialChecklistTask[] = [
    {
      id: 'coverage',
      title: 'Cobertura de catàleg',
      hint: `Guies pendents en publicat: ${totalMissing}`,
      metric: totalMissing,
      required: true,
    },
    {
      id: 'drafts',
      title: 'Esborranys pendents',
      hint: `Guies amb draft actiu: ${guidesWithDraftCount}`,
      metric: guidesWithDraftCount,
      required: true,
    },
    {
      id: 'translations',
      title: 'Revisió de traduccions',
      hint: `Guies amb translationReviewPending: ${translationReviewPendingCount}`,
      metric: translationReviewPendingCount,
      required: true,
    },
    {
      id: 'bot-signals',
      title: 'Senyals del bot',
      hint: `Tema principal de la setmana: ${mainTopic}`,
      metric: topTopics.length,
      required: true,
    },
    {
      id: 'publish-rhythm',
      title: 'Ritme de publicació',
      hint: 'Decideix si aquesta setmana cal publicar, ajornar o descartar',
      metric: coverage.fullyPublishedGuides,
      required: true,
    },
  ]

  return tasks
}

export function canCloseChecklistWeek(args: {
  tasks: EditorialChecklistTask[]
  decisions: EditorialChecklistState['decisions']
}): boolean {
  const { tasks, decisions } = args
  for (const task of tasks) {
    if (!task.required) continue
    const decisionEntry = decisions[task.id]
    if (!decisionEntry) return false

    if (decisionEntry.decision === 'postponed' || decisionEntry.decision === 'discarded') {
      if (!decisionEntry.note?.trim()) return false
    }
  }
  return true
}
