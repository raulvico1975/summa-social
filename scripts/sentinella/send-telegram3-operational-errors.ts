import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { parseTargetDayArg } from "./_lib/date-arg";

type OrgMeta = {
  id: string;
  slug: string | null;
  name: string | null;
};

type InstanceSpec = {
  label: string;
  slugHint: string | null;
  orgIdHint: string | null;
};

type ErrorTypeSummary = {
  label: string;
  category: "import" | "export" | "send";
  count: number;
  examples: Array<{ at: Date; desc: string }>;
};

type OrgResult = {
  label: string;
  status: "green" | "yellow" | "red";
  importsFailed: number;
  exportsFailed: number;
  sendsFailed: number;
  typeSummaries: ErrorTypeSummary[];
};

const INSTANCE_FILE = "~/summa-sentinella/instances.txt";
const MAX_EXAMPLES_PER_TYPE = 3;

function expandHome(inputPath: string): string {
  if (inputPath.startsWith("~/")) return path.join(os.homedir(), inputPath.slice(2));
  return inputPath;
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseInstanceLine(line: string): InstanceSpec | null {
  const parts = line
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const label = parts[0];
  let slugHint: string | null = null;
  let orgIdHint: string | null = null;

  for (const part of parts.slice(1)) {
    const lower = part.toLowerCase();
    if (lower.startsWith("slug=") || lower.startsWith("slug:")) {
      const value = part.slice(part.indexOf(part.includes("=") ? "=" : ":") + 1).trim();
      if (value) slugHint = value;
      continue;
    }
    if (
      lower.startsWith("orgid=") ||
      lower.startsWith("orgid:") ||
      lower.startsWith("id=") ||
      lower.startsWith("id:")
    ) {
      const value = part.slice(part.indexOf(part.includes("=") ? "=" : ":") + 1).trim();
      if (value) orgIdHint = value;
      continue;
    }
    if (!slugHint && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part)) slugHint = part;
  }

  return { label, slugHint, orgIdHint };
}

function parseInstancesFile(contents: string): InstanceSpec[] {
  const result: InstanceSpec[] = [];
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parsed = parseInstanceLine(line);
    if (parsed) result.push(parsed);
  }
  return result;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchOrganization(instance: InstanceSpec, organizations: OrgMeta[]): OrgMeta | null {
  if (instance.orgIdHint) {
    const byId = organizations.find((o) => o.id === instance.orgIdHint);
    if (byId) return byId;
  }
  if (instance.slugHint) {
    const bySlug = organizations.find((o) => o.slug === instance.slugHint);
    if (bySlug) return bySlug;
  }

  const normLabel = normalizeText(instance.label);
  const byName = organizations.filter((o) => o.name && normalizeText(o.name) === normLabel);
  if (byName.length === 1) return byName[0];

  const bySlugNorm = organizations.filter((o) => o.slug && normalizeText(o.slug) === normLabel);
  if (bySlugNorm.length === 1) return bySlugNorm[0];

  return null;
}

function toDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  if (typeof raw === "string") {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof raw === "number") {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof raw === "object" && raw !== null) {
    const maybeTs = raw as { toDate?: () => Date };
    if (typeof maybeTs.toDate === "function") {
      const parsed = maybeTs.toDate();
      if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

function madridDateTimeString(input: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(input);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function shortDateTime(input: Date): string {
  return madridDateTimeString(input);
}

function clipText(value: unknown, max = 120): string {
  if (typeof value !== "string" || !value.trim()) return "Error operatiu";
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function addTypeSummary(
  map: Map<string, ErrorTypeSummary>,
  params: {
    key: string;
    label: string;
    category: "import" | "export" | "send";
    countDelta: number;
    exampleAt: Date | null;
    exampleDesc: string;
  }
): void {
  const current = map.get(params.key) ?? {
    label: params.label,
    category: params.category,
    count: 0,
    examples: [],
  };
  current.count += params.countDelta;
  if (params.exampleAt && current.examples.length < MAX_EXAMPLES_PER_TYPE) {
    current.examples.push({ at: params.exampleAt, desc: params.exampleDesc });
  }
  map.set(params.key, current);
}

function toTs(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

async function getImportJobErrors(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  since: Date,
  until: Date,
  map: Map<string, ErrorTypeSummary>
): Promise<number> {
  const snap = await db
    .collection("organizations")
    .doc(orgId)
    .collection("importJobs")
    .where("status", "==", "error")
    .get();

  let total = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const at = toDate(data.finishedAt) ?? toDate(data.startedAt);
    if (!at || at < since || at > until) continue;

    total += 1;
    addTypeSummary(map, {
      key: "import_jobs_error",
      label: "Importació (job fallit)",
      category: "import",
      countDelta: 1,
      exampleAt: at,
      exampleDesc: clipText(data.lastError, 100),
    });
  }

  return total;
}

async function getIncidentImportExportErrors(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  since: Date,
  until: Date,
  map: Map<string, ErrorTypeSummary>
): Promise<{ imports: number; exports: number }> {
  const snap = await db.collection("systemIncidents").where("orgId", "==", orgId).get();
  let imports = 0;
  let exports = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const type = typeof data.type === "string" ? data.type : "";
    if (type !== "IMPORT_FAILURE" && type !== "EXPORT_FAILURE") continue;

    const at = toDate(data.lastSeenAt);
    if (!at || at < since || at > until) continue;

    if (type === "IMPORT_FAILURE") {
      imports += 1;
      addTypeSummary(map, {
        key: "incident_import_failure",
        label: "Importació (incident)",
        category: "import",
        countDelta: 1,
        exampleAt: at,
        exampleDesc: clipText(data.message, 100),
      });
    } else {
      exports += 1;
      addTypeSummary(map, {
        key: "incident_export_failure",
        label: "Exportació (incident)",
        category: "export",
        countDelta: 1,
        exampleAt: at,
        exampleDesc: clipText(data.message, 100),
      });
    }
  }

  return { imports, exports };
}

async function getBackupErrors(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  since: Date,
  until: Date,
  map: Map<string, ErrorTypeSummary>
): Promise<number> {
  const snap = await db
    .collection("organizations")
    .doc(orgId)
    .collection("backups")
    .where("status", "==", "error")
    .get();

  let total = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const at = toDate(data.finishedAt) ?? toDate(data.startedAt);
    if (!at || at < since || at > until) continue;

    total += 1;
    addTypeSummary(map, {
      key: "backup_export_error",
      label: "Exportació (backup fallit)",
      category: "export",
      countDelta: 1,
      exampleAt: at,
      exampleDesc: clipText(data.error, 100),
    });
  }
  return total;
}

function collectFailedRecipients(logDoc: QueryDocumentSnapshot): Array<{ at: Date | null; desc: string }> {
  const data = logDoc.data() as Record<string, unknown>;
  const at = toDate(data.updatedAt) ?? toDate(data.completedAt) ?? toDate(data.createdAt);
  const recipients = Array.isArray(data.recipients) ? data.recipients : [];
  const out: Array<{ at: Date | null; desc: string }> = [];

  for (const recipient of recipients) {
    if (!recipient || typeof recipient !== "object") continue;
    const r = recipient as Record<string, unknown>;
    if (r.status !== "failed") continue;
    const code = clipText(r.errorCode, 40);
    const email = clipText(r.email, 50);
    out.push({
      at,
      desc: `Enviament fallit (${code}) a ${email}`,
    });
  }
  return out;
}

async function getSendErrors(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  since: Date,
  until: Date,
  map: Map<string, ErrorTypeSummary>
): Promise<number> {
  const logsRef = db.collection("organizations").doc(orgId).collection("certificateEmailLogs");

  let snap: FirebaseFirestore.QuerySnapshot;
  try {
    snap = await logsRef
      .where("updatedAt", ">=", toTs(since))
      .where("updatedAt", "<=", toTs(until))
      .get();
  } catch {
    snap = await logsRef.get();
  }

  let total = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const at = toDate(data.updatedAt) ?? toDate(data.completedAt) ?? toDate(data.createdAt);
    if (!at || at < since || at > until) continue;

    const status = typeof data.status === "string" ? data.status : "";
    if (status === "failed") {
      total += 1;
      addTypeSummary(map, {
        key: "certificate_send_failed_request",
        label: "Enviament (petició fallida)",
        category: "send",
        countDelta: 1,
        exampleAt: at,
        exampleDesc: clipText(data.error, 100),
      });
    }

    const failedRecipients = collectFailedRecipients(doc);
    if (failedRecipients.length > 0) {
      total += failedRecipients.length;
      for (const item of failedRecipients.slice(0, MAX_EXAMPLES_PER_TYPE)) {
        addTypeSummary(map, {
          key: "certificate_send_failed_recipient",
          label: "Enviament (destinatari fallit)",
          category: "send",
          countDelta: 1,
          exampleAt: item.at,
          exampleDesc: item.desc,
        });
      }
    }
  }

  return total;
}

function classifyOrg(result: Omit<OrgResult, "status">): "green" | "yellow" | "red" {
  const totalErrors = result.importsFailed + result.exportsFailed + result.sendsFailed;
  if (totalErrors === 0) return "green";

  const criticalRepeated = result.typeSummaries.some(
    (t) => (t.category === "import" || t.category === "export" || t.category === "send") && t.count > 1
  );
  return criticalRepeated ? "red" : "yellow";
}

function pickGlobalEmoji(results: OrgResult[]): string {
  if (results.some((r) => r.status === "red")) return "🔴";
  if (results.some((r) => r.status === "yellow")) return "🟡";
  return "🟢";
}

function buildMessage(now: Date, results: OrgResult[]): string {
  const emoji = pickGlobalEmoji(results);
  const lines: string[] = [];
  lines.push(`${emoji} SUMMA – Errors Operatius – ${madridDateTimeString(now)}`);
  lines.push("");

  for (const org of results) {
    const orgEmoji = org.status === "green" ? "🟢" : org.status === "yellow" ? "🟡" : "🔴";
    lines.push(`Instància: ${org.label} ${orgEmoji}`);
    lines.push(`Imports fallits: ${org.importsFailed}`);
    lines.push(`Exports fallits: ${org.exportsFailed}`);
    lines.push(`Enviaments fallits: ${org.sendsFailed}`);
    lines.push("");
    lines.push("Tipus detectats:");

    if (org.typeSummaries.length === 0) {
      lines.push("- Cap");
      lines.push("");
      lines.push("Exemples:");
      lines.push("- Sense errors rellevants en les últimes 24h");
      lines.push("");
      continue;
    }

    for (const typeSummary of org.typeSummaries) {
      lines.push(`- ${typeSummary.label}: ${typeSummary.count}`);
    }

    lines.push("");
    lines.push("Exemples:");
    for (const typeSummary of org.typeSummaries) {
      if (typeSummary.examples.length === 0) continue;
      for (const ex of typeSummary.examples.slice(0, MAX_EXAMPLES_PER_TYPE)) {
        lines.push(`- ${shortDateTime(ex.at)} · [${typeSummary.label}] ${ex.desc}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

async function sendTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("Falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      chat_id: chatId,
      text: message,
    }),
  });

  const payload = (await response.json()) as { ok?: boolean; description?: string };
  if (!response.ok || payload.ok !== true) {
    throw new Error(`Telegram error: ${payload.description ?? `HTTP ${response.status}`}`);
  }
}

async function main(): Promise<void> {
  loadEnvFile(path.resolve(".env.local"));
  loadEnvFile(path.resolve(".env"));

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID");

  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault(), projectId });
  }

  const db = getFirestore();
  const now = new Date();
  const target = parseTargetDayArg(process.argv, now, "Europe/Madrid");
  const useForcedDate = target.forcedDate != null;
  const since = useForcedDate ? target.dayStart : new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const until = useForcedDate ? target.dayEnd : now;

  const orgSnap = await db.collection("organizations").get();
  const organizations: OrgMeta[] = orgSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      slug: typeof data.slug === "string" ? data.slug : null,
      name: typeof data.name === "string" ? data.name : null,
    };
  });

  const instancesPath = expandHome(INSTANCE_FILE);
  let targetInstances: InstanceSpec[] = [];
  if (fs.existsSync(instancesPath)) {
    targetInstances = parseInstancesFile(fs.readFileSync(instancesPath, "utf8"));
  }
  if (targetInstances.length === 0) {
    targetInstances = organizations.map((org) => ({
      label: org.name ?? org.slug ?? org.id,
      slugHint: org.slug,
      orgIdHint: org.id,
    }));
  }

  const results: OrgResult[] = [];
  for (const instance of targetInstances) {
    const org = matchOrganization(instance, organizations);
    if (!org) {
      results.push({
        label: instance.label,
        status: "red",
        importsFailed: 0,
        exportsFailed: 0,
        sendsFailed: 0,
        typeSummaries: [
          {
            label: "Lectura de dades",
            category: "import",
            count: 1,
            examples: [{ at: until, desc: "No puc llegir dades d'aquesta instància" }],
          },
        ],
      });
      continue;
    }

    const typeMap = new Map<string, ErrorTypeSummary>();
    const importJobsFailed = await getImportJobErrors(db, org.id, since, until, typeMap);
    const incidentCounts = await getIncidentImportExportErrors(db, org.id, since, until, typeMap);
    const backupExportsFailed = await getBackupErrors(db, org.id, since, until, typeMap);
    const sendFailed = await getSendErrors(db, org.id, since, until, typeMap);

    const importsFailed = importJobsFailed + incidentCounts.imports;
    const exportsFailed = incidentCounts.exports + backupExportsFailed;
    const sendsFailed = sendFailed;

    const typeSummaries = Array.from(typeMap.values()).sort((a, b) => b.count - a.count);
    const status = classifyOrg({
      label: instance.label,
      importsFailed,
      exportsFailed,
      sendsFailed,
      typeSummaries,
    });

    results.push({
      label: instance.label,
      status,
      importsFailed,
      exportsFailed,
      sendsFailed,
      typeSummaries,
    });
  }

  const globalEmoji = pickGlobalEmoji(results);
  const message = buildMessage(now, results);
  const weeklyRecalc = process.env.WEEKLY_RECALC === "true";

  if (weeklyRecalc) {
    console.log("WEEKLY_RECALC=true: no s'envia Telegram.");
    console.log(message);
    return;
  }

  if (globalEmoji === "🟢") {
    console.log("Estat global 🟢: no s'envia Telegram.");
    return;
  }

  await sendTelegram(message);
  console.log("Telegram enviat correctament.");
}

main().catch((error) => {
  console.error(
    "[sentinella:telegram3] Error:",
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
});
