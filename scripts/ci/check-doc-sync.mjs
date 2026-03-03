#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const IMPACT_FILE = 'docs/sync/impact.md'
const MANUAL_FILE = 'docs/manual-usuari-summa-social.md'
const FAQ_FILE = 'docs/FAQ_SUMMA_SOCIAL.md'

const FUNCTIONAL_PREFIXES = ['src/app/', 'src/components/', 'src/lib/']
const GUIDE_LOCALE_FILES = [
  'src/i18n/locales/ca.json',
  'src/i18n/locales/es.json',
  'src/i18n/locales/fr.json',
  'src/i18n/locales/pt.json',
]
const HELP_GENERATED_GUIDE_FILES = [
  'docs/generated/help-guides.ca.flat.json',
  'docs/generated/help-guides.es.flat.json',
]
const HELP_TOPICS_PREFIX = 'help/topics/'
const DOC_SYNC_STRICT = process.env.DOC_SYNC_STRICT === '1'

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch {
    return null
  }
}

function resolveChangedFiles() {
  const localWorking = run('git diff --name-only --diff-filter=ACMRT')
  const localStaged = run('git diff --cached --name-only --diff-filter=ACMRT')
  const localUntracked = run('git ls-files --others --exclude-standard')
  const localFiles = new Set([
    ...(localWorking ? localWorking.split('\n').map(line => line.trim()).filter(Boolean) : []),
    ...(localStaged ? localStaged.split('\n').map(line => line.trim()).filter(Boolean) : []),
    ...(localUntracked ? localUntracked.split('\n').map(line => line.trim()).filter(Boolean) : []),
  ])

  const candidates = ['origin/prod...HEAD', 'prod...HEAD']
  for (const ref of candidates) {
    const out = run(`git diff --name-only ${ref} --diff-filter=ACMRT`)
    if (out !== null) {
      const baseFiles = out.split('\n').map(line => line.trim()).filter(Boolean)
      return {
        ref,
        files: Array.from(new Set([...baseFiles, ...localFiles])),
      }
    }
  }

  const fallback = run('git diff --name-only HEAD~1...HEAD --diff-filter=ACMRT')
  if (fallback !== null) {
    const baseFiles = fallback.split('\n').map(line => line.trim()).filter(Boolean)
    return {
      ref: 'HEAD~1...HEAD',
      files: Array.from(new Set([...baseFiles, ...localFiles])),
    }
  }

  return { ref: 'working-tree', files: Array.from(localFiles) }
}

function startsWithAny(value, prefixes) {
  return prefixes.some(prefix => value.startsWith(prefix))
}

function hasGuidesLocaleDiff(ref) {
  const targetFiles = GUIDE_LOCALE_FILES.join(' ')
  const commands = [
    ref && ref !== 'working-tree' ? `git diff --unified=0 ${ref} -- ${targetFiles}` : null,
    `git diff --unified=0 -- ${targetFiles}`,
    `git diff --cached --unified=0 -- ${targetFiles}`,
  ].filter(Boolean)

  const changedLines = commands
    .map(cmd => run(cmd) ?? '')
    .join('\n')
    .split('\n')
    .map(line => line.trim())

  return changedLines.some(line => {
    if (!line.startsWith('+') && !line.startsWith('-')) return false
    if (line.startsWith('+++') || line.startsWith('---')) return false
    return /"guides\./.test(line)
  })
}

function parseImpact(content) {
  const manualUpdated = /-\s*manual_updated:\s*(yes|no)/i.exec(content)?.[1]?.toLowerCase() ?? ''
  const faqUpdated = /-\s*faq_updated:\s*(yes|no)/i.exec(content)?.[1]?.toLowerCase() ?? ''
  const justification = /-\s*justification_if_no_change:\s*(.*)$/im.exec(content)?.[1]?.trim() ?? ''

  const topicSection = content.match(/-\s*help_topics_updated:\s*([\s\S]*?)(?:\n-\s*manual_updated:|$)/i)?.[1] ?? ''
  const topics = Array.from(topicSection.matchAll(/-\s+([a-z0-9]+(?:-[a-z0-9]+)*)/g)).map(match => match[1])

  return {
    manualUpdated,
    faqUpdated,
    justification,
    topics,
  }
}

function fail(message) {
  console.error(`[check-doc-sync] FAIL: ${message}`)
  process.exit(1)
}

function warn(message) {
  console.warn(`[check-doc-sync] WARN: ${message}`)
}

function reportViolation(message, { hard = false } = {}) {
  if (hard || DOC_SYNC_STRICT) {
    fail(message)
  }
  warn(message)
}

function main() {
  const { ref, files } = resolveChangedFiles()
  console.log(`[check-doc-sync] diff base: ${ref}`)

  if (files.length === 0) {
    console.log('[check-doc-sync] No changed files. OK')
    return
  }

  const functionalChanged = files.some(file => startsWithAny(file, FUNCTIONAL_PREFIXES))
  const impactChanged = files.includes(IMPACT_FILE)
  const manualChanged = files.includes(MANUAL_FILE)
  const faqChanged = files.includes(FAQ_FILE)
  const localeChanged = files.some(file => GUIDE_LOCALE_FILES.includes(file))
  const helpTopicsChanged = files.some(file => file.startsWith(HELP_TOPICS_PREFIX))

  if (localeChanged && hasGuidesLocaleDiff(ref)) {
    const hasHelpTopicChanges = helpTopicsChanged
    const hasGeneratedGuideChanges = files.some(file => HELP_GENERATED_GUIDE_FILES.includes(file))
    if (!hasHelpTopicChanges && !hasGeneratedGuideChanges) {
      reportViolation(
        'Detected guides.* edits in src/i18n/locales without Help source changes. Run help:build-guides-adapter and include help/topics or docs/generated/help-guides.* in the PR.',
        { hard: true },
      )
    }
  }

  if (helpTopicsChanged) {
    const validationCmd = 'node --import tsx scripts/help/validate-topics.ts'
    const validation = run(validationCmd)
    if (validation === null) {
      reportViolation(`Help topics quality gate failed. Run: ${validationCmd}`, { hard: true })
    }
  }

  if (!functionalChanged) {
    console.log('[check-doc-sync] No functional files changed. OK')
    return
  }

  if (!impactChanged) {
    reportViolation(`Functional changes without ${IMPACT_FILE}. Add it to document impact and keep deploy context clear.`)
    console.log('[check-doc-sync] OK (with warnings)')
    return
  }

  if (!existsSync(IMPACT_FILE)) {
    reportViolation(`Missing ${IMPACT_FILE}`)
    console.log('[check-doc-sync] OK (with warnings)')
    return
  }

  const parsed = parseImpact(readFileSync(IMPACT_FILE, 'utf8'))

  if (!['yes', 'no'].includes(parsed.manualUpdated)) {
    reportViolation('impact.md should declare manual_updated: yes|no')
  }
  if (!['yes', 'no'].includes(parsed.faqUpdated)) {
    reportViolation('impact.md should declare faq_updated: yes|no')
  }

  if (parsed.manualUpdated === 'yes' && !manualChanged) {
    reportViolation('impact.md says manual_updated=yes but manual file was not changed')
  }
  if (parsed.manualUpdated === 'no' && manualChanged) {
    reportViolation('manual file changed but impact.md says manual_updated=no')
  }

  if (parsed.faqUpdated === 'yes' && !faqChanged) {
    reportViolation('impact.md says faq_updated=yes but FAQ file was not changed')
  }
  if (parsed.faqUpdated === 'no' && faqChanged) {
    reportViolation('FAQ file changed but impact.md says faq_updated=no')
  }

  if (parsed.topics.length > 0) {
    for (const topicId of parsed.topics) {
      const caPath = `help/topics/${topicId}.ca.md`
      const esPath = `help/topics/${topicId}.es.md`
      const touched = files.includes(caPath) || files.includes(esPath)
      if (!touched) {
        reportViolation(
          `impact.md declares help topic "${topicId}" but neither ${caPath} nor ${esPath} changed`,
          { hard: true },
        )
      }
    }
  }

  const noDeclaredUpdates = parsed.topics.length === 0 && parsed.manualUpdated === 'no' && parsed.faqUpdated === 'no'
  if (noDeclaredUpdates && parsed.justification.length === 0) {
    reportViolation('impact.md should include justification_if_no_change when no docs/help layer is updated')
  }

  console.log('[check-doc-sync] OK')
  if (!DOC_SYNC_STRICT) {
    console.log('[check-doc-sync] Tip: set DOC_SYNC_STRICT=1 to enforce hard blocking mode for all doc sync checks.')
  }
}

main()
