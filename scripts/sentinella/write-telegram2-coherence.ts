import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

type Movement = {
  date: string;
  amount: number;
};

type InstanceResult = {
  label: string;
  status: "green" | "yellow" | "red";
  changeBalance: number | null;
  dayMovementsSum: number | null;
  loadedPositiveCount: number | null;
  loadedPositiveSum: number | null;
  loadedNegativeCount: number | null;
  loadedNegativeSum: number | null;
  unexplainedDiff: number | null;
  highlightedMovements: Movement[];
  reason?: string;
};

const TOLERANCE = 0.01;
const INSTANCE_FILE = "~/summa-sentinella/instances.txt";
const OUTPUT_FILE = "~/summa-sentinella/out/telegram2.txt";

function expandHome(inputPath: string): string {
  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalIdx = trimmed.indexOf("=");
    if (equalIdx <= 0) continue;
    const key = trimmed.slice(0, equalIdx).trim();
    const value = trimmed.slice(equalIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function looksLikeSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
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
    if (!slugHint && looksLikeSlug(part)) {
      slugHint = part;
    }
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

function madridDateString(input: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(input);

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
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

function toDateOnly(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return madridDateString(parsed);
}

function toJsDate(raw: unknown): Date | null {
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
    const maybeToDate = (raw as { toDate?: unknown }).toDate;
    if (typeof maybeToDate === "function") {
      const parsed = maybeToDate.call(raw);
      if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toAmountCents(amount: number): number {
  return Math.round(amount * 100);
}

function buildCanonicalSignatureFromTx(tx: Record<string, unknown>): string | null {
  const date = typeof tx.date === "string" ? tx.date : null;
  const description = typeof tx.description === "string" ? tx.description : null;
  const amount = typeof tx.amount === "number" ? tx.amount : null;
  const bankAccountId = typeof tx.bankAccountId === "string" ? tx.bankAccountId : null;
  const source = typeof tx.source === "string" ? tx.source : null;
  const transactionType = typeof tx.transactionType === "string" ? tx.transactionType : "normal";

  if (!date || !description || amount == null || !bankAccountId || source !== "bank") {
    return null;
  }

  return JSON.stringify({
    d: date,
    n: description.trim().replace(/\s+/g, " ").toUpperCase(),
    a: toAmountCents(amount),
    c: typeof tx.category === "string" ? tx.category : null,
    x: typeof tx.contactId === "string" ? tx.contactId : null,
    y: typeof tx.contactType === "string" ? tx.contactType : null,
    t: transactionType,
    b: bankAccountId,
    s: "bank",
  });
}

function resolveImportedTxIdsByInputHashes(
  txDocs: FirebaseFirestore.QueryDocumentSnapshot[],
  inputHashes: string[]
): Set<string> {
  if (inputHashes.length === 0) return new Set<string>();

  const signatureByDocId = new Map<string, string>();
  const signatureCounts = new Map<string, number>();

  for (const doc of txDocs) {
    const tx = doc.data() as Record<string, unknown>;
    const signature = buildCanonicalSignatureFromTx(tx);
    if (!signature) continue;

    signatureByDocId.set(doc.id, signature);
    signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
  }

  const matched = new Set<string>();
  for (const [docId, signature] of signatureByDocId.entries()) {
    const maxOrdinal = signatureCounts.get(signature) ?? 1;
    let found = false;

    for (const inputHash of inputHashes) {
      for (let ordinal = 1; ordinal <= maxOrdinal; ordinal++) {
        const expectedId = `imp_${sha256Hex(`${inputHash}|${signature}|${ordinal}`).slice(0, 28)}`;
        if (expectedId === docId) {
          matched.add(docId);
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  return matched;
}

function isLedgerTx(tx: Record<string, unknown>): boolean {
  if (tx.archivedAt != null) return false;
  if (typeof tx.parentTransactionId === "string" && tx.parentTransactionId.trim()) return false;
  if (tx.isRemittanceItem === true) return false;
  if (tx.transactionType === "donation") return false;
  if (tx.transactionType === "fee") return false;
  if (tx.source === "remittance") return false;
  return true;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("ca-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedAmount(value: number): string {
  const abs = formatAmount(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

function pickOverallEmoji(results: InstanceResult[]): string {
  if (results.some((r) => r.status === "red")) return "🔴";
  if (results.some((r) => r.status === "yellow")) return "🟡";
  return "🟢";
}

function buildMessage(now: Date, results: InstanceResult[]): string {
  const titleEmoji = pickOverallEmoji(results);
  const lines: string[] = [];
  lines.push(`${titleEmoji} SUMMA – Coherència Econòmica – ${madridDateTimeString(now)}`);
  lines.push("");

  for (const result of results) {
    lines.push(`Instància: ${result.label}`);

    if (result.status === "red") {
      lines.push("Canvi saldo: N/D");
      lines.push("Moviments carregats avui (suma): N/D");
      lines.push("Moviments carregats avui (positius): N/D");
      lines.push("Moviments carregats avui (negatius): N/D");
      lines.push("Diferència no explicada: N/D");
      lines.push(`Motiu: ${result.reason ?? "No puc llegir dades"}`);
      lines.push("Moviments destacats:");
      lines.push("- Sense dades");
      lines.push("");
      continue;
    }

    lines.push(`Canvi saldo: ${formatSignedAmount(result.changeBalance ?? 0)} €`);
    lines.push(`Moviments carregats avui (suma): ${formatSignedAmount(result.dayMovementsSum ?? 0)} €`);
    lines.push(
      `Moviments carregats avui (positius): ${result.loadedPositiveCount ?? 0} · ${formatSignedAmount(
        result.loadedPositiveSum ?? 0
      )} €`
    );
    lines.push(
      `Moviments carregats avui (negatius): ${result.loadedNegativeCount ?? 0} · ${formatSignedAmount(
        result.loadedNegativeSum ?? 0
      )} €`
    );
    lines.push(`Diferència no explicada: ${formatSignedAmount(result.unexplainedDiff ?? 0)} €`);
    lines.push("Moviments destacats:");

    if (result.highlightedMovements.length === 0) {
      lines.push("- Cap moviment carregat avui");
    } else {
      for (const mov of result.highlightedMovements) {
        lines.push(`- ${mov.date} · ${formatSignedAmount(mov.amount)} €`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

function matchOrganization(instance: InstanceSpec, organizations: OrgMeta[]): OrgMeta | null {
  if (instance.orgIdHint) {
    const byId = organizations.find((org) => org.id === instance.orgIdHint);
    if (byId) return byId;
  }

  if (instance.slugHint) {
    const bySlug = organizations.find((org) => org.slug === instance.slugHint);
    if (bySlug) return bySlug;
  }

  const normLabel = normalizeText(instance.label);
  const byName = organizations.filter(
    (org) => org.name && normalizeText(org.name) === normLabel
  );
  if (byName.length === 1) return byName[0];

  const bySlugNorm = organizations.filter(
    (org) => org.slug && normalizeText(org.slug) === normLabel
  );
  if (bySlugNorm.length === 1) return bySlugNorm[0];

  return null;
}

async function computeInstanceResult(
  db: FirebaseFirestore.Firestore,
  instance: InstanceSpec,
  organizations: OrgMeta[],
  targetDay: string,
  previousDay: string,
  useForcedDate: boolean
): Promise<InstanceResult> {
  const org = matchOrganization(instance, organizations);
  if (!org) {
    return {
      label: instance.label,
      status: "red",
      changeBalance: null,
      dayMovementsSum: null,
      loadedPositiveCount: null,
      loadedPositiveSum: null,
      loadedNegativeCount: null,
      loadedNegativeSum: null,
      unexplainedDiff: null,
      highlightedMovements: [],
      reason: "No puc llegir dades",
    };
  }

  const txSnap = await db.collection("organizations").doc(org.id).collection("transactions").get();
  const todayImportHashes: string[] = [];
  let todayImportCreatedCount = 0;
  if (!useForcedDate) {
    const importRunsSnap = await db.collection("organizations").doc(org.id).collection("importRuns").get();
    for (const doc of importRunsSnap.docs) {
      const run = doc.data() as Record<string, unknown>;
      if (run.type !== "bankTransactions") continue;
      const createdAtDate = toJsDate(run.createdAt);
      if (!createdAtDate) continue;
      if (madridDateString(createdAtDate) !== targetDay) continue;

      const inputHash =
        typeof run.inputHash === "string" && run.inputHash.trim() ? run.inputHash : doc.id;
      if (inputHash) todayImportHashes.push(inputHash);
      if (typeof run.createdCount === "number" && Number.isFinite(run.createdCount)) {
        todayImportCreatedCount += run.createdCount;
      }
    }
  }

  const loadedTodayByImportHash = resolveImportedTxIdsByInputHashes(txSnap.docs, todayImportHashes);

  let saldoAvui = 0;
  let saldoAhir = 0;
  let sumMovDia = 0;
  let positiveCount = 0;
  let positiveSum = 0;
  let negativeCount = 0;
  let negativeSum = 0;
  let invalidRows = 0;
  const dayMovements: Movement[] = [];

  for (const doc of txSnap.docs) {
    const tx = doc.data() as Record<string, unknown>;
    if (!isLedgerTx(tx)) continue;

    if (typeof tx.amount !== "number" || Number.isNaN(tx.amount)) {
      invalidRows++;
      continue;
    }
    const amount = tx.amount;
    const txDay = toDateOnly(tx.date);
    if (!txDay) {
      invalidRows++;
      continue;
    }

    if (useForcedDate) {
      if (txDay <= targetDay) saldoAvui += amount;
      if (txDay <= previousDay) saldoAhir += amount;
      if (txDay !== targetDay) continue;

      sumMovDia += amount;
      if (amount > 0) {
        positiveCount++;
        positiveSum += amount;
      } else if (amount < 0) {
        negativeCount++;
        negativeSum += amount;
      }
      dayMovements.push({ date: txDay, amount });
      continue;
    }

    saldoAvui += amount;
    const createdAtDate = toJsDate(tx.createdAt);
    const loadedByCreatedAt = createdAtDate ? madridDateString(createdAtDate) === targetDay : false;
    const wasLoadedToday = loadedTodayByImportHash.has(doc.id) || loadedByCreatedAt;
    if (!wasLoadedToday) continue;

    sumMovDia += amount;
    if (amount > 0) {
      positiveCount++;
      positiveSum += amount;
    } else if (amount < 0) {
      negativeCount++;
      negativeSum += amount;
    }
    dayMovements.push({ date: txDay, amount });
  }

  if (invalidRows > 0) {
    return {
      label: instance.label,
      status: "red",
      changeBalance: null,
      dayMovementsSum: null,
      loadedPositiveCount: null,
      loadedPositiveSum: null,
      loadedNegativeCount: null,
      loadedNegativeSum: null,
      unexplainedDiff: null,
      highlightedMovements: [],
      reason: "No puc llegir dades",
    };
  }

  if (!useForcedDate && todayImportCreatedCount > 0 && dayMovements.length === 0) {
    return {
      label: instance.label,
      status: "red",
      changeBalance: null,
      dayMovementsSum: null,
      loadedPositiveCount: null,
      loadedPositiveSum: null,
      loadedNegativeCount: null,
      loadedNegativeSum: null,
      unexplainedDiff: null,
      highlightedMovements: [],
      reason: "No puc llegir dades",
    };
  }

  if (!useForcedDate) {
    saldoAhir = saldoAvui - sumMovDia;
  }
  const changeBalance = saldoAvui - saldoAhir;
  const unexplainedDiff = changeBalance - sumMovDia;
  const absDiff = Math.abs(unexplainedDiff);

  const highlighted = [...dayMovements]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 3);

  return {
    label: instance.label,
    status: absDiff <= TOLERANCE ? "green" : "yellow",
    changeBalance,
    dayMovementsSum: sumMovDia,
    loadedPositiveCount: positiveCount,
    loadedPositiveSum: positiveSum,
    loadedNegativeCount: negativeCount,
    loadedNegativeSum: negativeSum,
    unexplainedDiff,
    highlightedMovements: highlighted,
  };
}

async function main(): Promise<void> {
  loadEnvFile(path.resolve(".env.local"));
  loadEnvFile(path.resolve(".env"));

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const now = new Date();
  const target = parseTargetDayArg(process.argv, now, "Europe/Madrid");
  const targetDay = target.targetDay;
  const previousDay = target.previousDay;
  const useForcedDate = target.forcedDate != null;

  const instancesPath = expandHome(INSTANCE_FILE);
  const outputPath = expandHome(OUTPUT_FILE);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (!fs.existsSync(instancesPath)) {
    const fallback = buildMessage(now, [
      {
        label: "Instàncies",
        status: "red",
        changeBalance: null,
        dayMovementsSum: null,
        loadedPositiveCount: null,
        loadedPositiveSum: null,
        loadedNegativeCount: null,
        loadedNegativeSum: null,
        unexplainedDiff: null,
        highlightedMovements: [],
        reason: "No puc llegir dades",
      },
    ]);
    fs.writeFileSync(outputPath, fallback, "utf8");
    console.log(`Missatge escrit a ${outputPath}`);
    return;
  }

  const instanceRaw = fs.readFileSync(instancesPath, "utf8");
  const instances = parseInstancesFile(instanceRaw);

  if (instances.length === 0) {
    const fallback = buildMessage(now, [
      {
        label: "Instàncies",
        status: "red",
        changeBalance: null,
        dayMovementsSum: null,
        loadedPositiveCount: null,
        loadedPositiveSum: null,
        loadedNegativeCount: null,
        loadedNegativeSum: null,
        unexplainedDiff: null,
        highlightedMovements: [],
        reason: "No puc llegir dades",
      },
    ]);
    fs.writeFileSync(outputPath, fallback, "utf8");
    console.log(`Missatge escrit a ${outputPath}`);
    return;
  }

  const db = getFirestore();
  const orgSnap = await db.collection("organizations").get();
  const organizations: OrgMeta[] = orgSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      slug: typeof data.slug === "string" ? data.slug : null,
      name: typeof data.name === "string" ? data.name : null,
    };
  });

  const results: InstanceResult[] = [];
  for (const instance of instances) {
    const result = await computeInstanceResult(
      db,
      instance,
      organizations,
      targetDay,
      previousDay,
      useForcedDate
    );
    results.push(result);
  }

  const message = buildMessage(now, results);
  fs.writeFileSync(outputPath, message, "utf8");
  console.log(`Missatge escrit a ${outputPath}`);
}

main().catch((error) => {
  console.error("[sentinella] Error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
