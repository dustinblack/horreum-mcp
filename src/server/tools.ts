import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { OpenAPI } from '../horreum/generated/core/OpenAPI.js';
import { TestService } from '../horreum/generated/services/TestService.js';
import { SchemaService } from '../horreum/generated/services/SchemaService.js';
import { RunService } from '../horreum/generated/services/RunService.js';
import { createRateLimitedFetch } from '../horreum/fetch.js';
import { fetch as undiciFetch } from 'undici';
import type { TestListing } from '../horreum/generated/models/TestListing.js';
import type { TestSummary } from '../horreum/generated/models/TestSummary.js';
import type { SortDirection } from '../horreum/generated/models/SortDirection.js';

type FetchLike = (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => ReturnType<typeof fetch>;
type RegisterOptions = {
  getEnv: () => Promise<Env>;
  // Minimal fetch-like signature for tests; real runtime uses global fetch
  fetchImpl?: FetchLike | undefined;
};

export async function registerTools(
  server: McpServer,
  options: RegisterOptions
): Promise<void> {
  const { getEnv, fetchImpl } = options;
  const genCid = (): string =>
    Math.random().toString(16).slice(2, 10) + Date.now().toString(16);
  const log = (level: 'info' | 'error', data: Record<string, unknown>) => {
    const entry = { level, ts: new Date().toISOString(), ...data };
    (level === 'error' ? console.error : console.log)(JSON.stringify(entry));
  };
  const text = (s: string) => ({ type: 'text' as const, text: s });
  const env = await getEnv();
  // Configure generated client
  OpenAPI.BASE = env.HORREUM_BASE_URL;
  if (env.HORREUM_TOKEN) {
    OpenAPI.TOKEN = env.HORREUM_TOKEN;
  }
  // Configure global fetch with rate limiting and retries.
  // Prefer injected fetch for tests; else use global or undici's fetch.
  const baseFetch: FetchLike = (fetchImpl as FetchLike | undefined)
    ?? ((globalThis as { fetch?: FetchLike }).fetch as FetchLike | undefined)
    ?? (undiciFetch as unknown as FetchLike);
  const rlFetch = createRateLimitedFetch({
    baseFetch,
    requestsPerSecond: env.HORREUM_RATE_LIMIT,
    timeoutMs: env.HORREUM_TIMEOUT,
    maxRetries: 3,
    backoffInitialMs: 1000,
    backoffMaxMs: 30000,
    jitterRatio: 0.25,
  });
  (globalThis as { fetch: typeof fetch }).fetch = rlFetch as unknown as typeof fetch;

  // Resources
  // Test resource: horreum://tests/{id}
  server.resource(
    'test',
    'horreum://tests/{id}',
    { mimeType: 'application/json' },
    async (uri) => {
      const id = Number(uri.pathname.replace(/^\//, ''));
      if (!Number.isFinite(id)) {
        return { contents: [{ uri, text: 'Invalid test id' }], isError: true } as any;
      }
      const data = await TestService.testServiceGetTest({ id });
      return {
        contents: [
          { uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // Schema resource: horreum://schemas/{id}
  server.resource(
    'schema',
    'horreum://schemas/{id}',
    { mimeType: 'application/json' },
    async (uri) => {
      const id = Number(uri.pathname.replace(/^\//, ''));
      if (!Number.isFinite(id)) {
        return { contents: [{ uri, text: 'Invalid schema id' }], isError: true } as any;
      }
      const data = await SchemaService.schemaServiceGetSchema({ id });
      return {
        contents: [
          { uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // Run resource: horreum://tests/{testId}/runs/{runId}
  server.resource(
    'run',
    'horreum://tests/{testId}/runs/{runId}',
    { mimeType: 'application/json' },
    async (uri) => {
      const parts = uri.pathname.replace(/^\//, '').split('/');
      // expected structure: tests/{testId}/runs/{runId}
      if (parts.length !== 4 || parts[0] !== 'tests' || parts[2] !== 'runs') {
        return { contents: [{ uri, text: 'Invalid run URI' }], isError: true } as any;
      }
      const runId = Number(parts[3]);
      if (!Number.isFinite(runId)) {
        return { contents: [{ uri, text: 'Invalid run id' }], isError: true } as any;
      }
      const data = await RunService.runServiceGetRun({ id: runId });
      return {
        contents: [
          { uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // ping
  server.tool(
    'ping',
    'Ping the server to verify connectivity.',
    { message: z.string().optional() },
    async (args): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
      const cid = genCid();
      const started = Date.now();
      log('info', { event: 'tool.start', tool: 'ping', cid, args });
      const out = { content: [text(args?.message ?? 'pong')] };
      log('info', {
        event: 'tool.end',
        tool: 'ping',
        cid,
        durationMs: Date.now() - started,
      });
      return out;
    }
  );

  // list_tests
  server.tool(
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
    async (args): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
      const cid = genCid();
      const started = Date.now();
      log('info', { event: 'tool.start', tool: 'list_tests', cid, args });
      // If a specific folder is provided, query just that folder
      if (args.folder) {
        const res = await TestService.testServiceGetTestSummary({
          ...(args.roles ? { roles: args.roles } : {}),
          folder: args.folder,
          ...(args.limit !== undefined ? { limit: args.limit } : {}),
          ...(args.page !== undefined ? { page: args.page } : {}),
          ...(args.direction ? { direction: args.direction } : {}),
          ...(args.name ? { name: args.name } : {}),
        });
        const out = { content: [text(JSON.stringify(res, null, 2))] };
        log('info', {
          event: 'tool.end',
          tool: 'list_tests',
          cid,
          durationMs: Date.now() - started,
        });
        return out;
      }

      // Otherwise, aggregate across top-level and all folders
      const folders = await TestService.testServiceFolders({
        ...(args.roles ? { roles: args.roles } : {}),
      });

      const targets: (string | undefined)[] = [undefined, ...(folders ?? [])];
      const listings: TestListing[] = await Promise.all(
        targets.map((folderName) =>
          TestService.testServiceGetTestSummary({
            ...(args.roles ? { roles: args.roles } : {}),
            ...(folderName ? { folder: folderName } : {}),
            // page=0 => return all results for this folder to aggregate client-side
            page: 0,
            ...(args.direction ? { direction: args.direction as SortDirection } : {}),
            ...(args.name ? { name: args.name } : {}),
          }).catch(() => ({ tests: [], count: 0 } as unknown as TestListing))
        )
      );

      const aggregated: TestSummary[] = listings.flatMap((l) => Array.isArray(l?.tests) ? l.tests : []);
      const total = aggregated.length;

      // Optional client-side pagination after aggregation
      let paged = aggregated;
      if (args.page === 0) {
        // explicit: page=0 means return all
        paged = aggregated;
      } else if (args.limit !== undefined && args.page !== undefined) {
        const start = Math.max(0, (args.page - 1) * args.limit);
        paged = aggregated.slice(start, start + args.limit);
      }

      const result: { tests: TestSummary[]; count: number } = { tests: paged as TestSummary[], count: total };
      const out = { content: [text(JSON.stringify(result, null, 2))] };
      log('info', {
        event: 'tool.end',
        tool: 'list_tests',
        cid,
        durationMs: Date.now() - started,
      });
      return out;
    }
  );

  // get_schema
  server.tool(
    'get_schema',
    'Get a Horreum schema by id or name.',
    {
      id: z.number().int().positive().optional(),
      name: z.string().optional(),
    },
    async (args): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> => {
      const cid = genCid();
      const started = Date.now();
      log('info', { event: 'tool.start', tool: 'get_schema', cid, args });
      if (!args.id && !args.name) {
        const out = { content: [text('Provide id or name.')], isError: true };
        log('info', {
          event: 'tool.end',
          tool: 'get_schema',
          cid,
          durationMs: Date.now() - started,
        });
        return out;
      }
      const res = args.id
        ? await SchemaService.schemaServiceGetSchema({ id: args.id })
        : await SchemaService.schemaServiceListSchemas({
            ...(args.name ? { name: args.name } : {}),
          });
      const out = { content: [text(JSON.stringify(res, null, 2))] };
      log('info', {
        event: 'tool.end',
        tool: 'get_schema',
        cid,
        durationMs: Date.now() - started,
      });
      return out;
    }
  );

  // list_runs
  server.tool(
    'list_runs',
    'List Runs for a given test with optional pagination, sorting, and time filtering.',
    {
      testId: z.number().int().positive().optional(),
      test: z.string().optional().describe('Test name or ID'),
      trashed: z.boolean().optional(),
      limit: z.number().int().positive().max(1000).optional(),
      page: z.number().int().min(0).optional(),
      sort: z.string().optional(),
      direction: z.enum(['Ascending', 'Descending']).optional(),
      from: z.string().optional().describe('ISO timestamp or epoch millis'),
      to: z.string().optional().describe('ISO timestamp or epoch millis'),
    },
    async (args): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
      const cid = genCid();
      const started = Date.now();
      log('info', { event: 'tool.start', tool: 'list_runs', cid, args });
      // Resolve testId from name if needed
      let resolvedTestId: number | undefined = args.testId;
      if (!resolvedTestId && args.test) {
        const maybeId = Number(args.test);
        if (Number.isFinite(maybeId)) {
          resolvedTestId = maybeId;
        } else {
          const t = await TestService.testServiceGetByNameOrId({ name: args.test });
          resolvedTestId = t.id;
        }
      }
      if (!resolvedTestId) {
        const out = { content: [text('Provide testId or test (name or ID).')], isError: true } as any;
        log('info', {
          event: 'tool.end',
          tool: 'list_runs',
          cid,
          durationMs: Date.now() - started,
        });
        return out;
      }

      const parseTime = (s?: string): number | undefined => {
        if (!s) return undefined;
        if (/^\d+$/.test(s)) return Number(s);
        const t = Date.parse(s);
        return Number.isFinite(t) ? t : undefined;
      };
      const fromMs = parseTime(args.from);
      const toMs = parseTime(args.to);

      // If no time filters are provided, defer to a single API call (server-side pagination)
      if (fromMs === undefined && toMs === undefined) {
        const res = await RunService.runServiceListTestRuns({
          testId: resolvedTestId,
          ...(args.trashed !== undefined ? { trashed: args.trashed } : {}),
          ...(args.limit !== undefined ? { limit: args.limit } : {}),
          ...(args.page !== undefined ? { page: args.page } : {}),
          ...(args.sort ? { sort: args.sort } : {}),
          ...(args.direction ? { direction: args.direction } : {}),
        });
        const out = { content: [text(JSON.stringify(res, null, 2))] };
        log('info', {
          event: 'tool.end',
          tool: 'list_runs',
          cid,
          durationMs: Date.now() - started,
        });
        return out;
      }

      // Time-filtered: fetch pages and filter client-side by start timestamp
      const pageSize = Math.min(args.limit ?? 500, 1000);
      const sortField = args.sort ?? 'start';
      const sortDir = args.direction ?? 'Descending';

      let page = 1;
      const aggregated: import('../horreum/generated/models/RunSummary.js').RunSummary[] = [];
      // Fetch until no more results or we can short-circuit by time bound when sorted by start desc
      // Note: API pages start at 1; if server supports page=0 semantics, it's ignored here intentionally
      // to keep pagination predictable across deployments.
      for (;;) {
        const res = await RunService.runServiceListTestRuns({
          testId: resolvedTestId,
          ...(args.trashed !== undefined ? { trashed: args.trashed } : {}),
          limit: pageSize,
          page,
          sort: sortField,
          direction: sortDir as SortDirection,
        });
        const runs = Array.isArray(res.runs) ? res.runs : [];
        aggregated.push(...runs);

        // Short-circuit when sorted by start desc and oldest fetched run is older than from
        if (
          sortField === 'start' && sortDir === 'Descending' && fromMs !== undefined
        ) {
          const oldest = runs[runs.length - 1];
          const oldestStart = oldest ? Number(oldest.start) || Date.parse(String(oldest.start)) : NaN;
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
      if (args.page === 0) {
        finalRuns = withinRange;
      } else if (args.limit !== undefined && args.page !== undefined) {
        const start = Math.max(0, (args.page - 1) * args.limit);
        finalRuns = withinRange.slice(start, start + args.limit);
      }

      const result: import('../horreum/generated/models/RunsSummary.js').RunsSummary = {
        total: withinRange.length,
        runs: finalRuns,
      };
      const out = { content: [text(JSON.stringify(result, null, 2))] };
      log('info', {
        event: 'tool.end',
        tool: 'list_runs',
        cid,
        durationMs: Date.now() - started,
      });
      return out;
    }
  );

  // upload_run
  server.tool(
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
    async (args): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
      const cid = genCid();
      const started = Date.now();
      log('info', { event: 'tool.start', tool: 'upload_run', cid });
      const payload = typeof args.data === 'string' ? args.data : JSON.stringify(args.data);
      const res = await RunService.runServiceAddRunFromData({
        start: args.start,
        stop: args.stop,
        test: args.test,
        requestBody: payload,
        ...(args.owner ? { owner: args.owner } : {}),
        // Access is an enum type; string is accepted by client
        ...(args.access
          ? { access: args.access as unknown as import('../horreum/generated/models/Access.js').Access }
          : {}),
        ...(args.schema ? { schema: args.schema } : {}),
        ...(args.description ? { description: args.description } : {}),
      });
      const out = { content: [text(typeof res === 'string' ? res : JSON.stringify(res))] };
      log('info', {
        event: 'tool.end',
        tool: 'upload_run',
        cid,
        durationMs: Date.now() - started,
      });
      return out;
    }
  );
}


