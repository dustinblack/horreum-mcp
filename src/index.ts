/**
 * Horreum MCP server entrypoint.
 *
 * Exposes minimal tools via the MCP SDK. Read tools and Horreum integration
 * will be added next per the development plan.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadEnv } from './config/env.js';
import { registerTools } from './server/tools.js';

export { registerTools };

import { createMetrics } from './observability/metrics.js';
import { initTracing } from './observability/tracing.js';
import { startHttpServer } from './server/http.js';
import { logger } from './observability/logging.js';
import { createLlmClient } from './llm/client.js';

async function main() {
  const env = await loadEnv();

  const server = new McpServer({
    name: 'horreum-mcp',
    version: '0.1.0',
    inference: createLlmClient(env),
  });

  // Optional Prometheus metrics
  const metrics = createMetrics({
    enabled: env.METRICS_ENABLED,
    port: env.METRICS_PORT,
    path: env.METRICS_PATH,
    serviceName: 'horreum-mcp',
    serviceVersion: '0.1.0',
  });
  metrics.startServer();

  // Optional OpenTelemetry tracing
  await initTracing({
    enabled: env.TRACING_ENABLED,
    serviceName: 'horreum-mcp',
    serviceVersion: '0.1.0',
  });

  await registerTools(server, { getEnv: loadEnv, metrics });

  if (env.HTTP_MODE_ENABLED) {
    await startHttpServer(server, env);
  } else {
    logger.info('MCP server running in stdio mode');
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

// This check is to prevent the main function from running when this module is imported by other scripts,
// such as smoke tests.
if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop() as string)
) {
  main().catch((err: unknown) => {
    const error = err as Error & { code?: string };
    const message = error?.message || String(error);
    if (message.includes('Invalid environment')) {
      logger.error(
        { err: error },
        'Invalid environment configuration. Required: HORREUM_BASE_URL. ' +
          'Example: HORREUM_BASE_URL=https://horreum.example.com HTTP_MODE_ENABLED=true ' +
          'HTTP_PORT=3000. See README Container Usage for details.'
      );
    } else {
      logger.error({ err: error }, 'Failed to start server');
    }
    process.exit(1);
  });
}
