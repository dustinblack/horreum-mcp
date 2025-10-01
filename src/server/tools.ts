import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logger } from '../observability/logging.js';
import { startSpan } from '../observability/tracing.js';
import { OpenAPI } from '../horreum/generated/index.js';
import { SchemaService } from '../horreum/generated/services/SchemaService.js';
import { TestService } from '../horreum/generated/services/TestService.js';
import { RunService } from '../horreum/generated/services/RunService.js';
import { DatasetService } from '../horreum/generated/services/DatasetService.js';
import type { SortDirection } from '../horreum/generated/models/SortDirection.js';
import type { TestListing } from '../horreum/generated/models/TestListing.js';
import type { TestSummary } from '../horreum/generated/models/TestSummary.js';
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
    server.tool(
      toolName,
      description,
      shape,
      async (args: ToolArgs): Promise<ToolResult> => {
        const cid = genCid();
        const started = Date.now();
        log('info', { event: 'tool.start', tool: toolName, cid, args });
        try {
          const res = await startSpan(`tool.${toolName}`, async () => handler(args));
          const duration = Date.now() - started;
          log('info', { event: 'tool.end', tool: toolName, cid, durationMs: duration });
          metrics?.recordTool(
            toolName,
            duration,
            !(res as { isError?: boolean }).isError
          );
          return res;
        } catch (err) {
          const errObj = errorToObject(err, cid);
          const duration = Date.now() - started;
          log('error', {
            event: 'tool.error',
            tool: toolName,
            cid,
            durationMs: duration,
            error: errObj,
          });
          metrics?.recordTool(toolName, duration, false);
          return {
            content: [{ type: 'text', text: JSON.stringify(errObj) }],
            isError: true,
          };
        }
      }
    );
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
    'List Horreum tests with optional pagination and search.',
    {
      limit: z.number().int().positive().max(1000).optional(),
      page: z.number().int().min(0).optional(),
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
            // page=0 => return all results for this folder to aggregate client-side
            page: 0,
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
      if ((args.page as number | undefined) === 0) {
        // explicit: page=0 means return all
        paged = aggregated;
      } else if (args.limit !== undefined && args.page !== undefined) {
        const start = Math.max(0, ((args.page as number) - 1) * (args.limit as number));
        paged = aggregated.slice(start, start + (args.limit as number));
      }

      const result: { tests: TestSummary[]; count: number } = {
        tests: paged as TestSummary[],
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
      'Defaults to last 30 days when no time parameters are specified.',
    {
      testId: z.number().int().positive().optional(),
      test: z.string().optional().describe('Test name or ID'),
      trashed: z.boolean().optional(),
      limit: z.number().int().positive().max(1000).optional(),
      page: z.number().int().min(0).optional(),
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
      let resolvedTestId: number | undefined = args.testId as number | undefined;
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
          content: [text('Provide testId or test (name or ID).')],
          isError: true,
        };
      }

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
        return { content: [text(JSON.stringify(res, null, 2))] };
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

      // Apply optional client-side pagination if requested (page>0 means apply)
      let finalRuns = withinRange;
      if ((args.page as number | undefined) === 0) {
        finalRuns = withinRange;
      } else if (args.limit !== undefined && args.page !== undefined) {
        const start = Math.max(0, ((args.page as number) - 1) * (args.limit as number));
        finalRuns = withinRange.slice(start, start + (args.limit as number));
      }

      const result: import('../horreum/generated/models/RunsSummary.js').RunsSummary = {
        total: withinRange.length,
        runs: finalRuns,
      };
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
      'Defaults to last 30 days when no time parameters are specified.',
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
      page: z.number().int().min(0).optional(),
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

      // Parse time range with natural language support
      const { fromMs, toMs } = parseTimeRange(
        args.from as string | undefined,
        args.to as string | undefined
      );

      // Determine which API endpoint to use based on filters
      let datasetList;
      if (args.schema_uri) {
        // Use schema-based listing
        // WORKAROUND: Horreum has a bug where limit + page=0 causes 500 error
        // Only send page parameter if it's > 0
        const pageNum = (args.page as number | undefined) ?? 0;
        const params: {
          uri: string;
          limit: number;
          page?: number;
          sort?: string;
          direction?: SortDirection;
        } = {
          uri: args.schema_uri as string,
          limit: (args.page_size as number | undefined) ?? 100,
          ...(args.sort ? { sort: args.sort as string } : {}),
          ...(args.direction ? { direction: args.direction as SortDirection } : {}),
        };
        if (pageNum > 0) {
          params.page = pageNum;
        }
        datasetList = await DatasetService.datasetServiceListDatasetsBySchema(params);
      } else if (resolvedTestId) {
        // Use test-based listing
        // WORKAROUND: Horreum has a bug where limit + page=0 causes 500 error
        // Only send page parameter if it's > 0
        const pageNum = (args.page as number | undefined) ?? 0;
        const params: {
          testId: number;
          limit: number;
          page?: number;
          sort?: string;
          direction?: SortDirection;
        } = {
          testId: resolvedTestId,
          limit: (args.page_size as number | undefined) ?? 100,
          ...(args.sort ? { sort: args.sort as string } : {}),
          ...(args.direction ? { direction: args.direction as SortDirection } : {}),
        };
        if (pageNum > 0) {
          params.page = pageNum;
        }
        datasetList = await DatasetService.datasetServiceListByTest(params);
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

  // source.describe - Capability discovery tool
  withTool(
    'source.describe',
    'Discover the capabilities and limits of the Horreum MCP server.',
    {},
    async () => {
      const env = await getEnv();
      const response = {
        sourceType: 'horreum',
        version: '0.1.0', // From package.json
        contractVersion: '1.0.0',
        capabilities: {
          pagination: true,
          caching: false,
          streaming: false,
          schemas: true,
        },
        limits: {
          maxPageSize: 1000,
          maxDatasetSize: 10485760, // 10MB
          rateLimitPerMinute: env.HORREUM_RATE_LIMIT || 60,
        },
      };
      return { content: [text(JSON.stringify(response, null, 2))] };
    }
  );
}
