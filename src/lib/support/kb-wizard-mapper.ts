import { createHash } from 'crypto'
import type { KBCard } from './load-kb'
import { inferQuestionDomain, suggestKeywordsFromMessage } from './bot-retrieval'

export type WizardMode = 'from_unanswered' | 'manual'

export type WizardCardInput = {
  mode: WizardMode
  questionCa: string
  questionEs?: string
  answerCa: string
  answerEs?: string
  cardId?: string
}

export type WizardCardResolved = {
  card: KBCard
  detected: {
    domain: string
    risk: string
    safetyLabel: string
  }
}

const TROUBLESHOOTING_RE = /\b(error|errores|errada|falla|falla\b|bloquejat|bloqueado|no funciona|invalid|inv\w+|problema)\b/i

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function slugify(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function makeShortHash(seed: string): string {
  return createHash('sha1').update(seed).digest('hex').slice(0, 6)
}

function toKebabId(value: string): string {
  const slug = slugify(value)
  return slug || 'kb-card'
}

export function generateUniqueCardId(args: {
  baseText: string
  existingIds: Set<string>
  fixedSeed?: string
}): string {
  const base = toKebabId(args.baseText).slice(0, 54)
  if (!args.existingIds.has(base)) return base

  const seed = args.fixedSeed ?? `${args.baseText}:${Date.now()}:${Math.random()}`
  const candidate = `${base.slice(0, 47)}-${makeShortHash(seed)}`
  if (!args.existingIds.has(candidate)) return candidate

  for (let i = 0; i < 20; i++) {
    const tryId = `${base.slice(0, 45)}-${makeShortHash(`${seed}:${i}`)}`
    if (!args.existingIds.has(tryId)) return tryId
  }

  return `${base.slice(0, 40)}-${Date.now().toString(36).slice(-6)}`
}

function resolveType(questionCa: string, answerCa: string): KBCard['type'] {
  const body = `${questionCa} ${answerCa}`
  if (TROUBLESHOOTING_RE.test(body)) return 'troubleshooting'
  return 'howto'
}

function resolveDomain(domain: ReturnType<typeof inferQuestionDomain>): KBCard['domain'] {
  if (domain === 'danger') return 'superadmin'
  if (domain === 'general') return 'general'
  return domain
}

function resolveRiskPolicy(domain: KBCard['domain']): {
  risk: KBCard['risk']
  guardrail: KBCard['guardrail']
  answerMode: KBCard['answerMode']
  safetyLabel: string
} {
  if (domain === 'fiscal') {
    return {
      risk: 'guarded',
      guardrail: 'b1_fiscal',
      answerMode: 'limited',
      safetyLabel: 'Consulta sensible: resposta orientativa per seguretat.',
    }
  }

  if (domain === 'sepa') {
    return {
      risk: 'guarded',
      guardrail: 'b1_sepa',
      answerMode: 'limited',
      safetyLabel: 'Consulta sensible: revisa amb calma abans de confirmar cap fitxer.',
    }
  }

  if (domain === 'remittances') {
    return {
      risk: 'guarded',
      guardrail: 'b1_remittances',
      answerMode: 'limited',
      safetyLabel: 'Consulta sensible: millor orientació pas a pas i validació final.',
    }
  }

  if (domain === 'superadmin') {
    return {
      risk: 'guarded',
      guardrail: 'b1_danger',
      answerMode: 'limited',
      safetyLabel: 'Acció sensible de SuperAdmin: resposta prudent i verificable.',
    }
  }

  return {
    risk: 'safe',
    guardrail: 'none',
    answerMode: 'full',
    safetyLabel: 'Consulta estàndard: resposta completa.',
  }
}

function inferUiPaths(domain: KBCard['domain']): string[] {
  if (domain === 'fiscal') return ['Informes']
  if (domain === 'sepa' || domain === 'remittances') return ['Moviments > Remeses']
  if (domain === 'superadmin') return ['Admin > SuperAdmin']
  if (domain === 'documents') return ['Moviments > Documents']
  if (domain === 'projects') return ['Projectes']
  return ['Dashboard > ? (Hub de Guies)']
}

function buildTitle(question: string): string {
  const clean = normalizeText(question)
  if (clean.length <= 80) return clean
  return `${clean.slice(0, 77).trim()}...`
}

export function resolveWizardCard(args: {
  input: WizardCardInput
  existingIds: Set<string>
  fallbackCardId?: string
}): WizardCardResolved {
  const questionCa = normalizeText(args.input.questionCa)
  const questionEs = normalizeText(args.input.questionEs || args.input.questionCa)
  const answerCa = normalizeText(args.input.answerCa)
  const answerEs = normalizeText(args.input.answerEs || args.input.answerCa)

  const givenId = normalizeText(args.input.cardId ?? args.fallbackCardId ?? '')
  const cardId = givenId
    ? toKebabId(givenId)
    : generateUniqueCardId({
        baseText: questionCa,
        existingIds: args.existingIds,
      })

  const detectedDomain = resolveDomain(inferQuestionDomain(questionCa || questionEs))
  const policy = resolveRiskPolicy(detectedDomain)
  const keywords = Array.from(new Set(suggestKeywordsFromMessage(`${questionCa} ${questionEs}`, 10)))

  const card: KBCard = {
    id: cardId,
    type: resolveType(questionCa, answerCa),
    domain: detectedDomain,
    risk: policy.risk,
    guardrail: policy.guardrail,
    answerMode: policy.answerMode,
    title: {
      ca: buildTitle(questionCa),
      es: buildTitle(questionEs),
    },
    intents: {
      ca: [questionCa],
      es: [questionEs],
    },
    guideId: null,
    answer: {
      ca: answerCa,
      es: answerEs,
    },
    uiPaths: inferUiPaths(detectedDomain),
    needsSnapshot: false,
    keywords,
    related: [],
    error_key: null,
    symptom: {
      ca: null,
      es: null,
    },
  }

  return {
    card,
    detected: {
      domain: detectedDomain,
      risk: policy.risk,
      safetyLabel: policy.safetyLabel,
    },
  }
}

export function toHumanTopicLabel(domain: string): string {
  if (domain === 'fiscal') return 'Fiscal'
  if (domain === 'sepa') return 'SEPA'
  if (domain === 'remittances') return 'Remeses'
  if (domain === 'superadmin') return 'SuperAdmin'
  if (domain === 'transactions') return 'Moviments'
  if (domain === 'donors') return 'Donants'
  if (domain === 'config') return 'Configuració'
  if (domain === 'documents') return 'Documents'
  if (domain === 'projects') return 'Projectes'
  return 'General'
}
