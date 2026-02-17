#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_BUILD_DIR = '.next'
const DEFAULT_BUILD_LOG = 'tmp/performance-build-output.log'
const OFFENDER_THRESHOLD_KB = 200

function parseArgs(argv) {
  const args = {
    buildDir: DEFAULT_BUILD_DIR,
    buildLog: DEFAULT_BUILD_LOG,
    out: null,
    thresholdKB: OFFENDER_THRESHOLD_KB,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i]
    const next = argv[i + 1]

    if (current === '--build-dir' && next) {
      args.buildDir = next
      i += 1
      continue
    }
    if (current === '--build-log' && next) {
      args.buildLog = next
      i += 1
      continue
    }
    if (current === '--out' && next) {
      args.out = next
      i += 1
      continue
    }
    if (current === '--threshold-kb' && next) {
      const value = Number(next)
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid --threshold-kb value: ${next}`)
      }
      args.thresholdKB = value
      i += 1
      continue
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

function parseHumanSizeToKB(value) {
  const trimmed = value.trim()
  const match = trimmed.match(/^([\d.]+)\s*(B|kB|MB)$/i)
  if (!match) return null

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  if (Number.isNaN(amount)) return null
  if (unit === 'b') return Number((amount / 1024).toFixed(2))
  if (unit === 'kb') return Number(amount.toFixed(2))
  if (unit === 'mb') return Number((amount * 1024).toFixed(2))
  return null
}

function parseBuildOutput(buildLogPath) {
  if (!fs.existsSync(buildLogPath)) {
    return {
      parsed: false,
      reason: `Build log not found: ${buildLogPath}`,
    }
  }

  const content = fs.readFileSync(buildLogPath, 'utf8')
  const lines = content.split(/\r?\n/)
  const routes = []
  const sharedChunks = []
  let sharedFirstLoadJSKB = null

  for (const line of lines) {
    const routeMatch = line.match(/^[├└┌]\s+[^\s]+\s+(.+?)\s+([0-9.]+\s*(?:B|kB|MB))\s+([0-9.]+\s*(?:B|kB|MB))\s*$/)
    if (routeMatch) {
      const route = routeMatch[1].trim()
      const sizeKB = parseHumanSizeToKB(routeMatch[2])
      const firstLoadJSKB = parseHumanSizeToKB(routeMatch[3])
      if (firstLoadJSKB !== null) {
        routes.push({
          route,
          sizeKB,
          firstLoadJSKB,
        })
      }
      continue
    }

    const sharedMatch = line.match(/^\+\s+First Load JS shared by all\s+([0-9.]+\s*(?:B|kB|MB))\s*$/)
    if (sharedMatch) {
      sharedFirstLoadJSKB = parseHumanSizeToKB(sharedMatch[1])
      continue
    }

    const sharedChunkMatch = line.match(/^\s+[├└]\s+(.+?)\s+([0-9.]+\s*(?:B|kB|MB))\s*$/)
    if (sharedChunkMatch) {
      const chunkName = sharedChunkMatch[1].trim()
      const sizeKB = parseHumanSizeToKB(sharedChunkMatch[2])
      if (sizeKB !== null && (chunkName.startsWith('chunks/') || chunkName.startsWith('other shared chunks'))) {
        sharedChunks.push({
          chunk: chunkName,
          sizeKB,
        })
      }
    }
  }

  const rankedByFirstLoad = [...routes].sort((a, b) => b.firstLoadJSKB - a.firstLoadJSKB)

  return {
    parsed: true,
    totalRoutes: routes.length,
    sharedFirstLoadJSKB,
    sharedChunks,
    largestRoute: rankedByFirstLoad[0] || null,
    firstLoadByRoute: rankedByFirstLoad,
  }
}

function collectRoutesAndFiles(buildDir) {
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
    if (!normalizedRoute) continue
    routeFileMap.set(normalizedRoute, new Set(files))
  }

  if (appBuildManifest?.pages) {
    for (const [route, files] of Object.entries(appBuildManifest.pages)) {
      const normalizedRoute = normalizeRoute(route)
      if (!normalizedRoute) continue
      const existing = routeFileMap.get(normalizedRoute) || new Set()
      for (const file of files) existing.add(file)
      routeFileMap.set(normalizedRoute, existing)
    }
  }

  const sharedChunks = new Set([
    ...(buildManifest.rootMainFiles ?? []),
    ...(buildManifest.polyfillFiles ?? []),
  ].filter((file) => file.endsWith('.js')))

  return {
    buildManifest,
    hasAppBuildManifest,
    routeFileMap,
    sharedChunks,
  }
}

function calculateRouteMetrics(buildDir, routeFileMap, sharedChunks) {
  const routes = []
  const chunkToRoutes = new Map()

  for (const [route, filesSet] of routeFileMap.entries()) {
    const files = [...filesSet]
    const jsFiles = [...new Set(files.filter((file) => file.endsWith('.js')))]
    const cssFiles = [...new Set(files.filter((file) => file.endsWith('.css')))]

    let totalJSBytes = 0
    let routeOnlyJSBytes = 0
    let totalCssBytes = 0

    for (const jsFile of jsFiles) {
      const size = readFileSize(toAbsoluteBuildFile(buildDir, jsFile))
      totalJSBytes += size
      if (!sharedChunks.has(jsFile)) {
        routeOnlyJSBytes += size
      }
      const routeSet = chunkToRoutes.get(jsFile) || new Set()
      routeSet.add(route)
      chunkToRoutes.set(jsFile, routeSet)
    }

    for (const cssFile of cssFiles) {
      const size = readFileSize(toAbsoluteBuildFile(buildDir, cssFile))
      totalCssBytes += size
    }

    routes.push({
      route,
      totalJSKB: roundKB(totalJSBytes),
      routeOnlyJSKB: roundKB(routeOnlyJSBytes),
      cssKB: roundKB(totalCssBytes),
      jsFileCount: jsFiles.length,
      cssFileCount: cssFiles.length,
      jsFiles,
    })
  }

  return {
    routes,
    chunkToRoutes,
  }
}

function simplifyRoute(routeMetric) {
  return {
    route: routeMetric.route,
    totalJSKB: routeMetric.totalJSKB,
    routeOnlyJSKB: routeMetric.routeOnlyJSKB,
    cssKB: routeMetric.cssKB,
    jsFileCount: routeMetric.jsFileCount,
    cssFileCount: routeMetric.cssFileCount,
  }
}

function calculateSharedChunks(buildDir, sharedChunks) {
  const shared = []
  let totalBytes = 0
  for (const file of sharedChunks) {
    const size = readFileSize(toAbsoluteBuildFile(buildDir, file))
    totalBytes += size
    shared.push({
      chunk: file,
      sizeKB: roundKB(size),
    })
  }
  shared.sort((a, b) => b.sizeKB - a.sizeKB)

  return {
    sharedChunks: shared,
    sharedChunksKB: roundKB(totalBytes),
  }
}

function calculateWorstOffenders(buildDir, chunkToRoutes, thresholdKB) {
  const offenders = []
  for (const [file, routesSet] of chunkToRoutes.entries()) {
    const absPath = toAbsoluteBuildFile(buildDir, file)
    const sizeBytes = readFileSize(absPath)
    const sizeKB = roundKB(sizeBytes)
    if (sizeKB < thresholdKB) continue
    offenders.push({
      chunk: file,
      sizeKB,
      routeCount: routesSet.size,
      sampleRoutes: [...routesSet].sort().slice(0, 5),
    })
  }

  offenders.sort((a, b) => b.sizeKB - a.sizeKB)
  return offenders
}

function buildOutput(args) {
  const { buildManifest, hasAppBuildManifest, routeFileMap, sharedChunks } = collectRoutesAndFiles(args.buildDir)
  const routeMetrics = calculateRouteMetrics(args.buildDir, routeFileMap, sharedChunks)
  const sharedMetrics = calculateSharedChunks(args.buildDir, sharedChunks)
  const worstOffenders = calculateWorstOffenders(args.buildDir, routeMetrics.chunkToRoutes, args.thresholdKB)
  const buildOutput = parseBuildOutput(args.buildLog)

  const largestRoutesDetailed = [...routeMetrics.routes]
    .sort((a, b) => b.totalJSKB - a.totalJSKB)
    .slice(0, 10)
  const largestRoutes = largestRoutesDetailed.map(simplifyRoute)

  return {
    generatedAt: new Date().toISOString(),
    source: {
      buildDir: args.buildDir,
      buildManifest: path.join(args.buildDir, 'build-manifest.json'),
      appBuildManifest: hasAppBuildManifest ? path.join(args.buildDir, 'app-build-manifest.json') : null,
      buildLog: args.buildLog,
    },
    summary: {
      totalRoutes: routeMetrics.routes.length,
      sharedChunksKB: sharedMetrics.sharedChunksKB,
      largestRouteBundle: largestRoutes[0] || null,
      largestRoutes,
      worstOffenders,
    },
    largestRoutes,
    sharedChunksKB: sharedMetrics.sharedChunksKB,
    worstOffenders,
    sharedChunks: sharedMetrics.sharedChunks,
    routes: [...routeMetrics.routes].sort((a, b) => b.totalJSKB - a.totalJSKB).map(simplifyRoute),
    largestRoutesDetailed,
    firstLoadFromBuildOutput: buildOutput,
    raw: {
      rootMainFiles: buildManifest.rootMainFiles ?? [],
      polyfillFiles: buildManifest.polyfillFiles ?? [],
    },
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
