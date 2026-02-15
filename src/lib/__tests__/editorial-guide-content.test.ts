import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDraftFlatPatch,
  buildPublishedFlatPatch,
  readGuidePatchFromFlat,
} from '../editorial/guide-content'

function buildPatch() {
  return {
    title: 'Primer dia de posada en marxa',
    whatHappens:
      'Quan inicies Summa, cal definir dades base i validar moviments per evitar errors de conciliacio i informes inconsistents.',
    stepByStep: [
      'Configura dades basiques de l entitat abans de treballar amb moviments.',
      'Importa un extracte curt i valida la correspondencia de contactes i categories.',
    ],
    commonErrors: [
      'No revisis tot l historic el primer dia: pot generar soroll i bloquejos de decisio.',
    ],
    howToCheck: [
      'Contrasta totals de la pantalla principal amb extractes reals del banc.',
    ],
    whenToEscalate: [
      'Escala quan hi ha descuadres persistents o permisos insuficients per corregir dades.',
    ],
    cta: 'Obre la guia completa',
  }
}

test('buildPublishedFlatPatch escriu claus noves i legacy amb cardText compatible', () => {
  const flat = buildPublishedFlatPatch({
    guideId: 'firstDay',
    lang: 'ca',
    patch: buildPatch(),
  })

  assert.equal(flat['guides.firstDay.title'], 'Primer dia de posada en marxa')
  assert.equal(flat['guides.firstDay.summary'].length > 0, true)
  assert.equal(flat['guides.firstDay.intro'].length > 0, true)
  assert.equal(flat['guides.firstDay.whatIs'].length > 0, true)
  assert.equal(flat['guides.firstDay.steps.0'].length > 0, true)
  assert.equal(flat['guides.firstDay.lookFirst.0'].length > 0, true)
  assert.equal(flat['guides.firstDay.checkBeforeExport.0'].length > 0, true)
  assert.equal(flat['guides.firstDay.avoid.0'].length > 0, true)
  assert.equal(flat['guides.cta.firstDay'], 'Obre la guia completa')

  const cardText = flat['guides.firstDay.cardText']
  assert.match(cardText, /Què vol dir:/i)
  assert.match(cardText, /Pas a pas:/i)
  assert.match(cardText, /Segurament t'ajudarà:/i)
  assert.match(cardText, /→/)
})

test('buildDraftFlatPatch escriu exclusivament namespace guidesDraft', () => {
  const flat = buildDraftFlatPatch({
    guideId: 'firstDay',
    patch: buildPatch(),
  })

  assert.equal(flat['guidesDraft.firstDay.title'].length > 0, true)
  assert.equal(flat['guidesDraft.firstDay.stepByStep.0'].length > 0, true)
  assert.equal(flat['guidesDraft.firstDay.cta'].length > 0, true)
  assert.equal(Object.keys(flat).some(key => key.startsWith('guides.firstDay.')), false)
})

test('readGuidePatchFromFlat llegeix fallback legacy quan no hi ha claus noves', () => {
  const source: Record<string, string> = {
    'guides.firstDay.title': 'Titol legacy',
    'guides.firstDay.summary': 'Resum legacy per explicar que passa.',
    'guides.firstDay.steps.0': 'Pas 1 legacy',
    'guides.firstDay.avoid.0': 'Error comu legacy',
    'guides.firstDay.checkBeforeExport.0': 'Comprova legacy',
    'guides.firstDay.notResolved.0': 'Escala legacy',
    'guides.cta.firstDay': 'CTA legacy',
  }

  const parsed = readGuidePatchFromFlat({
    source,
    guideId: 'firstDay',
    namespace: 'guides',
  })

  assert.ok(parsed)
  assert.equal(parsed?.title, 'Titol legacy')
  assert.equal(parsed?.whatHappens, 'Resum legacy per explicar que passa.')
  assert.deepEqual(parsed?.stepByStep, ['Pas 1 legacy'])
  assert.deepEqual(parsed?.commonErrors, ['Error comu legacy'])
  assert.deepEqual(parsed?.howToCheck, ['Comprova legacy'])
  assert.deepEqual(parsed?.whenToEscalate, ['Escala legacy'])
  assert.equal(parsed?.cta, 'CTA legacy')
})
