import Papa from 'papaparse';

export type ReturnCsvEncoding = 'utf-8' | 'iso-8859-1';

export interface ParsedReturnCsv {
  rows: string[][];
  delimiter: ';' | ',';
  encoding: ReturnCsvEncoding;
}

const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;
const SUSPICIOUS_MOJIBAKE_MARKERS = ['Ã', 'Â', 'Ð', 'Ñ', '¤', '�'] as const;
const RETURN_HEADER_HINTS = [
  'cuenta',
  'adeudo',
  'iban',
  'importe',
  'fecha',
  'liquidacion',
  'devolucion',
  'devolucio',
  'referencia',
  'recibo',
  'motivo',
  'motiu',
  'nombre',
  'cliente',
] as const;

const stripBom = (text: string): string => {
  return text.replace(/^\uFEFF/, '');
};

const removeAccents = (value: string): string => {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const countDelimiterOutsideQuotes = (line: string, delimiter: ';' | ','): number => {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }

  return count;
};

const detectCsvDelimiter = (text: string): ';' | ',' => {
  const candidateLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (candidateLines.length === 0) return ',';

  const score = (delimiter: ';' | ','): number => {
    return candidateLines.reduce((sum, line) => sum + countDelimiterOutsideQuotes(line, delimiter), 0);
  };

  return score(';') >= score(',') ? ';' : ',';
};

const sanitizeRows = (rows: unknown[]): string[][] => {
  return rows
    .map((row) => (Array.isArray(row) ? row : []))
    .map((row) => row.map((cell) => String(cell ?? '').trim()))
    .filter((row) => row.some((cell) => cell !== ''));
};

export const normalizeReturnHeader = (value: string): string => {
  const normalized = removeAccents(stripBom(String(value ?? '')).trim().toLowerCase())
    .replace(/n[º°]/g, 'numero')
    .replace(/\bno\b/g, 'numero')
    .replace(/\bnum\b/g, 'numero')
    .replace(/\bnumero\b/g, 'numero')
    .replace(/#/g, ' numero ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
};

export const findReturnColumnByHeader = (headers: string[], patterns: readonly string[]): number => {
  const normalizedHeaders = headers.map(normalizeReturnHeader);
  const normalizedPatterns = patterns.map(normalizeReturnHeader);

  for (const pattern of normalizedPatterns) {
    const index = normalizedHeaders.findIndex((header) => header.includes(pattern));
    if (index !== -1) return index;
  }

  return -1;
};

const hasSuspiciousMojibake = (text: string): boolean => {
  return SUSPICIOUS_MOJIBAKE_MARKERS.some((marker) => text.includes(marker));
};

const scoreDecodedCsvText = (text: string): number => {
  const preview = text
    .split(/\r?\n/)
    .map((line) => normalizeReturnHeader(line))
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');

  let score = 0;
  for (const hint of RETURN_HEADER_HINTS) {
    if (preview.includes(hint)) {
      score += 1;
    }
  }

  if (hasSuspiciousMojibake(text)) {
    score -= 3;
  }

  return score;
};

export const decodeReturnCsvBuffer = (buffer: ArrayBuffer): { text: string; encoding: ReturnCsvEncoding } => {
  const bytes = new Uint8Array(buffer);
  const hasUtf8Bom = UTF8_BOM.every((byte, index) => bytes[index] === byte);
  const latin1Text = stripBom(new TextDecoder('iso-8859-1').decode(bytes));

  if (hasUtf8Bom) {
    return {
      text: stripBom(new TextDecoder('utf-8').decode(bytes)),
      encoding: 'utf-8',
    };
  }

  try {
    const utf8Text = stripBom(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    const utf8Score = scoreDecodedCsvText(utf8Text);
    const latin1Score = scoreDecodedCsvText(latin1Text);

    if (latin1Score > utf8Score) {
      return {
        text: latin1Text,
        encoding: 'iso-8859-1',
      };
    }

    return {
      text: utf8Text,
      encoding: 'utf-8',
    };
  } catch {
    return {
      text: latin1Text,
      encoding: 'iso-8859-1',
    };
  }
};

export const parseReturnCsvBuffer = (buffer: ArrayBuffer): ParsedReturnCsv => {
  const { text, encoding } = decodeReturnCsvBuffer(buffer);
  const delimiter = detectCsvDelimiter(text);

  const result = Papa.parse<string[]>(text, {
    delimiter,
    header: false,
    skipEmptyLines: false,
    quoteChar: '"',
    escapeChar: '"',
  });

  return {
    rows: sanitizeRows(result.data as unknown[]),
    delimiter,
    encoding,
  };
};
