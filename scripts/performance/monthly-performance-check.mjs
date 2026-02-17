#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const BUILD_LOG_PATH = 'tmp/performance-build-output.log'
const PERF_CURRENT_PATH = 'tmp/performance/performance-latest.json'
const DEPS_CURRENT_PATH = 'tmp/performance/deps-audit-latest.json'
const REPORT_PATH = 'tmp/performance/monthly-performance-report.json'

const PERF_BASELINE_PATH = 'docs/PERFORMANCE-BASELINE-v1.json'
const DEPS_BASELINE_PATH = 'docs/DEPS-AUDIT-v1.json'

const ADMIN_ROUTE = '/admin'

const THRESHOLDS = {
  adminFirstLoadPct: 5,
  adminFirstLoadKB: 50,
  sharedFirstLoadPct: 5,
  chunkLimitKB: 700,
  depsIncreasePct: 10,
}

function parseArgs(argv) {
  return {
    skipBuild: argv.includes('--skip-build'),
    noTelegram: argv.includes('--no-telegram'),
    noCommit: argv.includes('--no-commit'),
    dryRun: argv.includes('--dry-run'),
    monthlyWindowOnly: argv.includes('--monthly-window-only'),
  }
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  const out = {}
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx <= 0) continue

    const key = line.slice(0, eqIdx).trim()
    let value = line.slice(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

function loadLocalEnv() {
  const local = parseEnvFile(path.resolve('.env.local'))
  const env = parseEnvFile(path.resolve('.env'))

  for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) process.env[key] = value
  }
  for (const [key, value] of Object.entries(local)) {
    if (!process.env[key]) process.env[key] = value
  }
}

function ensureBuildEnvDefaults() {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'dummy'
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'dummy'
  }
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    stdio: 'pipe',
  })

  const stdout = result.stdout || ''
  const stderr = result.stderr || ''
  const merged = `${stdout}${stderr}`

  if (options.logFile) {
    ensureDirFor(options.logFile)
    fs.writeFileSync(options.logFile, merged, 'utf8')
  }

  if (result.status !== 0) {
    const head = merged.split(/\r?\n/).slice(-80).join('\n')
    throw new Error(`Command failed (${command} ${args.join(' ')}):\n${head}`)
  }

  return { stdout, stderr, merged }
}

function runBuild(skipBuild) {
  if (skipBuild) return
  runCommand('npm', ['run', 'build'], { logFile: BUILD_LOG_PATH })
}

function runPerformanceAudit() {
  runCommand(process.execPath, [
    'scripts/performance/analyze-build-size.mjs',
    '--build-log',
    BUILD_LOG_PATH,
    '--out',
    PERF_CURRENT_PATH,
  ])
}

function runDepsAudit() {
  runCommand(process.execPath, [
    'scripts/performance/bundle-deps-audit.mjs',
    '--out',
    DEPS_CURRENT_PATH,
  ])
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function round(number) {
  return Number(Number(number).toFixed(2))
}

function pctDelta(previous, current) {
  if (!Number.isFinite(previous) || previous <= 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function getFirstLoadByRoute(perf, route) {
  const list = perf?.firstLoadFromBuildOutput?.firstLoadByRoute
  if (!Array.isArray(list)) return null
  const found = list.find((entry) => entry?.route === route)
  if (!found) return null
  return Number(found.firstLoadJSKB) || null
}

function getSharedFirstLoad(perf) {
  const value = perf?.firstLoadFromBuildOutput?.sharedFirstLoadJSKB
  if (!Number.isFinite(value)) return null
  return Number(value)
}

function getLargeChunks(perf, thresholdKB) {
  const list = Array.isArray(perf?.worstOffenders) ? perf.worstOffenders : []
  return list
    .filter((chunk) => Number(chunk?.sizeKB) > thresholdKB)
    .map((chunk) => ({
      chunk: chunk.chunk,
      sizeKB: Number(chunk.sizeKB),
      routeCount: Number(chunk.routeCount) || 0,
      sampleRoutes: Array.isArray(chunk.sampleRoutes) ? chunk.sampleRoutes : [],
    }))
    .sort((a, b) => b.sizeKB - a.sizeKB || a.chunk.localeCompare(b.chunk))
}

function getTrackedDep(audit, key) {
  const dep = audit?.trackedDependencies?.[key]
  if (!dep) {
    return {
      dependency: key,
      estimatedKB: 0,
      coreRoutes: [],
      routes: [],
    }
  }

  return {
    dependency: key,
    estimatedKB: Number(dep.estimatedKB) || 0,
    coreRoutes: Array.isArray(dep.coreRoutes) ? dep.coreRoutes : [],
    routes: Array.isArray(dep.routes) ? dep.routes : [],
  }
}

function buildComparisons(currentPerf, baselinePerf, currentDeps, baselineDeps) {
  const alerts = []
  const checks = []

  const currentAdminFirstLoad = getFirstLoadByRoute(currentPerf, ADMIN_ROUTE)
  const baselineAdminFirstLoad = getFirstLoadByRoute(baselinePerf, ADMIN_ROUTE)
  const canCompareAdmin = Number.isFinite(currentAdminFirstLoad) && Number.isFinite(baselineAdminFirstLoad)
  let adminDeltaKB = null
  let adminDeltaPct = null

  if (canCompareAdmin) {
    adminDeltaKB = round(currentAdminFirstLoad - baselineAdminFirstLoad)
    adminDeltaPct = round(pctDelta(baselineAdminFirstLoad, currentAdminFirstLoad))
    const adminWorsened = adminDeltaKB > 0
    const adminOverThreshold =
      adminDeltaKB > THRESHOLDS.adminFirstLoadKB || adminDeltaPct > THRESHOLDS.adminFirstLoadPct

    checks.push({
      id: 'admin-first-load',
      currentKB: round(currentAdminFirstLoad),
      baselineKB: round(baselineAdminFirstLoad),
      deltaKB: adminDeltaKB,
      deltaPct: adminDeltaPct,
      passed: !(adminWorsened && adminOverThreshold),
    })

    if (adminWorsened && adminOverThreshold) {
      alerts.push({
        id: 'admin-first-load',
        title: "L'area d'administracio carrega mes pes del limit segur",
        reason: `Admin +${adminDeltaKB} kB (${adminDeltaPct}%)`,
      })
    }
  } else {
    checks.push({
      id: 'admin-first-load',
      skipped: true,
      reason: 'Baseline o mesura actual sense First Load JS de /admin',
    })
  }

  const currentShared = getSharedFirstLoad(currentPerf)
  const baselineShared = getSharedFirstLoad(baselinePerf)
  const canCompareShared = Number.isFinite(currentShared) && Number.isFinite(baselineShared)
  let sharedDeltaPct = null
  let sharedDeltaKB = null

  if (canCompareShared) {
    sharedDeltaKB = round(currentShared - baselineShared)
    sharedDeltaPct = round(pctDelta(baselineShared, currentShared))
    const worsened = sharedDeltaKB > 0 && sharedDeltaPct > THRESHOLDS.sharedFirstLoadPct
    checks.push({
      id: 'shared-first-load',
      currentKB: round(currentShared),
      baselineKB: round(baselineShared),
      deltaKB: sharedDeltaKB,
      deltaPct: sharedDeltaPct,
      passed: !worsened,
    })
    if (worsened) {
      alerts.push({
        id: 'shared-first-load',
        title: "La carrega comuna ha crescut per sobre del marge",
        reason: `Shared +${sharedDeltaKB} kB (${sharedDeltaPct}%)`,
      })
    }
  } else {
    checks.push({
      id: 'shared-first-load',
      skipped: true,
      reason: 'Baseline o mesura actual sense shared First Load JS',
    })
  }

  const currentLargeChunks = getLargeChunks(currentPerf, THRESHOLDS.chunkLimitKB)
  const baselineLargeChunks = getLargeChunks(baselinePerf, THRESHOLDS.chunkLimitKB)
  const baselineLargeChunkSet = new Set(baselineLargeChunks.map((item) => item.chunk))
  const newLargeChunks = currentLargeChunks.filter((chunk) => !baselineLargeChunkSet.has(chunk.chunk))

  checks.push({
    id: 'new-large-chunks',
    thresholdKB: THRESHOLDS.chunkLimitKB,
    currentCount: currentLargeChunks.length,
    baselineCount: baselineLargeChunks.length,
    newCount: newLargeChunks.length,
    passed: newLargeChunks.length === 0,
  })

  if (newLargeChunks.length > 0) {
    alerts.push({
      id: 'new-large-chunks',
      title: "S'ha detectat un chunk nou massa gran",
      reason: `Nous chunks > ${THRESHOLDS.chunkLimitKB} kB: ${newLargeChunks.map((item) => item.chunk).join(', ')}`,
    })
  }

  const depKeys = ['xlsx', 'html2canvas', 'jspdf']
  const depComparisons = []

  for (const key of depKeys) {
    const current = getTrackedDep(currentDeps, key)
    const baseline = getTrackedDep(baselineDeps, key)
    const deltaKB = round(current.estimatedKB - baseline.estimatedKB)
    const deltaPct = round(pctDelta(baseline.estimatedKB, current.estimatedKB))
    const baselineCoreRouteSet = new Set(baseline.coreRoutes)
    const newCoreRoutes = current.coreRoutes.filter((route) => !baselineCoreRouteSet.has(route))
    const worsenedOverPct = deltaKB > 0 && deltaPct > THRESHOLDS.depsIncreasePct
    const enteredCore = newCoreRoutes.length > 0

    depComparisons.push({
      dependency: key,
      currentKB: round(current.estimatedKB),
      baselineKB: round(baseline.estimatedKB),
      deltaKB,
      deltaPct,
      coreRoutes: current.coreRoutes,
      baselineCoreRoutes: baseline.coreRoutes,
      newCoreRoutes,
      passed: !(worsenedOverPct || enteredCore),
    })

    checks.push({
      id: `dep-${key}`,
      currentKB: round(current.estimatedKB),
      baselineKB: round(baseline.estimatedKB),
      deltaKB,
      deltaPct,
      newCoreRoutesCount: newCoreRoutes.length,
      passed: !(worsenedOverPct || enteredCore),
    })

    if (enteredCore) {
      alerts.push({
        id: `dep-${key}-core`,
        title: `La dependencia ${key} ha entrat en rutes core`,
        reason: `Core routes noves: ${newCoreRoutes.join(', ')}`,
      })
    }
    if (worsenedOverPct) {
      alerts.push({
        id: `dep-${key}-growth`,
        title: `La dependencia ${key} ha pujat massa`,
        reason: `${key} +${deltaKB} kB (${deltaPct}%)`,
      })
    }
  }

  return {
    alerts,
    checks,
    metrics: {
      adminFirstLoad: {
        currentKB: currentAdminFirstLoad,
        baselineKB: baselineAdminFirstLoad,
        deltaKB: adminDeltaKB,
        deltaPct: adminDeltaPct,
      },
      sharedFirstLoad: {
        currentKB: currentShared,
        baselineKB: baselineShared,
        deltaKB: sharedDeltaKB,
        deltaPct: sharedDeltaPct,
      },
      largeChunks: {
        thresholdKB: THRESHOLDS.chunkLimitKB,
        currentLargeChunks,
        baselineLargeChunks,
        newLargeChunks,
      },
      dependencies: depComparisons,
    },
  }
}

function buildExecutiveSummary(alerts, comparisons) {
  if (alerts.length === 0) {
    return [
      '🟢 Salut de velocitat correcta',
      '',
      'Aquest mes Summa mante el rendiment estable.',
      'No hi ha increments significatius de pes ni noves carregues pesades.',
      '',
      "Experiencia d'usuari estable.",
    ].join('\n')
  }

  const lines = [
    "🔴 Atencio: Summa s'ha tornat mes pesada",
    '',
  ]

  const adminDelta = comparisons.metrics.adminFirstLoad.deltaKB
  if (Number.isFinite(adminDelta) && adminDelta > 0) {
    lines.push(`- L'area d'administracio ha crescut aproximadament ${round(adminDelta)} kB.`)
  }

  if (comparisons.metrics.largeChunks.newLargeChunks.length > 0) {
    lines.push("- S'ha detectat un paquet nou massa gran que pot afectar la carrega inicial.")
  }

  const depCoreHits = comparisons.metrics.dependencies.filter((dep) => dep.newCoreRoutes.length > 0)
  if (depCoreHits.length > 0) {
    const list = depCoreHits.map((dep) => dep.dependency).join(', ')
    lines.push(`- S'han detectat dependencies pesades en rutes core (${list}).`)
  }

  const depGrowthHits = comparisons.metrics.dependencies.filter(
    (dep) => dep.deltaKB > 0 && dep.deltaPct > THRESHOLDS.depsIncreasePct
  )
  if (depGrowthHits.length > 0) {
    const list = depGrowthHits.map((dep) => dep.dependency).join(', ')
    lines.push(`- Algunes dependencies pesades han crescut per sobre del marge (${list}).`)
  }

  lines.push('')
  lines.push('Recomanat revisar imports recents abans de la seguent publicacio.')
  return lines.join('\n')
}

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    throw new Error('Falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID per enviar alerta.')
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    }),
  })

  const payload = await response.json()
  if (!response.ok || payload?.ok !== true) {
    throw new Error(`Telegram error: ${payload?.description ?? `HTTP ${response.status}`}`)
  }
}

function writeJson(filePath, value) {
  ensureDirFor(filePath)
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function isMonthlyWindowNow(date) {
  return date.getDate() === 1 && date.getHours() === 8
}

function refreshBaselines(currentPerf, currentDeps, args) {
  if (args.dryRun || args.noCommit) {
    return {
      baselineUpdated: false,
      commitCreated: false,
      skipped: true,
      reason: args.dryRun ? 'dry-run' : '--no-commit',
    }
  }

  writeJson(PERF_BASELINE_PATH, currentPerf)
  writeJson(DEPS_BASELINE_PATH, currentDeps)

  runCommand('git', ['add', PERF_BASELINE_PATH, DEPS_BASELINE_PATH])

  const diff = spawnSync('git', ['diff', '--cached', '--quiet', '--', PERF_BASELINE_PATH, DEPS_BASELINE_PATH], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (diff.status === 0) {
    return {
      baselineUpdated: true,
      commitCreated: false,
      skipped: true,
      reason: 'No baseline changes detected',
    }
  }

  runCommand('git', [
    'commit',
    '-m',
    'chore(perf): monthly baseline refresh (auto)',
    '--',
    PERF_BASELINE_PATH,
    DEPS_BASELINE_PATH,
  ])
  return {
    baselineUpdated: true,
    commitCreated: true,
    skipped: false,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const now = new Date()

  if (args.monthlyWindowOnly && !isMonthlyWindowNow(now)) {
    const summary = 'Monthly window not due. This check only runs on day 1 at 08:00 (local time).'
    const report = {
      generatedAt: now.toISOString(),
      skippedByWindow: true,
      hasAlerts: false,
      summary,
    }
    writeJson(REPORT_PATH, report)
    process.stdout.write(`${summary}\n`)
    return
  }

  loadLocalEnv()
  ensureBuildEnvDefaults()
  ensureDirFor(BUILD_LOG_PATH)
  ensureDirFor(PERF_CURRENT_PATH)
  ensureDirFor(DEPS_CURRENT_PATH)

  runBuild(args.skipBuild)
  runPerformanceAudit()
  runDepsAudit()

  const currentPerf = readJsonIfExists(PERF_CURRENT_PATH)
  const currentDeps = readJsonIfExists(DEPS_CURRENT_PATH)
  if (!currentPerf || !currentDeps) {
    throw new Error("No s'han pogut generar els reports actuals de performance/deps.")
  }

  const baselinePerf = readJsonIfExists(PERF_BASELINE_PATH)
  const baselineDeps = readJsonIfExists(DEPS_BASELINE_PATH)
  const bootstrapMode = !baselinePerf || !baselineDeps

  const comparisons = bootstrapMode
    ? { alerts: [], checks: [], metrics: {} }
    : buildComparisons(currentPerf, baselinePerf, currentDeps, baselineDeps)

  const alerts = bootstrapMode ? [] : comparisons.alerts
  const summary = bootstrapMode
    ? [
        '🟢 Baseline inicial de performance preparada',
        '',
        "S'ha executat el control mensual i s'ha guardat una baseline inicial.",
        'A partir de la seguent execucio mensual es faran alertes automatices per degradacio.',
      ].join('\n')
    : buildExecutiveSummary(alerts, comparisons)

  let telegramSent = false
  if (alerts.length > 0 && !args.noTelegram && !args.dryRun) {
    await sendTelegram(summary)
    telegramSent = true
  }

  let baselineResult = {
    baselineUpdated: false,
    commitCreated: false,
    skipped: true,
    reason: 'Not evaluated',
  }

  if (alerts.length === 0) {
    baselineResult = refreshBaselines(currentPerf, currentDeps, args)
  }

  const report = {
    generatedAt: new Date().toISOString(),
    bootstrapMode,
    hasAlerts: alerts.length > 0,
    alerts,
    summary,
    telegramSent,
    comparisons,
    baseline: baselineResult,
    files: {
      performanceCurrent: PERF_CURRENT_PATH,
      depsCurrent: DEPS_CURRENT_PATH,
      performanceBaseline: PERF_BASELINE_PATH,
      depsBaseline: DEPS_BASELINE_PATH,
      buildLog: BUILD_LOG_PATH,
    },
  }

  writeJson(REPORT_PATH, report)
  process.stdout.write(`${summary}\n`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`[monthly-performance-check] ERROR: ${message}\n`)
  process.exit(1)
})
