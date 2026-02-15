import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CONCURRENT_EDIT_CODE,
  applyGuidePatchByNamespace,
  applyGuidePatchToI18nObject,
  isConcurrentEditError,
  normalizeStorageWriteError,
} from '../editorial/i18n-storage-patch'

test('applyGuidePatchToI18nObject no toca claus d altres guies', () => {
  const existingJson: Record<string, string> = {
    'guides.firstDay.title': 'Titol A vell',
    'guides.firstDay.stepByStep.0': 'Pas A vell',
    'guides.firstDay.commonErrors.0': 'Error A vell',
    'guides.secondGuide.title': 'Titol B',
    'guides.thirdGuide.title': 'Titol C',
    'guides.cta.firstDay': 'CTA A vell',
    'guides.cta.secondGuide': 'CTA B',
    'guides.cta.thirdGuide': 'CTA C',
    'other.key': 'valor extern',
  }

  const flatPatch: Record<string, string> = {
    'guides.firstDay.title': 'Titol A nou',
    'guides.firstDay.stepByStep.0': 'Pas A nou',
    'guides.firstDay.howToCheck.0': 'Comprova A nou',
    'guides.cta.firstDay': 'CTA A nou',
  }

  const next = applyGuidePatchToI18nObject({
    existingJson,
    guideId: 'firstDay',
    flatPatch,
  })

  assert.equal(next['guides.firstDay.title'], 'Titol A nou')
  assert.equal(next['guides.firstDay.stepByStep.0'], 'Pas A nou')
  assert.equal(next['guides.firstDay.commonErrors.0'], undefined)
  assert.equal(next['guides.cta.firstDay'], 'CTA A nou')

  assert.equal(next['guides.secondGuide.title'], 'Titol B')
  assert.equal(next['guides.thirdGuide.title'], 'Titol C')
  assert.equal(next['guides.cta.secondGuide'], 'CTA B')
  assert.equal(next['guides.cta.thirdGuide'], 'CTA C')
  assert.equal(next['other.key'], 'valor extern')
})

test('normalizeStorageWriteError detecta ifGenerationMatch i mapeja a CONCURRENT_EDIT', () => {
  const normalized = normalizeStorageWriteError({
    code: 412,
    message: 'conditionNotMet',
  })

  assert.ok(isConcurrentEditError(normalized))
  assert.equal((normalized as { code?: string }).code, CONCURRENT_EDIT_CODE)
})

test('applyGuidePatchByNamespace sobre guidesDraft no toca guides publicades', () => {
  const existingJson: Record<string, string> = {
    'guides.firstDay.title': 'Publicat',
    'guides.cta.firstDay': 'CTA publicat',
    'guidesDraft.firstDay.title': 'Draft vell',
    'guidesDraft.firstDay.stepByStep.0': 'Draft pas vell',
  }

  const next = applyGuidePatchByNamespace({
    existingJson,
    guideId: 'firstDay',
    namespace: 'guidesDraft',
    flatPatch: {
      'guidesDraft.firstDay.title': 'Draft nou',
      'guidesDraft.firstDay.stepByStep.0': 'Draft pas nou',
    },
  })

  assert.equal(next['guides.firstDay.title'], 'Publicat')
  assert.equal(next['guides.cta.firstDay'], 'CTA publicat')
  assert.equal(next['guidesDraft.firstDay.title'], 'Draft nou')
  assert.equal(next['guidesDraft.firstDay.stepByStep.0'], 'Draft pas nou')
})
