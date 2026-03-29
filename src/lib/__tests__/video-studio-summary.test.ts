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
  assert.ok(summary.projects.some((project) => project.slug === 'summa-conciliacio-landing'))
  assert.ok(summary.starterPrompts.length >= 3)
  assert.equal(summary.paths.nonTechnicalGuide, 'docs/operations/VIDEO-STUDIO-US-NO-TECNIC.md')

  const publishedProject = summary.projects.find((project) => project.slug === 'summa-conciliacio-landing')
  assert.ok(publishedProject)
  assert.equal(publishedProject?.workflow.published, true)
  assert.ok((publishedProject?.nextAction.label.length ?? 0) > 0)
  assert.ok((publishedProject?.paths.publicDir?.length ?? 0) > 0)

  const draftProject = summary.projects.find((project) => project.slug === 'summa-home-promo')
  assert.ok(draftProject)
  assert.equal(draftProject?.status, 'draft')
  assert.ok(draftProject?.diagnostics.some((diagnostic) => diagnostic.level === 'warn'))
})
