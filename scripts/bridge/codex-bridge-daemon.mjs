#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CONTROL_REPO = "/Users/raulvico/Documents/summa-social";
const BRIDGE_DIR = path.join(CONTROL_REPO, "tmp", "bridge");
const INBOX_FILE = path.join(BRIDGE_DIR, "inbox.txt");
const OUTBOX_FILE = path.join(BRIDGE_DIR, "outbox.txt");
const LAST_RUN_FILE = path.join(BRIDGE_DIR, "last-run.json");
const TELEGRAM_OFFSET_FILE = path.join(BRIDGE_DIR, "telegram-offset.txt");
const POLL_INTERVAL_MS = 1500;
const LABEL = "com.summa.codexbridge";
const TELEGRAM_CHAT_ID = "68198321";
const TELEGRAM_MAX_LINES = 20;
const TELEGRAM_MAX_TEXT = 3900;
const TELEGRAM_PREFIX_REGEX = /^\s*(inicia\s*:|house\b\s*:)/i;
const TELEGRAM_POLL_INTERVAL_MS = 2500;
const TELEGRAM_CURL_MAX_TIME_SECONDS = 12;
const TELEGRAM_CURL_CONNECT_TIMEOUT_SECONDS = 5;
const HOUSE_PREFIX_REGEX = /^\s*House\b/i;
const DEFAULT_CODEX_EXEC_TIMEOUT_MS = 1000 * 60 * 3;
const CODEX_EXEC_TIMEOUT_MS = (() => {
  const raw = process.env.CODEX_BRIDGE_CODEX_TIMEOUT_MS || "";
  const parsed = Number.parseInt(String(raw).trim(), 10);
  if (Number.isFinite(parsed) && parsed >= 1000) {
    return parsed;
  }
  return DEFAULT_CODEX_EXEC_TIMEOUT_MS;
})();
const CODEX_CLI_FALLBACKS = [
  "/Applications/Codex.app/Contents/Resources/codex",
  "/usr/local/bin/codex",
];

const RISK_ALT_PATTERNS = [
  /\bfiscal\b/i,
  /\bremes[ae]s?\b/i,
  /\bdevoluc/i,
  /\bdonants?\b/i,
  /\bsepa\b/i,
  /\bmodel\s*182\b/i,
  /\bmodel\s*347\b/i,
  /src\/app\/api\//i,
  /src\/lib\/fiscal\//i,
  /src\/lib\/sepa\//i,
  /src\/lib\/remittances\//i,
  /firestore\.rules/i,
  /storage\.rules/i,
];

const PROHIBITED_PATTERNS = [
  /\bnpm\s+run\s+acabat\b/i,
  /\bnpm\s+run\s+publica\b/i,
  /\bautoritzo deploy\b/i,
  /\bgit\s+push\b/i,
];

let processing = false;
let inboxReadErrorLogged = false;
let telegramTokenMissingLogged = false;
let lastTelegramPollAt = 0;
const EXTRA_PATH_ENTRIES = [
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/Users/raulvico/.npm-global/bin",
  "/Users/raulvico/.local/bin",
  "/Users/raulvico/bin",
];

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function run(command, args, options = {}) {
  const currentPath = (options.env?.PATH ?? process.env.PATH ?? "").trim();
  const mergedPathEntries = [...EXTRA_PATH_ENTRIES];
  if (currentPath) {
    mergedPathEntries.push(...currentPath.split(":"));
  }
  const normalizedPath = Array.from(
    new Set(
      mergedPathEntries
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).join(":");

  return spawnSync(command, args, {
    encoding: "utf8",
    env: {
      ...process.env,
      ...(options.env || {}),
      PATH: normalizedPath,
    },
    ...options,
  });
}

function runSafe(command, args, options = {}) {
  const result = run(command, args, options);
  if (result.error) {
    const timedOut =
      result.error?.code === "ETIMEDOUT" ||
      /timed out/i.test(result.error?.message || "");
    const stderrParts = [];
    if (result.error?.message) {
      stderrParts.push(result.error.message);
    }
    if (result.stderr) {
      stderrParts.push(result.stderr);
    }
    return {
      ok: false,
      exitCode: result.status ?? -1,
      stdout: result.stdout || "",
      stderr: stderrParts.join("\n").trim(),
      signal: result.signal ?? null,
      timedOut,
    };
  }
  return {
    ok: result.status === 0,
    exitCode: result.status ?? -1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    signal: result.signal ?? null,
    timedOut: false,
  };
}

function ensureBridgeDir() {
  fs.mkdirSync(BRIDGE_DIR, { recursive: true });
}

function logLine(message) {
  process.stdout.write(`[codex-bridge-daemon] ${message}\n`);
}

function writeOutbox(text) {
  fs.writeFileSync(OUTBOX_FILE, `${text.trim()}\n`, "utf8");
}

function writeLastRun(payload) {
  fs.writeFileSync(LAST_RUN_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function parseSimpleEnvFile(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) {
    return vars;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function getTelegramToken() {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    return process.env.TELEGRAM_BOT_TOKEN;
  }
  const localEnv = parseSimpleEnvFile(path.join(CONTROL_REPO, ".env.local"));
  if (localEnv.TELEGRAM_BOT_TOKEN) {
    return localEnv.TELEGRAM_BOT_TOKEN;
  }
  const env = parseSimpleEnvFile(path.join(CONTROL_REPO, ".env"));
  if (env.TELEGRAM_BOT_TOKEN) {
    return env.TELEGRAM_BOT_TOKEN;
  }
  return "";
}

function trimTelegramText(text) {
  if (text.length <= TELEGRAM_MAX_TEXT) {
    return text;
  }
  return `${text.slice(0, TELEGRAM_MAX_TEXT - 16)}\n... [truncat]`;
}

function extractResumCeoBlock(outbox) {
  const lines = outbox.split(/\r?\n/);
  const start = lines.findIndex((line) => line.includes("RESUM CEO (OBLIGATORI)"));
  if (start < 0) {
    return "";
  }

  const block = [lines[start]];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "") {
      block.push(line);
      continue;
    }
    if (trimmed.startsWith("-")) {
      block.push(line);
      continue;
    }
    break;
  }

  while (block.length > 0 && block[block.length - 1].trim() === "") {
    block.pop();
  }

  return block.join("\n").trim();
}

function firstOutboxLines(outbox, maxLines = TELEGRAM_MAX_LINES) {
  return outbox.split(/\r?\n/).slice(0, maxLines).join("\n").trim();
}

function buildTechnicalTelegramMessage(result, outbox) {
  const lines = [];
  lines.push(`Bridge daemon ${LABEL}`);
  lines.push(`Estat: ${result.status ?? "ERROR"}`);
  if (result.worktree?.branch) {
    lines.push(`Worktree: ${result.worktree.branch}`);
  } else if (result.worktree?.worktreePath) {
    lines.push(`Worktree: ${path.basename(result.worktree.worktreePath)}`);
  } else {
    lines.push("Worktree: no creat");
  }
  lines.push("");
  if (outbox.trim()) {
    lines.push(`Outbox (primeres ${TELEGRAM_MAX_LINES} linies):`);
    lines.push(firstOutboxLines(outbox));
  } else {
    lines.push("Outbox: no disponible");
  }
  return trimTelegramText(lines.join("\n").trim());
}

function buildTelegramMessage(result) {
  const outbox = readOutbox();
  const resumBlock = extractResumCeoBlock(outbox);
  if (resumBlock) {
    return trimTelegramText(resumBlock);
  }
  return buildTechnicalTelegramMessage(result, outbox);
}

function baseTelegramCurlArgs() {
  return [
    "--http1.1",
    "--ipv4",
    "--connect-timeout",
    String(TELEGRAM_CURL_CONNECT_TIMEOUT_SECONDS),
    "--max-time",
    String(TELEGRAM_CURL_MAX_TIME_SECONDS),
    "--retry",
    "2",
    "--retry-delay",
    "1",
    "--retry-connrefused",
  ];
}

function sendTelegramMessage(text) {
  const token = getTelegramToken();
  if (!token) {
    return {
      ok: false,
      reason: "Falta TELEGRAM_BOT_TOKEN (entorn o .env.local/.env).",
    };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const result = runSafe(
    "curl",
    [
      "-sS",
      ...baseTelegramCurlArgs(),
      "-X",
      "POST",
      url,
      "--data-urlencode",
      `chat_id=${TELEGRAM_CHAT_ID}`,
      "--data-urlencode",
      `text=${text}`,
    ],
    { cwd: CONTROL_REPO },
  );

  if (!result.ok) {
    return {
      ok: false,
      reason: result.stderr || result.stdout || "Error enviant missatge Telegram.",
    };
  }

  let payload = null;
  try {
    payload = JSON.parse(result.stdout || "{}");
  } catch {
    return {
      ok: false,
      reason: "Resposta Telegram no parsejable.",
      raw: result.stdout,
    };
  }

  if (payload?.ok !== true) {
    return {
      ok: false,
      reason: payload?.description || "Telegram resposta no OK.",
      raw: payload,
    };
  }

  return {
    ok: true,
    messageId: payload?.result?.message_id ?? null,
  };
}

function notifyTelegramForResult(result, force = false) {
  if (!force && !result?.notifyTelegram) {
    return {
      sent: false,
      skipped: true,
      reason: "Execucio preflight/queue: no es notifica.",
    };
  }

  const text = buildTelegramMessage(result);
  const sent = sendTelegramMessage(text);
  if (!sent.ok) {
    return {
      sent: false,
      skipped: false,
      reason: sent.reason,
      raw: sent.raw ?? null,
    };
  }

  return {
    sent: true,
    skipped: false,
    messageId: sent.messageId,
  };
}

function readTelegramOffset() {
  try {
    const raw = fs.readFileSync(TELEGRAM_OFFSET_FILE, "utf8").trim();
    if (!raw) {
      return 0;
    }
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeTelegramOffset(offset) {
  fs.writeFileSync(TELEGRAM_OFFSET_FILE, `${offset}\n`, "utf8");
}

function getTelegramUpdates(offset) {
  const token = getTelegramToken();
  if (!token) {
    if (!telegramTokenMissingLogged) {
      logLine("telegram polling desactivat: falta TELEGRAM_BOT_TOKEN");
      telegramTokenMissingLogged = true;
    }
    return {
      ok: false,
      reason: "missing-token",
      updates: [],
    };
  }
  telegramTokenMissingLogged = false;

  const url = `https://api.telegram.org/bot${token}/getUpdates`;
  const result = runSafe(
    "curl",
    [
      "-sS",
      ...baseTelegramCurlArgs(),
      "-X",
      "POST",
      url,
      "--data-urlencode",
      `offset=${offset}`,
      "--data-urlencode",
      "timeout=0",
      "--data-urlencode",
      "allowed_updates=[\"message\"]",
    ],
    { cwd: CONTROL_REPO },
  );

  if (!result.ok) {
    return {
      ok: false,
      reason: result.stderr || result.stdout || "telegram getUpdates error",
      updates: [],
    };
  }

  let payload = null;
  try {
    payload = JSON.parse(result.stdout || "{}");
  } catch {
    return {
      ok: false,
      reason: "Resposta Telegram no parsejable a getUpdates.",
      updates: [],
    };
  }

  if (payload?.ok !== true || !Array.isArray(payload?.result)) {
    return {
      ok: false,
      reason: payload?.description || "Telegram getUpdates no OK.",
      updates: [],
    };
  }

  return {
    ok: true,
    reason: "",
    updates: payload.result,
  };
}

function extractTelegramOrder(update) {
  const message = update?.message ?? null;
  if (!message) {
    return null;
  }

  const chatId = String(message?.chat?.id ?? "");
  if (chatId !== TELEGRAM_CHAT_ID) {
    return null;
  }

  if (typeof message.text !== "string") {
    return null;
  }

  const text = message.text.trim();
  if (!TELEGRAM_PREFIX_REGEX.test(text)) {
    return null;
  }

  return {
    order: text,
    chatId,
    updateId: Number(update.update_id) || 0,
    messageId: Number(message.message_id) || 0,
  };
}

function shouldPollTelegramNow() {
  return Date.now() - lastTelegramPollAt >= TELEGRAM_POLL_INTERVAL_MS;
}

function pollTelegramCommands() {
  try {
    if (!shouldPollTelegramNow()) {
      return {
        polled: false,
        processed: 0,
      };
    }
    lastTelegramPollAt = Date.now();

    const offset = readTelegramOffset();
    const updatesResult = getTelegramUpdates(offset);
    if (!updatesResult.ok) {
      if (updatesResult.reason !== "missing-token") {
        logLine(`telegram polling error: ${updatesResult.reason}`);
      }
      return {
        polled: true,
        processed: 0,
        error: updatesResult.reason,
      };
    }

    let maxUpdateId = offset - 1;
    let processed = 0;

    for (const update of updatesResult.updates) {
      const updateId = Number(update?.update_id) || 0;
      if (updateId > maxUpdateId) {
        maxUpdateId = updateId;
      }

      const extracted = extractTelegramOrder(update);
      if (!extracted) {
        continue;
      }

      logLine(`ordre telegram detectada (update=${extracted.updateId})`);
      const result = processOrder(extracted.order);
      const telegram = notifyTelegramForResult(result, true);
      if (telegram.sent) {
        logLine(`telegram resposta enviada (update=${extracted.updateId})`);
      } else {
        logLine(`telegram resposta no enviada: ${telegram.reason}`);
      }
      writeLastRun({
        ...result,
        source: "telegram",
        telegramCommand: {
          updateId: extracted.updateId,
          messageId: extracted.messageId,
          chatId: extracted.chatId,
        },
        telegram,
      });
      processed += 1;
    }

    if (maxUpdateId >= offset) {
      writeTelegramOffset(maxUpdateId + 1);
    }

    return {
      polled: true,
      processed,
    };
  } catch (error) {
    logLine(`telegram polling excepcio: ${error.message}`);
    return {
      polled: true,
      processed: 0,
      error: error.message,
    };
  }
}

function clearInbox() {
  fs.writeFileSync(INBOX_FILE, "", "utf8");
}

function readInboxOrder() {
  try {
    const raw = fs.readFileSync(INBOX_FILE, "utf8");
    inboxReadErrorLogged = false;
    return raw.trim();
  } catch (error) {
    if (!inboxReadErrorLogged) {
      logLine(`error llegint inbox (${INBOX_FILE}): ${error.message}`);
      inboxReadErrorLogged = true;
    }
    return "";
  }
}

function gitText(repoDir, args) {
  const result = runSafe("git", ["-C", repoDir, ...args]);
  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || "git command failed");
  }
  return result.stdout.trim();
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

function detectAltRisk(order) {
  return RISK_ALT_PATTERNS.find((pattern) => pattern.test(order)) || null;
}

function detectProhibited(order) {
  return PROHIBITED_PATTERNS.find((pattern) => pattern.test(order)) || null;
}

function isHouseOrder(order) {
  return HOUSE_PREFIX_REGEX.test(order);
}

function listChangedFiles(repoDir) {
  const chunks = [];

  const unstaged = runSafe("git", ["-C", repoDir, "diff", "--name-only"]);
  if (unstaged.ok && unstaged.stdout.trim()) {
    chunks.push(unstaged.stdout.trim());
  }

  const staged = runSafe("git", ["-C", repoDir, "diff", "--cached", "--name-only"]);
  if (staged.ok && staged.stdout.trim()) {
    chunks.push(staged.stdout.trim());
  }

  const untracked = runSafe("git", ["-C", repoDir, "ls-files", "--others", "--exclude-standard"]);
  if (untracked.ok && untracked.stdout.trim()) {
    chunks.push(untracked.stdout.trim());
  }

  const files = new Set();
  for (const chunk of chunks) {
    for (const line of chunk.split(/\r?\n/)) {
      const file = line.trim();
      if (file) {
        files.add(file);
      }
    }
  }

  return Array.from(files).sort((a, b) => a.localeCompare(b));
}

function isAllowedHousePath(filePath) {
  return (
    /^docs\/BRIDGE-[^/]*\.md$/i.test(filePath) ||
    /^docs\/bridge/i.test(filePath) ||
    /^scripts\/bridge\//i.test(filePath)
  );
}

function normalizeHouseCommitMessage(order) {
  const stripped = order.replace(HOUSE_PREFIX_REGEX, "").replace(/^[:\s-]+/, "").trim();
  if (!stripped) {
    return "chore(bridge): housekeeping docs bridge";
  }
  const oneLine = stripped.replace(/\s+/g, " ").slice(0, 96).trim();
  return `chore(bridge): ${oneLine}`;
}

function runHousekeepingOrder(order, base, controlBefore) {
  const forbiddenHouseOps =
    /\bgit\s+push\b/i.test(order) ||
    /\bnpm\s+run\s+publica\b/i.test(order) ||
    /\bnpm\s+run\s+acabat\b/i.test(order) ||
    /\bdeploy\b/i.test(order) ||
    /\bcodex\s+exec\b/i.test(order) ||
    /\bworktree\b/i.test(order);

  if (forbiddenHouseOps) {
    const reason = "BLOCKED_SAFE: ordre House amb operacio prohibida (push/deploy/worktree/codex-exec).";
    writeOutbox(reason);
    return finalizeLastRun(base, {
      status: "BLOCKED_SAFE",
      reason,
      notifyTelegram: true,
      guardrails: { houseMode: true, forbiddenHouseOps: true },
      gitBefore: { control: controlBefore },
    });
  }

  const changedFiles = listChangedFiles(CONTROL_REPO);
  if (changedFiles.length === 0) {
    const out = [
      "Housekeeping sense canvis.",
      "No hi havia fitxers pendents dins l allowlist House.",
    ].join("\n");
    writeOutbox(out);
    return finalizeLastRun(base, {
      status: "SUCCESS",
      reason: "Housekeeping sense canvis.",
      notifyTelegram: true,
      guardrails: { houseMode: true, noChanges: true },
      gitBefore: { control: controlBefore },
      gitAfter: { control: gitState(CONTROL_REPO) },
    });
  }

  const houseCandidates = changedFiles.filter((f) => isAllowedHousePath(f));
  const disallowed = changedFiles.filter((f) => !isAllowedHousePath(f));
  if (disallowed.length > 0) {
    const reason = `BLOCKED_SAFE: House bloquejat. Fitxers fora d allowlist: ${disallowed.slice(0, 8).join(", ")}`;
    writeOutbox(reason);
    return finalizeLastRun(base, {
      status: "BLOCKED_SAFE",
      reason,
      notifyTelegram: true,
      guardrails: { houseMode: true, disallowedPaths: disallowed },
      gitBefore: { control: controlBefore },
    });
  }

  if (houseCandidates.length === 0) {
    const reason =
      "BLOCKED_SAFE: House no te canvis dins l allowlist (docs/BRIDGE-*.md, docs/bridge*, scripts/bridge/).";
    writeOutbox(reason);
    return finalizeLastRun(base, {
      status: "BLOCKED_SAFE",
      reason,
      notifyTelegram: true,
      guardrails: { houseMode: true, noHouseCandidates: true },
      gitBefore: { control: controlBefore },
    });
  }

  const addResult = runSafe("git", ["-C", CONTROL_REPO, "add", "--", ...houseCandidates]);
  if (!addResult.ok) {
    const reason = `BLOCKED_SAFE: error a git add en House (${addResult.stderr || addResult.stdout})`;
    writeOutbox(reason);
    return finalizeLastRun(base, {
      status: "BLOCKED_SAFE",
      reason,
      notifyTelegram: true,
      guardrails: { houseMode: true, addFailed: true },
      gitBefore: { control: controlBefore },
    });
  }

  const stagedAfterAdd = runSafe("git", [
    "-C",
    CONTROL_REPO,
    "diff",
    "--cached",
    "--name-only",
  ]);
  const stagedFiles = (stagedAfterAdd.stdout || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (stagedFiles.length === 0) {
    const reason = "BLOCKED_SAFE: House no ha deixat canvis staged.";
    writeOutbox(reason);
    return finalizeLastRun(base, {
      status: "BLOCKED_SAFE",
      reason,
      notifyTelegram: true,
      guardrails: { houseMode: true, emptyStage: true },
      gitBefore: { control: controlBefore },
    });
  }

  const stagedDisallowed = stagedFiles.filter((f) => !isAllowedHousePath(f));
  if (stagedDisallowed.length > 0) {
    const reason = `BLOCKED_SAFE: staged fora de docs/bridge* en House: ${stagedDisallowed.join(", ")}`;
    writeOutbox(reason);
    return finalizeLastRun(base, {
      status: "BLOCKED_SAFE",
      reason,
      notifyTelegram: true,
      guardrails: { houseMode: true, stagedDisallowed },
      gitBefore: { control: controlBefore },
    });
  }

  const commitMessage = normalizeHouseCommitMessage(order);
  const commitResult = runSafe("git", ["-C", CONTROL_REPO, "commit", "-m", commitMessage]);
  if (!commitResult.ok) {
    const reason = `BLOCKED_SAFE: error a git commit en House (${commitResult.stderr || commitResult.stdout})`;
    writeOutbox(reason);
    return finalizeLastRun(base, {
      status: "BLOCKED_SAFE",
      reason,
      notifyTelegram: true,
      guardrails: { houseMode: true, commitFailed: true },
      gitBefore: { control: controlBefore },
    });
  }

  const controlAfter = gitState(CONTROL_REPO);
  const outbox = [
    "Housekeeping completat.",
    `Commit: ${commitMessage}`,
    `Fitxers: ${stagedFiles.join(", ")}`,
    "Guardrail: sense worktree, sense codex exec, sense push, sense deploy.",
  ].join("\n");
  writeOutbox(outbox);

  return finalizeLastRun(base, {
    status: "SUCCESS",
    reason: "Housekeeping aplicat.",
    notifyTelegram: true,
    guardrails: { houseMode: true, policyViolations: [] },
    gitBefore: { control: controlBefore },
    gitAfter: { control: controlAfter },
    housekeeping: {
      commitMessage,
      files: stagedFiles,
    },
  });
}

function parseCreatedWorktree(stdout, stderr) {
  const combined = `${stdout}\n${stderr}`;
  const branchMatch = combined.match(/Branca de tasca creada:\s*(codex\/[^\s]+)/);
  const pathMatch = combined.match(/Worktree creat:\s*(.+)/);
  if (!branchMatch || !pathMatch) {
    return null;
  }
  return {
    branch: branchMatch[1].trim(),
    worktreePath: pathMatch[1].trim(),
  };
}

function createWorktree() {
  const result = runSafe("bash", ["scripts/worktree.sh", "create"], { cwd: CONTROL_REPO });
  if (!result.ok) {
    return {
      ok: false,
      reason: `Error creant worktree codex/*: ${(result.stderr || result.stdout).trim()}`,
      result,
    };
  }
  const parsed = parseCreatedWorktree(result.stdout, result.stderr);
  if (!parsed) {
    return {
      ok: false,
      reason: "No s'ha pogut parsejar la sortida de creacio de worktree.",
      result,
    };
  }
  return { ok: true, ...parsed, result };
}

function buildPrompt(order, worktreePath) {
  return `
Ets un executor del daemon local ${LABEL}.

RESTRICCIONS DURES:
1) Treballa nomes al worktree actual: ${worktreePath}
2) La branca activa ha de ser codex/* o retorna BLOCKED_SAFE.
3) Prohibit commit automatic, push automatic o deploy automatic.
4) Prohibit executar npm run acabat.
5) Prohibit executar npm run publica.
6) Abans de qualsevol peticio d'OK al CEO, imprimeix aquest bloc:
RESUM CEO (OBLIGATORI)
- Que s'ha fet:
- Implicacio per l'entitat:
- Risc i control:
- Seguent pas recomanat:
7) Encara que no demanis OK, imprimeix igualment el bloc RESUM CEO (OBLIGATORI) al final.

ORDRE:
${order}

FORMAT FINAL:
- Accions fetes (breu)
- RESUM CEO (OBLIGATORI)
- Estat final (No en produccio | Preparat per produccio | A produccio)
`.trim();
}

function executeCodex(order, worktreePath) {
  const codexBinary = resolveCodexBinary();
  if (!codexBinary) {
    return {
      ok: false,
      exitCode: -1,
      stdout: "",
      stderr: "codex-cli-not-found",
    };
  }

  const prompt = buildPrompt(order, worktreePath);
  return runSafe(
    codexBinary,
    [
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
    ],
    {
      cwd: CONTROL_REPO,
      input: prompt,
      timeout: CODEX_EXEC_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 50,
    },
  );
}

function resolveCodexBinary() {
  const probe = runSafe("which", ["codex"]);
  const fromPath = (probe.stdout || "").trim();
  if (probe.ok && fromPath) {
    return fromPath;
  }

  for (const candidate of CODEX_CLI_FALLBACKS) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "";
}

function readOutbox() {
  try {
    return fs.readFileSync(OUTBOX_FILE, "utf8");
  } catch {
    return "";
  }
}

function statusPayloadBase(startedAt, order) {
  return {
    startedAt: startedAt.toISOString(),
    controlRepo: CONTROL_REPO,
    order,
    label: LABEL,
    files: {
      inbox: INBOX_FILE,
      outbox: OUTBOX_FILE,
      lastRun: LAST_RUN_FILE,
    },
    commandsForAudit: [
      "git -C <repo> rev-parse --abbrev-ref HEAD",
      "git -C <repo> status --porcelain --untracked-files=normal",
      "bash scripts/worktree.sh create",
      `codex exec -C <worktree> --sandbox workspace-write -o tmp/bridge/outbox.txt - (timeout=${CODEX_EXEC_TIMEOUT_MS}ms)`,
    ],
  };
}

function finalizeLastRun(base, updates) {
  const finishedAt = new Date();
  const payload = {
    ...base,
    ...updates,
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - Date.parse(base.startedAt),
  };
  writeLastRun(payload);
  return payload;
}

function processOrder(order) {
  const startedAt = new Date();
  const base = statusPayloadBase(startedAt, order);

  try {
    const controlBefore = gitState(CONTROL_REPO);
    const houseMode = isHouseOrder(order);
    if (controlBefore.branch !== "main") {
      const reason = `BLOCKED_SAFE: repositori de control no esta a main (actual: ${controlBefore.branch}).`;
      writeOutbox(reason);
      return finalizeLastRun(base, {
        status: "BLOCKED_SAFE",
        reason,
        notifyTelegram: false,
        guardrails: { controlBranchMain: false, controlClean: controlBefore.clean },
        gitBefore: { control: controlBefore },
      });
    }

    if (houseMode) {
      return runHousekeepingOrder(order, base, controlBefore);
    }

    if (!controlBefore.clean) {
      const firstLine = controlBefore.porcelain.split("\n").filter(Boolean).slice(0, 1).join("");
      const reason = `BLOCKED_SAFE: repositori de control no net (${firstLine}).`;
      writeOutbox(reason);
      return finalizeLastRun(base, {
        status: "BLOCKED_SAFE",
        reason,
        notifyTelegram: false,
        guardrails: { controlBranchMain: true, controlClean: false },
        gitBefore: { control: controlBefore },
      });
    }

    const prohibited = detectProhibited(order);
    if (prohibited) {
      const reason = `BLOCKED_SAFE: ordre prohibida detectada (${prohibited}).`;
      writeOutbox(reason);
      return finalizeLastRun(base, {
        status: "BLOCKED_SAFE",
        reason,
        notifyTelegram: false,
        guardrails: { prohibitedOrder: true },
        gitBefore: { control: controlBefore },
      });
    }

    const altRiskPattern = detectAltRisk(order);
    if (altRiskPattern) {
      const reason = `BLOCKED_SAFE: risc ALT detectat (${altRiskPattern}).`;
      writeOutbox(reason);
      return finalizeLastRun(base, {
        status: "BLOCKED_SAFE",
        reason,
        notifyTelegram: false,
        guardrails: { risk: "ALT" },
        gitBefore: { control: controlBefore },
      });
    }

    const created = createWorktree();
    if (!created.ok) {
      const reason = `BLOCKED_SAFE: ${created.reason}`;
      writeOutbox(reason);
      return finalizeLastRun(base, {
        status: "BLOCKED_SAFE",
        reason,
        notifyTelegram: false,
        guardrails: { worktreeCreated: false },
        gitBefore: { control: controlBefore },
        worktreeCreateRaw: {
          stdout: created.result?.stdout || "",
          stderr: created.result?.stderr || "",
          exitCode: created.result?.exitCode ?? -1,
        },
      });
    }

    const worktreeBefore = gitState(created.worktreePath);
    if (!worktreeBefore.branch.startsWith("codex/")) {
      const reason = `BLOCKED_SAFE: worktree fora de codex/* (${worktreeBefore.branch}).`;
      writeOutbox(reason);
      return finalizeLastRun(base, {
        status: "BLOCKED_SAFE",
        reason,
        notifyTelegram: false,
        worktree: created,
        gitBefore: { control: controlBefore, worktree: worktreeBefore },
      });
    }

    const codex = executeCodex(order, created.worktreePath);
    if (!fs.existsSync(OUTBOX_FILE)) {
      writeOutbox(
        `BLOCKED_SAFE: codex exec no ha generat outbox.\n${(codex.stderr || codex.stdout).trim()}`,
      );
    }

    const outbox = readOutbox();
    const hasSummary = outbox.includes("RESUM CEO (OBLIGATORI)");
    const worktreeAfter = gitState(created.worktreePath);
    const controlAfter = gitState(CONTROL_REPO);

    const violations = [];
    const warnings = [];
    if (codex.exitCode !== 0) {
      const suffix = codex.timedOut
        ? " (timeout)"
        : codex.signal
          ? ` (signal=${codex.signal})`
          : "";
      if (codex.timedOut && hasSummary) {
        warnings.push(`codex exec exit=${codex.exitCode}${suffix} pero outbox complet`);
      } else {
        violations.push(`codex exec exit=${codex.exitCode}${suffix}`);
      }
    }
    if (!hasSummary) {
      violations.push("sortida sense bloc RESUM CEO (OBLIGATORI)");
    }
    if (worktreeAfter.head !== worktreeBefore.head) {
      violations.push("s'ha detectat commit automatic al worktree");
    }
    if (controlAfter.head !== controlBefore.head) {
      violations.push("canvi de HEAD al repositori de control");
    }
    if (!controlAfter.clean) {
      violations.push("repositori de control brut despres de l'execucio");
    }
    if (controlAfter.branch !== "main") {
      violations.push(`repositori de control fora de main (${controlAfter.branch})`);
    }

    if (violations.length > 0) {
      writeOutbox(`BLOCKED_SAFE: ${violations.join(" | ")}`);
      return finalizeLastRun(base, {
        status: "BLOCKED_SAFE",
        reason: violations.join(" | "),
        notifyTelegram: true,
        guardrails: { policyViolations: violations },
        worktree: created,
        gitBefore: { control: controlBefore, worktree: worktreeBefore },
        gitAfter: { control: controlAfter, worktree: worktreeAfter },
        codex: {
          exitCode: codex.exitCode,
          signal: codex.signal,
          timedOut: codex.timedOut,
          stdoutTail: codex.stdout.slice(-4000),
          stderrTail: codex.stderr.slice(-4000),
        },
      });
    }

    return finalizeLastRun(base, {
      status: "SUCCESS",
      reason: "ordre processada correctament",
      notifyTelegram: true,
      guardrails: { policyViolations: [], warnings },
      worktree: created,
      gitBefore: { control: controlBefore, worktree: worktreeBefore },
      gitAfter: { control: controlAfter, worktree: worktreeAfter },
      codex: {
        exitCode: codex.exitCode,
        signal: codex.signal,
        timedOut: codex.timedOut,
        stdoutTail: codex.stdout.slice(-4000),
        stderrTail: codex.stderr.slice(-4000),
      },
    });
  } catch (error) {
    const reason = `ERROR: excepcio al daemon (${error.message})`;
    writeOutbox(reason);
    return finalizeLastRun(base, {
      status: "ERROR",
      reason,
      notifyTelegram: false,
      guardrails: { unexpectedError: true },
      error: { message: error.message, stack: error.stack },
    });
  }
}

function tick() {
  if (processing) {
    return;
  }

  processing = true;
  try {
    const order = readInboxOrder();
    if (order) {
      logLine(`ordre detectada a inbox (${order.length} chars)`);
      const result = processOrder(order);
      const telegram = notifyTelegramForResult(result, false);
      if (telegram.sent) {
        logLine(`telegram enviat a chat ${TELEGRAM_CHAT_ID}`);
      } else if (!telegram.skipped) {
        logLine(`telegram no enviat: ${telegram.reason}`);
      }
      writeLastRun({
        ...result,
        source: "inbox",
        telegram,
      });
      logLine(`ordre processada amb estat: ${result.status}`);
      clearInbox();
    }

    const telegramPoll = pollTelegramCommands();
    if (telegramPoll.processed > 0) {
      logLine(`ordres processades des de telegram: ${telegramPoll.processed}`);
    }
  } finally {
    processing = false;
  }
}

function main() {
  if (process.argv.includes("--telegram-test")) {
    const sent = sendTelegramMessage(
      `Bridge daemon ${LABEL}\nEstat: SUCCESS\nWorktree: prova\nOutbox: prova telegram`,
    );
    if (!sent.ok) {
      fail(`TEST TELEGRAM ERROR: ${sent.reason}`);
    }
    process.stdout.write(
      `TEST TELEGRAM OK: missatge enviat a chat ${TELEGRAM_CHAT_ID} (id=${sent.messageId ?? "n/a"})\n`,
    );
    return;
  }
  if (process.argv.includes("--telegram-poll-once")) {
    process.chdir(CONTROL_REPO);
    ensureBridgeDir();
    const poll = pollTelegramCommands();
    process.stdout.write(`${JSON.stringify(poll, null, 2)}\n`);
    return;
  }

  process.chdir(CONTROL_REPO);
  ensureBridgeDir();
  if (!fs.existsSync(INBOX_FILE)) {
    fs.writeFileSync(INBOX_FILE, "", "utf8");
  }

  logLine(`daemon actiu (${LABEL}) al repo ${CONTROL_REPO}`);
  logLine(`poll interval: ${POLL_INTERVAL_MS}ms`);
  tick();
  setInterval(tick, POLL_INTERVAL_MS);
}

main();
