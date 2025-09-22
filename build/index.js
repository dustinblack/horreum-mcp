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
import { createMetrics } from './observability/metrics.js';
const env = await loadEnv();
const server = new McpServer({
    name: 'horreum-mcp',
    version: '0.1.0',
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
await registerTools(server, { getEnv: loadEnv, metrics });
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map