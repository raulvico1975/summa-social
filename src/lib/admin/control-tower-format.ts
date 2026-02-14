const DAY_MS = 24 * 60 * 60 * 1000

function isFiniteDate(date: Date): boolean {
  return Number.isFinite(date.getTime())
}

export function toDateOrNull(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const date = new Date(iso)
  return isFiniteDate(date) ? date : null
}

export function daysSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  const date = toDateOrNull(iso)
  if (!date) return null
  return Math.floor((now.getTime() - date.getTime()) / DAY_MS)
}

export function formatRelativeActivity(iso: string | null | undefined, now: Date = new Date()): string {
  const days = daysSince(iso, now)
  if (days === null) return 'sense activitat'
  if (days <= 0) return 'avui'
  if (days === 1) return 'fa 1 dia'
  return `fa ${days} dies`
}

export function formatDateForAdmin(iso: string | null | undefined): string {
  const date = toDateOrNull(iso)
  if (!date) return '—'

  return date.toLocaleDateString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
