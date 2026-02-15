import test from 'node:test'
import assert from 'node:assert/strict'
import { runGuidePublishGate } from '../editorial/guide-publish-gate'

function buildValidPayload() {
  return {
    guideId: 'firstDay',
    patchByLang: {
      ca: {
        title: 'Primers passos de configuracio',
        whatHappens:
          'Quan entres a Summa per primer cop, el sistema necessita una revisio inicial per evitar errors de configuracio i moviments desquadrats.',
        stepByStep: [
          'Obre la pantalla principal, revisa banc i categories, i valida que les dades importades coincideixen amb el que tens al banc.',
        ],
        commonErrors: [
          'Un error habitual es no revisar els filtres i assumir que falten dades quan en realitat nomes estan amagades per data o compte.',
        ],
        howToCheck: [
          'Comprova que el resum de moviments, els totals i l estat de conciliacio mostren valors consistents amb els extractes reals.',
        ],
        whenToEscalate: [
          'Escala el cas si hi ha desquadres persistents, errors de permisos o imports repetits que no es poden corregir des de la vista habitual.',
        ],
        cta: 'Obre la guia completa',
      },
      es: {
        title: 'Primeros pasos de configuracion',
        whatHappens:
          'Cuando entras en Summa por primera vez, el sistema necesita una revision inicial para evitar errores de configuracion y movimientos descuadrados.',
        stepByStep: [
          'Abre la pantalla principal, revisa banco y categorias, y valida que los datos importados coinciden con lo que tienes en el banco.',
        ],
        commonErrors: [
          'Un error habitual es no revisar los filtros y asumir que faltan datos cuando en realidad solo estan ocultos por fecha o cuenta.',
        ],
        howToCheck: [
          'Comprueba que el resumen de movimientos, los totales y el estado de conciliacion muestran valores consistentes con los extractos reales.',
        ],
        whenToEscalate: [
          'Escala el caso si hay descuadres persistentes, errores de permisos o importes repetidos que no se pueden corregir desde la vista habitual.',
        ],
        cta: 'Abre la guia completa',
      },
      fr: {
        title: 'Guide des premiers controles',
        whatHappens:
          'Le controle initial est une etape cle, car la configuration avec des donnees inexactes peut provoquer des erreurs de suivi et de rapprochement.',
        stepByStep: [
          'Pour commencer, ouvre la vue principale avec les comptes et valide des montants avec les lignes importees avant de continuer.',
        ],
        commonErrors: [
          'Le cas frequent est la confusion des filtres, et pour cela une verification simple avec les periodes evite des conclusions fausses.',
        ],
        howToCheck: [
          'Pour verifier, compare les totaux de la plateforme avec des extraits bancaires, et confirme que la correspondance est stable.',
        ],
        whenToEscalate: [
          'Escalade avec une note claire si les montants divergent, si le flux est bloque ou si des permissions manquent apres verification.',
        ],
        cta: 'Ouvrir le guide complet',
      },
      pt: {
        title: 'Guia de verificacao inicial',
        whatHappens:
          'Para iniciar com seguranca, a configuracao deve ficar correta, com validacao de valores e sem diferencas que afetem a conciliacao.',
        stepByStep: [
          'Para comecar, abre a vista principal com contas e confere uma acao de validacao com os movimentos importados antes de seguir.',
        ],
        commonErrors: [
          'Um erro comum e nao revisar filtros, para evitar isso faz uma comparacao com extratos e confirma a organizacao da informacao.',
        ],
        howToCheck: [
          'Para validar com precisao, compara os totais com os extratos e verifica se nao existe variacao inesperada na conciliacao.',
        ],
        whenToEscalate: [
          'Escala para suporte quando nao for possivel corrigir a situacao, com descricao clara da acao feita e do impacto observado.',
        ],
        cta: 'Abrir guia completa',
      },
    },
  }
}

test('guide publish gate bloqueja guideId fora de cataleg', () => {
  const payload = buildValidPayload()
  payload.guideId = 'guide-que-no-existeix'

  const result = runGuidePublishGate(payload)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some(error => error.field === 'guideId' && error.rule === 'catalog'))
})

test('guide publish gate bloqueja FR copia literal de CA en un bloc', () => {
  const payload = buildValidPayload()
  payload.patchByLang.fr.stepByStep = [...payload.patchByLang.ca.stepByStep]

  const result = runGuidePublishGate(payload)
  assert.equal(result.ok, false)
  assert.ok(
    result.errors.some(error => error.field === 'fr.stepByStep' && error.rule === 'literal_copy')
  )
})

test('guide publish gate bloqueja placeholder prohibit', () => {
  const payload = buildValidPayload()
  payload.patchByLang.pt.commonErrors = ['TODO traduir aquest bloc abans de publicar amb detall valid']

  const result = runGuidePublishGate(payload)
  assert.equal(result.ok, false)
  assert.ok(
    result.errors.some(
      error => error.field === 'pt.commonErrors' && error.rule === 'placeholder_forbidden'
    )
  )
})

test('guide publish gate bloqueja FR/PT massa curt respecte CA', () => {
  const payload = buildValidPayload()
  payload.patchByLang.fr.howToCheck = [
    'Pour verifier la vue, compare des montants avec le compte.',
  ]

  const result = runGuidePublishGate(payload)
  assert.equal(result.ok, false)
  assert.ok(
    result.errors.some(error => error.field === 'fr.howToCheck' && error.rule === 'relative_length')
  )
})

test('guide publish gate accepta payload valid amb heuristiques FR/PT', () => {
  const payload = buildValidPayload()
  const result = runGuidePublishGate(payload)
  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
})
