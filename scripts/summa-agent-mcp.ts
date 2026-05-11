import { runStdioServer } from '@/lib/summa-agent-mcp/server';

runStdioServer().catch((error) => {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  process.stderr.write(`[summa-agent-mcp] ${message}\n`);
  process.exitCode = 1;
});
