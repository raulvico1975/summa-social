import type {
  DocumentReviewDetection,
  DocumentReviewDocType,
  DocumentReviewField,
  DocumentReviewFields,
} from './types';

export const DEFAULT_OPENAI_DOCUMENT_REVIEW_MODEL = 'gpt-5-mini';
export const OPENAI_DOCUMENT_REVIEW_ENDPOINT = 'https://api.openai.com/v1/responses';

export type OpenAiDocumentReviewErrorCode =
  | 'AI_UNAVAILABLE'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'TRANSIENT'
  | 'AI_ERROR'
  | 'INVALID_OUTPUT';

export class OpenAiDocumentReviewError extends Error {
  code: OpenAiDocumentReviewErrorCode;
  status: number;

  constructor(code: OpenAiDocumentReviewErrorCode, message: string, status = 200) {
    super(message);
    this.name = 'OpenAiDocumentReviewError';
    this.code = code;
    this.status = status;
  }
}

type AiEnv = Record<string, string | undefined>;

type FetchLike = (
  input: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export interface OpenAiDocumentReviewInput {
  apiKey: string | undefined;
  model?: string;
  file: {
    filename: string;
    contentType: string;
    base64: string;
  };
  rowContext: {
    source: 'bank' | 'offBank';
    dateExpense: string;
    paymentDate: string | null;
    counterpartyName: string;
    concept: string;
    amountAssignedEUR: number | null;
    amountTotalEUR: number | null;
    budgetLineCode: string;
    budgetLineName: string;
  };
  fetchImpl?: FetchLike;
  now?: () => string;
  timeoutMs?: number;
}

const DOC_TYPES: DocumentReviewDocType[] = [
  'invoice',
  'payment_proof',
  'payroll',
  'social_security_rlc',
  'social_security_rnt',
  'social_security_payment',
  'tax_model_111',
  'tax_model_111_payment',
  'receipt',
  'ticket',
  'bank_statement',
  'local_support',
  'unknown',
];

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function resolveOpenAiApiKey(env: AiEnv = process.env): string | undefined {
  return firstNonEmpty(env.OPENAI_API_KEY);
}

export function hasOpenAiApiKey(env: AiEnv = process.env): boolean {
  return Boolean(resolveOpenAiApiKey(env));
}

export function resolveOpenAiDocumentReviewModel(env: AiEnv = process.env): string {
  return firstNonEmpty(env.OPENAI_DOCUMENT_REVIEW_MODEL) ?? DEFAULT_OPENAI_DOCUMENT_REVIEW_MODEL;
}

function emptyField<T>(): DocumentReviewField<T> {
  return { value: null, confidence: null, evidence: null };
}

function emptyFields(): DocumentReviewFields {
  return {
    invoiceNumber: emptyField<string>(),
    invoiceDate: emptyField<string>(),
    paymentDate: emptyField<string>(),
    amount: emptyField<number>(),
    supplierName: emptyField<string>(),
    supplierTaxId: emptyField<string>(),
  };
}

function fieldSchema(valueType: 'string' | 'number') {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['value', 'confidence', 'evidence'],
    properties: {
      value: { type: [valueType, 'null'] },
      confidence: { type: ['number', 'null'], minimum: 0, maximum: 1 },
      evidence: { type: ['string', 'null'] },
    },
  };
}

function buildDocumentReviewJsonSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['docType', 'confidence', 'fields', 'errors'],
    properties: {
      docType: { type: 'string', enum: DOC_TYPES },
      confidence: { type: ['number', 'null'], minimum: 0, maximum: 1 },
      fields: {
        type: 'object',
        additionalProperties: false,
        required: ['invoiceNumber', 'invoiceDate', 'paymentDate', 'amount', 'supplierName', 'supplierTaxId'],
        properties: {
          invoiceNumber: fieldSchema('string'),
          invoiceDate: fieldSchema('string'),
          paymentDate: fieldSchema('string'),
          amount: fieldSchema('number'),
          supplierName: fieldSchema('string'),
          supplierTaxId: fieldSchema('string'),
        },
      },
      errors: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  };
}

function buildPrompt(input: OpenAiDocumentReviewInput): string {
  const { rowContext } = input;
  return [
    'Ets un extractor documental per a justificacio economica de projectes de cooperacio.',
    'Analitza nomes el document aportat. El context economic ajuda a orientar la lectura, pero no pot omplir dades que no siguin visibles al document.',
    'No decideixis si la despesa es elegible, acceptable o justificable. Retorna nomes classificacio documental i dades observables.',
    'Si una dada no es veu clarament, posa value null i confidence null. No inventis imports, dates, proveidors ni codis fiscals.',
    'Dates sempre en format YYYY-MM-DD. Si el document usa DD/MM/YYYY, converteix-lo. Si no es pot determinar el dia exacte, retorna null.',
    'Imports com a numero decimal, sense simbols ni separadors de milers. Usa el total de factura, import pagat o import principal del document.',
    '',
    'Classifica docType amb aquests criteris:',
    '- invoice: factura formal o document equivalent amb proveidor, data, concepte i import.',
    '- payment_proof: transferencia, rebut bancari, comprovant de pagament, justificant de pagament o ordre executada.',
    '- payroll: nomina o full salarial individual.',
    '- social_security_rlc: Relacion de Liquidacion de Cotizaciones / RLC.',
    '- social_security_rnt: Relacion Nominal de Trabajadores / RNT.',
    '- social_security_payment: comprovant de pagament de seguretat social.',
    '- tax_model_111: model 111 o declaracio fiscal equivalent sense comprovant de pagament.',
    '- tax_model_111_payment: pagament o justificant bancari del model 111.',
    '- receipt: rebut formal no bancari.',
    '- ticket: tiquet simplificat de compra.',
    '- bank_statement: extracte bancari o llistat de moviments.',
    '- local_support: acta, certificat, declaracio local, suport administratiu local o document justificatiu no fiscal.',
    '- unknown: document il.legible, massa generic o que no encaixa amb cap categoria.',
    '',
    'Camps:',
    '- invoiceNumber: numero de factura, nomina, rebut, model o referencia documental si es visible.',
    '- invoiceDate: data del document o emissio; en comprovants de pagament, nomes si hi ha data documental clara diferent del pagament.',
    '- paymentDate: data de pagament, execucio, transferencia o cobrament si es visible.',
    '- amount: import total, import pagat o import principal del document.',
    '- supplierName: proveidor, beneficiari, emissor, treballador o contrapart visible segons el document.',
    '- supplierTaxId: CIF/NIF/NIE/VAT/tax id visible de proveidor, emissor, treballador o contrapart.',
    '- errors: llista breu de problemes de lectura, OCR, idioma, camps ambigus o imports multiples. [] si no n hi ha.',
    '',
    'Context minim de la fila economica:',
    `- source: ${rowContext.source}`,
    `- data despesa: ${rowContext.dateExpense || '-'}`,
    `- data pagament: ${rowContext.paymentDate || '-'}`,
    `- proveidor/contrapart: ${rowContext.counterpartyName || '-'}`,
    `- concepte: ${rowContext.concept || '-'}`,
    `- import assignat EUR: ${rowContext.amountAssignedEUR ?? '-'}`,
    `- import total EUR: ${rowContext.amountTotalEUR ?? '-'}`,
    `- partida: ${rowContext.budgetLineCode || '-'} ${rowContext.budgetLineName || ''}`.trim(),
  ].join('\n');
}

function buildFileContent(input: OpenAiDocumentReviewInput): Record<string, unknown> {
  const dataUrl = `data:${input.file.contentType};base64,${input.file.base64}`;
  if (input.file.contentType.startsWith('image/')) {
    return {
      type: 'input_image',
      image_url: dataUrl,
      detail: 'auto',
    };
  }

  return {
    type: 'input_file',
    filename: input.file.filename,
    file_data: dataUrl,
  };
}

export function buildOpenAiDocumentReviewPayload(input: OpenAiDocumentReviewInput): Record<string, unknown> {
  return {
    model: input.model ?? resolveOpenAiDocumentReviewModel(),
    store: false,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: buildPrompt(input) },
          buildFileContent(input),
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'document_review_detection',
        strict: true,
        schema: buildDocumentReviewJsonSchema(),
      },
    },
  };
}

function outputTextFromResponse(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;
  const object = response as Record<string, unknown>;
  if (typeof object.output_text === 'string') return object.output_text;

  const output = object.output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== 'object') continue;
      const contentObject = contentItem as Record<string, unknown>;
      if (typeof contentObject.text === 'string') return contentObject.text;
    }
  }

  return null;
}

function parseJsonOutput(response: unknown): unknown {
  const outputText = outputTextFromResponse(response);
  if (!outputText) {
    throw new OpenAiDocumentReviewError('INVALID_OUTPUT', 'OpenAI no ha retornat text estructurat.');
  }

  try {
    return JSON.parse(outputText);
  } catch {
    throw new OpenAiDocumentReviewError('INVALID_OUTPUT', 'La resposta OpenAI no es JSON valid.');
  }
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeStringField(value: unknown): DocumentReviewField<string> {
  if (!value || typeof value !== 'object') return emptyField<string>();
  const object = value as Record<string, unknown>;
  return {
    value: normalizeString(object.value),
    confidence: normalizeConfidence(object.confidence),
    evidence: normalizeString(object.evidence),
  };
}

function normalizeNumberField(value: unknown): DocumentReviewField<number> {
  if (!value || typeof value !== 'object') return emptyField<number>();
  const object = value as Record<string, unknown>;
  return {
    value: normalizeNumber(object.value),
    confidence: normalizeConfidence(object.confidence),
    evidence: normalizeString(object.evidence),
  };
}

export function parseOpenAiDocumentReviewDetection(params: {
  response: unknown;
  model: string;
  processedAt: string;
}): DocumentReviewDetection {
  const parsed = parseJsonOutput(params.response);
  if (!parsed || typeof parsed !== 'object') {
    throw new OpenAiDocumentReviewError('INVALID_OUTPUT', 'La resposta OpenAI no te estructura valida.');
  }

  const object = parsed as Record<string, unknown>;
  const fieldsObject = object.fields && typeof object.fields === 'object'
    ? object.fields as Record<string, unknown>
    : {};
  const docType = DOC_TYPES.includes(object.docType as DocumentReviewDocType)
    ? object.docType as DocumentReviewDocType
    : 'unknown';
  const errors = Array.isArray(object.errors)
    ? object.errors.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    docType,
    confidence: normalizeConfidence(object.confidence),
    fields: {
      ...emptyFields(),
      invoiceNumber: normalizeStringField(fieldsObject.invoiceNumber),
      invoiceDate: normalizeStringField(fieldsObject.invoiceDate),
      paymentDate: normalizeStringField(fieldsObject.paymentDate),
      amount: normalizeNumberField(fieldsObject.amount),
      supplierName: normalizeStringField(fieldsObject.supplierName),
      supplierTaxId: normalizeStringField(fieldsObject.supplierTaxId),
    },
    provider: 'openai',
    model: params.model,
    processedAt: params.processedAt,
    errors,
  };
}

function errorCodeFromOpenAiStatus(status: number, message: string): OpenAiDocumentReviewErrorCode {
  const lower = message.toLowerCase();
  if (status === 401 || status === 403) return 'AI_UNAVAILABLE';
  if (status === 408 || status === 409 || status >= 500) return 'TRANSIENT';
  if (status === 429 || lower.includes('quota')) return 'QUOTA_EXCEEDED';
  if (lower.includes('rate limit') || lower.includes('rate_limit')) return 'RATE_LIMITED';
  return 'AI_ERROR';
}

export async function analyzeDocumentWithOpenAI(input: OpenAiDocumentReviewInput): Promise<DocumentReviewDetection> {
  if (!input.apiKey) {
    throw new OpenAiDocumentReviewError('AI_UNAVAILABLE', 'OpenAI API key not configured.');
  }

  const model = input.model ?? resolveOpenAiDocumentReviewModel();
  const payload = buildOpenAiDocumentReviewPayload({ ...input, model });
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 45_000);

  try {
    const response = await fetchImpl(OPENAI_DOCUMENT_REVIEW_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseJson = await response.json().catch(async () => ({
      error: { message: await response.text().catch(() => '') },
    }));

    if (!response.ok) {
      const message = typeof responseJson === 'object' && responseJson && 'error' in responseJson
        ? String(((responseJson as Record<string, unknown>).error as Record<string, unknown> | undefined)?.message ?? '')
        : '';
      const code = errorCodeFromOpenAiStatus(response.status, message);
      throw new OpenAiDocumentReviewError(code, message || `OpenAI error ${response.status}`, response.status);
    }

    return parseOpenAiDocumentReviewDetection({
      response: responseJson,
      model,
      processedAt: input.now?.() ?? new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof OpenAiDocumentReviewError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenAiDocumentReviewError('TRANSIENT', 'OpenAI request timed out.');
    }
    throw new OpenAiDocumentReviewError(
      'AI_ERROR',
      error instanceof Error ? error.message : 'OpenAI request failed.'
    );
  } finally {
    clearTimeout(timeout);
  }
}
