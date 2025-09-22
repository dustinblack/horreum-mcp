import http from 'node:http';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

export type MetricsConfig = {
  enabled: boolean;
  port: number;
  path: string;
  serviceName: string;
  serviceVersion: string;
};

export class Metrics {
  private readonly registry: Registry;
  private readonly counters: {
    toolInvocations: Counter<string>;
    resourceInvocations: Counter<string>;
  };
  private readonly histograms: {
    toolDurationMs: Histogram<string>;
    resourceDurationMs: Histogram<string>;
  };
  private server: http.Server | null = null;

  constructor(private readonly cfg: MetricsConfig) {
    this.registry = new Registry();
    this.registry.setDefaultLabels({ service_name: cfg.serviceName, service_version: cfg.serviceVersion });
    collectDefaultMetrics({ register: this.registry });

    const durationBuckets = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

    this.counters = {
      toolInvocations: new Counter({
        name: 'mcp_tool_invocations_total',
        help: 'Count of MCP tool invocations',
        labelNames: ['tool', 'outcome'],
        registers: [this.registry],
      }),
      resourceInvocations: new Counter({
        name: 'mcp_resource_invocations_total',
        help: 'Count of MCP resource reads',
        labelNames: ['resource', 'outcome'],
        registers: [this.registry],
      }),
    };

    this.histograms = {
      toolDurationMs: new Histogram({
        name: 'mcp_tool_duration_ms',
        help: 'Duration of MCP tool invocations in milliseconds',
        labelNames: ['tool'],
        buckets: durationBuckets,
        registers: [this.registry],
      }),
      resourceDurationMs: new Histogram({
        name: 'mcp_resource_duration_ms',
        help: 'Duration of MCP resource reads in milliseconds',
        labelNames: ['resource'],
        buckets: durationBuckets,
        registers: [this.registry],
      }),
    };
  }

  startServer(): void {
    if (!this.cfg.enabled || this.server) return;
    this.server = http.createServer(async (req, res) => {
      if (req.method === 'GET' && req.url && new URL(req.url, 'http://localhost').pathname === this.cfg.path) {
        const body = await this.registry.metrics();
        res.setHeader('Content-Type', this.registry.contentType);
        res.writeHead(200);
        res.end(body);
        return;
      }
      res.writeHead(404);
      res.end();
    });
    this.server.listen(this.cfg.port);
  }

  recordTool(tool: string, durationMs: number, ok: boolean): void {
    try {
      this.counters.toolInvocations.labels({ tool, outcome: ok ? 'ok' : 'error' }).inc();
      this.histograms.toolDurationMs.labels({ tool }).observe(durationMs);
    } catch {
      // ignore metric errors
    }
  }

  recordResource(resource: string, durationMs: number, ok: boolean): void {
    try {
      this.counters.resourceInvocations.labels({ resource, outcome: ok ? 'ok' : 'error' }).inc();
      this.histograms.resourceDurationMs.labels({ resource }).observe(durationMs);
    } catch {
      // ignore metric errors
    }
  }
}

export const createMetrics = (cfg: MetricsConfig): Metrics => new Metrics(cfg);


