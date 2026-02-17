const DATE_ARG_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function formatYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(value: string): { year: number; month: number; day: number } {
  const [y, m, d] = value.split("-").map((part) => Number(part));
  return { year: y, month: m, day: d };
}

function isValidYmd(value: string): boolean {
  if (!DATE_ARG_REGEX.test(value)) return false;
  const { year, month, day } = parseYmd(value);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() + 1 === month &&
    probe.getUTCDate() === day
  );
}

function ymdInTimeZone(input: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(input);

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function shiftYmd(value: string, deltaDays: number): string {
  const { year, month, day } = parseYmd(value);
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return formatYmd(shifted);
}

function zonedLocalToUtc(
  ymd: string,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string
): Date {
  const { year, month, day } = parseYmd(ymd);
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);

  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let i = 0; i < 4; i++) {
    const parts = dtf.formatToParts(new Date(utcMs));
    const pYear = Number(parts.find((p) => p.type === "year")?.value ?? 0);
    const pMonth = Number(parts.find((p) => p.type === "month")?.value ?? 1);
    const pDay = Number(parts.find((p) => p.type === "day")?.value ?? 1);
    const pHour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const pMinute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const pSecond = Number(parts.find((p) => p.type === "second")?.value ?? 0);

    const representedAsUtc = Date.UTC(
      pYear,
      pMonth - 1,
      pDay,
      pHour,
      pMinute,
      pSecond,
      millisecond
    );
    const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
    const diff = representedAsUtc - targetAsUtc;
    if (diff === 0) break;
    utcMs -= diff;
  }

  return new Date(utcMs);
}

export interface ParsedTargetDay {
  forcedDate: string | null;
  targetDay: string;
  previousDay: string;
  dayStart: Date;
  dayEnd: Date;
}

export function parseTargetDayArg(
  argv: string[],
  now: Date,
  timeZone: string = "Europe/Madrid"
): ParsedTargetDay {
  let forcedDate: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--date")) continue;

    if (token.startsWith("--date=")) {
      forcedDate = token.slice("--date=".length).trim();
      break;
    }

    if (token === "--date") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("Cal passar una data després de --date (YYYY-MM-DD)");
      }
      forcedDate = next.trim();
      break;
    }
  }

  if (forcedDate && !isValidYmd(forcedDate)) {
    throw new Error(`Data invàlida per --date: ${forcedDate}. Format esperat YYYY-MM-DD`);
  }

  const targetDay = forcedDate ?? ymdInTimeZone(now, timeZone);
  const previousDay = shiftYmd(targetDay, -1);
  const dayStart = zonedLocalToUtc(targetDay, 0, 0, 0, 0, timeZone);
  const dayEnd = zonedLocalToUtc(targetDay, 23, 59, 59, 999, timeZone);

  return {
    forcedDate,
    targetDay,
    previousDay,
    dayStart,
    dayEnd,
  };
}
