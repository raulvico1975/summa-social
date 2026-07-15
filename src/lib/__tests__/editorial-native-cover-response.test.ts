import assert from 'node:assert/strict'
import test from 'node:test'

import { extractGeneratedImage } from '@/lib/editorial-native/cover'

test('extractGeneratedImage reads the current interactions steps response', () => {
  const image = extractGeneratedImage({
    status: 'completed',
    steps: [
      { type: 'thought' },
      {
        type: 'model_output',
        content: [
          {
            type: 'image',
            mime_type: 'image/jpeg',
            data: 'aW1hZ2U=',
          },
        ],
      },
    ],
  })

  assert.deepEqual(image, {
    base64: 'aW1hZ2U=',
    mimeType: 'image/jpeg',
  })
})

test('extractGeneratedImage keeps compatibility with legacy outputs', () => {
  const image = extractGeneratedImage({
    outputs: [
      {
        type: 'image',
        mime_type: 'image/png',
        data: 'bGVnYWN5',
      },
    ],
  })

  assert.deepEqual(image, {
    base64: 'bGVnYWN5',
    mimeType: 'image/png',
  })
})
