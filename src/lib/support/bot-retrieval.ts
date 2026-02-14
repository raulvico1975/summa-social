import type { KBCard } from './load-kb'

const DIRECT_MATCH_THRESHOLD = 30
const CLARIFY_MIN_SCORE = 18
const CLARIFY_MAX_GAP = 16

export type KbLang = 'ca' | 'es'

export type RetrievalResult = {
  card: KBCard
  mode: 'card' | 'fallback'
  clarifyOptions?: KBCard[]
}

const STOPWORDS = new Set([
  // CA
  'com', 'que', 'quin', 'quina', 'quins', 'quines', 'de', 'del', 'dels', 'la', 'el', 'els', 'les',
  'un', 'una', 'uns', 'unes', 'al', 'als', 'a', 'i', 'o', 'en', 'per', 'amb', 'sense',
  'es', 'mes', 'més', 'entre', 'dun', "d'un", 'sobre', 'fer', 'faig',
  // ES
  'como', 'qué', 'que', 'cual', 'cuál', 'de', 'del', 'la', 'el', 'los', 'las',
  'un', 'una', 'unos', 'unas', 'al', 'a', 'y', 'o', 'en', 'por', 'con', 'sin',
  'es', 'entre', 'sobre', 'hacer',
])

function normalizePlain(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalize(text: string): string[] {
  return normalizePlain(text)
    .split(/[\s,;:.!?¿¡()\[\]{}"']+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t))
}

function levenshteinDistance(a: string, b: string, maxDistance = 1): number {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1

  const prev = new Array(b.length + 1).fill(0).map((_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    let minInRow = curr[0]

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const val = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      )
      curr.push(val)
      if (val < minInRow) minInRow = val
    }

    if (minInRow > maxDistance) return maxDistance + 1
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }

  return prev[b.length]
}

function isApproxTokenMatch(token: string, candidate: string): boolean {
  if (token === candidate) return true
  if (token.length < 4 || candidate.length < 4) return false
  if (Math.abs(token.length - candidate.length) > 1) return false
  return levenshteinDistance(token, candidate, 1) <= 1
}

function scoreCard(tokens: string[], normalizedMessage: string, card: KBCard, lang: KbLang): number {
  let score = 0
  const intents = (card.intents?.[lang] ?? []).map(normalizePlain).filter(Boolean)
  const title = normalizePlain(card.title?.[lang] ?? '')
  const keywords = (card.keywords ?? []).map(normalizePlain).filter(Boolean)
  const errorKey = normalizePlain(card.error_key ?? '')
  const intentTokens = intents.flatMap(intent => intent.split(' ').filter(Boolean))
  const keywordTokens = keywords.flatMap(kw => kw.split(' ').filter(Boolean))

  for (const intent of intents) {
    if (intent.length > 3 && normalizedMessage.includes(intent)) {
      score += 90
    }
  }

  for (const keyword of keywords) {
    if (keyword.length > 2 && normalizedMessage.includes(keyword)) {
      score += 35
    }
  }

  if (title && normalizedMessage.includes(title)) {
    score += 45
  }

  if (errorKey && normalizedMessage.includes(errorKey)) {
    score += 20
  }

  for (const token of tokens) {
    for (const intent of intents) {
      if (intent.includes(token)) {
        score += 50
        break
      }
    }

    for (const intentToken of intentTokens) {
      if (isApproxTokenMatch(token, intentToken)) {
        score += 25
        break
      }
    }

    for (const keyword of keywords) {
      if (
        keyword === token ||
        token.includes(keyword) ||
        keyword.includes(token)
      ) {
        score += 20
        break
      }
    }

    for (const keywordToken of keywordTokens) {
      if (isApproxTokenMatch(token, keywordToken)) {
        score += 10
        break
      }
    }

    if (title.includes(token)) {
      score += 10
    }

    if (errorKey) {
      if (errorKey.includes(token) || token.includes(errorKey)) {
        score += 5
      }
    }
  }

  return score
}

function detectFallbackDomain(tokens: string[]): string {
  const joined = tokens.join(' ')

  if (/fiscal|182|347|aeat|hisenda|hacienda|certificat|certificado|model|modelo/.test(joined)) {
    return 'fallback-fiscal-unclear'
  }
  if (/sepa|pain|pain008|pain001|domiciliacio|xml|banc|banco/.test(joined)) {
    return 'fallback-sepa-unclear'
  }
  if (/remesa|remesas|quotes|cuotas|dividir|processar|procesar|desfer|deshacer/.test(joined)) {
    return 'fallback-remittances-unclear'
  }
  if (/esborrar|borrar|eliminar|perill|peligro|irreversible|superadmin/.test(joined)) {
    return 'fallback-danger-unclear'
  }

  return 'fallback-no-answer'
}

function findGenericFallback(cards: KBCard[]): KBCard | null {
  return cards.find(c => c.id === 'fallback-no-answer') ?? null
}

function isRetrievableCard(card: KBCard): boolean {
  if (card.type === 'fallback') return false
  // Safety: ignore corrupted guide cards (import mistakes).
  if (card.id.startsWith('guide-') && !card.guideId) return false
  return true
}

export function retrieveCard(message: string, lang: KbLang, cards: KBCard[]): RetrievalResult {
  const tokens = normalize(message)
  const normalizedMessage = normalizePlain(message)

  const regularCards = cards.filter(isRetrievableCard)
  const ranked = regularCards
    .map(card => ({
      card,
      score: scoreCard(tokens, normalizedMessage, card, lang),
    }))
    .sort((a, b) => b.score - a.score)

  const best = ranked[0]
  const second = ranked[1]

  if (best && best.score >= DIRECT_MATCH_THRESHOLD) {
    return { card: best.card, mode: 'card' }
  }

  if (
    best &&
    second &&
    best.score >= CLARIFY_MIN_SCORE &&
    second.score >= CLARIFY_MIN_SCORE &&
    best.score - second.score <= CLARIFY_MAX_GAP
  ) {
    const genericFallback = findGenericFallback(cards)
    if (genericFallback) {
      return {
        card: genericFallback,
        mode: 'fallback',
        clarifyOptions: [best.card, second.card],
      }
    }
  }

  const fallbackId = detectFallbackDomain(tokens)
  const fallbackCard = cards.find(c => c.id === fallbackId)
  if (fallbackCard) {
    return { card: fallbackCard, mode: 'fallback' }
  }

  const genericFallback = findGenericFallback(cards)
  if (genericFallback) {
    return { card: genericFallback, mode: 'fallback' }
  }

  if (cards[0]) {
    return { card: cards[0], mode: 'fallback' }
  }

  throw new Error('No KB cards available for retrieval')
}
