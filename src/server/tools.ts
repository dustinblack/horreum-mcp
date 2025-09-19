import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import type { FetchLike } from '../horreum/http.js';
import { OpenAPI } from '../horreum/generated/core/OpenAPI.js';
import { TestService } from '../horreum/generated/services/TestService.js';
import { SchemaService } from '../horreum/generated/services/SchemaService.js';
import { RunService } from '../horreum/generated/services/RunService.js';

type RegisterOptions = {
  getEnv: () => Promise<Env>;
  fetchImpl?: FetchLike | undefined;
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
  // Allow tests to inject a mock fetch implementation
  if (fetchImpl) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = fetchImpl;
  }

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
}


