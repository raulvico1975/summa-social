/**
 * Runtime KB Loader
 *
 * Loads the support bot KB deterministically from repository files only.
 *
 * @see src/lib/support/load-kb.ts — Filesystem loader
 */

import type { KBCard } from './load-kb'
import { loadAllCards } from './load-kb'
import { CONTEXT_HELP_UI_PATHS } from '@/help/help-manual-links'

type CachedKB = {
  cards: KBCard[]
}

let cached: CachedKB | null = null

const EMERGENCY_RUNTIME_CARD_IDS = new Set([
  'fallback-no-answer',
  'fallback-fiscal-unclear',
  'fallback-sepa-unclear',
  'fallback-remittances-unclear',
  'fallback-danger-unclear',
])

function buildEmergencyFallbackCards(): KBCard[] {
  const base = {
    type: 'fallback',
    domain: 'general',
    risk: 'safe',
    guardrail: 'none',
    answerMode: 'full',
    title: { ca: 'Fallback d’emergència', es: 'Fallback de emergencia' },
    intents: { ca: ['fallback'], es: ['fallback'] },
    guideId: null,
    uiPaths: [CONTEXT_HELP_UI_PATHS.ca, 'Manual > Resolució de problemes'],
    needsSnapshot: false,
    keywords: [],
    related: [],
    error_key: null,
    symptom: { ca: null, es: null },
  } as const satisfies Omit<KBCard, 'id' | 'answer'>

  return [
    {
      ...base,
      id: 'fallback-no-answer',
      answer: {
        ca: 'No he trobat informació exacta. Obre l’ajuda contextual de la pantalla o el manual abans de continuar.',
        es: 'No he encontrado información exacta. Abre la ayuda contextual de la pantalla o el manual antes de continuar.',
      },
    },
    {
      ...base,
      id: 'fallback-fiscal-unclear',
      domain: 'fiscal',
      risk: 'guarded',
      guardrail: 'b1_fiscal',
      answerMode: 'limited',
      answer: {
        ca: 'Consulta fiscal detectada. Revisa Informes i el manual fiscal corresponent abans de continuar.',
        es: 'Consulta fiscal detectada. Revisa Informes y el manual fiscal correspondiente antes de continuar.',
      },
    },
    {
      ...base,
      id: 'fallback-sepa-unclear',
      domain: 'sepa',
      risk: 'guarded',
      guardrail: 'b1_sepa',
      answerMode: 'limited',
      answer: {
        ca: 'Consulta SEPA detectada. Revisa Moviments i el manual abans de generar cap fitxer.',
        es: 'Consulta SEPA detectada. Revisa Movimientos y el manual antes de generar ningún fichero.',
      },
    },
    {
      ...base,
      id: 'fallback-remittances-unclear',
      domain: 'remittances',
      risk: 'guarded',
      guardrail: 'b1_remittances',
      answerMode: 'limited',
      answer: {
        ca: 'Consulta de remeses detectada. Revisa l’estat a Moviments i el manual abans de tocar res.',
        es: 'Consulta de remesas detectada. Revisa el estado en Movimientos y el manual antes de tocar nada.',
      },
    },
    {
      ...base,
      id: 'fallback-danger-unclear',
      domain: 'superadmin',
      risk: 'guarded',
      guardrail: 'b1_danger',
      answerMode: 'limited',
      answer: {
        ca: 'Acció sensible detectada. No facis canvis irreversibles sense revisar el manual i la pantalla correcta.',
        es: 'Acción sensible detectada. No hagas cambios irreversibles sin revisar el manual y la pantalla correcta.',
      },
    },
  ]
}

export function isEmergencyRuntimeKb(cards: KBCard[]): boolean {
  if (cards.length !== EMERGENCY_RUNTIME_CARD_IDS.size) return false
  return cards.every(card => card.type === 'fallback' && EMERGENCY_RUNTIME_CARD_IDS.has(card.id))
}

/**
 * Load KB cards from repository files only.
 * Cache stays in module memory for the lifetime of the process.
 */
export async function loadKbCards(): Promise<KBCard[]> {
  if (cached) {
    return cached.cards
  }

  const cards = loadAllCards()
  if (cards.length === 0) {
    console.error('[load-kb-runtime] Repository KB is empty, using emergency fallback dataset')
    const emergencyCards = buildEmergencyFallbackCards()
    cached = { cards: emergencyCards }
    return emergencyCards
  }

  cached = { cards }
  return cards
}
