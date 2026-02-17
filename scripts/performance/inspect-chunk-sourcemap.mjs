#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_MAP_PATH = '.next/static/chunks/5823-56b73bfaa283ecfe.js.map'

function parseArgs(argv) {
  const args = {
    map: DEFAULT_MAP_PATH,
    top: 30,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i]
    const next = argv[i + 1]
    if (current === '--map' && next) {
      args.map = next
      i += 1
      continue
    }
    if (current === '--top' && next) {
      const value = Number(next)
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Invalid --top value: ${next}`)
      }
      args.top = value
      i += 1
    }
  }

  return args
}

function normalizeSource(source) {
  let normalized = source
    .replace(/^webpack:\/\/_N_E\/\.\//, '')
    .replace(/^webpack:\/\/\/\.\//, '')
    .replace(/^webpack:\/\//, '')
    .replace(/^\.\//, '')

  try {
    normalized = decodeURIComponent(normalized)
  } catch {
    // Keep raw string if decode fails.
  }

  return normalized
}

function countBy(values) {
  const counts = new Map()
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  return counts
}

function topEntries(countMap, top) {
  return [...countMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, top)
}

function extractNodeModulePackage(source) {
  const marker = 'node_modules/'
  const idx = source.indexOf(marker)
  if (idx === -1) return null

  const remaining = source.slice(idx + marker.length)
  const parts = remaining.split('/')
  if (parts.length === 0) return null

  if (parts[0].startsWith('@') && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`
  }
  return parts[0]
}

function localBucket(source) {
  if (!source.startsWith('src/')) return null
  const parts = source.split('/')
  if (parts.length < 2) return 'src'
  return `src/${parts[1]}`
}

function collectHeavyIndicators(sources) {
  const indicators = [
    { key: 'xlsx', regex: /(^|\/)(xlsx)(\/|$)|sheetjs/i },
    { key: 'pdf', regex: /(^|\/)(jspdf|pdfjs|pdfkit)(\/|$)|pdf/i },
    { key: 'charts', regex: /(^|\/)(recharts|chart\.js|echarts|d3)(\/|$)/i },
    { key: 'editor', regex: /(^|\/)(monaco-editor|codemirror|quill|tiptap)(\/|$)|editor/i },
    { key: 'firebase', regex: /(^|\/)(firebase|firebase-admin)(\/|$)/i },
    { key: 'genkit', regex: /(^|\/)(genkit|@genkit-ai)(\/|$)/i },
  ]

  const results = []
  for (const indicator of indicators) {
    const matches = sources.filter((source) => indicator.regex.test(source))
    if (matches.length === 0) continue
    results.push({
      keyword: indicator.key,
      count: matches.length,
      sampleSources: [...new Set(matches)].sort().slice(0, 10),
    })
  }

  return results
}

function resolveLocalImport(sourcePath, importSpecifier) {
  if (!sourcePath.startsWith('src/')) return null
  if (!importSpecifier.startsWith('.')) return null

  const sourceDir = path.posix.dirname(sourcePath)
  const candidateBase = path.posix.normalize(path.posix.join(sourceDir, importSpecifier))
  const candidates = [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.js`,
    `${candidateBase}.mjs`,
    `${candidateBase}.json`,
    path.posix.join(candidateBase, 'index.ts'),
    path.posix.join(candidateBase, 'index.tsx'),
    path.posix.join(candidateBase, 'index.js'),
    path.posix.join(candidateBase, 'index.mjs'),
    path.posix.join(candidateBase, 'index.json'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }

  return null
}

function parseImports(sourceCode) {
  if (typeof sourceCode !== 'string' || sourceCode.length === 0) return []

  const imports = []
  const staticImportRegex = /^\s*import\s+(?:.+?\s+from\s+)?['"]([^'"]+)['"]/gm
  const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g

  let match
  while ((match = staticImportRegex.exec(sourceCode)) !== null) {
    imports.push(match[1])
  }
  while ((match = dynamicImportRegex.exec(sourceCode)) !== null) {
    imports.push(match[1])
  }

  return imports
}

function inspectMap(mapPath, top) {
  if (!fs.existsSync(mapPath)) {
    throw new Error(`Sourcemap not found: ${mapPath}`)
  }

  const raw = fs.readFileSync(mapPath, 'utf8')
  const parsed = JSON.parse(raw)
  const rawSources = Array.isArray(parsed.sources) ? parsed.sources : []
  const sources = rawSources.map(normalizeSource)
  const sourcesContent = Array.isArray(parsed.sourcesContent) ? parsed.sourcesContent : []

  const nodePackages = []
  const localBuckets = []
  const importSpecifiers = []
  const resolvedLocalImports = []
  for (const source of sources) {
    const pkg = extractNodeModulePackage(source)
    if (pkg) nodePackages.push(pkg)

    const bucket = localBucket(source)
    if (bucket) localBuckets.push(bucket)
  }

  for (let i = 0; i < sources.length; i += 1) {
    const sourcePath = sources[i]
    const sourceCode = sourcesContent[i]
    const imports = parseImports(sourceCode)
    for (const importSpecifier of imports) {
      importSpecifiers.push(importSpecifier)
      const resolved = resolveLocalImport(sourcePath, importSpecifier)
      if (resolved) {
        resolvedLocalImports.push(resolved)
      }
    }
  }

  const topNodePackages = topEntries(countBy(nodePackages), top).map((entry) => ({
    package: entry.name,
    count: entry.count,
  }))
  const topLocalFolders = topEntries(countBy(localBuckets), top).map((entry) => ({
    folder: entry.name,
    count: entry.count,
  }))
  const topImportSpecifiers = topEntries(countBy(importSpecifiers), top).map((entry) => ({
    import: entry.name,
    count: entry.count,
  }))
  const topResolvedLocalImports = topEntries(countBy(resolvedLocalImports), top)
    .map((entry) => ({
      file: entry.name,
      count: entry.count,
      sizeBytes: fs.statSync(entry.name).size,
      sizeKB: Number((fs.statSync(entry.name).size / 1024).toFixed(2)),
    }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes || b.count - a.count || a.file.localeCompare(b.file))
    .slice(0, top)

  const heavyIndicators = collectHeavyIndicators(sources)

  return {
    mapPath,
    chunkPath: mapPath.replace(/\.map$/, ''),
    chunkSizeBytes: fs.existsSync(mapPath.replace(/\.map$/, '')) ? fs.statSync(mapPath.replace(/\.map$/, '')).size : null,
    totalSources: sources.length,
    topNodeModulesPackages: topNodePackages,
    topLocalSources: topLocalFolders,
    importsDiscovered: {
      topImportSpecifiers,
      topResolvedLocalImports,
    },
    heavyIndicators,
    sampleSources: sources.slice(0, 30),
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const result = inspectMap(args.map, args.top)
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

main()
