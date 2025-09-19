import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { OpenAPI } from '../horreum/generated/core/OpenAPI.js';
import { TestService } from '../horreum/generated/services/TestService.js';
import { SchemaService } from '../horreum/generated/services/SchemaService.js';
import { RunService } from '../horreum/generated/services/RunService.js';
import { createRateLimitedFetch } from '../horreum/fetch.js';
import { fetch as undiciFetch } from 'undici';

type RegisterOptions = {
  getEnv: () => Promise<Env>;
  // Minimal fetch-like signature for tests; real runtime uses global fetch
  fetchImpl?: ((input: unknown, init?: unknown) => Promise<unknown>) | undefined;
};

export async function registerTools(
  server: McpServer,
  options: RegisterOptions
): Promise<void> {
  const { getEnv, fetchImpl } = options;
  const env = await getEnv();
  // Configure generated client
  OpenAPI.BASE = env.HORREUM_BASE_URL;
  if (env.HORREUM_TOKEN) {
    OpenAPI.TOKEN = env.HORREUM_TOKEN;
  }
  // Configure global fetch with rate limiting and retries.
  // Prefer injected fetch for tests; else use global or undici's fetch.
  const baseFetch = (fetchImpl as unknown as typeof fetch | undefined)
    ?? (globalThis as { fetch?: typeof fetch }).fetch
    ?? (undiciFetch as unknown as typeof fetch);
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
    async (args) => ({
      content: [
        { type: 'text', text: args?.message ?? 'pong' },
      ],
    })
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
    },
    async (args) => {
      const res = await TestService.testServiceGetTestSummary({
        ...(args.roles ? { roles: args.roles } : {}),
        ...(args.limit !== undefined ? { limit: args.limit } : {}),
        ...(args.page !== undefined ? { page: args.page } : {}),
        ...(args.direction ? { direction: args.direction } : {}),
        ...(args.name ? { name: args.name } : {}),
      });
      return {
        content: [
          { type: 'text', text: JSON.stringify(res, null, 2) },
        ],
      };
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
    async (args) => {
      if (!args.id && !args.name) {
        return {
          content: [
            { type: 'text', text: 'Provide id or name.' },
          ],
          isError: true,
        };
      }
      const res = args.id
        ? await SchemaService.schemaServiceGetSchema({ id: args.id })
        : await SchemaService.schemaServiceListSchemas({
            ...(args.name ? { name: args.name } : {}),
          });
      return {
        content: [
          { type: 'text', text: JSON.stringify(res, null, 2) },
        ],
      };
    }
  );

  // list_runs
  server.tool(
    'list_runs',
    'List Runs for a given test id with optional pagination and sorting.',
    {
      testId: z.number().int().positive(),
      trashed: z.boolean().optional(),
      limit: z.number().int().positive().max(1000).optional(),
      page: z.number().int().min(0).optional(),
      sort: z.string().optional(),
      direction: z.enum(['Ascending', 'Descending']).optional(),
    },
    async (args) => {
      const res = await RunService.runServiceListTestRuns({
        testId: args.testId,
        ...(args.trashed !== undefined ? { trashed: args.trashed } : {}),
        ...(args.limit !== undefined ? { limit: args.limit } : {}),
        ...(args.page !== undefined ? { page: args.page } : {}),
        ...(args.sort ? { sort: args.sort } : {}),
        ...(args.direction ? { direction: args.direction } : {}),
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
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
      data: z.union([z.string(), z.record(z.any())]).describe('Run JSON payload'),
      owner: z.string().optional(),
      access: z.string().optional(),
      schema: z.string().optional().describe('Schema URI'),
      description: z.string().optional(),
    },
    async (args) => {
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
      return {
        content: [{ type: 'text', text: typeof res === 'string' ? res : JSON.stringify(res) }],
      };
    }
  );
}


