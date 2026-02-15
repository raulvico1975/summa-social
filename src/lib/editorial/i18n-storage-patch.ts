import { getStorage } from 'firebase-admin/storage'
import { getAdminApp } from '@/lib/api/admin-sdk'

export type I18nLang = 'ca' | 'es' | 'fr' | 'pt'

export const CONCURRENT_EDIT_CODE = 'CONCURRENT_EDIT'

export class ConcurrentEditError extends Error {
  readonly code = CONCURRENT_EDIT_CODE

  constructor(message = 'Recarrega i torna a publicar') {
    super(message)
    this.name = 'ConcurrentEditError'
  }
}

function getConfiguredBucketName(): string {
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

  if (!bucketName) {
    throw new Error('Missing FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET')
  }

  return bucketName
}

function getI18nFile(lang: I18nLang) {
  const app = getAdminApp()
  const bucketName = getConfiguredBucketName()
  return getStorage(app).bucket(bucketName).file(`i18n/${lang}.json`)
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isGenerationMismatchError(error: unknown): boolean {
  const err = error as { code?: unknown; message?: unknown; details?: unknown }
  const code = typeof err.code === 'number' ? err.code : null
  const message = typeof err.message === 'string' ? err.message : ''
  const details = typeof err.details === 'string' ? err.details : ''
  const combined = `${message} ${details}`.toLowerCase()

  if (code === 412) return true
  return (
    combined.includes('conditionnotmet') ||
    combined.includes('precondition') ||
    combined.includes('ifgenerationmatch') ||
    combined.includes('412')
  )
}

export function normalizeStorageWriteError(error: unknown): Error {
  if (isGenerationMismatchError(error)) {
    return new ConcurrentEditError()
  }

  if (error instanceof Error) return error
  return new Error(String(error))
}

export function isConcurrentEditError(error: unknown): error is ConcurrentEditError {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  const name = (error as { name?: unknown }).name
  return code === CONCURRENT_EDIT_CODE || name === 'ConcurrentEditError'
}

export async function readI18nJsonWithGeneration(
  lang: I18nLang
): Promise<{ data: Record<string, string>; generation: string }> {
  const file = getI18nFile(lang)
  const [exists] = await file.exists()
  if (!exists) {
    throw new Error(`i18n/${lang}.json no existeix a Storage`)
  }

  const [rawData] = await file.download()
  const parsed = JSON.parse(rawData.toString('utf-8')) as unknown
  if (!isPlainRecord(parsed)) {
    throw new Error(`i18n/${lang}.json no es un objecte JSON valid`)
  }

  const data: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      data[key] = value
    }
  }

  const [metadata] = await file.getMetadata()
  const generation = metadata.generation
  if (!generation) {
    throw new Error(`i18n/${lang}.json sense generation`)
  }

  return { data, generation: String(generation) }
}

export function applyGuidePatchToI18nObject(args: {
  existingJson: Record<string, string>
  guideId: string
  flatPatch: Record<string, string>
}): Record<string, string> {
  const { existingJson, guideId, flatPatch } = args
  return applyGuidePatchByNamespace({
    existingJson,
    guideId,
    flatPatch,
    namespace: 'guides',
  })
}

export function applyGuidePatchByNamespace(args: {
  existingJson: Record<string, string>
  guideId: string
  flatPatch: Record<string, string>
  namespace: 'guides' | 'guidesDraft'
}): Record<string, string> {
  const { existingJson, guideId, flatPatch, namespace } = args
  const prefix = `${namespace}.${guideId}.`
  const ctaKey = namespace === 'guides' ? `guides.cta.${guideId}` : null

  const next: Record<string, string> = {}

  for (const [key, value] of Object.entries(existingJson)) {
    if (key.startsWith(prefix)) continue
    if (ctaKey && key === ctaKey) continue
    next[key] = value
  }

  for (const [key, value] of Object.entries(flatPatch)) {
    next[key] = value
  }

  const sortedKeys = Object.keys(next).sort()
  const sorted: Record<string, string> = {}
  for (const key of sortedKeys) {
    sorted[key] = next[key]
  }

  return sorted
}

export async function writeI18nJsonWithGenerationMatch(
  lang: I18nLang,
  nextJson: Record<string, string>,
  generation: string
): Promise<void> {
  const file = getI18nFile(lang)
  const generationNumber = Number(generation)
  if (!Number.isFinite(generationNumber)) {
    throw new Error(`generation invalida per ${lang}`)
  }

  try {
    await file.save(JSON.stringify(nextJson, null, 2), {
      contentType: 'application/json',
      preconditionOpts: {
        ifGenerationMatch: generationNumber,
      },
    })
  } catch (error) {
    throw normalizeStorageWriteError(error)
  }
}
