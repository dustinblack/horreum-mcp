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
import { logger, setLogLevel, isValidLogLevel } from './observability/logging.js';
import { createLlmClient } from './llm/client.js';

function parseCliLogLevel(argv: string[]): string | undefined {
  // Accept: --log-level <level>, --log-level=<level>, --debug, -d, --trace
  // Return a level string if present.
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;
    if (arg === '--debug' || arg === '-d') return 'debug';
    if (arg === '--trace') return 'trace';
    if (arg === '--silent') return 'silent';
    if (arg.startsWith('--log-level=')) {
      const lvl = arg.split('=')[1] as string | undefined;
      if (lvl && isValidLogLevel(lvl)) return lvl;
      return undefined;
    }
    if (arg === '--log-level') {
      const lvl = argv[i + 1] as string | undefined;
      if (lvl && isValidLogLevel(lvl)) return lvl;
      return undefined;
    }
  }
  return undefined;
}

async function main() {
  // Apply CLI log level as early as possible
  const cliLevel = parseCliLogLevel(process.argv.slice(2));
  if (cliLevel) {
    setLogLevel(cliLevel);
    logger.info({ level: cliLevel }, 'Log level set via CLI');
  }

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
    const httpServer = await startHttpServer(server, env);

    const shutdown = async (signal: NodeJS.Signals) => {
      try {
        logger.info({ signal }, 'Shutting down...');
        metrics.stopServer();
        await new Promise<void>((resolve) => {
          httpServer.close(() => resolve());
        });
      } finally {
        process.exit(0);
      }
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
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
