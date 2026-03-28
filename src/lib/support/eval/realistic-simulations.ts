import { orchestrator } from '../engine/orchestrator'
import { containsProceduralFreeform } from '../engine/policy'
import type { KBCard } from '../load-kb'
import type { KbLang } from '../bot-retrieval'
import type { IntentClassifier } from '../engine/retrieval'
import type { SupportContext } from '../support-context'

type SimulationIntentType = 'operational' | 'informational'

export interface SupportSimulationCase {
  id: string
  lang: KbLang
  question: string
  expectedCardId: string
  expectedMode?: 'card' | 'fallback'
  intentType?: SimulationIntentType
  expectedDecisionReasonIncludes?: string
  expectSpecificCase?: boolean
  supportContext?: SupportContext
}

export interface SupportSimulationFailure {
  caseId: string
  lang: KbLang
  question: string
  expectedCardId: string
  actualCardId: string
  expectedMode: 'card' | 'fallback'
  actualMode: 'card' | 'fallback'
  reason: string
  decisionReason?: string
}

export interface SupportSimulationMetrics {
  total: number
  exactCardHits: number
  exactModeHits: number
  qualityPasses: number
  exactCardAccuracy: number
  exactModeAccuracy: number
  qualityPassRate: number
}

export interface SupportSimulationResult {
  metrics: SupportSimulationMetrics
  failures: SupportSimulationFailure[]
}

function inferExpectedMode(testCase: SupportSimulationCase): 'card' | 'fallback' {
  if (testCase.expectedMode) return testCase.expectedMode
  if (testCase.expectedCardId === 'fallback-no-answer' || testCase.expectedCardId === 'clarify-disambiguation') {
    return 'fallback'
  }
  return 'card'
}

const CA_CASES: SupportSimulationCase[] = [
  { id: 'ca-project-open-grant', lang: 'ca', question: 'com obro un projecte de subvenció?', expectedCardId: 'project-open' },
  { id: 'ca-project-open-campaign', lang: 'ca', question: 'vull entrar al projecte de captació', expectedCardId: 'project-open' },
  { id: 'ca-project-create', lang: 'ca', question: 'com creo un projecte nou', expectedCardId: 'guide-projects' },
  { id: 'ca-project-assign-expense', lang: 'ca', question: 'com reparteixo una despesa entre dos projectes', expectedCardId: 'guide-projects' },
  { id: 'ca-bank-import-duplicates', lang: 'ca', question: 'he pujat dues vegades l extracte del banc', expectedCardId: 'howto-import-safe-duplicates' },
  { id: 'ca-bank-import-csv', lang: 'ca', question: 'com carrego el csv del banc', expectedCardId: 'guide-import-movements' },
  { id: 'ca-bank-import-returns-file', lang: 'ca', question: 'com entro els rebuts retornats del banc', expectedCardId: 'howto-import-bank-returns' },
  { id: 'ca-bank-returns-process', lang: 'ca', question: 'tinc devolucions bancàries, què faig?', expectedCardId: 'guide-returns' },
  { id: 'ca-attach-payroll', lang: 'ca', question: 'on adjunto una nòmina', expectedCardId: 'guide-attach-document' },
  { id: 'ca-attach-proof', lang: 'ca', question: 'com pujo un justificant a un moviment', expectedCardId: 'guide-attach-document' },
  { id: 'ca-member-create', lang: 'ca', question: 'vull donar d alta un soci', expectedCardId: 'howto-member-create' },
  { id: 'ca-donor-update-iban', lang: 'ca', question: 'com canvio l IBAN d un soci', expectedCardId: 'howto-donor-update-iban' },
  { id: 'ca-donor-update-fee', lang: 'ca', question: 'com actualitzo la quota d un soci', expectedCardId: 'howto-donor-update-fee' },
  { id: 'ca-donor-paid-fees', lang: 'ca', question: 'on veig les quotes que ha pagat una sòcia', expectedCardId: 'manual-member-paid-quotas' },
  { id: 'ca-donor-reactivate', lang: 'ca', question: 'vull reactivar un donant', expectedCardId: 'guide-donor-reactivate' },
  { id: 'ca-donor-deactivate', lang: 'ca', question: 'com dono de baixa un donant', expectedCardId: 'guide-donor-inactive' },
  { id: 'ca-donor-export', lang: 'ca', question: 'com exporto els donants a excel', expectedCardId: 'howto-donor-export' },
  { id: 'ca-donor-history', lang: 'ca', question: 'com veig l historial d un donant', expectedCardId: 'howto-donor-history-summary' },
  { id: 'ca-reset-password', lang: 'ca', question: 'he oblidat la contrasenya', expectedCardId: 'guide-reset-password' },
  { id: 'ca-member-invite', lang: 'ca', question: 'com convido una companya nova a l app', expectedCardId: 'howto-member-invite' },
  { id: 'ca-member-permissions', lang: 'ca', question: 'com canvio els permisos d una usuària', expectedCardId: 'howto-member-user-permissions' },
  { id: 'ca-change-language', lang: 'ca', question: 'on canvio l idioma', expectedCardId: 'guide-change-language' },
  { id: 'ca-org-fiscal-data', lang: 'ca', question: 'on canvio les dades fiscals de l entitat', expectedCardId: 'howto-organization-fiscal-data' },
  { id: 'ca-model-182-generate', lang: 'ca', question: 'com genero el model 182', expectedCardId: 'guide-model-182-generate' },
  { id: 'ca-model-182-missing-donor', lang: 'ca', question: 'per què no surt un donant al 182', expectedCardId: 'ts-model-182-donor-missing', expectSpecificCase: true },
  { id: 'ca-model-347-generate', lang: 'ca', question: 'com genero el model 347', expectedCardId: 'guide-model-347' },
  { id: 'ca-donor-certificate', lang: 'ca', question: 'com envio el certificat de donacions', expectedCardId: 'guide-donor-certificate' },
  { id: 'ca-remittance-create-sepa', lang: 'ca', question: 'com creo una remesa sepa', expectedCardId: 'howto-remittance-create-sepa' },
  { id: 'ca-remittance-review-before-send', lang: 'ca', question: 'com reviso una remesa abans d enviar-la', expectedCardId: 'howto-remittance-review-before-send' },
  { id: 'ca-remittance-undo', lang: 'ca', question: 'com desfaig una remesa', expectedCardId: 'howto-remittance-undo' },
  { id: 'ca-remittance-split', lang: 'ca', question: 'tinc problemes per dividir una remesa', expectedCardId: 'guide-split-remittance' },
  { id: 'ca-remittance-delete-last', lang: 'ca', question: 'vull esborrar l última remesa', expectedCardId: 'guide-danger-delete-remittance' },
  { id: 'ca-danger-zone', lang: 'ca', question: 'què és la zona de perill', expectedCardId: 'manual-danger-zone', intentType: 'informational' },
  { id: 'ca-movement-split', lang: 'ca', question: 'com divideixo un moviment bancari', expectedCardId: 'howto-movement-split-amount' },
  { id: 'ca-movement-unassigned', lang: 'ca', question: 'tinc moviments sense assignar, on els veig?', expectedCardId: 'howto-movement-unassigned-alerts' },
  { id: 'ca-income-period', lang: 'ca', question: 'com miro els ingressos d aquest mes', expectedCardId: 'howto-dashboard-income-period' },
  { id: 'ca-closing-package', lang: 'ca', question: 'on trec el paquet de tancament', expectedCardId: 'manual-closing-package' },
  { id: 'ca-reports-export', lang: 'ca', question: 'com exporto un informe', expectedCardId: 'guide-reports' },
  { id: 'ca-login-access', lang: 'ca', question: 'no puc entrar a summa', expectedCardId: 'manual-login-access' },
  { id: 'ca-specific-remittance', lang: 'ca', question: 'aquesta remesa no em quadra', expectedCardId: 'fallback-no-answer', expectedMode: 'fallback', expectedDecisionReasonIncludes: 'specific_case', expectSpecificCase: true },
]

const ES_CASES: SupportSimulationCase[] = [
  { id: 'es-project-open-grant', lang: 'es', question: 'como abro un proyecto de subvencion', expectedCardId: 'project-open' },
  { id: 'es-project-open-campaign', lang: 'es', question: 'quiero entrar al proyecto de captacion', expectedCardId: 'project-open' },
  { id: 'es-project-create', lang: 'es', question: 'como creo un proyecto nuevo', expectedCardId: 'guide-projects' },
  { id: 'es-project-assign-expense', lang: 'es', question: 'como reparto un gasto entre dos proyectos', expectedCardId: 'guide-projects' },
  { id: 'es-bank-import-duplicates', lang: 'es', question: 'he subido dos veces el extracto del banco', expectedCardId: 'howto-import-safe-duplicates' },
  { id: 'es-bank-import-csv', lang: 'es', question: 'como cargo el csv del banco', expectedCardId: 'guide-import-movements' },
  { id: 'es-bank-import-returns-file', lang: 'es', question: 'como meto los recibos devueltos del banco', expectedCardId: 'howto-import-bank-returns' },
  { id: 'es-bank-returns-process', lang: 'es', question: 'tengo devoluciones bancarias, que hago', expectedCardId: 'guide-returns' },
  { id: 'es-attach-payroll', lang: 'es', question: 'donde adjunto una nomina', expectedCardId: 'guide-attach-document' },
  { id: 'es-attach-proof', lang: 'es', question: 'como subo un justificante a un movimiento', expectedCardId: 'guide-attach-document' },
  { id: 'es-member-create', lang: 'es', question: 'quiero dar de alta un socio', expectedCardId: 'howto-member-create' },
  { id: 'es-donor-update-iban', lang: 'es', question: 'como cambio el iban de un socio', expectedCardId: 'howto-donor-update-iban' },
  { id: 'es-donor-update-fee', lang: 'es', question: 'como actualizo la cuota de un socio', expectedCardId: 'howto-donor-update-fee' },
  { id: 'es-donor-paid-fees', lang: 'es', question: 'donde veo las cuotas pagadas de una socia', expectedCardId: 'manual-member-paid-quotas' },
  { id: 'es-donor-reactivate', lang: 'es', question: 'quiero reactivar un donante', expectedCardId: 'guide-donor-reactivate' },
  { id: 'es-donor-deactivate', lang: 'es', question: 'como doy de baja un donante', expectedCardId: 'guide-donor-inactive' },
  { id: 'es-donor-export', lang: 'es', question: 'como exporto los donantes a excel', expectedCardId: 'howto-donor-export' },
  { id: 'es-donor-history', lang: 'es', question: 'como veo el historial de un donante', expectedCardId: 'howto-donor-history-summary' },
  { id: 'es-reset-password', lang: 'es', question: 'he olvidado la contraseña', expectedCardId: 'guide-reset-password' },
  { id: 'es-member-invite', lang: 'es', question: 'como invito a una compañera nueva a la app', expectedCardId: 'howto-member-invite' },
  { id: 'es-member-permissions', lang: 'es', question: 'como cambio los permisos de una usuaria', expectedCardId: 'howto-member-user-permissions' },
  { id: 'es-change-language', lang: 'es', question: 'donde cambio el idioma', expectedCardId: 'guide-change-language' },
  { id: 'es-org-fiscal-data', lang: 'es', question: 'donde cambio los datos fiscales de la entidad', expectedCardId: 'howto-organization-fiscal-data' },
  { id: 'es-model-182-generate', lang: 'es', question: 'como genero el modelo 182', expectedCardId: 'guide-model-182-generate' },
  { id: 'es-model-182-missing-donor', lang: 'es', question: 'por que no sale un donante en el 182', expectedCardId: 'ts-model-182-donor-missing', expectSpecificCase: true },
  { id: 'es-model-347-generate', lang: 'es', question: 'como genero el modelo 347', expectedCardId: 'guide-model-347' },
  { id: 'es-donor-certificate', lang: 'es', question: 'como envio el certificado de donaciones', expectedCardId: 'guide-donor-certificate' },
  { id: 'es-remittance-create-sepa', lang: 'es', question: 'como creo una remesa sepa', expectedCardId: 'howto-remittance-create-sepa' },
  { id: 'es-remittance-review-before-send', lang: 'es', question: 'como reviso una remesa antes de enviarla', expectedCardId: 'howto-remittance-review-before-send' },
  { id: 'es-remittance-undo', lang: 'es', question: 'como deshago una remesa', expectedCardId: 'howto-remittance-undo' },
  { id: 'es-remittance-split', lang: 'es', question: 'tengo problemas para dividir una remesa', expectedCardId: 'guide-split-remittance' },
  { id: 'es-remittance-delete-last', lang: 'es', question: 'quiero borrar la ultima remesa', expectedCardId: 'guide-danger-delete-remittance' },
  { id: 'es-danger-zone', lang: 'es', question: 'que es la zona de peligro', expectedCardId: 'manual-danger-zone', intentType: 'informational' },
  { id: 'es-movement-split', lang: 'es', question: 'como divido un movimiento bancario', expectedCardId: 'howto-movement-split-amount' },
  { id: 'es-movement-unassigned', lang: 'es', question: 'tengo movimientos sin asignar, donde los veo', expectedCardId: 'howto-movement-unassigned-alerts' },
  { id: 'es-income-period', lang: 'es', question: 'como miro los ingresos de este mes', expectedCardId: 'howto-dashboard-income-period' },
  { id: 'es-closing-package', lang: 'es', question: 'donde saco el paquete de cierre', expectedCardId: 'manual-closing-package' },
  { id: 'es-reports-export', lang: 'es', question: 'como exporto un informe', expectedCardId: 'guide-reports' },
  { id: 'es-login-access', lang: 'es', question: 'no puedo entrar en summa', expectedCardId: 'manual-login-access' },
  { id: 'es-specific-remittance', lang: 'es', question: 'esta remesa no me cuadra', expectedCardId: 'fallback-no-answer', expectedMode: 'fallback', expectedDecisionReasonIncludes: 'specific_case', expectSpecificCase: true },
  { id: 'es-year-end-fiscal', lang: 'es', question: 'como cierro el año fiscal', expectedCardId: 'guide-year-end-fiscal' },
]

const FOLLOW_UP_CASES: SupportSimulationCase[] = [
  {
    id: 'ca-followup-remittance-undo',
    lang: 'ca',
    question: 'i com la desfaig?',
    expectedCardId: 'howto-remittance-undo',
    expectedDecisionReasonIncludes: 'follow_up_direct_intent',
    supportContext: {
      screen: null,
      previousCardId: 'guide-split-remittance',
      recentTurns: [
        { role: 'user', text: 'tinc una remesa malament' },
        { role: 'bot', text: 'Pots revisar la remesa', cardId: 'guide-split-remittance', mode: 'card' },
      ],
    },
  },
  {
    id: 'ca-followup-import-movements',
    lang: 'ca',
    question: 'i com els importo?',
    expectedCardId: 'guide-import-movements',
    expectedDecisionReasonIncludes: 'follow_up_direct_intent',
    supportContext: {
      screen: null,
      previousCardId: 'guide-import-movements',
      recentTurns: [
        { role: 'user', text: 'tinc l extracte del banc en csv' },
        { role: 'bot', text: 'Et puc guiar amb l extracte', cardId: 'guide-import-movements', mode: 'card' },
      ],
    },
  },
  {
    id: 'ca-followup-user-permissions',
    lang: 'ca',
    question: 'i com li canvio permisos?',
    expectedCardId: 'howto-member-user-permissions',
    expectedDecisionReasonIncludes: 'follow_up_direct_intent',
    supportContext: {
      screen: null,
      previousCardId: 'howto-member-invite',
      recentTurns: [
        { role: 'user', text: 'vull convidar una companya nova' },
        { role: 'bot', text: 'Pots convidar-la des de membres', cardId: 'howto-member-invite', mode: 'card' },
      ],
    },
  },
  {
    id: 'es-followup-import-movements',
    lang: 'es',
    question: 'y ahora como los importo?',
    expectedCardId: 'guide-import-movements',
    expectedDecisionReasonIncludes: 'follow_up_direct_intent',
    supportContext: {
      screen: null,
      previousCardId: 'guide-import-movements',
      recentTurns: [
        { role: 'user', text: 'tengo el extracto del banco en csv' },
        { role: 'bot', text: 'Te guio con el extracto', cardId: 'guide-import-movements', mode: 'card' },
      ],
    },
  },
]

export const REALISTIC_SIMULATION_CASES: SupportSimulationCase[] = [
  ...CA_CASES,
  ...ES_CASES,
  ...FOLLOW_UP_CASES,
]

export async function evaluateRealisticSimulations(input: {
  cards: KBCard[]
  allowAiIntent?: boolean
  allowAiReformat?: boolean
  classifyIntent?: IntentClassifier
}): Promise<SupportSimulationResult> {
  const { cards, allowAiIntent = false, allowAiReformat = false, classifyIntent } = input
  const failures: SupportSimulationFailure[] = []

  let exactCardHits = 0
  let exactModeHits = 0
  let qualityPasses = 0

  for (const testCase of REALISTIC_SIMULATION_CASES) {
    const expectedMode = inferExpectedMode(testCase)
    const intentType = testCase.intentType ?? 'operational'
    const result = await orchestrator({
      message: testCase.question,
      kbLang: testCase.lang,
      cards,
      clarifyOptionIds: [],
      supportContext: testCase.supportContext,
      assistantTone: 'neutral',
      allowAiIntent,
      allowAiReformat,
      classifyIntent,
    })

    const exactCard = result.response.cardId === testCase.expectedCardId
    const exactMode = result.response.mode === expectedMode
    const qualityErrors: string[] = []

    if (!exactCard) {
      qualityErrors.push(`expected card "${testCase.expectedCardId}" got "${result.response.cardId}"`)
    }

    if (!exactMode) {
      qualityErrors.push(`expected mode "${expectedMode}" got "${result.response.mode}"`)
    }

    if (testCase.expectedDecisionReasonIncludes && !result.meta.decisionReason?.includes(testCase.expectedDecisionReasonIncludes)) {
      qualityErrors.push(`decisionReason "${result.meta.decisionReason ?? ''}" missing "${testCase.expectedDecisionReasonIncludes}"`)
    }

    if (testCase.expectSpecificCase && !result.meta.specificCaseDetected) {
      qualityErrors.push('specific-case detection missing')
    }

    if (intentType === 'operational' && result.response.mode === 'card') {
      if (!result.response.answer.match(/(^|\n)1\.\s+/)) {
        qualityErrors.push('missing numbered steps')
      }
      if (result.response.uiPaths.length === 0) {
        qualityErrors.push('missing uiPaths')
      }
    }

    if (intentType === 'operational' && result.response.mode === 'fallback') {
      if (containsProceduralFreeform(result.response.answer)) {
        qualityErrors.push('fallback contains procedural freeform')
      }
      if (result.response.uiPaths.length === 0) {
        qualityErrors.push('fallback missing uiPaths')
      }
    }

    if (intentType === 'informational' && result.response.answer.trim().length === 0) {
      qualityErrors.push('empty informational answer')
    }

    if (exactCard) exactCardHits += 1
    if (exactMode) exactModeHits += 1

    if (qualityErrors.length === 0) {
      qualityPasses += 1
      continue
    }

    failures.push({
      caseId: testCase.id,
      lang: testCase.lang,
      question: testCase.question,
      expectedCardId: testCase.expectedCardId,
      actualCardId: result.response.cardId,
      expectedMode,
      actualMode: result.response.mode,
      reason: qualityErrors.join('; '),
      decisionReason: result.meta.decisionReason,
    })
  }

  const total = REALISTIC_SIMULATION_CASES.length

  return {
    metrics: {
      total,
      exactCardHits,
      exactModeHits,
      qualityPasses,
      exactCardAccuracy: total > 0 ? exactCardHits / total : 0,
      exactModeAccuracy: total > 0 ? exactModeHits / total : 0,
      qualityPassRate: total > 0 ? qualityPasses / total : 0,
    },
    failures,
  }
}
