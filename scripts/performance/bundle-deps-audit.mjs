#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_BUILD_DIR = '.next'

const TRACKED_DEPENDENCIES = {
  xlsx: new Set(['xlsx', 'sheetjs']),
  html2canvas: new Set(['html2canvas']),
  jspdf: new Set(['jspdf', 'jspdf-autotable']),
}

function parseArgs(argv) {
  const args = {
    buildDir: DEFAULT_BUILD_DIR,
    out: null,
    top: 25,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i]
    const next = argv[i + 1]
    if (current === '--build-dir' && next) {
      args.buildDir = next
      i += 1
      continue
    }
    if (current === '--out' && next) {
      args.out = next
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function roundKB(bytes) {
  return Number((bytes / 1024).toFixed(2))
}

function toAbsoluteBuildFile(buildDir, manifestFile) {
  return path.join(buildDir, manifestFile.replace(/^\//, ''))
}

function readFileSize(filePath) {
  if (!fs.existsSync(filePath)) return 0
  return fs.statSync(filePath).size
}

function normalizeRoute(routeKey) {
  if (routeKey === '/layout') return null
  if (routeKey.endsWith('/page')) {
    const value = routeKey.slice(0, -5)
    return value.length === 0 ? '/' : value
  }
  if (routeKey.endsWith('/route')) {
    return routeKey.slice(0, -6) || '/'
  }
  return routeKey
}

function normalizeSource(source) {
  let normalized = String(source || '')
    .replace(/^webpack:\/\/_N_E\/\.\//, '')
    .replace(/^webpack:\/\/\/\.\//, '')
    .replace(/^webpack:\/\//, '')
    .replace(/^\.\//, '')

  try {
    normalized = decodeURIComponent(normalized)
  } catch {
    // Keep the raw source path when URI decoding fails.
  }

  return normalized
}

function extractNodeModulePackage(source) {
  const marker = 'node_modules/'
  const idx = source.indexOf(marker)
  if (idx === -1) return null

  const remaining = source.slice(idx + marker.length)
  const parts = remaining.split('/')
  if (parts.length === 0) return null

  const clean = (value) => String(value || '').split('|')[0].split('?')[0].trim()
  const first = clean(parts[0])
  if (!first) return null

  if (first.startsWith('@') && parts.length >= 2) {
    const second = clean(parts[1])
    if (!second) return first
    return `${first}/${second}`
  }

  return first
}

function isCoreRoute(route) {
  const value = String(route || '').toLowerCase()
  return value.includes('/dashboard') || value.includes('/movimientos') || value.includes('/moviments')
}

function resolveTrackedDependency(pkgName) {
  const normalized = String(pkgName || '').toLowerCase()
  for (const [tracked, aliases] of Object.entries(TRACKED_DEPENDENCIES)) {
    if (aliases.has(normalized)) return tracked
  }
  return null
}

function collectManifestChunkRoutes(buildDir) {
  const buildManifestPath = path.join(buildDir, 'build-manifest.json')
  if (!fs.existsSync(buildManifestPath)) {
    throw new Error(`Missing ${buildManifestPath}. Run "npm run build" first.`)
  }

  const buildManifest = readJson(buildManifestPath)
  const appBuildManifestPath = path.join(buildDir, 'app-build-manifest.json')
  const hasAppBuildManifest = fs.existsSync(appBuildManifestPath)
  const appBuildManifest = hasAppBuildManifest ? readJson(appBuildManifestPath) : null

  const routeFileMap = new Map()

  for (const [route, files] of Object.entries(buildManifest.pages ?? {})) {
    const normalizedRoute = normalizeRoute(route)
    if (!normalizedRoute || !Array.isArray(files)) continue
    const existing = routeFileMap.get(normalizedRoute) || new Set()
    for (const file of files) {
      if (typeof file === 'string' && file.endsWith('.js')) {
        existing.add(file)
      }
    }
    routeFileMap.set(normalizedRoute, existing)
  }

  if (appBuildManifest?.pages) {
    for (const [route, files] of Object.entries(appBuildManifest.pages)) {
      const normalizedRoute = normalizeRoute(route)
      if (!normalizedRoute || !Array.isArray(files)) continue
      const existing = routeFileMap.get(normalizedRoute) || new Set()
      for (const file of files) {
        if (typeof file === 'string' && file.endsWith('.js')) {
          existing.add(file)
        }
      }
      routeFileMap.set(normalizedRoute, existing)
    }
  }

  const allRoutes = [...routeFileMap.keys()].sort((a, b) => a.localeCompare(b))
  const chunkToRoutes = new Map()

  for (const [route, filesSet] of routeFileMap.entries()) {
    for (const jsFile of filesSet) {
      const routesSet = chunkToRoutes.get(jsFile) || new Set()
      routesSet.add(route)
      chunkToRoutes.set(jsFile, routesSet)
    }
  }

  const globallySharedChunks = new Set([
    ...(buildManifest.rootMainFiles ?? []),
    ...(buildManifest.polyfillFiles ?? []),
    ...(buildManifest.lowPriorityFiles ?? []),
  ].filter((file) => typeof file === 'string' && file.endsWith('.js')))

  for (const sharedChunk of globallySharedChunks) {
    if (chunkToRoutes.has(sharedChunk)) continue
    chunkToRoutes.set(sharedChunk, new Set(allRoutes))
  }

  return {
    buildManifestPath,
    appBuildManifestPath: hasAppBuildManifest ? appBuildManifestPath : null,
    chunkToRoutes,
  }
}

function readChunkPackages(buildDir, chunkFile) {
  const chunkPath = toAbsoluteBuildFile(buildDir, chunkFile)
  const mapPath = `${chunkPath}.map`
  if (!fs.existsSync(mapPath)) {
    return {
      mapFound: false,
      packages: new Set(),
    }
  }

  const mapJson = readJson(mapPath)
  const sources = Array.isArray(mapJson.sources) ? mapJson.sources : []
  const packages = new Set()

  for (const source of sources) {
    const pkg = extractNodeModulePackage(normalizeSource(source))
    if (pkg) packages.add(pkg.toLowerCase())
  }

  return {
    mapFound: true,
    packages,
  }
}

function ensureDependencyStats(map, dependency) {
  if (!map.has(dependency)) {
    map.set(dependency, {
      dependency,
      estimatedBytes: 0,
      chunkFiles: new Set(),
      routes: new Set(),
      coreRoutes: new Set(),
    })
  }
  return map.get(dependency)
}

function ensureTrackedStats(map, dependency) {
  if (!map.has(dependency)) {
    map.set(dependency, {
      dependency,
      packages: new Set(),
      estimatedBytes: 0,
      chunkFiles: new Set(),
      routes: new Set(),
      coreRoutes: new Set(),
      chunks: new Map(),
    })
  }
  return map.get(dependency)
}

function summarizeDependencyStats(stat) {
  return {
    dependency: stat.dependency,
    estimatedKB: roundKB(stat.estimatedBytes),
    chunkCount: stat.chunkFiles.size,
    routeCount: stat.routes.size,
    coreRouteCount: stat.coreRoutes.size,
  }
}

function summarizeTrackedDependencyStats(stat, top) {
  const chunks = [...stat.chunks.values()]
    .sort((a, b) => b.sizeBytes - a.sizeBytes || a.chunk.localeCompare(b.chunk))
    .slice(0, top)
    .map((chunk) => ({
      chunk: chunk.chunk,
      sizeKB: roundKB(chunk.sizeBytes),
      routeCount: chunk.routeCount,
      sampleRoutes: chunk.sampleRoutes,
    }))

  return {
    dependency: stat.dependency,
    packages: [...stat.packages].sort((a, b) => a.localeCompare(b)),
    estimatedKB: roundKB(stat.estimatedBytes),
    chunkCount: stat.chunkFiles.size,
    routeCount: stat.routes.size,
    coreRouteCount: stat.coreRoutes.size,
    routes: [...stat.routes].sort((a, b) => a.localeCompare(b)),
    coreRoutes: [...stat.coreRoutes].sort((a, b) => a.localeCompare(b)),
    chunks,
  }
}

function buildOutput(args) {
  const manifests = collectManifestChunkRoutes(args.buildDir)
  const dependencyStats = new Map()
  const trackedStats = new Map()

  let scannedChunks = 0
  let sourcemapsFound = 0
  const chunksWithoutSourceMap = []

  for (const [chunkFile, routesSet] of manifests.chunkToRoutes.entries()) {
    scannedChunks += 1
    const routes = [...routesSet].sort((a, b) => a.localeCompare(b))
    const coreRoutes = routes.filter(isCoreRoute)
    const chunkSizeBytes = readFileSize(toAbsoluteBuildFile(args.buildDir, chunkFile))
    const { mapFound, packages } = readChunkPackages(args.buildDir, chunkFile)

    if (!mapFound) {
      chunksWithoutSourceMap.push(chunkFile)
      continue
    }

    sourcemapsFound += 1
    if (packages.size === 0) continue

    for (const pkg of packages) {
      const stat = ensureDependencyStats(dependencyStats, pkg)
      stat.estimatedBytes += chunkSizeBytes
      stat.chunkFiles.add(chunkFile)
      for (const route of routes) stat.routes.add(route)
      for (const route of coreRoutes) stat.coreRoutes.add(route)
    }

    const trackedInChunk = new Set()
    for (const pkg of packages) {
      const tracked = resolveTrackedDependency(pkg)
      if (!tracked) continue
      const stat = ensureTrackedStats(trackedStats, tracked)
      stat.packages.add(pkg)
      trackedInChunk.add(tracked)
    }

    for (const tracked of trackedInChunk) {
      const stat = ensureTrackedStats(trackedStats, tracked)
      stat.estimatedBytes += chunkSizeBytes
      stat.chunkFiles.add(chunkFile)
      for (const route of routes) stat.routes.add(route)
      for (const route of coreRoutes) stat.coreRoutes.add(route)
      stat.chunks.set(chunkFile, {
        chunk: chunkFile,
        sizeBytes: chunkSizeBytes,
        routeCount: routes.length,
        sampleRoutes: routes.slice(0, 5),
      })
    }
  }

  const dependencyRank = [...dependencyStats.values()]
    .map(summarizeDependencyStats)
    .sort((a, b) => b.estimatedKB - a.estimatedKB || a.dependency.localeCompare(b.dependency))

  const trackedDependencies = {}
  for (const dependency of Object.keys(TRACKED_DEPENDENCIES)) {
    const stats = trackedStats.get(dependency)
    if (!stats) {
      trackedDependencies[dependency] = {
        dependency,
        packages: [],
        estimatedKB: 0,
        chunkCount: 0,
        routeCount: 0,
        coreRouteCount: 0,
        routes: [],
        coreRoutes: [],
        chunks: [],
      }
      continue
    }
    trackedDependencies[dependency] = summarizeTrackedDependencyStats(stats, args.top)
  }

  return {
    generatedAt: new Date().toISOString(),
    source: {
      buildDir: args.buildDir,
      buildManifest: manifests.buildManifestPath,
      appBuildManifest: manifests.appBuildManifestPath,
    },
    summary: {
      scannedChunks,
      sourcemapsFound,
      sourcemapsMissing: scannedChunks - sourcemapsFound,
      dependenciesFound: dependencyRank.length,
      topDependenciesByEstimatedKB: dependencyRank.slice(0, args.top),
    },
    trackedDependencies,
    dependencyRank: dependencyRank.slice(0, Math.max(args.top, 50)),
    chunksWithoutSourceMap: chunksWithoutSourceMap.sort((a, b) => a.localeCompare(b)),
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const result = buildOutput(args)
  const json = JSON.stringify(result, null, 2)

  if (args.out) {
    const outDir = path.dirname(args.out)
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(args.out, `${json}\n`, 'utf8')
  }

  process.stdout.write(`${json}\n`)
}

main()
