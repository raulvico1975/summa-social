export type SupportIntent =
  | 'stripe_imputation'
  | 'split_remittance'
  | 'returns_management'
  | 'fiscal_model_182'
  | 'donation_certificates'
  | 'sepa_collection'
  | 'permissions'
  | 'documents_pending'
  | 'unknown'

export type SupportIntentDomain =
  | 'stripe'
  | 'remittances'
  | 'returns'
  | 'fiscal'
  | 'sepa'
  | 'permissions'
  | 'documents'
  | 'general'

export type IntentNormalizationResult = {
  intent: SupportIntent
  confidence: number
  domain: SupportIntentDomain | null
  reason: string
  matchedTerms: string[]
}

type IntentDefinition = {
  intent: Exclude<SupportIntent, 'unknown'>
  domain: SupportIntentDomain
  strong: string[]
  weak: string[]
  incompatible?: string[]
}

const DEFINITIONS: IntentDefinition[] = [
  {
    intent: 'stripe_imputation',
    domain: 'stripe',
    strong: [
      'stripe',
      'payout',
      'abonament stripe',
      'abono stripe',
      'ingres stripe',
      'ingreso stripe',
      'transferencia stripe',
      'imputar stripe',
      'dividir payout',
      'abonament',
      'abono',
      'ingres',
      'ingreso',
    ],
    weak: ['donacio online', 'donacion online', 'targeta', 'tarjeta', 'csv stripe', 'comissions'],
  },
  {
    intent: 'split_remittance',
    domain: 'remittances',
    strong: [
      'remesa',
      'dividir remesa',
      'separar remesa',
      'quotes banc',
      'cuotas banco',
      'rebut domiciliat',
      'recibo domiciliado',
      'dividir',
      'divideixo',
      'divido',
      'quotes',
      'cuotas',
    ],
    weak: ['sepa', 'socis', 'socios', 'cobrament', 'cobro', 'matching'],
    incompatible: ['stripe', 'payout'],
  },
  {
    intent: 'returns_management',
    domain: 'returns',
    strong: ['devolucio', 'devolucion', 'retorn', 'retorno', 'rebut retornat', 'recibo devuelto'],
    weak: ['impagat', 'impagado', 'banc', 'banco'],
  },
  {
    intent: 'fiscal_model_182',
    domain: 'fiscal',
    strong: ['model 182', 'modelo 182', '182', 'aeat', 'hisenda', 'hacienda'],
    weak: ['fiscal', 'donant', 'donante', 'declaracio', 'declaracion'],
  },
  {
    intent: 'donation_certificates',
    domain: 'fiscal',
    strong: ['certificat donacio', 'certificado donacion', 'certificat donatius', 'certificado donativos'],
    weak: ['certificat', 'certificado', 'donant', 'donante'],
  },
  {
    intent: 'sepa_collection',
    domain: 'sepa',
    strong: ['remesa sepa', 'pain008', 'pain 008', 'xml sepa', 'cobrament sepa', 'cobro sepa'],
    weak: ['sepa', 'banc', 'banco', 'quotes', 'cuotas'],
  },
  {
    intent: 'permissions',
    domain: 'permissions',
    strong: ['permisos', 'permis', 'permiso', 'rol usuari', 'rol usuario', 'accessos', 'accesos'],
    weak: ['seguretat', 'seguridad', 'usuari', 'usuario', 'convidar', 'invitar'],
  },
  {
    intent: 'documents_pending',
    domain: 'documents',
    strong: ['documents pendents', 'documentos pendientes', 'pujar factura', 'subir factura', 'adjuntar document'],
    weak: ['factura', 'rebut', 'recibo', 'nomina', 'ticket', 'document'],
  },
]

export function normalizeIntentText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function termMatches(normalizedMessage: string, term: string): boolean {
  const normalizedTerm = normalizeIntentText(term)
  if (!normalizedTerm) return false
  return ` ${normalizedMessage} `.includes(` ${normalizedTerm} `)
}

function scoreDefinition(normalizedMessage: string, definition: IntentDefinition): {
  score: number
  maxScore: number
  matchedTerms: string[]
  penalties: string[]
} {
  let score = 0
  const matchedTerms: string[] = []
  const penalties: string[] = []

  for (const term of definition.strong) {
    if (!termMatches(normalizedMessage, term)) continue
    score += term.includes(' ') ? 4 : 3
    matchedTerms.push(term)
  }

  for (const term of definition.weak) {
    if (!termMatches(normalizedMessage, term)) continue
    score += term.includes(' ') ? 2 : 1
    matchedTerms.push(term)
  }

  for (const term of definition.incompatible ?? []) {
    if (!termMatches(normalizedMessage, term)) continue
    score -= 5
    penalties.push(term)
  }

  return {
    score,
    maxScore: 8,
    matchedTerms,
    penalties,
  }
}

export function normalizeSupportIntent(message: string): IntentNormalizationResult {
  const normalizedMessage = normalizeIntentText(message)
  if (!normalizedMessage) {
    return {
      intent: 'unknown',
      confidence: 0,
      domain: null,
      reason: 'empty_message',
      matchedTerms: [],
    }
  }

  const scored = DEFINITIONS
    .map(definition => {
      const result = scoreDefinition(normalizedMessage, definition)
      return {
        definition,
        ...result,
        confidence: Math.max(0, Math.min(0.99, result.score / result.maxScore)),
      }
    })
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  if (!best || best.score <= 0 || best.confidence < 0.5) {
    return {
      intent: 'unknown',
      confidence: 0,
      domain: null,
      reason: 'no_reliable_intent',
      matchedTerms: [],
    }
  }

  const penaltyReason = best.penalties.length ? ` penalty:${best.penalties.join('+')}` : ''
  return {
    intent: best.definition.intent,
    confidence: Number(best.confidence.toFixed(2)),
    domain: best.definition.domain,
    reason: `matched:${best.matchedTerms.join('+')}${penaltyReason}`,
    matchedTerms: best.matchedTerms,
  }
}

export function supportIntentToCardAdjustment(intent: IntentNormalizationResult, cardId: string): {
  score: number
  reason: string | null
} {
  if (intent.intent === 'stripe_imputation') {
    if (cardId === 'guide-stripe-donations') return { score: 90, reason: 'intent_boost:stripe_imputation' }
    if (cardId === 'guide-split-remittance') return { score: -110, reason: 'intent_penalty:stripe_not_remittance' }
  }

  if (intent.intent === 'split_remittance') {
    if (cardId === 'guide-split-remittance') return { score: 50, reason: 'intent_boost:split_remittance' }
    if (cardId === 'guide-stripe-donations') return { score: -70, reason: 'intent_penalty:remittance_not_stripe' }
  }

  return { score: 0, reason: null }
}
