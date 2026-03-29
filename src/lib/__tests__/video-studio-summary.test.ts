import { strict as assert } from 'node:assert'
import test from 'node:test'
import { buildVideoStudioSummary } from '../video-studio/summary'

test('buildVideoStudioSummary reads the current studio foundation', () => {
  const summary = buildVideoStudioSummary(process.cwd())

  assert.ok(summary.interfaceRecommendation.primary.length > 0)
  assert.equal(summary.telegramRecommendation.recommended, false)
  assert.ok(summary.brands.some((brand) => brand.id === 'summa'))
  assert.ok(summary.presets.some((preset) => preset.id === 'landing-hero'))
  assert.ok(summary.projects.some((project) => project.slug === 'summa-home-promo'))
  assert.ok(summary.starterPrompts.length >= 3)
})
