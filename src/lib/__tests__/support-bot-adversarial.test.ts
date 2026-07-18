import assert from 'node:assert/strict'
import test from 'node:test'
import type { Firestore } from 'firebase-admin/firestore'

import { loadAllCards } from '../support/load-kb'
import { retrieveCard } from '../support/bot-retrieval'
import { resolveSupportLanguage } from '../support/language'
import {
  resolveSupportOrganizationId,
  SupportOrganizationResolutionError,
} from '../support/request-context'
import { orchestrator } from '../support/engine/orchestrator'

const cards = loadAllCards()

type AdversarialCase = {
  query: string
  lang: 'ca' | 'es'
  expectedCardId: string
  expectedMode?: 'card' | 'fallback'
}

const cases: AdversarialCase[] = [
  { query: 'Vull canviar les dades de la Maria a la seva fitxa', lang: 'ca', expectedCardId: 'howto-donor-update-details' },
  { query: 'He d’actualitzar les dades de Joan, on ho faig?', lang: 'ca', expectedCardId: 'howto-donor-update-details' },
  { query: 'Necesito cambiar los datos de María en su ficha', lang: 'es', expectedCardId: 'howto-donor-update-details' },
  { query: '¿Dónde modifico los datos de José?', lang: 'es', expectedCardId: 'howto-donor-update-details' },

  { query: 'El mes vinent passa de pagar 10 a 12 euros', lang: 'ca', expectedCardId: 'howto-donor-update-fee' },
  { query: 'A la Laia li apugem la quota mensual', lang: 'ca', expectedCardId: 'howto-donor-update-fee' },
  { query: 'El mes que viene pasa de pagar 10 a 12 euros', lang: 'es', expectedCardId: 'howto-donor-update-fee' },
  { query: 'Quiero subirle la cuota mensual a un socio', lang: 'es', expectedCardId: 'howto-donor-update-fee' },

  { query: 'Ja tinc les quotes: com faig el fitxer per al banc?', lang: 'ca', expectedCardId: 'howto-remittance-create-sepa' },
  { query: 'Necessito enviar al banc el fitxer de quotes', lang: 'ca', expectedCardId: 'howto-remittance-create-sepa' },
  { query: 'Ya tengo las cuotas, ¿cómo preparo el archivo del banco?', lang: 'es', expectedCardId: 'howto-remittance-create-sepa' },
  { query: 'Quiero generar el XML para cobrar las cuotas', lang: 'es', expectedCardId: 'howto-remittance-create-sepa' },

  { query: 'He processat la remesa abans d’hora i vull tornar enrere', lang: 'ca', expectedCardId: 'howto-remittance-undo' },
  { query: 'La remesa s’ha processat massa aviat, com la desfaig?', lang: 'ca', expectedCardId: 'howto-remittance-undo' },
  { query: 'He procesado la remesa antes de tiempo y quiero volver atrás', lang: 'es', expectedCardId: 'howto-remittance-undo' },
  { query: 'La remesa está procesada por error, ¿cómo la deshago?', lang: 'es', expectedCardId: 'howto-remittance-undo' },

  { query: 'He pagat una despesa en efectiu i no surt al banc', lang: 'ca', expectedCardId: 'howto-enter-expense' },
  { query: 'On entro un tiquet de caixa que no passa pel banc?', lang: 'ca', expectedCardId: 'howto-enter-expense' },
  { query: 'He pagado un gasto en efectivo y no sale en el banco', lang: 'es', expectedCardId: 'howto-enter-expense' },
  { query: '¿Dónde meto un ticket de caja fuera del banco?', lang: 'es', expectedCardId: 'howto-enter-expense' },

  { query: 'Vull que una voluntària només pugui veure i no tocar res', lang: 'ca', expectedCardId: 'howto-member-user-permissions' },
  { query: 'Un usuari ha de poder consultar però no editar', lang: 'ca', expectedCardId: 'howto-member-user-permissions' },
  { query: 'Quiero que una voluntaria solo pueda ver y no tocar nada', lang: 'es', expectedCardId: 'howto-member-user-permissions' },
  { query: 'Un usuario debe consultar pero no editar', lang: 'es', expectedCardId: 'howto-member-user-permissions' },

  { query: 'Aquesta donació desgrava? Què he de declarar?', lang: 'ca', expectedCardId: 'fallback-fiscal-unclear', expectedMode: 'fallback' },
  { query: 'Com calculo la deducció fiscal d’un donatiu?', lang: 'ca', expectedCardId: 'fallback-fiscal-unclear', expectedMode: 'fallback' },
  { query: '¿Esta donación desgrava? ¿Qué tengo que declarar?', lang: 'es', expectedCardId: 'fallback-fiscal-unclear', expectedMode: 'fallback' },
  { query: '¿Cómo calculo la deducción fiscal de un donativo?', lang: 'es', expectedCardId: 'fallback-fiscal-unclear', expectedMode: 'fallback' },

  { query: 'Un proveïdor supera 3.005 euros, surt al 347?', lang: 'ca', expectedCardId: 'guide-model-347' },
  { query: 'Què he de revisar abans de generar el 347?', lang: 'ca', expectedCardId: 'guide-model-347' },
  { query: 'Un proveedor supera 3.005 euros, ¿sale en el 347?', lang: 'es', expectedCardId: 'guide-model-347' },
  { query: '¿Qué reviso antes de generar el modelo 347?', lang: 'es', expectedCardId: 'guide-model-347' },

  { query: 'Treballo amb diverses organitzacions, com canvio d’una a l’altra?', lang: 'ca', expectedCardId: 'manual-multi-organization' },
  { query: 'On és el selector per canviar d’organització?', lang: 'ca', expectedCardId: 'manual-multi-organization' },
  { query: 'Trabajo con varias organizaciones, ¿cómo cambio de una a otra?', lang: 'es', expectedCardId: 'manual-multi-organization' },
  { query: '¿Dónde está el selector para cambiar de organización?', lang: 'es', expectedCardId: 'manual-multi-organization' },

  { query: 'Puc fer servir Summa des del mòbil?', lang: 'ca', expectedCardId: 'manual-mobile-usage' },
  { query: 'Summa funciona bé en un telèfon?', lang: 'ca', expectedCardId: 'manual-mobile-usage' },
  { query: '¿Puedo usar Summa desde el móvil?', lang: 'es', expectedCardId: 'manual-mobile-usage' },
  { query: '¿La aplicación funciona en una tablet?', lang: 'es', expectedCardId: 'manual-mobile-usage' },

  { query: 'Summa va molt lent i triga a carregar', lang: 'ca', expectedCardId: 'ts-slow-app' },
  { query: 'La pantalla tarda molt a respondre', lang: 'ca', expectedCardId: 'ts-slow-app' },
  { query: 'Summa va muy lento y tarda en cargar', lang: 'es', expectedCardId: 'ts-slow-app' },
  { query: 'La aplicación responde muy despacio', lang: 'es', expectedCardId: 'ts-slow-app' },

  { query: 'A la fitxa del Pere he de modificar les dades de contacte', lang: 'ca', expectedCardId: 'howto-donor-update-details' },
  { query: 'Com actualitzo les dades d’una sòcia sense crear-la de nou?', lang: 'ca', expectedCardId: 'howto-donor-update-details' },
  { query: 'En la ficha de Pedro tengo que modificar los datos de contacto', lang: 'es', expectedCardId: 'howto-donor-update-details' },
  { query: '¿Cómo actualizo los datos de una socia sin crearla otra vez?', lang: 'es', expectedCardId: 'howto-donor-update-details' },

  { query: 'Hem d’augmentar la quota d’en Pau', lang: 'ca', expectedCardId: 'howto-donor-update-fee' },
  { query: 'Com baixo l’import de la quota trimestral?', lang: 'ca', expectedCardId: 'howto-donor-update-fee' },
  { query: 'Tenemos que aumentar la cuota de Pablo', lang: 'es', expectedCardId: 'howto-donor-update-fee' },
  { query: '¿Cómo bajo el importe de la cuota trimestral?', lang: 'es', expectedCardId: 'howto-donor-update-fee' },

  { query: 'Les quotes estan preparades i ara necessito l’XML del banc', lang: 'ca', expectedCardId: 'howto-remittance-create-sepa' },
  { query: 'Quin fitxer envio al banc per cobrar les quotes?', lang: 'ca', expectedCardId: 'howto-remittance-create-sepa' },
  { query: 'Las cuotas están preparadas y ahora necesito el XML del banco', lang: 'es', expectedCardId: 'howto-remittance-create-sepa' },
  { query: '¿Qué archivo envío al banco para cobrar las cuotas?', lang: 'es', expectedCardId: 'howto-remittance-create-sepa' },

  { query: 'Remesa processada per error: la puc desfer?', lang: 'ca', expectedCardId: 'howto-remittance-undo' },
  { query: 'He generat la remesa massa aviat i he de tornar enrere', lang: 'ca', expectedCardId: 'howto-remittance-undo' },
  { query: 'Remesa procesada por error: ¿puedo deshacerla?', lang: 'es', expectedCardId: 'howto-remittance-undo' },
  { query: 'He generado la remesa demasiado pronto y debo volver atrás', lang: 'es', expectedCardId: 'howto-remittance-undo' },

  { query: 'Tinc una factura pagada en efectiu, on la registro?', lang: 'ca', expectedCardId: 'howto-enter-expense' },
  { query: 'Aquesta despesa de caixa no apareixerà al compte bancari', lang: 'ca', expectedCardId: 'howto-enter-expense' },
  { query: 'Tengo una factura pagada en efectivo, ¿dónde la registro?', lang: 'es', expectedCardId: 'howto-enter-expense' },
  { query: 'Este gasto de caja no aparecerá en la cuenta bancaria', lang: 'es', expectedCardId: 'howto-enter-expense' },

  { query: 'La voluntària ha de mirar dades sense poder editar-les', lang: 'ca', expectedCardId: 'howto-member-user-permissions' },
  { query: 'Necessito un usuari de només lectura', lang: 'ca', expectedCardId: 'howto-member-user-permissions' },
  { query: 'La voluntaria debe mirar datos sin poder editarlos', lang: 'es', expectedCardId: 'howto-member-user-permissions' },
  { query: 'Necesito un usuario de solo lectura', lang: 'es', expectedCardId: 'howto-member-user-permissions' },

  { query: 'Els donatius tributen o tenen deducció?', lang: 'ca', expectedCardId: 'fallback-fiscal-unclear', expectedMode: 'fallback' },
  { query: 'Quina deducció declaro per aquesta donació?', lang: 'ca', expectedCardId: 'fallback-fiscal-unclear', expectedMode: 'fallback' },
  { query: '¿Los donativos tributan o tienen deducción?', lang: 'es', expectedCardId: 'fallback-fiscal-unclear', expectedMode: 'fallback' },
  { query: '¿Qué deducción declaro por esta donación?', lang: 'es', expectedCardId: 'fallback-fiscal-unclear', expectedMode: 'fallback' },

  { query: 'El model 347 inclou operacions amb proveïdors?', lang: 'ca', expectedCardId: 'guide-model-347' },
  { query: 'On genero l’informe 347?', lang: 'ca', expectedCardId: 'guide-model-347' },
  { query: '¿El modelo 347 incluye operaciones con proveedores?', lang: 'es', expectedCardId: 'guide-model-347' },
  { query: '¿Dónde genero el informe 347?', lang: 'es', expectedCardId: 'guide-model-347' },

  { query: 'Puc tenir més d’una organització al mateix usuari?', lang: 'ca', expectedCardId: 'manual-multi-organization' },
  { query: 'Necessito alternar entre dues entitats', lang: 'ca', expectedCardId: 'manual-multi-organization' },
  { query: '¿Puedo tener más de una organización con el mismo usuario?', lang: 'es', expectedCardId: 'manual-multi-organization' },
  { query: 'Necesito alternar entre dos entidades', lang: 'es', expectedCardId: 'manual-multi-organization' },

  { query: 'Puc posar la quota d’un soci en pausa?', lang: 'ca', expectedCardId: 'howto-donor-pause-fee' },
  { query: 'Aquest mes no li hem de cobrar la quota', lang: 'ca', expectedCardId: 'howto-donor-pause-fee' },
  { query: '¿Puedo poner la cuota de un socio en pausa?', lang: 'es', expectedCardId: 'howto-donor-pause-fee' },
  { query: 'Este mes no debemos cobrarle la cuota', lang: 'es', expectedCardId: 'howto-donor-pause-fee' },

  { query: 'On poso la persona de contacte d’una empresa donant?', lang: 'ca', expectedCardId: 'howto-company-contact-person' },
  { query: 'Vull indicar qui és el contacte de l’empresa', lang: 'ca', expectedCardId: 'howto-company-contact-person' },
  { query: '¿Dónde pongo la persona de contacto de una empresa donante?', lang: 'es', expectedCardId: 'howto-company-contact-person' },
  { query: 'Quiero indicar quién es el contacto de la empresa', lang: 'es', expectedCardId: 'howto-company-contact-person' },

  { query: 'Com gestiono les donacions de Stripe?', lang: 'ca', expectedCardId: 'guide-stripe-donations' },
  { query: '¿Cómo gestiono las donaciones de Stripe?', lang: 'es', expectedCardId: 'guide-stripe-donations' },
  { query: 'Com reviso les dades fiscals d’un donant?', lang: 'ca', expectedCardId: 'howto-donor-fiscal-review' },
  { query: '¿Cómo reviso los datos fiscales de un donante?', lang: 'es', expectedCardId: 'howto-donor-fiscal-review' },
  { query: 'No puc esborrar moviments perquè estan assignats a projectes', lang: 'ca', expectedCardId: 'ts-blocked-by-project-links' },
  { query: 'No puedo borrar movimientos porque están asignados a proyectos', lang: 'es', expectedCardId: 'ts-blocked-by-project-links' },
  { query: 'Com començo a fer servir Summa Social?', lang: 'ca', expectedCardId: 'guide-first-day' },
  { query: '¿Cómo empiezo a usar Summa Social?', lang: 'es', expectedCardId: 'guide-first-day' },
  { query: 'Com assigno un moviment bancari?', lang: 'ca', expectedCardId: 'howto-assign-bank-movement' },
  { query: 'On poso la categoria i el contacte d’un moviment?', lang: 'ca', expectedCardId: 'howto-assign-bank-movement' },
  { query: '¿Cómo asigno un movimiento bancario?', lang: 'es', expectedCardId: 'howto-assign-bank-movement' },
  { query: '¿Dónde pongo la categoría y el contacto de un movimiento?', lang: 'es', expectedCardId: 'howto-assign-bank-movement' },
]

test('adversarial natural-language gate routes every CA/ES variant safely', () => {
  assert.equal(cases.length, 100)
  const failures = cases.flatMap(item => {
    const result = retrieveCard(item.query, item.lang, cards)
    const expectedMode = item.expectedMode ?? 'card'
    return result.card.id === item.expectedCardId && result.mode === expectedMode
      ? []
      : [{ query: item.query, expected: `${expectedMode}:${item.expectedCardId}`, actual: `${result.mode}:${result.card.id}` }]
  })

  assert.deepEqual(failures, [])
})

test('question language overrides the interface language for CA and ES', () => {
  const samples = [
    ['El mes que viene pasa de pagar 10 a 12 euros', 'ca', 'es'],
    ['He pagado un gasto en efectivo y no sale en el banco', 'ca', 'es'],
    ['Vull canviar les dades de la Maria', 'es', 'ca'],
    ['He pagat una despesa en efectiu i no surt al banc', 'es', 'ca'],
  ] as const

  for (const [message, uiLang, expected] of samples) {
    assert.equal(resolveSupportLanguage(message, uiLang).kbLang, expected, message)
  }
})

test('spanish answers and navigation paths are localized end to end', async () => {
  const result = await orchestrator({
    message: 'El mes que viene pasa de pagar 10 a 12 euros',
    kbLang: 'es',
    cards,
    clarifyOptionIds: [],
    assistantTone: 'neutral',
    allowAiIntent: false,
    allowAiReformat: false,
  })

  assert.equal(result.response.cardId, 'howto-donor-update-fee')
  assert.match(result.response.answer, /Para cambiar la cuota/)
  assert.ok(result.response.uiPaths.some(path => path.startsWith('Donantes > Ficha del donante')))
  assert.ok(result.response.uiPaths.every(path => !/Moviments|Donants|Configuració|Projectes/.test(path)))

  const troubleshooting = await orchestrator({
    message: 'La aplicación responde muy despacio',
    kbLang: 'es',
    cards,
    clarifyOptionIds: [],
    assistantTone: 'neutral',
    allowAiIntent: false,
    allowAiReformat: false,
  })
  assert.ok(troubleshooting.response.uiPaths.includes('Ayuda contextual'))
  assert.ok(troubleshooting.response.uiPaths.includes('Manual > Resolución de problemas'))
})

function fakeDb(documents: Record<string, { exists: boolean; data?: Record<string, unknown> }>): Firestore {
  return {
    doc(path: string) {
      return {
        async get() {
          const value = documents[path] ?? { exists: false }
          return { exists: value.exists, data: () => value.data }
        },
      }
    },
  } as unknown as Firestore
}

test('support organization resolution honors the visible slug and rejects mismatches', async () => {
  const db = fakeDb({
    'slugs/qa-ong-summa': { exists: true, data: { orgId: 'qa-ong-summa' } },
    'users/u1': { exists: true, data: { organizationId: 'baruma-id' } },
  })

  assert.equal(await resolveSupportOrganizationId({
    db,
    uid: 'u1',
    requestedOrganizationId: 'qa-ong-summa',
    requestedOrgSlug: 'qa-ong-summa',
  }), 'qa-ong-summa')

  await assert.rejects(
    resolveSupportOrganizationId({
      db,
      uid: 'u1',
      requestedOrganizationId: 'baruma-id',
      requestedOrgSlug: 'qa-ong-summa',
    }),
    SupportOrganizationResolutionError
  )
})

test('legacy organization fallback prefers defaultOrganizationId', async () => {
  const db = fakeDb({
    'users/u1': { exists: true, data: { defaultOrganizationId: 'flores-id', organizationId: 'baruma-id' } },
  })
  assert.equal(await resolveSupportOrganizationId({ db, uid: 'u1' }), 'flores-id')
})
