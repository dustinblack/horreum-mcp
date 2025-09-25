export type TracingConfig = {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
};

let tracingEnabled = false;

export async function initTracing(cfg: TracingConfig): Promise<void> {
  if (!cfg.enabled) {
    tracingEnabled = false;
    return;
  }
  try {
    const [sdkNode, resources, semconv, sdkBase, otlpHttp, instrCore, instrUndici] =
      await Promise.all([
        import('@opentelemetry/api'),
        import('@opentelemetry/sdk-trace-node'),
        import('@opentelemetry/resources'),
        import('@opentelemetry/semantic-conventions'),
        import('@opentelemetry/sdk-trace-base'),
        import('@opentelemetry/exporter-trace-otlp-http'),
        import('@opentelemetry/instrumentation'),
        import('@opentelemetry/instrumentation-undici'),
      ]);

    const resource = new resources.Resource({
      [semconv.SemanticResourceAttributes.SERVICE_NAME]: cfg.serviceName,
      [semconv.SemanticResourceAttributes.SERVICE_VERSION]: cfg.serviceVersion,
    });

    const provider = new sdkNode.NodeTracerProvider({ resource });
    const exporter = new otlpHttp.OTLPTraceExporter();
    provider.addSpanProcessor(new sdkBase.BatchSpanProcessor(exporter));
    provider.register();

    instrCore.registerInstrumentations({
      instrumentations: [new instrUndici.UndiciInstrumentation()],
    });
    tracingEnabled = true;
  } catch {
    tracingEnabled = false;
  }
}

export async function startSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!tracingEnabled) return fn();
  try {
    const api = await import('@opentelemetry/api');
    const tracer = api.trace.getTracer('horreum-mcp');
    const span = tracer.startSpan(name);
    return api.context.with(api.trace.setSpan(api.context.active(), span), async () => {
      try {
        const result = await fn();
        span.end();
        return result;
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: 2, message: (err as Error).message });
        span.end();
        throw err;
      }
    });
  } catch {
    return fn();
  }
}
