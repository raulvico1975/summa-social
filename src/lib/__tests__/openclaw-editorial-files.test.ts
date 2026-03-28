import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { resolveWorkspacePath, toWorkspaceRelativePath } from '../openclaw-editorial/files'

test('toWorkspaceRelativePath converteix rutes absolutes del repo a relatives', () => {
  const absolutePath = path.join(
    process.cwd(),
    'octavi',
    'summa',
    'editorial',
    'artifacts',
    'blog',
    '2026-04-control-model-347.json'
  )

  assert.equal(
    toWorkspaceRelativePath(absolutePath),
    'octavi/summa/editorial/artifacts/blog/2026-04-control-model-347.json'
  )
})

test('toWorkspaceRelativePath conserva rutes fora del workspace', () => {
  const externalPath = '/mnt/data/KNOWLEDGE_BASE_Entitats.md'

  assert.equal(toWorkspaceRelativePath(externalPath), externalPath)
})

test('resolveWorkspacePath resol rutes relatives respecte al repo', () => {
  const relativePath = 'octavi/summa/editorial/runtime/queue-state.json'

  assert.equal(
    resolveWorkspacePath(relativePath),
    path.join(process.cwd(), relativePath)
  )
})
