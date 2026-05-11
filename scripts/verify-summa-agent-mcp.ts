import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SummaPrivateIntegrationClient } from '@/lib/summa-agent-mcp/client';

interface EntityVerificationConfig {
  label: 'baruma' | 'flores';
  sourceRepo: string;
  token: string;
  orgId: string;
  forbiddenOrgId: string;
  contactQuery: string;
}

interface ToolResult {
  tool: string;
  status: 'ok' | 'blocked' | 'error';
  httpLikeStatus?: number;
  code?: string;
  details: Record<string, unknown>;
}

const DEFAULT_BASE_URL = 'https://studio--summa-social.us-central1.hosted.app';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function getConfig(label: 'baruma' | 'flores'): EntityVerificationConfig {
  const prefix = label === 'baruma' ? 'BARUMA' : 'FLORES';
  return {
    label,
    sourceRepo: `${label}-admin-agent`,
    token: requiredEnv(`SUMMA_${prefix}_PRIVATE_INTEGRATION_TOKEN`),
    orgId: requiredEnv(`SUMMA_${prefix}_ORG_ID`),
    forbiddenOrgId: requiredEnv(`SUMMA_${prefix}_FORBIDDEN_ORG_ID`),
    contactQuery: optionalEnv(`SUMMA_${prefix}_CONTACT_QUERY`, label === 'baruma' ? 'de' : 'la'),
  };
}

function errorCode(error: unknown): string {
  return error instanceof Error ? error.message : 'UNKNOWN_ERROR';
}

function statusFromCode(code: string): number | undefined {
  if (code === 'ORG_NOT_ALLOWED' || code === 'SCOPE_DENIED') return 403;
  if (code === 'UNAUTHORIZED') return 401;
  if (code.startsWith('HTTP_')) return Number(code.slice(5)) || undefined;
  return undefined;
}

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function redactToolResult(result: ToolResult): string {
  const lines = [
    `### ${result.tool}`,
    '',
    `- Estat: ${result.status}`,
  ];
  if (result.httpLikeStatus) lines.push(`- HTTP/resultat: ${result.httpLikeStatus}`);
  if (result.code) lines.push(`- Codi: ${result.code}`);
  for (const [key, value] of Object.entries(result.details)) {
    lines.push(`- ${key}: ${String(value)}`);
  }
  return `${lines.join('\n')}\n`;
}

async function withToolResult(tool: string, fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (error) {
    const code = errorCode(error);
    return {
      tool,
      status: 'error',
      httpLikeStatus: statusFromCode(code),
      code,
      details: {},
    };
  }
}

async function createDummyFile(): Promise<string> {
  const dir = join(tmpdir(), `summa-agent-mcp-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, 'dummy-validation.txt');
  await writeFile(
    filePath,
    [
      'Dummy validation document for Summa Agent private MCP.',
      'No personal data. No invoice. Safe payload.',
      new Date().toISOString(),
    ].join('\n'),
    'utf8'
  );
  return filePath;
}

async function verifyEntity(
  config: EntityVerificationConfig,
  baseUrl: string,
  dummyFilePath: string
): Promise<ToolResult[]> {
  const client = new SummaPrivateIntegrationClient({
    baseUrl,
    token: config.token,
    defaultOrgId: config.orgId,
    sourceRepo: config.sourceRepo,
  });

  const idempotencyKey = `${config.sourceRepo}-mcp-validation-${Date.now()}`;

  return [
    await withToolResult(`${config.label}: search_contacts`, async () => {
      const body = await client.searchContacts({
        q: config.contactQuery,
        limit: 5,
      });
      return {
        tool: `${config.label}: search_contacts`,
        status: 'ok',
        httpLikeStatus: 200,
        details: {
          count: countArray(body.contacts),
          query: config.contactQuery,
        },
      };
    }),
    await withToolResult(`${config.label}: search_transactions`, async () => {
      const body = await client.searchTransactions({
        dateFrom: optionalEnv('SUMMA_MCP_DATE_FROM', '2026-04-01'),
        dateTo: optionalEnv('SUMMA_MCP_DATE_TO', '2026-04-30'),
        limit: 5,
      });
      return {
        tool: `${config.label}: search_transactions`,
        status: 'ok',
        httpLikeStatus: 200,
        details: {
          count: countArray(body.transactions),
          nextCursor: body.nextCursor ? 'present' : 'none',
        },
      };
    }),
    await withToolResult(`${config.label}: upload_pending_document`, async () => {
      const body = await client.uploadPendingDocument({
        filePath: dummyFilePath,
        idempotencyKey,
        externalMessageId: idempotencyKey,
        contentType: 'text/plain',
      });
      const pendingDocument = body.pendingDocument && typeof body.pendingDocument === 'object'
        ? body.pendingDocument as Record<string, unknown>
        : {};
      return {
        tool: `${config.label}: upload_pending_document`,
        status: 'ok',
        httpLikeStatus: 200,
        details: {
          pendingDocumentId: pendingDocument.id ? 'created' : 'missing',
          idempotent: body.idempotent === true,
        },
      };
    }),
    await withToolResult(`${config.label}: get_entity_operational_summary`, async () => {
      const body = await client.getEntityOperationalSummary({
        dateFrom: optionalEnv('SUMMA_MCP_DATE_FROM', '2026-04-01'),
        dateTo: optionalEnv('SUMMA_MCP_DATE_TO', '2026-04-30'),
        limit: 10,
      });
      const recent = body.recentTransactions && typeof body.recentTransactions === 'object'
        ? body.recentTransactions as Record<string, unknown>
        : {};
      const pendingDocuments = body.pendingDocuments && typeof body.pendingDocuments === 'object'
        ? body.pendingDocuments as Record<string, unknown>
        : {};
      return {
        tool: `${config.label}: get_entity_operational_summary`,
        status: 'ok',
        httpLikeStatus: 200,
        details: {
          recentTransactions: recent.count ?? 0,
          pendingDocumentsReadable: pendingDocuments.readable === true,
        },
      };
    }),
    await withToolResult(`${config.label}: cross-org isolation`, async () => {
      const forbiddenClient = new SummaPrivateIntegrationClient({
        baseUrl,
        token: config.token,
        defaultOrgId: config.forbiddenOrgId,
        sourceRepo: config.sourceRepo,
      });
      try {
        await forbiddenClient.searchContacts({
          q: config.contactQuery,
          limit: 5,
        });
        return {
          tool: `${config.label}: cross-org isolation`,
          status: 'error',
          httpLikeStatus: 200,
          code: 'CROSS_ORG_ALLOWED',
          details: {},
        };
      } catch (error) {
        const code = errorCode(error);
        return {
          tool: `${config.label}: cross-org isolation`,
          status: code === 'ORG_NOT_ALLOWED' ? 'ok' : 'error',
          httpLikeStatus: statusFromCode(code),
          code,
          details: {
            expected: 'ORG_NOT_ALLOWED',
          },
        };
      }
    }),
  ];
}

async function main(): Promise<void> {
  const baseUrl = optionalEnv('SUMMA_BASE_URL', DEFAULT_BASE_URL);
  const configs = [getConfig('baruma'), getConfig('flores')];
  const dummyFilePath = await createDummyFile();
  const results: ToolResult[] = [];

  for (const config of configs) {
    results.push(...await verifyEntity(config, baseUrl, dummyFilePath));
  }

  const ok = results.every((result) => result.status === 'ok');
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const outDir = 'tmp/verification';
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `summa-agent-mcp-${yyyymmdd}.md`);
  const body = [
    '# Validació Summa Agent MCP privat',
    '',
    `Data: ${now.toISOString()}`,
    `Base URL: ${baseUrl}`,
    '',
    'Aquest log està redaccionat. No inclou tokens, emails complets, NIFs, IBANs ni payloads sensibles.',
    '',
    ...results.map(redactToolResult),
    '## Conclusió',
    '',
    ok
      ? 'Validació correcta. MCP apte per integrar com a infraestructura privada, sense deploy públic.'
      : 'Validació incompleta o fallida. No recomanat per merge fins resoldre els errors.',
    '',
  ].join('\n');

  await writeFile(outPath, body, 'utf8');
  console.log(JSON.stringify({ ok, outPath, results }, null, 2));
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
