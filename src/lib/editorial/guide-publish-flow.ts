import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/api/admin-sdk'
import {
  isConcurrentEditError,
  readI18nJsonWithGeneration,
  type I18nLang,
  writeI18nJsonWithGenerationMatch,
} from '@/lib/editorial/i18n-storage-patch'

export type PublishLang = I18nLang

const PUBLISH_WRITE_ORDER: PublishLang[] = ['fr', 'pt', 'es', 'ca']
const LOCK_DOC_PATH = 'system/editorialPublishLock'
const LOCK_TTL_MS = 30_000

export type I18nSnapshot = {
  data: Record<string, string>
  generation: string
}

export type I18nByLang = Record<PublishLang, I18nSnapshot>
export type I18nJsonByLang = Record<PublishLang, Record<string, string>>

export type FirestoreTransactionLike = {
  get: (ref: unknown) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>
  set: (ref: unknown, data: Record<string, unknown>, options?: { merge: boolean }) => void
}

export type FirestoreForLock = {
  doc: (path: string) => unknown
  runTransaction: <T>(updateFn: (tx: FirestoreTransactionLike) => Promise<T>) => Promise<T>
}

export class PublishLockedError extends Error {
  readonly code = 'PUBLISH_LOCKED'

  constructor(message = 'Una altra publicació està en curs') {
    super(message)
    this.name = 'PublishLockedError'
  }
}

export class PartialWriteRecoveryFailedError extends Error {
  readonly code = 'PARTIAL_WRITE_RECOVERY_FAILED'

  constructor(message = "No s'ha pogut recuperar una escriptura parcial") {
    super(message)
    this.name = 'PartialWriteRecoveryFailedError'
  }
}

function parseExpiresAtMillis(value: unknown): number | null {
  if (!value) return null
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeTimestamp = value as { toDate?: () => Date }
    if (typeof maybeTimestamp.toDate === 'function') {
      return maybeTimestamp.toDate().getTime()
    }
  }
  return null
}

export async function acquirePublishLock(
  uid: string,
  options?: { now?: Date; db?: FirestoreForLock }
): Promise<void> {
  const db = options?.db ?? (getAdminDb() as unknown as FirestoreForLock)
  const now = options?.now ?? new Date()
  const lockRef = db.doc(LOCK_DOC_PATH)
  const expiresAt = Timestamp.fromMillis(now.getTime() + LOCK_TTL_MS)

  await db.runTransaction(async tx => {
    const snap = await tx.get(lockRef)
    const data = snap.exists ? snap.data() : undefined

    const locked = Boolean(data?.locked)
    const expiresAtMs = parseExpiresAtMillis(data?.expiresAt)
    if (locked && expiresAtMs !== null && expiresAtMs > now.getTime()) {
      throw new PublishLockedError()
    }

    tx.set(
      lockRef,
      {
        locked: true,
        lockedBy: uid,
        lockedAt: FieldValue.serverTimestamp(),
        expiresAt,
      },
      { merge: true }
    )
  })
}

export async function releasePublishLock(uid: string): Promise<void> {
  const db = getAdminDb()
  const lockRef = db.doc(LOCK_DOC_PATH)
  await lockRef.set(
    {
      locked: false,
      lockedBy: uid,
      lockedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(0),
    },
    { merge: true }
  )
}

export async function writeI18nWithRollback(args: {
  originalByLang: I18nByLang
  nextJsonByLang: I18nJsonByLang
  readWithGeneration?: typeof readI18nJsonWithGeneration
  writeWithGeneration?: typeof writeI18nJsonWithGenerationMatch
}): Promise<void> {
  const {
    originalByLang,
    nextJsonByLang,
    readWithGeneration = readI18nJsonWithGeneration,
    writeWithGeneration = writeI18nJsonWithGenerationMatch,
  } = args

  const writtenLangs: PublishLang[] = []

  try {
    for (const lang of PUBLISH_WRITE_ORDER) {
      await writeWithGeneration(lang, nextJsonByLang[lang], originalByLang[lang].generation)
      writtenLangs.push(lang)
    }
  } catch (writeError) {
    if (writtenLangs.length > 0) {
      try {
        for (const lang of [...writtenLangs].reverse()) {
          const current = await readWithGeneration(lang)
          await writeWithGeneration(lang, originalByLang[lang].data, current.generation)
        }
      } catch (rollbackError) {
        console.error('[editorial/publish] rollback failed:', rollbackError)
        throw new PartialWriteRecoveryFailedError()
      }
    }
    throw writeError
  }
}

export function mapPublishErrorToHttp(error: unknown): {
  status: number
  code?: 'CONCURRENT_EDIT' | 'PUBLISH_LOCKED' | 'PARTIAL_WRITE_RECOVERY_FAILED'
  message: string
} {
  if (error instanceof PublishLockedError) {
    return {
      status: 423,
      code: 'PUBLISH_LOCKED',
      message: 'Una altra publicació està en curs',
    }
  }

  if (isConcurrentEditError(error)) {
    return {
      status: 409,
      code: 'CONCURRENT_EDIT',
      message: 'Recarrega i torna a publicar',
    }
  }

  if (error instanceof PartialWriteRecoveryFailedError) {
    return {
      status: 500,
      code: 'PARTIAL_WRITE_RECOVERY_FAILED',
      message: "No s'ha pogut recuperar una escriptura parcial",
    }
  }

  const message = (error as Error)?.message || 'Error intern'
  return {
    status: 500,
    message: message.substring(0, 200),
  }
}
