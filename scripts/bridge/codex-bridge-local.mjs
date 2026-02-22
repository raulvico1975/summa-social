#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CONTROL_REPO = "/Users/raulvico/Documents/summa-social";
const BRIDGE_DIR = path.join(CONTROL_REPO, "tmp", "bridge");
const INBOX_FILE = path.join(BRIDGE_DIR, "inbox.txt");
const OUTBOX_FILE = path.join(BRIDGE_DIR, "outbox.txt");
const LAST_RUN_FILE = path.join(BRIDGE_DIR, "last-run.json");
const KILL_SWITCH_FILE = path.join(BRIDGE_DIR, "DISABLED");

const CEO_ACABAT_KEYWORD = "CEO_OK_ACABAT";
const CEO_PUBLICA_KEYWORD = "CEO_OK_PUBLICA";

function usage() {
  return [
    "Us:",
    "  node scripts/bridge/codex-bridge-local.mjs \"<ordre>\"",
    "  node scripts/bridge/codex-bridge-local.mjs --queue-only \"<ordre>\"",
    "  echo \"<ordre>\" | node scripts/bridge/codex-bridge-local.mjs --stdin",
    "",
    "Keywords CEO obligatòries per ordres sensibles:",
    `  - ${CEO_ACABAT_KEYWORD} (per permetre 'acabat')`,
    `  - ${CEO_PUBLICA_KEYWORD} (per permetre 'publica')`,
  ].join("\n");
}

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  let queueOnly = false;
  let fromStdin = false;
  const parts = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }
    if (token === "--queue-only") {
      queueOnly = true;
      continue;
    }
    if (token === "--stdin") {
      fromStdin = true;
      continue;
    }
    parts.push(token);
  }

  let order = "";
  if (fromStdin) {
    order = fs.readFileSync(0, "utf8");
  } else {
    order = parts.join(" ");
  }
  order = order.trim();

  if (!order) {
    fail(`Falta l'ordre.\n\n${usage()}`);
  }

  return { order, queueOnly };
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
}

function runOrFail(command, args, options = {}) {
  const result = run(command, args, options);
  if (result.error) {
    fail(`No s'ha pogut executar '${command}': ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    const details = [stderr, stdout].filter(Boolean).join("\n");
    fail(`Error executant '${command} ${args.join(" ")}':\n${details}`);
  }
  return result;
}

function realDir(targetPath) {
  return fs.realpathSync.native ? fs.realpathSync.native(targetPath) : fs.realpathSync(targetPath);
}

function gitText(repoDir, args) {
  const result = runOrFail("git", ["-C", repoDir, ...args]);
  return (result.stdout || "").trim();
}

function gitState(repoDir) {
  const branch = gitText(repoDir, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const head = gitText(repoDir, ["rev-parse", "HEAD"]);
  const porcelain = gitText(repoDir, ["status", "--porcelain", "--untracked-files=normal"]);
  return {
    branch,
    head,
    clean: porcelain.length === 0,
    porcelain,
  };
}

function preflightControlRepo() {
  const cwd = realDir(process.cwd());
  const control = realDir(CONTROL_REPO);
  if (cwd !== control) {
    fail(`BLOCKED_SAFE: Executa aquest bridge des de ${CONTROL_REPO}. cwd actual: ${cwd}`);
  }

  if (fs.existsSync(KILL_SWITCH_FILE)) {
    fail(`BLOCKED_SAFE: bridge desactivat via kill switch (${KILL_SWITCH_FILE}).`);
  }

  const state = gitState(CONTROL_REPO);
  if (state.branch !== "main") {
    fail(`BLOCKED_SAFE: el repositori de control ha d'estar a 'main' (actual: ${state.branch}).`);
  }
  if (!state.clean) {
    const firstLine = state.porcelain.split("\n").filter(Boolean).slice(0, 1).join("");
    fail(`BLOCKED_SAFE: el repositori de control ha d'estar net. Exemple pendent: ${firstLine}`);
  }
  return state;
}

function findLatestCodexWorktree() {
  const raw = gitText(CONTROL_REPO, ["worktree", "list", "--porcelain"]);
  const blocks = raw
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean);

  const candidates = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    let worktreePath = "";
    let branchRef = "";

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        worktreePath = line.slice("worktree ".length).trim();
      } else if (line.startsWith("branch ")) {
        branchRef = line.slice("branch ".length).trim();
      }
    }

    if (!worktreePath || !branchRef.startsWith("refs/heads/codex/")) {
      continue;
    }

    const branch = branchRef.replace("refs/heads/", "");
    if (realDir(worktreePath) === realDir(CONTROL_REPO)) {
      continue;
    }

    let score = 0;
    try {
      const statTarget = path.join(worktreePath, ".git");
      score = fs.statSync(statTarget).mtimeMs;
    } catch {
      score = 0;
    }

    candidates.push({ branch, worktreePath, score });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function createCodexWorktree() {
  const result = run("bash", ["scripts/worktree.sh", "create"], { cwd: CONTROL_REPO });
  if (result.error) {
    fail(`No s'ha pogut crear worktree: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const details = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    fail(`BLOCKED_SAFE: error creant worktree codex/*\n${details}`);
  }

  const combined = `${result.stdout || ""}\n${result.stderr || ""}`;
  const branchMatch = combined.match(/Branca de tasca creada:\s*(codex\/[^\s]+)/);
  const pathMatch = combined.match(/Worktree creat:\s*(.+)/);
  if (!branchMatch || !pathMatch) {
    fail("BLOCKED_SAFE: no s'ha pogut parsejar la sortida de creació de worktree.");
  }

  return {
    branch: branchMatch[1].trim(),
    worktreePath: pathMatch[1].trim(),
    createdNow: true,
  };
}

function ensureCodexWorktree() {
  const existing = findLatestCodexWorktree();
  if (existing) {
    return { ...existing, createdNow: false };
  }
  return createCodexWorktree();
}

function detectSensitiveIntents(order) {
  const normalized = order.toLowerCase();
  const wantsAcabat =
    /\bnpm\s+run\s+acabat\b/.test(normalized) || /\bacabat\b/.test(normalized);
  const wantsPublica =
    /\bnpm\s+run\s+publica\b/.test(normalized) ||
    /\bautoritzo deploy\b/.test(normalized) ||
    /\bpublica\b/.test(normalized);

  return { wantsAcabat, wantsPublica };
}

function enforceOrderGuardrails(order) {
  const { wantsAcabat, wantsPublica } = detectSensitiveIntents(order);
  const hasAcabatKeyword = order.includes(CEO_ACABAT_KEYWORD);
  const hasPublicaKeyword = order.includes(CEO_PUBLICA_KEYWORD);

  if (wantsAcabat && !hasAcabatKeyword) {
    fail(
      `BLOCKED_SAFE: ordre amb 'acabat' sense keyword CEO (${CEO_ACABAT_KEYWORD}).`,
    );
  }
  if (wantsPublica && !hasPublicaKeyword) {
    fail(
      `BLOCKED_SAFE: ordre amb 'publica/deploy' sense keyword CEO (${CEO_PUBLICA_KEYWORD}).`,
    );
  }

  return { wantsAcabat, wantsPublica, hasAcabatKeyword, hasPublicaKeyword };
}

function ensureBridgeDir() {
  fs.mkdirSync(BRIDGE_DIR, { recursive: true });
}

function writeInbox(order, context) {
  const lines = [
    `timestamp=${new Date().toISOString()}`,
    `control_repo=${CONTROL_REPO}`,
    `worktree=${context.worktreePath}`,
    `branch=${context.branch}`,
    "",
    order,
    "",
  ];
  fs.writeFileSync(INBOX_FILE, lines.join("\n"), "utf8");
}

function buildPrompt(order, context, policy) {
  const acabatAllowed = policy.wantsAcabat && policy.hasAcabatKeyword;
  const publicaAllowed = policy.wantsPublica && policy.hasPublicaKeyword;

  return `
Ets un executor dins un bridge local amb govern estricte.

REGLES NO NEGOCIABLES:
1) Treballa només al worktree actual: ${context.worktreePath}
2) Verifica al principi que la branca actual comenci per codex/. Si no, retorna BLOCKED_SAFE i para.
3) Prohibit fer commit automàtic, push automàtic o deploy automàtic.
4) Prohibit executar npm run acabat sense keyword CEO '${CEO_ACABAT_KEYWORD}'.
5) Prohibit executar npm run publica o qualsevol deploy sense keyword CEO '${CEO_PUBLICA_KEYWORD}'.
6) Abans de qualsevol petició d'OK al CEO, has d'imprimir el bloc següent (text exacte):
RESUM CEO (OBLIGATORI)
- Què s'ha fet:
- Implicació per l'entitat:
- Risc i control:
- Següent pas recomanat:
7) Encara que no demanis OK, imprimeix igualment el bloc RESUM CEO (OBLIGATORI) al final.
8) No toquis el flux de deploy existent.

PERMISOS TEMPORALS PER AQUESTA ORDRE:
- Permís acabat: ${acabatAllowed ? "SI (keyword validada)" : "NO"}
- Permís publica/deploy: ${publicaAllowed ? "SI (keyword validada)" : "NO"}

ORDRE LITERAL DEL CEO:
${order}

FORMAT DE SORTIDA:
- Llista breu d'accions fetes
- Bloc RESUM CEO (OBLIGATORI)
- Estat final (No en producció | Preparat per producció | A producció)
`.trim();
}

function writeOutboxFallback(text) {
  fs.writeFileSync(OUTBOX_FILE, `${text.trim()}\n`, "utf8");
}

function readOutboxSafe() {
  try {
    return fs.readFileSync(OUTBOX_FILE, "utf8");
  } catch {
    return "";
  }
}

function hasMandatorySummary(outboxText) {
  return outboxText.includes("RESUM CEO (OBLIGATORI)");
}

function runCodexExec(prompt, worktreePath) {
  const args = [
    "exec",
    "-C",
    worktreePath,
    "--sandbox",
    "workspace-write",
    "--color",
    "never",
    "-o",
    OUTBOX_FILE,
    "-",
  ];

  return run("codex", args, {
    cwd: CONTROL_REPO,
    input: prompt,
    timeout: 1000 * 60 * 20,
    maxBuffer: 1024 * 1024 * 50,
  });
}

function writeLastRun(payload) {
  fs.writeFileSync(LAST_RUN_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function main() {
  const startedAt = new Date();
  const { order, queueOnly } = parseArgs(process.argv.slice(2));

  const controlBefore = preflightControlRepo();
  const policy = enforceOrderGuardrails(order);
  const worktree = ensureCodexWorktree();
  const worktreeBefore = gitState(worktree.worktreePath);

  if (!worktreeBefore.branch.startsWith("codex/")) {
    fail(
      `BLOCKED_SAFE: el worktree seleccionat no està a codex/* (actual: ${worktreeBefore.branch}).`,
    );
  }

  ensureBridgeDir();
  writeInbox(order, worktree);

  let mode = "queue-only";
  let codexExitCode = 0;
  let codexStdout = "";
  let codexStderr = "";
  let codexErrorMessage = "";

  if (!queueOnly) {
    const prompt = buildPrompt(order, worktree, policy);
    const codexResult = runCodexExec(prompt, worktree.worktreePath);
    mode = "codex-exec";
    codexExitCode = codexResult.status === null ? 1 : codexResult.status;
    codexStdout = codexResult.stdout || "";
    codexStderr = codexResult.stderr || "";
    codexErrorMessage = codexResult.error ? codexResult.error.message : "";

    if (codexResult.error) {
      writeOutboxFallback(
        `BLOCKED_SAFE: error executant codex exec\n${codexErrorMessage}`,
      );
    } else if (!fs.existsSync(OUTBOX_FILE)) {
      const combined = [codexStdout, codexStderr].filter(Boolean).join("\n").trim();
      writeOutboxFallback(
        `BLOCKED_SAFE: codex exec no ha generat outbox.\n${combined}`,
      );
    }
  } else {
    writeOutboxFallback(
      "Queue only activat. Ordre desada a inbox; codex no s'ha executat.",
    );
  }

  const outboxText = readOutboxSafe();
  const summaryPresent = hasMandatorySummary(outboxText);

  const worktreeAfter = gitState(worktree.worktreePath);
  const controlAfter = gitState(CONTROL_REPO);

  const policyViolations = [];
  if (mode === "codex-exec" && worktreeAfter.head !== worktreeBefore.head) {
    policyViolations.push(
      "S'ha detectat un commit automàtic (HEAD del worktree ha canviat).",
    );
  }
  if (controlAfter.head !== controlBefore.head) {
    policyViolations.push("S'ha detectat canvi de HEAD al repositori de control.");
  }
  if (controlAfter.branch !== "main") {
    policyViolations.push("El repositori de control ha deixat d'estar a main.");
  }
  if (!controlAfter.clean) {
    policyViolations.push("El repositori de control ha quedat brut després de l'execució.");
  }
  if (mode === "codex-exec" && !summaryPresent) {
    policyViolations.push("Sortida sense bloc obligatori 'RESUM CEO (OBLIGATORI)'.");
  }

  const finishedAt = new Date();
  const lastRun = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    mode,
    controlRepo: CONTROL_REPO,
    worktreePath: worktree.worktreePath,
    worktreeBranch: worktree.branch,
    worktreeCreatedNow: worktree.createdNow,
    files: {
      inbox: INBOX_FILE,
      outbox: OUTBOX_FILE,
      lastRun: LAST_RUN_FILE,
      killSwitch: KILL_SWITCH_FILE,
    },
    order,
    keywords: {
      acabat: CEO_ACABAT_KEYWORD,
      publica: CEO_PUBLICA_KEYWORD,
      hasAcabatKeyword: policy.hasAcabatKeyword,
      hasPublicaKeyword: policy.hasPublicaKeyword,
    },
    guardrails: {
      cwdMatchesControlRepo: true,
      controlMainBefore: controlBefore.branch === "main",
      controlCleanBefore: controlBefore.clean,
      mandatorySummaryPresent: summaryPresent,
      policyViolations,
    },
    codex: {
      exitCode: codexExitCode,
      stdoutTail: codexStdout.slice(-4000),
      stderrTail: codexStderr.slice(-4000),
      error: codexErrorMessage,
    },
    gitBefore: {
      control: controlBefore,
      worktree: worktreeBefore,
    },
    gitAfter: {
      control: controlAfter,
      worktree: worktreeAfter,
    },
  };
  writeLastRun(lastRun);

  if (policyViolations.length > 0) {
    fail(`BLOCKED_SAFE: ${policyViolations.join(" | ")}`);
  }

  if (mode === "codex-exec" && codexExitCode !== 0) {
    fail(
      `BLOCKED_SAFE: codex exec ha fallat (exit=${codexExitCode}). Revisa ${OUTBOX_FILE} i ${LAST_RUN_FILE}.`,
    );
  }

  process.stdout.write(
    `OK: bridge completat (${mode}). Inbox: ${INBOX_FILE} | Outbox: ${OUTBOX_FILE} | Last run: ${LAST_RUN_FILE}\n`,
  );
}

main();
