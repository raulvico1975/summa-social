import test from 'node:test'
import assert from 'node:assert/strict'
import { Timestamp } from 'firebase-admin/firestore'
import {
  type FirestoreForLock,
  acquirePublishLock,
  mapPublishErrorToHttp,
  PublishLockedError,
  writeI18nWithRollback,
} from '../editorial/guide-publish-flow'

test('writeI18nWithRollback fa rollback de FR si PT falla a mig publish', async () => {
  const originalByLang = {
    ca: { data: { 'guides.firstDay.title': 'ca-original' }, generation: '11' },
    es: { data: { 'guides.firstDay.title': 'es-original' }, generation: '12' },
    fr: { data: { 'guides.firstDay.title': 'fr-original' }, generation: '13' },
    pt: { data: { 'guides.firstDay.title': 'pt-original' }, generation: '14' },
  }

  const nextJsonByLang = {
    ca: { 'guides.firstDay.title': 'ca-next' },
    es: { 'guides.firstDay.title': 'es-next' },
    fr: { 'guides.firstDay.title': 'fr-next' },
    pt: { 'guides.firstDay.title': 'pt-next' },
  }

  const writeCalls: Array<{ lang: string; generation: string; title: string }> = []
  const readCalls: string[] = []

  const readWithGeneration = async (lang: 'ca' | 'es' | 'fr' | 'pt') => {
    readCalls.push(lang)
    return {
      data: { 'guides.firstDay.title': `${lang}-current` },
      generation: lang === 'fr' ? '21' : '99',
    }
  }

  const writeWithGeneration = async (
    lang: 'ca' | 'es' | 'fr' | 'pt',
    nextJson: Record<string, string>,
    generation: string
  ) => {
    writeCalls.push({
      lang,
      generation,
      title: nextJson['guides.firstDay.title'],
    })

    if (lang === 'pt' && nextJson['guides.firstDay.title'] === 'pt-next') {
      throw new Error('forced-pt-failure')
    }
  }

  await assert.rejects(
    async () => {
      await writeI18nWithRollback({
        originalByLang,
        nextJsonByLang,
        readWithGeneration,
        writeWithGeneration,
      })
    },
    /forced-pt-failure/
  )

  assert.deepEqual(readCalls, ['fr'])
  assert.deepEqual(writeCalls, [
    { lang: 'fr', generation: '13', title: 'fr-next' },
    { lang: 'pt', generation: '14', title: 'pt-next' },
    { lang: 'fr', generation: '21', title: 'fr-original' },
  ])
})

test('lock actiu no expirat bloqueja publicacio i mapeja a 423', async () => {
  const now = new Date('2026-02-15T12:00:00.000Z')
  let setCalled = false

  const fakeDb = {
    doc: (_path: string) => ({ _kind: 'doc-ref' }),
    runTransaction: async <T>(updateFn: (tx: { get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> }>; set: () => void }) => Promise<T>): Promise<T> => {
      return updateFn({
        get: async () => ({
          exists: true,
          data: () => ({
            locked: true,
            lockedBy: 'other-user',
            expiresAt: Timestamp.fromMillis(now.getTime() + 5_000),
          }),
        }),
        set: () => {
          setCalled = true
        },
      })
    },
  } as const

  await assert.rejects(
    async () => {
      await acquirePublishLock('me', { now, db: fakeDb as unknown as FirestoreForLock })
    },
    (error: unknown) => {
      assert.ok(error instanceof PublishLockedError)
      const mapped = mapPublishErrorToHttp(error)
      assert.equal(mapped.status, 423)
      assert.equal(mapped.code, 'PUBLISH_LOCKED')
      return true
    }
  )

  assert.equal(setCalled, false)
})
