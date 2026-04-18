import { existsSync } from 'node:fs'
import path from 'node:path'

import type { NativeBlogPost } from '@/lib/editorial-native/types'

const DEFAULT_REFERENCE_LIBRARY_DIR = path.join(process.cwd(), 'public', 'visuals', 'web')

export type NativeBlogCoverPreset = {
  id:
    | 'stripe_identification'
    | 'receipt_returns'
    | 'remittances_split'
    | 'bank_reconciliation'
    | 'certificates_182'
    | 'fiscal_closure'
    | 'operational_criteria'
    | 'generic_operational'
  filename: string
  sceneDirection: string
  referenceNames: string[]
}

export type NativeBlogCoverPlan = {
  preset: NativeBlogCoverPreset
  filename: string
  sceneDirection: string
  referenceNames: string[]
  referencePaths: string[]
}

type PresetDefinition = NativeBlogCoverPreset & {
  signals: Array<{
    pattern: RegExp
    weight: number
  }>
}

const PRESET_DEFINITIONS: PresetDefinition[] = [
  {
    id: 'stripe_identification',
    filename: 'web_pagos_online_identificacion_automatica.png',
    sceneDirection:
      'Composicion horizontal muy limpia. A la izquierda, un modulo simple de pagos online o cobro digital. En el centro, un punto de identificacion o clasificacion. A la derecha, 2 o 3 carpetas o fichas individuales de personas donantes. Todo conectado por una sola linea fluida, continua y elegante.',
    referenceNames: ['web_divideix_stripe_ca.webp', 'web_divideix_remeses_ca.webp'],
    signals: [
      { pattern: /stripe/, weight: 8 },
      { pattern: /checkout/, weight: 6 },
      { pattern: /(pagament online|pago online|pagos online)/, weight: 6 },
      { pattern: /(identificaci[oó]n autom[aà]tica|identificacion automatica)/, weight: 4 },
      { pattern: /(cobro digital|pasarela de pago)/, weight: 4 },
    ],
  },
  {
    id: 'receipt_returns',
    filename: 'web_devolucion_recibos_estado_real.png',
    sceneDirection:
      'Composicion horizontal. A la izquierda, un grupo de recibos o cargos. En el centro, un punto de revision sereno. A la derecha, 2 o 3 documentos o fichas de estado que muestran que cada recibo acaba en una situacion clara. Debe transmitir que el valor no esta en volver a cobrar, sino en saber que ha pasado.',
    referenceNames: ['web_divideix_remeses_ca.webp', 'web_concilia_bancaria_ca.webp'],
    signals: [
      { pattern: /(devoluci|retorn|devuelto)/, weight: 8 },
      { pattern: /(rebut|recibo)/, weight: 6 },
      { pattern: /(estado real|que ha pasado|que ha passat)/, weight: 5 },
      { pattern: /(incidenc|trazabilidad|tra[cç]abilitat)/, weight: 3 },
    ],
  },
  {
    id: 'remittances_split',
    filename: 'web_remesas_bancarias_desglose.png',
    sceneDirection:
      'Composicion horizontal y panoramica. A la izquierda, un bloque de remesas o recibos agrupados. En el centro, una bifurcacion limpia o un punto de reparto. A la derecha, 2 o 3 documentos individuales asociados a personas socias o donantes. Todo unido por una linea continua con pequenos acentos azules en nodos clave.',
    referenceNames: ['web_divideix_remeses_ca.webp', 'web_concilia_bancaria_ca.webp'],
    signals: [
      { pattern: /(remes|remesa)/, weight: 8 },
      { pattern: /sepa/, weight: 6 },
      { pattern: /(quota|cuota)/, weight: 4 },
      { pattern: /(domicili|domiciliaci[oó]n)/, weight: 4 },
    ],
  },
  {
    id: 'certificates_182',
    filename: 'web_certificados_modelo_182.png',
    sceneDirection:
      'Composicion horizontal muy ordenada. A la izquierda, un conjunto de donaciones o aportaciones. En el centro, uno o dos certificados. A la derecha, un documento fiscal final. La linea que une todo debe sugerir continuidad, trazabilidad y criterio sin parecer un formulario real.',
    referenceNames: ['web_certificats_182_ca.webp', 'web_concilia_bancaria_ca.webp'],
    signals: [
      { pattern: /(model 182)/, weight: 9 },
      { pattern: /(certificat|certificado)/, weight: 7 },
      { pattern: /(donaci[oó]n|donacio|aportaci[oó]|aportacio)/, weight: 5 },
      { pattern: /(mecenatge|mecenazgo)/, weight: 5 },
    ],
  },
  {
    id: 'fiscal_closure',
    filename: 'web_cierre_fiscal_ordenado.png',
    sceneDirection:
      'Composicion horizontal de cierre limpio. Varias piezas administrativas avanzan hacia un sistema claro y bien resuelto. Debe comunicar prevision, orden y criterio, sin exceso de detalle ni burocracia literal.',
    referenceNames: ['web_certificats_182_ca.webp', 'web_concilia_bancaria_ca.webp'],
    signals: [
      { pattern: /(aeat|agencia tributaria|hisenda|hacienda)/, weight: 8 },
      { pattern: /(fiscal|tancament|cierre)/, weight: 5 },
      { pattern: /(auditoria|auditor[ií]a)/, weight: 5 },
      { pattern: /(model 347)/, weight: 6 },
    ],
  },
  {
    id: 'bank_reconciliation',
    filename: 'web_conciliacion_bancaria_ordenada.png',
    sceneDirection:
      'Composicion horizontal. A la izquierda, 2 o 3 movimientos o cuentas bancarias muy simplificados. En el centro, una linea fluida de paso y validacion. A la derecha, un sistema organizado con resultados, categorias o conciliacion automatica. El foco es el orden que aparece despues del movimiento.',
    referenceNames: ['web_concilia_bancaria_ca.webp', 'web_divideix_remeses_ca.webp'],
    signals: [
      { pattern: /(concili|conciliaci[oó]n)/, weight: 8 },
      { pattern: /(moviment|movimiento)/, weight: 5 },
      { pattern: /(banc|banco|cuenta bancaria)/, weight: 4 },
    ],
  },
  {
    id: 'operational_criteria',
    filename: 'web_criterio_operativo_compartido.png',
    sceneDirection:
      'Composicion horizontal estable. Varias piezas de trabajo administrativo o documental avanzan con una sola linea continua hacia un estado mas claro y ordenado. Debe hacer visible la idea de criterio compartido, calma y continuidad operativa.',
    referenceNames: ['web_concilia_bancaria_ca.webp', 'web_divideix_remeses_ca.webp'],
    signals: [
      { pattern: /(criteri|criterio)/, weight: 5 },
      { pattern: /(operati|operativ)/, weight: 4 },
      { pattern: /(equip|equipo)/, weight: 3 },
      { pattern: /(excel|fricci|fricci[oó]n)/, weight: 3 },
      { pattern: /(continuidad operativa|criterio compartido)/, weight: 5 },
    ],
  },
]

const GENERIC_PRESET: NativeBlogCoverPreset = {
  id: 'generic_operational',
  filename: 'web_orden_y_criterio.png',
  sceneDirection:
    'Composicion horizontal panoramica con 2, 3 o 4 bloques conectados por una sola linea continua. Debe representar orden, preparacion, criterio y calma operativa, con un antes, un punto de transformacion y un despues claros.',
  referenceNames: ['web_concilia_bancaria_ca.webp', 'web_divideix_remeses_ca.webp'],
}

function getReferenceLibraryDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.BLOG_IMAGE_REFERENCE_LIBRARY_DIR?.trim() || DEFAULT_REFERENCE_LIBRARY_DIR
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function sanitizeFilenameSegment(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function buildFallbackFilename(post: NativeBlogPost): string {
  const fallback = sanitizeFilenameSegment(post.draft.title || post.idea.prompt || '')
    .split('_')
    .filter(Boolean)
    .slice(0, 4)
    .join('_')

  return fallback ? `web_${fallback}.png` : GENERIC_PRESET.filename
}

function collectPostImageContext(post: NativeBlogPost): string {
  return [
    post.draft.title,
    post.draft.excerpt,
    post.idea.prompt,
    post.idea.problem,
    post.idea.objective,
    post.draft.category,
    post.draft.contentMarkdown,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function resolveNativeBlogCoverPlan(
  post: NativeBlogPost,
  env: NodeJS.ProcessEnv = process.env,
): NativeBlogCoverPlan {
  const context = collectPostImageContext(post)
  const rankedPreset = PRESET_DEFINITIONS
    .map((candidate) => ({
      candidate,
      score: candidate.signals.reduce(
        (total, signal) => total + (signal.pattern.test(context) ? signal.weight : 0),
        0,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)[0]

  const preset = rankedPreset?.candidate || GENERIC_PRESET
  const filename = preset.id === 'generic_operational' ? buildFallbackFilename(post) : preset.filename
  const libraryDir = getReferenceLibraryDir(env)
  const referencePaths = preset.referenceNames
    .map((referenceName) => path.join(libraryDir, referenceName))
    .filter((referencePath, index, all) => all.indexOf(referencePath) === index)
    .filter((referencePath) => existsSync(referencePath))

  return {
    preset,
    filename,
    sceneDirection: preset.sceneDirection,
    referenceNames: preset.referenceNames,
    referencePaths,
  }
}
