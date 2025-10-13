import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logger } from '../observability/logging.js';
import { getRequestId } from '../observability/correlation.js';
import { registerToolName, getRegisteredToolsCount } from './registry.js';
import { startSpan } from '../observability/tracing.js';
import { OpenAPI } from '../horreum/generated/index.js';
import { SchemaService } from '../horreum/generated/services/SchemaService.js';
import { TestService } from '../horreum/generated/services/TestService.js';
import { RunService } from '../horreum/generated/services/RunService.js';
import { DatasetService } from '../horreum/generated/services/DatasetService.js';
import type { SortDirection } from '../horreum/generated/models/SortDirection.js';
import type { TestListing } from '../horreum/generated/models/TestListing.js';
import type { TestSummary } from '../horreum/generated/models/TestSummary.js';
import type { ExportedLabelValues } from '../horreum/generated/models/ExportedLabelValues.js';
import { createRateLimitedFetch } from '../horreum/fetch.js';
import { fetch as undiciFetch } from 'undici';
import type { Env } from '../config/env.js';
import { Metrics } from '../observability/metrics.js';
import { parseTimeRange } from '../utils/time.js';

type FetchLike = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => ReturnType<typeof fetch>;
type RegisterOptions = {
  getEnv: () => Promise<Env>;
  // Minimal fetch-like signature for tests; real runtime uses global fetch
  fetchImpl?: FetchLike | undefined;
  metrics?: Metrics | undefined;
};

/**
 * Map of tool names to their handler functions.
 * This is populated during tool registration and can be used for direct tool invocation.
 */
export const toolHandlers = new Map<
  string,
  (
    args: Record<string, unknown>
  ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>
>();

/**
 * Transform Horreum's ExportedLabelValues to Source MCP Contract format.
 *
 * Converts:
 * - values: Record<string, any> → Array<{name: string, value: any}>
 * - runId → run_id (string)
 * - datasetId → dataset_id (string)
 * - start/stop: epoch millis (number | string) → ISO 8601 datetime (string)
 */
function transformLabelValues(horreumValues: ExportedLabelValues[]): Array<{
  values: Array<{ name: string; value: unknown }>;
  run_id?: string;
  dataset_id?: string;
  start: string;
  stop: string;
}> {
  return horreumValues.map((item) => {
    // Transform values from object to array of {name, value} pairs
    const valuesArray: Array<{ name: string; value: unknown }> = [];
    if (item.values && typeof item.values === 'object') {
      for (const [name, value] of Object.entries(item.values)) {
        valuesArray.push({ name, value });
      }
    }

    // Convert timestamps: handle both number and string (ISO or epoch millis)
    const toIsoString = (ts: string | number | undefined): string => {
      if (ts === undefined) return new Date(0).toISOString();

      // If already a string, check if it's ISO format or epoch millis
      if (typeof ts === 'string') {
        // Check if it's a numeric string (epoch millis)
        if (/^\d+$/.test(ts)) {
          return new Date(parseInt(ts, 10)).toISOString();
        }
        // Assume it's already ISO format
        return ts;
      }

      // It's a number, treat as epoch millis
      return new Date(ts).toISOString();
    };

    return {
      values: valuesArray,
      ...(item.runId !== undefined ? { run_id: String(item.runId) } : {}),
      ...(item.datasetId !== undefined ? { dataset_id: String(item.datasetId) } : {}),
      start: toIsoString(item.start),
      stop: toIsoString(item.stop),
    };
  });
}

export async function registerTools(
  server: McpServer,
  options: RegisterOptions
): Promise<void> {
  const { getEnv, fetchImpl, metrics } = options;
  const genCid = (): string =>
    Math.random().toString(16).slice(2, 10) + Date.now().toString(16);
  const log = (level: 'info' | 'error', data: Record<string, unknown>) => {
    if (level === 'error') logger.error(data);
    else logger.info(data);
  };
  const text = (s: string) => ({ type: 'text' as const, text: s });
  const errorToObject = (
    err: unknown,
    cid: string
  ): { code: string; message: string; details?: unknown; correlationId: string } => {
    // ApiError from generated client has shape with status/statusText/body
    const anyErr = err as {
      name?: string;
      message?: string;
      status?: number;
      statusText?: string;
      body?: unknown;
    };
    if (typeof anyErr?.status === 'number') {
      return {
        code: `HTTP_${anyErr.status}`,
        message: anyErr.statusText || anyErr.message || 'HTTP error',
        details: anyErr.body,
        correlationId: cid,
      };
    }
    return {
      code: anyErr?.name || 'UNKNOWN',
      message: anyErr?.message || 'Unknown error',
      correlationId: cid,
    };
  };
  const env = await getEnv();
  // Configure generated client
  OpenAPI.BASE = env.HORREUM_BASE_URL;
  if (env.HORREUM_TOKEN) {
    OpenAPI.TOKEN = env.HORREUM_TOKEN;
  }
  // Configure rate-limited fetch and inject into OpenAPI instead of patching global fetch.
  // Prefer injected fetch for tests; else use global or undici's fetch.
  const baseFetch: FetchLike =
    (fetchImpl as FetchLike | undefined) ??
    ((globalThis as { fetch?: FetchLike }).fetch as FetchLike | undefined) ??
    (undiciFetch as unknown as FetchLike);
  const rlFetch = createRateLimitedFetch({
    baseFetch,
    requestsPerSecond: env.HORREUM_RATE_LIMIT,
    timeoutMs: env.HORREUM_TIMEOUT,
    maxRetries: 3,
    backoffInitialMs: 1000,
    backoffMaxMs: 30000,
    jitterRatio: 0.25,
  });
  // Inject custom fetch into generated client config
  (OpenAPI as unknown as { FETCH?: typeof fetch }).FETCH =
    rlFetch as unknown as typeof fetch;

  // Resources
  // Test resource: horreum://tests/{id}
  server.resource(
    'test',
    'horreum://tests/{id}',
    { mimeType: 'application/json' },
    async (uri: URL) => {
      const uriStr = String(uri);
      const id = Number(uri.pathname.replace(/^\//, ''));
      if (!Number.isFinite(id)) {
        return { contents: [{ uri: uriStr, text: 'Invalid test id' }], isError: true };
      }
      const data = await TestService.testServiceGetTest({ id });
      return {
        contents: [
          {
            uri: uriStr,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // Schema resource: horreum://schemas/{id}
  server.resource(
    'schema',
    'horreum://schemas/{id}',
    { mimeType: 'application/json' },
    async (uri: URL) => {
      const cid = genCid();
      const started = Date.now();
      const uriStr = String(uri);
      log('info', { event: 'resource.start', resource: 'schema', cid, uri: uriStr });
      try {
        const res = await startSpan('resource.schema', async () => {
          const id = Number(uri.pathname.replace(/^\//, ''));
          if (!Number.isFinite(id)) {
            return {
              contents: [{ uri: uriStr, text: 'Invalid schema id' }],
              isError: true,
            };
          }
          const data = await SchemaService.schemaServiceGetSchema({ id });
          return {
            contents: [
              {
                uri: uriStr,
                mimeType: 'application/json',
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        });
        const duration = Date.now() - started;
        log('info', {
          event: 'resource.end',
          resource: 'schema',
          cid,
          durationMs: duration,
        });
        metrics?.recordResource('schema', duration, true);
        return res;
      } catch (err) {
        const errObj = errorToObject(err, cid);
        const duration = Date.now() - started;
        log('error', {
          event: 'resource.error',
          resource: 'schema',
          cid,
          durationMs: duration,
          error: errObj,
        });
        metrics?.recordResource('schema', duration, false);
        return {
          contents: [{ uri: uriStr, text: JSON.stringify(errObj) }],
          isError: true,
        };
      }
    }
  );

  // Run resource: horreum://tests/{testId}/runs/{runId}
  server.resource(
    'run',
    'horreum://tests/{testId}/runs/{runId}',
    { mimeType: 'application/json' },
    async (uri: URL) => {
      const cid = genCid();
      const started = Date.now();
      const uriStr = String(uri);
      log('info', { event: 'resource.start', resource: 'run', cid, uri: uriStr });
      try {
        const res = await startSpan('resource.run', async () => {
          const parts = uri.pathname.replace(/^\//, '').split('/');
          // expected structure: tests/{testId}/runs/{runId}
          if (parts.length !== 4 || parts[0] !== 'tests' || parts[2] !== 'runs') {
            return {
              contents: [{ uri: uriStr, text: 'Invalid run URI' }],
              isError: true,
            };
          }
          const runId = Number(parts[3]);
          if (!Number.isFinite(runId)) {
            return {
              contents: [{ uri: uriStr, text: 'Invalid run id' }],
              isError: true,
            };
          }
          const data = await RunService.runServiceGetRun({ id: runId });
          return {
            contents: [
              {
                uri: uriStr,
                mimeType: 'application/json',
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        });
        const duration = Date.now() - started;
        log('info', {
          event: 'resource.end',
          resource: 'run',
          cid,
          durationMs: duration,
        });
        metrics?.recordResource('run', duration, true);
        return res;
      } catch (err) {
        const errObj = errorToObject(err, cid);
        const duration = Date.now() - started;
        log('error', {
          event: 'resource.error',
          resource: 'run',
          cid,
          durationMs: duration,
          error: errObj,
        });
        metrics?.recordResource('run', duration, false);
        return {
          contents: [{ uri: uriStr, text: JSON.stringify(errObj) }],
          isError: true,
        };
      }
    }
  );

  // ping
  type ToolResult = {
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  };
  type ToolArgs = Record<string, unknown>;
  const withTool = (
    toolName: string,
    description: string,
    shape: z.ZodRawShape,
    handler: (args: ToolArgs) => Promise<ToolResult>
  ) => {
    registerToolName(toolName);

    // Wrapped handler with logging and metrics
    const wrappedHandler = async (args: ToolArgs): Promise<ToolResult> => {
      const cid = getRequestId() || genCid();
      const started = Date.now();
      logger.info({
        event: 'mcp.tools.call.start',
        req_id: cid,
        tool: toolName,
        arguments_keys: Object.keys(args || {}),
      });
      try {
        const res = await startSpan(`tool.${toolName}`, async () => handler(args));
        const duration = Date.now() - started;
        logger.info({
          event: 'mcp.tools.call.complete',
          req_id: cid,
          tool: toolName,
          duration_ms: duration,
        });
        metrics?.recordTool(
          toolName,
          duration,
          !(res as { isError?: boolean }).isError
        );
        return res;
      } catch (err) {
        const errObj = errorToObject(err, cid);
        const duration = Date.now() - started;
        logger.error({
          event: 'mcp.request.failed',
          req_id: cid,
          error_type: 'tool_error',
          error: errObj,
          duration_ms: duration,
        });
        metrics?.recordTool(toolName, duration, false);
        return {
          content: [{ type: 'text', text: JSON.stringify(errObj) }],
          isError: true,
        };
      }
    };

    // Register with MCP server
    server.tool(toolName, description, shape, wrappedHandler);

    // Also store in our handler map for direct invocation
    toolHandlers.set(toolName, wrappedHandler);
  };

  withTool(
    'ping',
    'Ping the server to verify connectivity.',
    { message: z.string().optional() },
    async (args: ToolArgs) => ({
      content: [text(typeof args.message === 'string' ? args.message : 'pong')],
    })
  );

  // list_tests
  withTool(
    'list_tests',
    'List Horreum tests with optional pagination and search. Pagination uses 1-based indexing (first page is page=1).',
    {
      limit: z.number().int().positive().max(1000).optional(),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number (1-based, first page is 1)'),
      sort: z.string().optional(),
      direction: z.enum(['Ascending', 'Descending']).optional(),
      roles: z.string().optional(),
      name: z.string().optional(),
      folder: z.string().optional(),
    },
    async (args) => {
      // If a specific folder is provided, query just that folder
      if (args.folder) {
        const res = await TestService.testServiceGetTestSummary({
          ...(args.roles !== undefined ? { roles: args.roles as string } : {}),
          folder: args.folder as string,
          ...(args.limit !== undefined ? { limit: args.limit as number } : {}),
          ...(args.page !== undefined ? { page: args.page as number } : {}),
          ...(args.direction ? { direction: args.direction as SortDirection } : {}),
          ...(args.name ? { name: args.name as string } : {}),
        });
        return { content: [text(JSON.stringify(res, null, 2))] };
      }

      // Otherwise, aggregate across top-level and all folders
      const folders = await TestService.testServiceFolders(
        args.roles !== undefined ? { roles: args.roles as string } : {}
      );

      const targets: (string | undefined)[] = [undefined, ...(folders ?? [])];
      const listings: TestListing[] = await Promise.all(
        targets.map((folderName) =>
          TestService.testServiceGetTestSummary({
            ...(args.roles !== undefined ? { roles: args.roles as string } : {}),
            ...(folderName ? { folder: folderName } : {}),
            // Omit page parameter to get all results for aggregation
            ...(args.direction ? { direction: args.direction as SortDirection } : {}),
            ...(args.name ? { name: args.name as string } : {}),
          }).catch(() => ({ tests: [], count: 0 }) as unknown as TestListing)
        )
      );

      const aggregated: TestSummary[] = listings.flatMap((l) =>
        Array.isArray(l?.tests) ? l.tests : []
      );
      const total = aggregated.length;

      // Optional client-side pagination after aggregation
      let paged = aggregated;
      if (args.limit !== undefined && args.page !== undefined) {
        const start = Math.max(0, ((args.page as number) - 1) * (args.limit as number));
        paged = aggregated.slice(start, start + (args.limit as number));
      }

      // Transform for Source MCP Contract compliance
      const testsWithId = (
        paged as Array<{ id?: number | string; [key: string]: unknown }>
      ).map((test) => ({
        ...test,
        test_id: String(test.id ?? test.test_id ?? ''),
      }));

      const result = {
        tests: testsWithId as unknown as TestSummary[],
        count: total,
      };
      return { content: [text(JSON.stringify(result, null, 2))] };
    }
  );

  // get_schema
  withTool(
    'get_schema',
    'Get a Horreum schema by id or name.',
    {
      id: z.number().int().positive().optional(),
      name: z.string().optional(),
    },
    async (args) => {
      if (!args.id && !args.name) {
        return { content: [text('Provide id or name.')], isError: true };
      }
      const res = args.id
        ? await SchemaService.schemaServiceGetSchema({ id: args.id as number })
        : await SchemaService.schemaServiceListSchemas({
            ...(args.name ? { name: args.name as string } : {}),
          });
      return { content: [text(JSON.stringify(res, null, 2))] };
    }
  );

  // list_runs
  withTool(
    'list_runs',
    'List Runs for a given test with optional pagination, sorting, and time filtering. ' +
      'Supports natural language time expressions like "last week", "yesterday", "last 30 days". ' +
      'Defaults to last 30 days when no time parameters are specified. ' +
      'Pagination uses 1-based indexing (first page is page=1).',
    {
      test_id: z.number().int().positive().optional(),
      test: z.string().optional().describe('Test name or ID'),
      trashed: z.boolean().optional(),
      limit: z.number().int().positive().max(1000).optional(),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number (1-based, first page is 1)'),
      sort: z.string().optional(),
      direction: z.enum(['Ascending', 'Descending']).optional(),
      from: z
        .string()
        .optional()
        .describe(
          'Start time: ISO timestamp, epoch millis, or natural language ("last week", "yesterday")'
        ),
      to: z
        .string()
        .optional()
        .describe(
          'End time: ISO timestamp, epoch millis, or natural language ("now", "today")'
        ),
    },
    async (args) => {
      // Resolve testId from name if needed
      let resolvedTestId: number | undefined = args.test_id as number | undefined;
      if (!resolvedTestId && args.test) {
        const maybeId = Number(args.test as string);
        if (Number.isFinite(maybeId)) {
          resolvedTestId = maybeId;
        } else {
          const t = await TestService.testServiceGetByNameOrId({
            name: args.test as string,
          });
          resolvedTestId = t.id;
        }
      }
      if (!resolvedTestId) {
        return {
          content: [text('Provide test_id or test (name or ID).')],
          isError: true,
        };
      }

      const reqId = getRequestId();
      const qStart = Date.now();
      logger.info({
        event: 'query.start',
        req_id: reqId,
        path: 'runs',
        tool: 'list_runs',
      });

      // Parse time range with natural language support
      const { fromMs, toMs } = parseTimeRange(
        args.from as string | undefined,
        args.to as string | undefined
      );

      // If no time filters are provided, defer to a single API call (server-side pagination)
      if (fromMs === undefined && toMs === undefined) {
        const res = await RunService.runServiceListTestRuns({
          testId: resolvedTestId,
          ...(args.trashed !== undefined ? { trashed: args.trashed as boolean } : {}),
          ...(args.limit !== undefined ? { limit: args.limit as number } : {}),
          ...(args.page !== undefined ? { page: args.page as number } : {}),
          ...(args.sort ? { sort: args.sort as string } : {}),
          ...(args.direction ? { direction: args.direction as SortDirection } : {}),
        });

        // Transform for Source MCP Contract compliance
        const runs = Array.isArray((res as { runs?: unknown }).runs)
          ? (res as { runs: unknown[] }).runs
          : [];
        const runsWithId = (
          runs as Array<{ id?: number | string; [key: string]: unknown }>
        ).map((run) => ({
          ...run,
          run_id: String(run.id ?? run.run_id ?? ''),
        }));

        const transformed = {
          ...res,
          runs: runsWithId,
        };

        const duration = (Date.now() - qStart) / 1000;
        const points = Array.isArray((transformed as { runs?: unknown }).runs)
          ? ((transformed as { runs: unknown[] }).runs as unknown[]).length
          : 0;
        logger.info({
          event: 'query.complete',
          req_id: reqId,
          duration_sec: duration,
          points,
          path: 'runs',
        });
        return { content: [text(JSON.stringify(transformed, null, 2))] };
      }

      // Time-filtered: fetch pages and filter client-side by start timestamp
      const pageSize = Math.min((args.limit as number | undefined) ?? 500, 1000);
      const sortField = (args.sort as string | undefined) ?? 'start';
      const sortDir = (args.direction as SortDirection | undefined) ?? 'Descending';

      let page = 1;
      const aggregated: import('../horreum/generated/models/RunSummary.js').RunSummary[] =
        [];
      // Fetch until no more results or we can short-circuit by time bound when sorted by start desc
      // Note: API pages start at 1; if server supports page=0 semantics, it's ignored here intentionally
      // to keep pagination predictable across deployments.
      for (;;) {
        const res = await RunService.runServiceListTestRuns({
          testId: resolvedTestId,
          ...(args.trashed !== undefined ? { trashed: args.trashed as boolean } : {}),
          limit: pageSize,
          page,
          sort: sortField,
          direction: sortDir as SortDirection,
        });
        const runs = Array.isArray(res.runs) ? res.runs : [];
        aggregated.push(...runs);

        // Short-circuit when sorted by start desc and oldest fetched run is older than from
        if (sortField === 'start' && sortDir === 'Descending' && fromMs !== undefined) {
          const oldest = runs[runs.length - 1];
          const oldestStart = oldest
            ? Number(oldest.start) || Date.parse(String(oldest.start))
            : NaN;
          if (Number.isFinite(oldestStart) && oldestStart < fromMs) {
            break;
          }
        }
        if (runs.length < pageSize) break;
        page += 1;
      }

      const withinRange = aggregated.filter((r) => {
        const startMs = Number(r.start) || Date.parse(String(r.start));
        if (!Number.isFinite(startMs)) return false;
        if (fromMs !== undefined && startMs < fromMs) return false;
        if (toMs !== undefined && startMs > toMs) return false;
        return true;
      });

      // Apply optional client-side pagination if requested
      let finalRuns = withinRange;
      if (args.limit !== undefined && args.page !== undefined) {
        const start = Math.max(0, ((args.page as number) - 1) * (args.limit as number));
        finalRuns = withinRange.slice(start, start + (args.limit as number));
      }

      // Transform for Source MCP Contract compliance
      const runsWithId = finalRuns.map((run) => ({
        ...run,
        run_id: String(run.id ?? (run as { run_id?: unknown }).run_id ?? ''),
      }));

      const result = {
        total: withinRange.length,
        runs: runsWithId as unknown as typeof finalRuns,
      };
      const duration = (Date.now() - qStart) / 1000;
      logger.info({
        event: 'query.complete',
        req_id: reqId,
        duration_sec: duration,
        points: runsWithId.length,
        path: 'runs',
      });
      return { content: [text(JSON.stringify(result, null, 2))] };
    }
  );

  // upload_run
  withTool(
    'upload_run',
    'Upload a Run JSON payload to a test (name or ID).',
    {
      test: z.string(),
      start: z.string().describe('Start timestamp or JSONPath'),
      stop: z.string().describe('Stop timestamp or JSONPath'),
      data: z.union([z.string(), z.record(z.unknown())]).describe('Run JSON payload'),
      owner: z.string().optional(),
      access: z.string().optional(),
      schema: z.string().optional().describe('Schema URI'),
      description: z.string().optional(),
    },
    async (args) => {
      const payload =
        typeof args.data === 'string' ? args.data : JSON.stringify(args.data);
      const res = await RunService.runServiceAddRunFromData({
        start: args.start as string,
        stop: args.stop as string,
        test: args.test as string,
        requestBody: payload,
        ...(args.owner ? { owner: args.owner as string } : {}),
        // Access is an enum type; string is accepted by client
        ...(args.access
          ? {
              access:
                args.access as unknown as import('../horreum/generated/models/Access.js').Access,
            }
          : {}),
        ...(args.schema ? { schema: args.schema as string } : {}),
        ...(args.description ? { description: args.description as string } : {}),
      });
      return { content: [text(typeof res === 'string' ? res : JSON.stringify(res))] };
    }
  );

  // list_datasets - Search for datasets with optional filtering
  withTool(
    'list_datasets',
    'Search for datasets across tests and runs with optional filtering. ' +
      'Supports natural language time expressions like "last week", "yesterday", "last 30 days". ' +
      'Defaults to last 30 days when no time parameters are specified. ' +
      'Pagination uses 1-based indexing (first page is page=1).',
    {
      test_id: z.number().int().positive().optional().describe('Filter by test ID'),
      test_name: z.string().optional().describe('Filter by test name'),
      schema_uri: z.string().optional().describe('Filter by schema URI'),
      from: z
        .string()
        .optional()
        .describe(
          'Start time: ISO timestamp, epoch millis, or natural language ("last week", "yesterday")'
        ),
      to: z
        .string()
        .optional()
        .describe(
          'End time: ISO timestamp, epoch millis, or natural language ("now", "today")'
        ),
      page_size: z.number().int().positive().max(1000).optional(),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number (1-based, first page is 1)'),
      sort: z.string().optional(),
      direction: z.enum(['Ascending', 'Descending']).optional(),
    },
    async (args) => {
      // Resolve test ID from name if provided
      let resolvedTestId: number | undefined = args.test_id as number | undefined;
      if (!resolvedTestId && args.test_name) {
        const t = await TestService.testServiceGetByNameOrId({
          name: args.test_name as string,
        });
        resolvedTestId = t.id;
      }
      if (!args.test_id && args.test_name && resolvedTestId) {
        logger.info({
          event: 'normalize.hint',
          action: 'test_name->test_id',
          before: args.test_name,
          after: resolvedTestId,
          req_id: getRequestId(),
        });
      }

      // Parse time range with natural language support
      const { fromMs, toMs } = parseTimeRange(
        args.from as string | undefined,
        args.to as string | undefined
      );

      // Determine which API endpoint to use based on filters
      let datasetList;
      const reqId = getRequestId();
      const qStart = Date.now();
      logger.info({
        event: 'query.start',
        req_id: reqId,
        path: 'datasets',
        tool: 'list_datasets',
      });
      if (args.schema_uri) {
        // Use schema-based listing with 1-based pagination
        const pageNum = (args.page as number | undefined) ?? 1;
        datasetList = await DatasetService.datasetServiceListDatasetsBySchema({
          uri: args.schema_uri as string,
          limit: (args.page_size as number | undefined) ?? 100,
          page: pageNum,
          ...(args.sort ? { sort: args.sort as string } : {}),
          ...(args.direction ? { direction: args.direction as SortDirection } : {}),
        });
      } else if (resolvedTestId) {
        // Use test-based listing with 1-based pagination
        const pageNum = (args.page as number | undefined) ?? 1;
        datasetList = await DatasetService.datasetServiceListByTest({
          testId: resolvedTestId,
          limit: (args.page_size as number | undefined) ?? 100,
          page: pageNum,
          ...(args.sort ? { sort: args.sort as string } : {}),
          ...(args.direction ? { direction: args.direction as SortDirection } : {}),
        });
      } else {
        return {
          content: [
            text(
              'Please provide either test_id, test_name, or schema_uri to filter datasets.'
            ),
          ],
          isError: true,
        };
      }

      // Apply time filtering client-side if specified
      let filteredDatasets = datasetList.datasets;
      if (fromMs !== undefined || toMs !== undefined) {
        filteredDatasets = datasetList.datasets.filter((ds) => {
          const startMs = Number(ds.start) || Date.parse(String(ds.start));
          if (!Number.isFinite(startMs)) return false;
          if (fromMs !== undefined && startMs < fromMs) return false;
          if (toMs !== undefined && startMs > toMs) return false;
          return true;
        });
      }

      // Map to response format
      const response = {
        datasets: filteredDatasets.map((ds) => ({
          dataset_id: ds.id,
          run_id: ds.runId,
          test_id: ds.testId,
          test_name: ds.testname,
          start: ds.start,
          stop: ds.stop,
          schema_uri: ds.schemas?.[0]?.uri ?? null,
          schemas: ds.schemas?.map((s) => s.uri) ?? [],
        })),
        pagination: {
          has_more: filteredDatasets.length < datasetList.total,
          total_count: datasetList.total,
        },
      };

      const duration = (Date.now() - qStart) / 1000;
      logger.info({
        event: 'query.complete',
        req_id: reqId,
        duration_sec: duration,
        points: response.datasets.length,
        path: 'datasets',
      });
      return { content: [text(JSON.stringify(response, null, 2))] };
    }
  );

  // get_dataset - Retrieve raw content of a specific dataset
  withTool(
    'get_dataset',
    'Get the raw JSON content of a specific dataset by ID.',
    {
      dataset_id: z.number().int().positive().describe('Dataset ID to retrieve'),
    },
    async (args) => {
      const dataset = await DatasetService.datasetServiceGetDataset({
        id: args.dataset_id as number,
      });

      const response = {
        dataset_id: dataset.id,
        run_id: dataset.runId,
        test_id: dataset.testid,
        start: dataset.start,
        stop: dataset.stop,
        description: dataset.description,
        content: dataset.data,
      };

      return { content: [text(JSON.stringify(response, null, 2))] };
    }
  );

  // get_dataset_summary - dataset summary with optional viewId
  withTool(
    'get_dataset_summary',
    'Get dataset summary by Dataset ID; optionally filter by View ID.',
    {
      dataset_id: z.number().int().positive(),
      view_id: z.number().int().positive().optional(),
    },
    async (args) => {
      const res = await DatasetService.datasetServiceGetDatasetSummary({
        datasetId: args.dataset_id as number,
        ...(args.view_id ? { viewId: args.view_id as number } : {}),
      });
      return { content: [text(JSON.stringify(res, null, 2))] };
    }
  );

  // get_run_label_values - Label values for a specific run
  withTool(
    'get_run_label_values',
    'Get label values for a specific run with filtering and pagination. ' +
      'When multiFilter=true, filter values can be arrays to match multiple values: ' +
      '{"label_name": ["value1", "value2"]}',
    {
      run_id: z
        .union([z.number().int().positive(), z.string()])
        .describe('Run ID (number or numeric string)'),
      filter: z
        .union([z.string(), z.record(z.unknown())])
        .optional()
        .describe(
          'JSON sub-document or path expression. Use arrays when multiFilter=true: ' +
            '{"label": ["val1", "val2"]}'
        ),
      include: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
      multiFilter: z
        .boolean()
        .optional()
        .describe('Enable array value matching in filter'),
      sort: z.string().optional(),
      direction: z.enum(['Ascending', 'Descending']).optional(),
      limit: z.number().int().positive().optional(),
      page: z.number().int().min(1).optional().describe('1-based page number'),
    },
    async (args) => {
      // Convert run_id to number if it's a string
      const runId =
        typeof args.run_id === 'string'
          ? parseInt(args.run_id as string, 10)
          : (args.run_id as number);

      const filterStr =
        typeof args.filter === 'string'
          ? (args.filter as string)
          : args.filter && typeof args.filter === 'object'
            ? JSON.stringify(args.filter)
            : '{}';

      const res = await RunService.runServiceGetRunLabelValues({
        id: runId,
        filter: filterStr,
        ...(args.sort ? { sort: args.sort as string } : {}),
        ...(args.direction ? { direction: args.direction as unknown as string } : {}),
        ...(args.limit !== undefined ? { limit: args.limit as number } : {}),
        ...(args.page !== undefined ? { page: args.page as number } : {}),
        ...(args.include ? { include: args.include as string[] } : {}),
        ...(args.exclude ? { exclude: args.exclude as string[] } : {}),
        ...(args.multiFilter !== undefined
          ? { multiFilter: args.multiFilter as boolean }
          : {}),
      });

      // Transform to Source MCP Contract format
      const transformed = transformLabelValues(Array.isArray(res) ? res : [res]);

      // Wrap in Source MCP Contract response structure
      const response = {
        items: transformed,
        pagination: {
          has_more: false,
          total_count: transformed.length,
        },
      };
      return { content: [text(JSON.stringify(response, null, 2))] };
    }
  );

  // get_test_label_values - Aggregated label values across a test
  withTool(
    'get_test_label_values',
    'Get aggregated label values across all runs for a test. ' +
      'When multiFilter=true, filter values can be arrays to match multiple values: ' +
      '{"label_name": ["value1", "value2"]}',
    {
      test_id: z
        .union([z.number().int().positive(), z.string()])
        .optional()
        .describe('Test ID (number or numeric string)'),
      test_name: z.string().optional(),
      filtering: z.boolean().optional().describe('Include filtering labels'),
      metrics: z.boolean().optional().describe('Include metric labels'),
      filter: z
        .union([z.string(), z.record(z.unknown())])
        .optional()
        .describe(
          'JSON sub-document or path expression. Use arrays when multiFilter=true: ' +
            '{"label": ["val1", "val2"]}'
        ),
      before: z.string().optional().describe('ISO, epoch millis, or natural language'),
      after: z.string().optional().describe('ISO, epoch millis, or natural language'),
      sort: z.string().optional(),
      direction: z.enum(['Ascending', 'Descending']).optional(),
      limit: z.number().int().positive().optional(),
      page: z.number().int().min(1).optional().describe('1-based page number'),
      include: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
      multiFilter: z
        .boolean()
        .optional()
        .describe('Enable array value matching in filter'),
    },
    async (args) => {
      // Resolve test ID from name if provided, handle string test_id
      let resolvedTestId: number | undefined;
      if (args.test_id) {
        resolvedTestId =
          typeof args.test_id === 'string'
            ? parseInt(args.test_id as string, 10)
            : (args.test_id as number);
      } else if (args.test_name) {
        const t = await TestService.testServiceGetByNameOrId({
          name: args.test_name as string,
        });
        resolvedTestId = t.id;
      }
      if (!resolvedTestId) {
        return {
          content: [text('Provide test_id or test_name.')],
          isError: true,
        };
      }

      // Natural language time for before/after via parseTimeRange
      const { fromMs, toMs } = parseTimeRange(
        (args.after as string | undefined) ?? undefined,
        (args.before as string | undefined) ?? undefined
      );
      const beforeStr = toMs !== undefined ? String(toMs) : undefined;
      const afterStr = fromMs !== undefined ? String(fromMs) : undefined;

      const filterStr =
        typeof args.filter === 'string'
          ? (args.filter as string)
          : args.filter && typeof args.filter === 'object'
            ? JSON.stringify(args.filter)
            : '{}';

      const res = await TestService.testServiceGetTestLabelValues({
        id: resolvedTestId,
        ...(args.filtering !== undefined
          ? { filtering: args.filtering as boolean }
          : {}),
        ...(args.metrics !== undefined ? { metrics: args.metrics as boolean } : {}),
        filter: filterStr,
        ...(beforeStr ? { before: beforeStr } : {}),
        ...(afterStr ? { after: afterStr } : {}),
        ...(args.sort ? { sort: args.sort as string } : {}),
        ...(args.direction ? { direction: args.direction as unknown as string } : {}),
        ...(args.limit !== undefined ? { limit: args.limit as number } : {}),
        ...(args.page !== undefined ? { page: args.page as number } : {}),
        ...(args.include ? { include: args.include as string[] } : {}),
        ...(args.exclude ? { exclude: args.exclude as string[] } : {}),
        ...(args.multiFilter !== undefined
          ? { multiFilter: args.multiFilter as boolean }
          : {}),
      });

      // Transform to Source MCP Contract format
      const transformed = transformLabelValues(Array.isArray(res) ? res : [res]);

      // Wrap in Source MCP Contract response structure
      const response = {
        items: transformed,
        pagination: {
          has_more: false,
          total_count: transformed.length,
        },
      };
      return { content: [text(JSON.stringify(response, null, 2))] };
    }
  );

  // get_dataset_label_values - Label values for a specific dataset
  withTool(
    'get_dataset_label_values',
    'Get label values for a specific dataset.',
    {
      dataset_id: z.number().int().positive().describe('Dataset ID'),
    },
    async (args) => {
      const res = await DatasetService.datasetServiceGetDatasetLabelValues({
        datasetId: args.dataset_id as number,
      });
      return { content: [text(JSON.stringify(res, null, 2))] };
    }
  );

  // get_run - expose run resource as a tool
  withTool(
    'get_run',
    'Get extended Run information by Run ID.',
    { run_id: z.number().int().positive() },
    async (args) => {
      const res = await RunService.runServiceGetRun({ id: args.run_id as number });
      return { content: [text(JSON.stringify(res, null, 2))] };
    }
  );

  // get_run_data - raw run payload (optional schemaUri)
  withTool(
    'get_run_data',
    'Get raw run data payload; optionally filter by schema URI.',
    {
      run_id: z.number().int().positive(),
      schema_uri: z.string().optional(),
    },
    async (args) => {
      const res = await RunService.runServiceGetData({
        id: args.run_id as number,
        ...(args.schema_uri ? { schemaUri: args.schema_uri as string } : {}),
      });
      return { content: [text(JSON.stringify(res, null, 2))] };
    }
  );

  // get_run_metadata - metadata only (optional schemaUri)
  withTool(
    'get_run_metadata',
    'Get run metadata; optionally filter by schema URI.',
    {
      run_id: z.number().int().positive(),
      schema_uri: z.string().optional(),
    },
    async (args) => {
      const res = await RunService.runServiceGetMetadata({
        id: args.run_id as number,
        ...(args.schema_uri ? { schemaUri: args.schema_uri as string } : {}),
      });
      return { content: [text(JSON.stringify(res, null, 2))] };
    }
  );

  // get_run_summary - lightweight run overview
  withTool(
    'get_run_summary',
    'Get run summary information by Run ID.',
    { run_id: z.number().int().positive() },
    async (args) => {
      const res = await RunService.runServiceGetRunSummary({
        id: args.run_id as number,
      });
      return { content: [text(JSON.stringify(res, null, 2))] };
    }
  );

  // list_runs_by_schema - list runs filtered by schema URI
  withTool(
    'list_runs_by_schema',
    'List runs filtered by a given schema URI. Pagination is 1-based.',
    {
      schema_uri: z.string(),
      limit: z.number().int().positive().max(1000).optional(),
      page: z.number().int().min(1).optional(),
      sort: z.string().optional(),
      direction: z.enum(['Ascending', 'Descending']).optional(),
    },
    async (args) => {
      const limit = (args.limit as number | undefined) ?? 100;
      const page = (args.page as number | undefined) ?? 1;
      const res = await RunService.runServiceListRunsBySchema({
        uri: args.schema_uri as string,
        limit,
        page,
        ...(args.sort ? { sort: args.sort as string } : {}),
        ...(args.direction ? { direction: args.direction as SortDirection } : {}),
      });

      const runs = Array.isArray((res as { runs?: unknown }).runs)
        ? (res as { runs: unknown[] }).runs
        : [];
      const total = (res as { total?: number }).total ?? runs.length;
      const hasMore = runs.length >= limit;

      const runsWithId = (
        runs as Array<{ id?: number | string; [key: string]: unknown }>
      ).map((run) => ({
        ...run,
        run_id: String(run.id ?? (run as { run_id?: unknown }).run_id ?? ''),
      }));

      const transformed = {
        runs: runsWithId,
        pagination: {
          has_more: hasMore,
          total_count: total,
          next_page_token: hasMore
            ? Buffer.from(JSON.stringify({ page: page + 1, limit })).toString('base64')
            : undefined,
        },
      };
      return { content: [text(JSON.stringify(transformed, null, 2))] };
    }
  );

  // get_run_count - count summary for a test
  withTool(
    'get_run_count',
    'Get Run count summary for a given Test ID.',
    { test_id: z.number().int().positive() },
    async (args) => {
      const res = await RunService.runServiceRunCount({
        testId: args.test_id as number,
      });
      return { content: [text(JSON.stringify(res, null, 2))] };
    }
  );

  // list_all_runs - global run search with optional time filters
  withTool(
    'list_all_runs',
    'List all runs across all tests. Supports natural language time expressions. ' +
      'Pagination uses 1-based indexing (first page is 1).',
    {
      query: z.string().optional(),
      roles: z.string().optional(),
      trashed: z.boolean().optional(),
      limit: z.number().int().positive().max(1000).optional(),
      page: z.number().int().min(1).optional(),
      sort: z.string().optional(),
      direction: z.enum(['Ascending', 'Descending']).optional(),
      from: z
        .string()
        .optional()
        .describe('Start time: ISO, epoch millis, or natural language ("last week")'),
      to: z
        .string()
        .optional()
        .describe('End time: ISO, epoch millis, or natural language ("now")'),
    },
    async (args) => {
      const limit = Math.min((args.limit as number | undefined) ?? 100, 1000);
      const page = (args.page as number | undefined) ?? 1;

      // If no time filters, defer to API pagination
      if (!args.from && !args.to) {
        const res = await RunService.runServiceListAllRuns({
          ...(args.query ? { query: args.query as string } : {}),
          ...(args.roles ? { roles: args.roles as string } : {}),
          ...(args.trashed !== undefined ? { trashed: args.trashed as boolean } : {}),
          limit,
          page,
          ...(args.sort ? { sort: args.sort as string } : {}),
          ...(args.direction ? { direction: args.direction as SortDirection } : {}),
        });
        const runs = Array.isArray((res as { runs?: unknown }).runs)
          ? (res as { runs: unknown[] }).runs
          : [];
        const total = (res as { total?: number }).total ?? runs.length;
        const hasMore = runs.length >= limit;
        const runsWithId = (
          runs as Array<{ id?: number | string; [key: string]: unknown }>
        ).map((run) => ({
          ...run,
          run_id: String(run.id ?? (run as { run_id?: unknown }).run_id ?? ''),
        }));
        const transformed = {
          runs: runsWithId,
          pagination: {
            has_more: hasMore,
            total_count: total,
            next_page_token: hasMore
              ? Buffer.from(JSON.stringify({ page: page + 1, limit })).toString(
                  'base64'
                )
              : undefined,
          },
        };
        return { content: [text(JSON.stringify(transformed, null, 2))] };
      }

      // Time-filtered: aggregate pages client-side and filter by start timestamp
      const { fromMs, toMs } = parseTimeRange(
        args.from as string | undefined,
        args.to as string | undefined
      );

      let apiPage = 1;
      const pageSize = Math.min(limit, 500);
      const sortField = (args.sort as string | undefined) ?? 'start';
      const sortDir = (args.direction as SortDirection | undefined) ?? 'Descending';
      const aggregated: Array<{ start?: number | string }> = [];
      for (;;) {
        const chunk = await RunService.runServiceListAllRuns({
          ...(args.query ? { query: args.query as string } : {}),
          ...(args.roles ? { roles: args.roles as string } : {}),
          ...(args.trashed !== undefined ? { trashed: args.trashed as boolean } : {}),
          limit: pageSize,
          page: apiPage,
          sort: sortField,
          direction: sortDir,
        });
        const runs = Array.isArray((chunk as { runs?: unknown }).runs)
          ? ((chunk as { runs: unknown[] }).runs as unknown[])
          : [];
        aggregated.push(...(runs as Array<{ start?: number | string }>));
        if (runs.length < pageSize) break;
        apiPage += 1;
      }

      const withinRange = aggregated.filter((r) => {
        const s = Number(r.start) || Date.parse(String(r.start));
        if (!Number.isFinite(s)) return false;
        if (fromMs !== undefined && s < fromMs) return false;
        if (toMs !== undefined && s > toMs) return false;
        return true;
      });
      const startIdx = Math.max(0, (page - 1) * limit);
      const finalRuns = withinRange.slice(startIdx, startIdx + limit);
      const hasMore = startIdx + limit < withinRange.length;
      const result = {
        runs: (
          finalRuns as Array<{ id?: number | string; [key: string]: unknown }>
        ).map((run) => ({
          ...run,
          run_id: String(run.id ?? (run as { run_id?: unknown }).run_id ?? ''),
        })),
        pagination: {
          has_more: hasMore,
          total_count: withinRange.length,
          next_page_token: hasMore
            ? Buffer.from(JSON.stringify({ page: page + 1, limit })).toString('base64')
            : undefined,
        },
      } as const;
      return { content: [text(JSON.stringify(result, null, 2))] };
    }
  );

  // source.describe - Capability discovery tool
  withTool(
    'source_describe',
    'Discover the capabilities and limits of the Horreum MCP server.',
    {},
    async () => {
      const env = await getEnv();
      logger.info({ event: 'mcp.tools.list.start' });
      const response = {
        source_type: 'horreum',
        version: '0.1.0', // From package.json
        contract_version: '1.0.0',
        capabilities: {
          pagination: true,
          caching: false,
          streaming: false,
          schemas: true,
        },
        limits: {
          max_page_size: 1000,
          max_dataset_size: 10485760, // 10MB
          rate_limit_per_minute: env.HORREUM_RATE_LIMIT || 60,
        },
      };
      logger.info({
        event: 'mcp.tools.list.complete',
        count: getRegisteredToolsCount(),
      });
      return { content: [text(JSON.stringify(response, null, 2))] };
    }
  );
}
