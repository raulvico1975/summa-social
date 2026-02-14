import test from 'node:test'
import assert from 'node:assert/strict'
import { daysSince, formatDateForAdmin, formatRelativeActivity } from '../admin/control-tower-format'

test('daysSince returns null for invalid dates and integer day diff for valid date', () => {
  const now = new Date('2026-02-14T12:00:00.000Z')
  assert.equal(daysSince(null, now), null)
  assert.equal(daysSince('invalid-date', now), null)
  assert.equal(daysSince('2026-02-12T10:00:00.000Z', now), 2)
})

test('formatRelativeActivity renders Catalan relative labels', () => {
  const now = new Date('2026-02-14T12:00:00.000Z')
  assert.equal(formatRelativeActivity('2026-02-14T10:00:00.000Z', now), 'avui')
  assert.equal(formatRelativeActivity('2026-02-13T10:00:00.000Z', now), 'fa 1 dia')
  assert.equal(formatRelativeActivity('2026-02-10T10:00:00.000Z', now), 'fa 4 dies')
  assert.equal(formatRelativeActivity(null, now), 'sense activitat')
})

test('formatDateForAdmin renders dd/mm/yyyy or placeholder', () => {
  assert.equal(formatDateForAdmin('2026-02-14T00:00:00.000Z'), '14/02/2026')
  assert.equal(formatDateForAdmin('not-a-date'), '—')
  assert.equal(formatDateForAdmin(null), '—')
})
