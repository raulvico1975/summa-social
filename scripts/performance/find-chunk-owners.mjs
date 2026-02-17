#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_BUILD_DIR = '.next'
const DEFAULT_CHUNK = 'static/chunks/5823-56b73bfaa283ecfe.js'

function parseArgs(argv) {
  const args = {
    buildDir: DEFAULT_BUILD_DIR,
    chunk: DEFAULT_CHUNK,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i]
    const next = argv[i + 1]
    if (current === '--build-dir' && next) {
      args.buildDir = next
      i += 1
      continue
    }
    if (current === '--chunk' && next) {
      args.chunk = next
      i += 1
    }
  }

  return args
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function normalizeAppRoute(routeKey) {
  if (routeKey.endsWith('/page')) {
    const route = routeKey.slice(0, -5)
    return route.length === 0 ? '/' : route
  }
  if (routeKey.endsWith('/route')) {
    return routeKey.slice(0, -6) || '/'
  }
  return routeKey
}

function collectOwners(pagesObj, chunk, routeNormalizer = (value) => value) {
  const owners = []
  const rawEntries = []
  for (const [routeKey, files] of Object.entries(pagesObj || {})) {
    if (!Array.isArray(files)) continue
    if (!files.includes(chunk)) continue
    rawEntries.push(routeKey)
    owners.push(routeNormalizer(routeKey))
  }
  return {
    rawEntries: rawEntries.sort((a, b) => a.localeCompare(b)),
    normalizedRoutes: owners.sort((a, b) => a.localeCompare(b)),
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const buildManifestPath = path.join(args.buildDir, 'build-manifest.json')
  const appBuildManifestPath = path.join(args.buildDir, 'app-build-manifest.json')

  if (!fs.existsSync(buildManifestPath)) {
    throw new Error(`Missing ${buildManifestPath}. Run "npm run build" first.`)
  }

  const buildManifest = readJson(buildManifestPath)
  const appBuildManifest = fs.existsSync(appBuildManifestPath) ? readJson(appBuildManifestPath) : null

  const pagesOwners = collectOwners(buildManifest.pages, args.chunk)
  const appOwners = appBuildManifest
    ? collectOwners(appBuildManifest.pages, args.chunk, normalizeAppRoute)
    : { rawEntries: [], normalizedRoutes: [] }

  const sharedReferences = {
    rootMainFiles: (buildManifest.rootMainFiles || []).includes(args.chunk),
    polyfillFiles: (buildManifest.polyfillFiles || []).includes(args.chunk),
    lowPriorityFiles: (buildManifest.lowPriorityFiles || []).includes(args.chunk),
  }

  const allOwners = [...new Set([...pagesOwners.normalizedRoutes, ...appOwners.normalizedRoutes])]
    .sort((a, b) => a.localeCompare(b))

  const result = {
    chunk: args.chunk,
    buildDir: args.buildDir,
    owners: {
      pagesManifestEntries: pagesOwners.rawEntries,
      pagesManifestRoutes: pagesOwners.normalizedRoutes,
      appManifestEntries: appOwners.rawEntries,
      appManifestRoutes: appOwners.normalizedRoutes,
      allRoutes: allOwners,
    },
    sharedReferences,
    isSharedChunk: Object.values(sharedReferences).some(Boolean),
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

main()
