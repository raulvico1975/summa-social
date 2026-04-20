import test from 'node:test'
import assert from 'node:assert/strict'

import { loadAllCards } from '../support/load-kb'
import { detectSmallTalkResponse, retrieveCard } from '../support/bot-retrieval'

const cards = loadAllCards()

type RetrievalCase = {
  expectedCardId: string
  variants: string[]
}

const LOT_ONE_CASES: RetrievalCase[] = [
  {
    expectedCardId: 'kb-dashboard-balance-mismatch',
    variants: [
      'Per què el saldo del dashboard no em quadra amb el del banc?',
      'saldo dashboard diferent banc',
      'el dashborad no em cuadra amb el banc',
    ],
  },
  {
    expectedCardId: 'guide-import-movements',
    variants: [
      "He importat l'extracte i em falten moviments.",
      'falten moviments import banc',
      "he importat l extracta i no veig tots els moviments",
    ],
  },
  {
    expectedCardId: 'kb-remittance-member-missing',
    variants: [
      'Per què aquest soci no entra a la remesa?',
      'soci no surt remesa',
      'aquest soci no entra a la remessa',
    ],
  },
  {
    expectedCardId: 'kb-project-expense-unassign',
    variants: [
      'Com desfaig una imputació a projecte?',
      'treure despesa del projecte',
      'he imputat malament una despesa al proyecte com ho desfaig',
    ],
  },
  {
    expectedCardId: 'guide-edit-movement',
    variants: [
      'He categoritzat un moviment malament.',
      'canviar categoria moviment',
      'e categorizat malament el moviment',
    ],
  },
  {
    expectedCardId: 'guide-attach-document',
    variants: [
      'He pujat un document al moviment equivocat.',
      'moure factura a un altre moviment',
      'he adjuntat el justificant al movimient que no tocava',
    ],
  },
  {
    expectedCardId: 'howto-movement-unassigned-alerts',
    variants: [
      'On veig els moviments pendents de categoritzar?',
      'moviments sense categoritzar on',
      'on estan els moviments pendents de categorisar',
    ],
  },
  {
    expectedCardId: 'ts-import-overlap',
    variants: [
      "Què vol dir l'avís de dates solapades?",
      'moviments solapats import',
      'com sap el sistema si hi han moviments solapats',
    ],
  },
  {
    expectedCardId: 'guide-donor-certificate',
    variants: [
      'Com envio els certificats a tots?',
      'enviar certificats donants',
      'vull enviar els certificats a tots els donans per email',
    ],
  },
  {
    expectedCardId: 'manual-guides-hub',
    variants: [
      "Porta'm al lloc exacte dins l'app.",
      'on es fa aixo',
      "no trobo on es fa aquò dins l'app",
    ],
  },
]

for (const retrievalCase of LOT_ONE_CASES) {
  test(`top10 lot1 routes all variants to ${retrievalCase.expectedCardId}`, () => {
    for (const variant of retrievalCase.variants) {
      assert.equal(
        detectSmallTalkResponse(variant, 'ca'),
        null,
        `unexpected smalltalk match for "${variant}"`
      )

      const result = retrieveCard(variant, 'ca', cards)
      assert.equal(result.mode, 'card', `expected card mode for "${variant}"`)
      assert.equal(result.card.id, retrievalCase.expectedCardId, `unexpected card for "${variant}"`)
    }
  })
}
