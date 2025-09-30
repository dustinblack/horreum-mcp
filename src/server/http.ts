/**
 * HTTP transport implementation for the Horreum MCP server.
 */
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { Env } from '../config/env.js';
import { logger } from '../observability/logging.js';
import { TestService } from '../horreum/generated/services/TestService.js';
import { RunService } from '../horreum/generated/services/RunService.js';
import { SchemaService } from '../horreum/generated/services/SchemaService.js';
import type { SortDirection } from '../horreum/generated/models/SortDirection.js';
import type { TestListing } from '../horreum/generated/models/TestListing.js';
import type { TestSummary } from '../horreum/generated/models/TestSummary.js';

/**
 * Starts the MCP server in HTTP mode.
 *
 * @param server - The MCP server instance.
 * @param env - The loaded environment configuration.
 */
export async function startHttpServer(server: McpServer, env: Env) {
  const app = express();

  // Enable CORS for all routes
  app.use(
    cors({
      origin: '*',
      exposedHeaders: ['Mcp-Session-Id'],
    })
  );

  app.use(express.json());

  // Liveness and readiness endpoints
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/ready', (_req, res) => {
    // Readiness should be accessible without authentication for Kubernetes probes
    res.status(200).json({ status: 'ready' });
  });

  // Map to store transports by session ID
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // Bearer token authentication middleware
  const authMiddleware = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (env.HTTP_AUTH_TOKEN) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing bearer token' });
      }
      const token = authHeader.substring(7);
      if (token !== env.HTTP_AUTH_TOKEN) {
        return res.status(403).json({ error: 'Forbidden: Invalid token' });
      }
    }
    next();
  };

  // MCP POST endpoint
  app.post('/mcp', authMiddleware, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string;
    logger.debug({ hasSessionId: Boolean(sessionId) }, 'Incoming /mcp request');

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
        logger.debug({ sessionId }, 'Reusing existing session transport');
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true, // Use JSON response mode for simplicity
          onsessioninitialized: (sessionId) => {
            logger.info(`Session initialized with ID: ${sessionId}`);
            transports[sessionId] = transport;
          },
        });

        // Connect the transport to the server
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        // Invalid request
        logger.debug(
          { bodyShape: typeof req.body, hasSessionId: Boolean(sessionId) },
          'Rejecting /mcp request without session or initialize payload'
        );
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      // Handle the request with existing transport
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error({ err: error }, 'Error handling MCP request');
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // Handle GET requests for SSE streams (if needed)
  app.get('/mcp', authMiddleware, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  // ----------------------------------------------
  // Direct HTTP API endpoints for server-to-server
  // ----------------------------------------------

  type ErrorCode =
    | 'INVALID_REQUEST'
    | 'NOT_FOUND'
    | 'RATE_LIMITED'
    | 'INTERNAL_ERROR'
    | 'SERVICE_UNAVAILABLE'
    | 'TIMEOUT';

  const sendContractError = (
    res: express.Response,
    httpStatus: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
    retryable = false,
    retryAfterSeconds?: number
  ) => {
    const payload: Record<string, unknown> = {
      error: {
        code,
        message,
        details,
        retryable,
      },
    };
    if (typeof retryAfterSeconds === 'number') {
      (payload.error as { retryAfter?: number }).retryAfter = retryAfterSeconds;
      res.setHeader('Retry-After', String(retryAfterSeconds));
    }
    return res.status(httpStatus).json(payload);
  };

  const parseTime = (s?: unknown): number | undefined => {
    if (typeof s !== 'string') return undefined;
    if (!s) return undefined;
    if (/^\d+$/.test(s)) return Number(s);
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : undefined;
  };

  // Pagination helpers for pageToken/pageSize support
  type PageCursor = {
    page: number;
    limit: number;
  };

  const encodePageToken = (cursor: PageCursor): string => {
    return Buffer.from(JSON.stringify(cursor)).toString('base64');
  };

  const decodePageToken = (token: string): PageCursor | null => {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const cursor = JSON.parse(decoded) as PageCursor;
      if (
        typeof cursor.page === 'number' &&
        typeof cursor.limit === 'number' &&
        cursor.page > 0 &&
        cursor.limit > 0
      ) {
        return cursor;
      }
      return null;
    } catch {
      return null;
    }
  };

  // POST /api/tools/horreum_list_runs
  app.post('/api/tools/horreum_list_runs', authMiddleware, async (req, res) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body !== 'object') {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          'Request body must be a JSON object.'
        );
      }

      // Accept testId or test (name or ID string)
      const testIdRaw = body.testId;
      const testRaw = body.test;
      const trashed = body.trashed as boolean | undefined;
      const sort = body.sort as string | undefined;
      const direction = body.direction as SortDirection | undefined;
      const fromMs = parseTime(body.from);
      const toMs = parseTime(body.to);

      // Support both pageToken/pageSize (new) and page/limit (legacy)
      const pageToken = body.pageToken as string | undefined;
      const pageSize = body.pageSize as number | undefined;
      const legacyLimit = body.limit as number | undefined;
      const legacyPage = body.page as number | undefined;

      let limit: number;
      let page: number;

      if (pageToken) {
        const cursor = decodePageToken(pageToken);
        if (!cursor) {
          return sendContractError(
            res,
            400,
            'INVALID_REQUEST',
            'Invalid pageToken provided.'
          );
        }
        page = cursor.page;
        limit = cursor.limit;
      } else {
        // Use pageSize or fallback to legacyLimit, default 100, max 1000
        limit = Math.min(Math.max(1, pageSize ?? legacyLimit ?? 100), 1000);
        page = legacyPage ?? 1;
      }

      let resolvedTestId: number | undefined = undefined;
      if (typeof testIdRaw === 'number' && Number.isFinite(testIdRaw)) {
        resolvedTestId = testIdRaw;
      } else if (typeof testRaw === 'string' && testRaw.length > 0) {
        const maybeId = Number(testRaw);
        if (Number.isFinite(maybeId)) {
          resolvedTestId = maybeId;
        } else {
          const t = await TestService.testServiceGetByNameOrId({ name: testRaw });
          resolvedTestId = (t as { id?: number }).id;
        }
      }

      if (!resolvedTestId) {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          "Provide 'testId' or 'test' (name or ID)."
        );
      }

      // If no time filters, defer to single API call (server-side pagination)
      if (fromMs === undefined && toMs === undefined) {
        const result = await RunService.runServiceListTestRuns({
          testId: resolvedTestId,
          ...(trashed !== undefined ? { trashed } : {}),
          limit,
          page,
          ...(sort ? { sort } : {}),
          ...(direction ? { direction } : {}),
        });

        const runs = Array.isArray((result as { runs?: unknown }).runs)
          ? (result as { runs: unknown[] }).runs
          : [];
        const total = (result as { total?: number }).total ?? runs.length;

        // Build pagination response
        const hasMore = runs.length >= limit;
        const nextPageToken = hasMore
          ? encodePageToken({ page: page + 1, limit })
          : undefined;

        return res.status(200).json({
          runs,
          pagination: {
            ...(nextPageToken ? { nextPageToken } : {}),
            hasMore,
            totalCount: total,
          },
        });
      }

      // Time-filtered: fetch pages and filter client-side by start timestamp
      const fetchPageSize = Math.min(limit, 500);
      const sortField = sort ?? 'start';
      const sortDir: SortDirection = direction ?? 'Descending';
      let pageIndex = 1; // API pages start at 1
      const aggregated: Array<{
        start?: number | string;
      }> = [] as unknown as Array<{ start?: number | string }>;

      for (;;) {
        const chunk = await RunService.runServiceListTestRuns({
          testId: resolvedTestId,
          ...(trashed !== undefined ? { trashed } : {}),
          limit: fetchPageSize,
          page: pageIndex,
          sort: sortField,
          direction: sortDir,
        });
        const runs = Array.isArray((chunk as { runs?: unknown }).runs)
          ? ((chunk as { runs: unknown[] }).runs as unknown[])
          : [];
        aggregated.push(...(runs as Array<{ start?: number | string }>));

        if (sortField === 'start' && sortDir === 'Descending' && fromMs !== undefined) {
          const oldest = runs[runs.length - 1] as { start?: number | string };
          const oldestStart = oldest
            ? Number((oldest as { start?: unknown }).start) ||
              Date.parse(String((oldest as { start?: unknown }).start))
            : NaN;
          if (Number.isFinite(oldestStart) && oldestStart < fromMs) {
            break;
          }
        }
        if (runs.length < fetchPageSize) break;
        pageIndex += 1;
      }

      const withinRange = aggregated.filter((r) => {
        const start = Number(r.start) || Date.parse(String(r.start));
        if (!Number.isFinite(start)) return false;
        if (fromMs !== undefined && start < fromMs) return false;
        if (toMs !== undefined && start > toMs) return false;
        return true;
      });

      // Client-side pagination of filtered results
      const startIdx = Math.max(0, (page - 1) * limit);
      const finalRuns = withinRange.slice(startIdx, startIdx + limit);
      const hasMore = startIdx + limit < withinRange.length;
      const nextPageToken = hasMore
        ? encodePageToken({ page: page + 1, limit })
        : undefined;

      return res.status(200).json({
        runs: finalRuns,
        pagination: {
          ...(nextPageToken ? { nextPageToken } : {}),
          hasMore,
          totalCount: withinRange.length,
        },
      });
    } catch (err) {
      // Map common error cases
      const anyErr = err as { status?: number; message?: string; body?: unknown };
      if (anyErr?.status === 404) {
        return sendContractError(
          res,
          404,
          'NOT_FOUND',
          anyErr.message || 'Test or runs not found',
          anyErr.body,
          false
        );
      }
      if (anyErr?.status === 401 || anyErr?.status === 403) {
        return sendContractError(
          res,
          anyErr.status,
          'INVALID_REQUEST',
          anyErr.message || 'Authentication failed',
          anyErr.body,
          false
        );
      }
      if (anyErr?.status === 429) {
        return sendContractError(
          res,
          429,
          'RATE_LIMITED',
          'Rate limited by upstream Horreum API',
          anyErr.body,
          true
        );
      }
      if (anyErr?.status === 503 || anyErr?.status === 502) {
        return sendContractError(
          res,
          anyErr.status,
          'SERVICE_UNAVAILABLE',
          'Upstream service unavailable',
          anyErr.body,
          true
        );
      }
      if (anyErr?.status === 504) {
        return sendContractError(
          res,
          504,
          'TIMEOUT',
          'Request timed out',
          anyErr.body,
          true
        );
      }
      logger.error({ err }, 'Unhandled error in horreum_list_runs');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  // POST /api/tools/horreum_list_tests
  app.post('/api/tools/horreum_list_tests', authMiddleware, async (req, res) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body !== 'object') {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          'Request body must be a JSON object.'
        );
      }

      const direction = body.direction as SortDirection | undefined;
      const roles = body.roles as string | undefined;
      const name = body.name as string | undefined;
      const folder = body.folder as string | undefined;

      // Support both pageToken/pageSize (new) and page/limit (legacy)
      const pageToken = body.pageToken as string | undefined;
      const pageSize = body.pageSize as number | undefined;
      const legacyLimit = body.limit as number | undefined;
      const legacyPage = body.page as number | undefined;

      let limit: number;
      let page: number;

      if (pageToken) {
        const cursor = decodePageToken(pageToken);
        if (!cursor) {
          return sendContractError(
            res,
            400,
            'INVALID_REQUEST',
            'Invalid pageToken provided.'
          );
        }
        page = cursor.page;
        limit = cursor.limit;
      } else {
        limit = Math.min(Math.max(1, pageSize ?? legacyLimit ?? 100), 1000);
        page = legacyPage ?? 1;
      }

      // If a specific folder is provided, query just that folder
      if (folder) {
        const result = await TestService.testServiceGetTestSummary({
          ...(roles !== undefined ? { roles } : {}),
          folder,
          limit,
          page,
          ...(direction ? { direction } : {}),
          ...(name ? { name } : {}),
        });

        const tests = Array.isArray((result as { tests?: unknown }).tests)
          ? (result as { tests: unknown[] }).tests
          : [];
        const total = (result as { count?: number }).count ?? tests.length;
        const hasMore = tests.length >= limit;
        const nextPageToken = hasMore
          ? encodePageToken({ page: page + 1, limit })
          : undefined;

        return res.status(200).json({
          tests,
          pagination: {
            ...(nextPageToken ? { nextPageToken } : {}),
            hasMore,
            totalCount: total,
          },
        });
      }

      // Otherwise, aggregate across top-level and all folders
      const folders = await TestService.testServiceFolders(
        roles !== undefined ? { roles } : {}
      );
      const targets: (string | undefined)[] = [undefined, ...(folders ?? [])];
      const listings: TestListing[] = await Promise.all(
        targets.map((folderName) =>
          TestService.testServiceGetTestSummary({
            ...(roles !== undefined ? { roles } : {}),
            ...(folderName ? { folder: folderName } : {}),
            page: 0, // return all results for this folder
            ...(direction ? { direction } : {}),
            ...(name ? { name } : {}),
          }).catch(() => ({ tests: [], count: 0 }) as unknown as TestListing)
        )
      );

      const aggregated: TestSummary[] = listings.flatMap((l) =>
        Array.isArray(l?.tests) ? l.tests : []
      );
      const total = aggregated.length;

      // Client-side pagination after aggregation
      const startIdx = Math.max(0, (page - 1) * limit);
      const paged = aggregated.slice(startIdx, startIdx + limit);
      const hasMore = startIdx + limit < aggregated.length;
      const nextPageToken = hasMore
        ? encodePageToken({ page: page + 1, limit })
        : undefined;

      return res.status(200).json({
        tests: paged,
        pagination: {
          ...(nextPageToken ? { nextPageToken } : {}),
          hasMore,
          totalCount: total,
        },
      });
    } catch (err) {
      const anyErr = err as { status?: number; message?: string; body?: unknown };
      if (anyErr?.status === 404) {
        return sendContractError(
          res,
          404,
          'NOT_FOUND',
          anyErr.message || 'Tests not found',
          anyErr.body,
          false
        );
      }
      if (anyErr?.status === 401 || anyErr?.status === 403) {
        return sendContractError(
          res,
          anyErr.status,
          'INVALID_REQUEST',
          anyErr.message || 'Authentication failed',
          anyErr.body,
          false
        );
      }
      if (anyErr?.status === 429) {
        return sendContractError(
          res,
          429,
          'RATE_LIMITED',
          'Rate limited by upstream Horreum API',
          anyErr.body,
          true
        );
      }
      if (anyErr?.status === 503 || anyErr?.status === 502) {
        return sendContractError(
          res,
          anyErr.status,
          'SERVICE_UNAVAILABLE',
          'Upstream service unavailable',
          anyErr.body,
          true
        );
      }
      if (anyErr?.status === 504) {
        return sendContractError(
          res,
          504,
          'TIMEOUT',
          'Request timed out',
          anyErr.body,
          true
        );
      }
      logger.error({ err }, 'Unhandled error in horreum_list_tests');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  // POST /api/tools/horreum_get_schema
  app.post('/api/tools/horreum_get_schema', authMiddleware, async (req, res) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body !== 'object') {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          'Request body must be a JSON object.'
        );
      }

      const id = body.id as number | undefined;
      const name = body.name as string | undefined;

      if (!id && !name) {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          "Provide 'id' or 'name' parameter."
        );
      }

      const result = id
        ? await SchemaService.schemaServiceGetSchema({ id })
        : await SchemaService.schemaServiceListSchemas({
            ...(name ? { name } : {}),
          });

      return res.status(200).json(result);
    } catch (err) {
      const anyErr = err as { status?: number; message?: string; body?: unknown };
      if (anyErr?.status === 404) {
        return sendContractError(
          res,
          404,
          'NOT_FOUND',
          anyErr.message || 'Schema not found',
          anyErr.body,
          false
        );
      }
      if (anyErr?.status === 401 || anyErr?.status === 403) {
        return sendContractError(
          res,
          anyErr.status,
          'INVALID_REQUEST',
          anyErr.message || 'Authentication failed',
          anyErr.body,
          false
        );
      }
      if (anyErr?.status === 429) {
        return sendContractError(
          res,
          429,
          'RATE_LIMITED',
          'Rate limited by upstream Horreum API',
          anyErr.body,
          true
        );
      }
      if (anyErr?.status === 503 || anyErr?.status === 502) {
        return sendContractError(
          res,
          anyErr.status,
          'SERVICE_UNAVAILABLE',
          'Upstream service unavailable',
          anyErr.body,
          true
        );
      }
      if (anyErr?.status === 504) {
        return sendContractError(
          res,
          504,
          'TIMEOUT',
          'Request timed out',
          anyErr.body,
          true
        );
      }
      logger.error({ err }, 'Unhandled error in horreum_get_schema');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  // POST /api/tools/horreum_list_schemas
  app.post('/api/tools/horreum_list_schemas', authMiddleware, async (req, res) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body !== 'object') {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          'Request body must be a JSON object.'
        );
      }

      const name = body.name as string | undefined;
      const result = await SchemaService.schemaServiceListSchemas({
        ...(name ? { name } : {}),
      });

      return res.status(200).json(result);
    } catch (err) {
      const anyErr = err as { status?: number; message?: string; body?: unknown };
      if (anyErr?.status === 404) {
        return sendContractError(
          res,
          404,
          'NOT_FOUND',
          anyErr.message || 'Schemas not found',
          anyErr.body,
          false
        );
      }
      if (anyErr?.status === 401 || anyErr?.status === 403) {
        return sendContractError(
          res,
          anyErr.status,
          'INVALID_REQUEST',
          anyErr.message || 'Authentication failed',
          anyErr.body,
          false
        );
      }
      if (anyErr?.status === 429) {
        return sendContractError(
          res,
          429,
          'RATE_LIMITED',
          'Rate limited by upstream Horreum API',
          anyErr.body,
          true
        );
      }
      if (anyErr?.status === 503 || anyErr?.status === 502) {
        return sendContractError(
          res,
          anyErr.status,
          'SERVICE_UNAVAILABLE',
          'Upstream service unavailable',
          anyErr.body,
          true
        );
      }
      if (anyErr?.status === 504) {
        return sendContractError(
          res,
          504,
          'TIMEOUT',
          'Request timed out',
          anyErr.body,
          true
        );
      }
      logger.error({ err }, 'Unhandled error in horreum_list_schemas');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  // POST /api/tools/horreum_get_run
  app.post('/api/tools/horreum_get_run', authMiddleware, async (req, res) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body !== 'object') {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          'Request body must be a JSON object.'
        );
      }

      const runId = body.run_id as number | undefined;
      if (!runId || !Number.isFinite(runId)) {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          "Provide valid 'run_id' parameter."
        );
      }

      const result = await RunService.runServiceGetRun({ id: runId });
      return res.status(200).json(result);
    } catch (err) {
      const anyErr = err as { status?: number; message?: string; body?: unknown };
      if (anyErr?.status === 404) {
        return sendContractError(
          res,
          404,
          'NOT_FOUND',
          anyErr.message || 'Run not found',
          anyErr.body,
          false
        );
      }
      if (anyErr?.status === 401 || anyErr?.status === 403) {
        return sendContractError(
          res,
          anyErr.status,
          'INVALID_REQUEST',
          anyErr.message || 'Authentication failed',
          anyErr.body,
          false
        );
      }
      if (anyErr?.status === 429) {
        return sendContractError(
          res,
          429,
          'RATE_LIMITED',
          'Rate limited by upstream Horreum API',
          anyErr.body,
          true
        );
      }
      if (anyErr?.status === 503 || anyErr?.status === 502) {
        return sendContractError(
          res,
          anyErr.status,
          'SERVICE_UNAVAILABLE',
          'Upstream service unavailable',
          anyErr.body,
          true
        );
      }
      if (anyErr?.status === 504) {
        return sendContractError(
          res,
          504,
          'TIMEOUT',
          'Request timed out',
          anyErr.body,
          true
        );
      }
      logger.error({ err }, 'Unhandled error in horreum_get_run');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  const httpServer = app.listen(env.HTTP_PORT, () => {
    logger.info(
      `MCP server running in HTTP mode at http://localhost:${env.HTTP_PORT}/mcp`
    );
  });
  return httpServer;
}
