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
import {
  enterWithRequestId,
  runWithRequestId,
  getRequestId,
} from '../observability/correlation.js';
import { TestService } from '../horreum/generated/services/TestService.js';
import { RunService } from '../horreum/generated/services/RunService.js';
import { SchemaService } from '../horreum/generated/services/SchemaService.js';
import { DatasetService } from '../horreum/generated/services/DatasetService.js';
import type { SortDirection } from '../horreum/generated/models/SortDirection.js';
import type { TestListing } from '../horreum/generated/models/TestListing.js';
import type { TestSummary } from '../horreum/generated/models/TestSummary.js';
import type { ExportedLabelValues } from '../horreum/generated/models/ExportedLabelValues.js';
import { parseTimeRange } from '../utils/time.js';

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

/**
 * Starts the MCP server in HTTP mode.
 *
 * @param server - The MCP server instance.
 * @param env - The loaded environment configuration.
 */
export async function startHttpServer(server: McpServer, env: Env) {
  // Import LLM modules dynamically to allow operation without LLM configured
  let llmClient: unknown | undefined;
  let QueryOrchestrator: unknown | undefined;
  try {
    const llmModule = await import('../llm/client.js');
    const orchestratorModule = await import('../llm/orchestrator.js');
    llmClient = llmModule.createLlmClient(env);
    QueryOrchestrator = orchestratorModule.QueryOrchestrator;
  } catch (error) {
    logger.debug({ err: error }, 'LLM modules not available');
  }
  const app = express();

  // Enable CORS for all routes
  app.use(
    cors({
      origin: '*',
      exposedHeaders: ['Mcp-Session-Id'],
    })
  );

  app.use(express.json());

  // Correlation ID + request logging middleware (SSE-safe by route ordering)
  app.use((req, res, next) => {
    // Reuse incoming header or generate
    const incoming = (req.headers['x-correlation-id'] ||
      req.headers['x-request-id']) as string | undefined;
    const reqId =
      incoming && String(incoming).trim().length > 0 ? String(incoming) : randomUUID();
    // Enter ALS context early so all downstream logs include req_id via pino mixin
    enterWithRequestId(reqId);

    const started = Date.now();
    // Minimal safe preview for debugging; avoid consuming streams (express.json already parsed)
    const bodyPreview = (() => {
      try {
        const s = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        return s && s.length > 500 ? s.slice(0, 500) + '…' : s;
      } catch {
        return undefined;
      }
    })();
    logger.info(
      {
        event: 'mcp.request.received',
        req_id: reqId,
        method: req.method,
        path: req.path,
        accept: req.headers['accept'],
        content_type: req.headers['content-type'],
        body_preview: bodyPreview,
      },
      'Request received'
    );

    // Echo header for clients
    res.setHeader('X-Correlation-Id', reqId);

    // Completion/failure logging
    const onFinish = () => {
      const duration = Date.now() - started;
      logger.info(
        {
          event: 'mcp.request.completed',
          req_id: reqId,
          status: res.statusCode,
          duration_ms: duration,
        },
        'Request completed'
      );
      res.removeListener('finish', onFinish);
      res.removeListener('close', onClose);
      res.removeListener('error', onError);
    };
    const onClose = () => {
      const duration = Date.now() - started;
      logger.warn(
        {
          event: 'mcp.request.failed',
          req_id: reqId,
          error_type: 'connection_closed',
          duration_ms: duration,
        },
        'Request closed prematurely'
      );
    };
    const onError = (err: unknown) => {
      const duration = Date.now() - started;
      logger.error(
        {
          event: 'mcp.request.failed',
          req_id: reqId,
          error_type: 'handler_error',
          error: err,
          duration_ms: duration,
        },
        'Request error'
      );
    };
    res.on('finish', onFinish);
    res.on('close', onClose);
    res.on('error', onError);

    // Run downstream inside ALS context to propagate req_id
    return runWithRequestId(reqId, next);
  });

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
        const reqId = getRequestId();
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
            detail: {
              error_type: 'internal_error',
              correlation_id: reqId ?? undefined,
            },
          },
          id: null,
        });
      }
    }
  });

  // Handle GET requests for SSE streams
  // Note: The MCP SDK's StreamableHTTPServerTransport requires POST-first
  // initialization and doesn't support pure SSE GET streaming.
  // For now, we'll return a helpful error message directing clients to use POST.
  app.get('/mcp', authMiddleware, async (req, res) => {
    logger.warn('GET request to /mcp received - MCP requires POST for initialization');

    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message:
          'Method Not Allowed: MCP initialization requires POST request. ' +
          'Send a POST request with an initialize message to start a session.',
      },
      id: null,
    });
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
      detail: {
        error_type:
          httpStatus === 504
            ? 'timeout'
            : httpStatus >= 400 && httpStatus < 500
              ? 'validation_error'
              : 'upstream_http_error',
      },
    };
    const reqId = getRequestId();
    if (reqId) {
      (payload.detail as Record<string, unknown>).correlation_id = reqId;
    }
    if (typeof retryAfterSeconds === 'number') {
      (payload.error as { retryAfter?: number }).retryAfter = retryAfterSeconds;
      res.setHeader('Retry-After', String(retryAfterSeconds));
    }
    return res.status(httpStatus).json(payload);
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

      // Accept test_id (preferred) or testId (backward compat), or test (name or ID string)
      const testIdSnake = body.test_id as number | string | undefined;
      const testIdCamel = body.testId as number | string | undefined;
      const testRaw = body.test as string | undefined;
      const trashed = body.trashed as boolean | undefined;
      const sort = body.sort as string | undefined;
      const direction = body.direction as SortDirection | undefined;

      // Parse time range with natural language support
      const { fromMs, toMs } = parseTimeRange(
        body.from as string | undefined,
        body.to as string | undefined
      );

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
      // Prefer snake_case, allow numeric strings
      if (typeof testIdSnake === 'number' && Number.isFinite(testIdSnake)) {
        resolvedTestId = testIdSnake;
      } else if (typeof testIdSnake === 'string' && testIdSnake.trim().length > 0) {
        const maybe = Number(testIdSnake);
        if (Number.isFinite(maybe)) resolvedTestId = maybe;
      }
      // Fallback to camelCase for backward compatibility
      if (!resolvedTestId) {
        if (typeof testIdCamel === 'number' && Number.isFinite(testIdCamel)) {
          resolvedTestId = testIdCamel;
        } else if (typeof testIdCamel === 'string' && testIdCamel.trim().length > 0) {
          const maybe = Number(testIdCamel);
          if (Number.isFinite(maybe)) resolvedTestId = maybe;
        }
      }
      // Finally support test name or ID string via 'test'
      if (!resolvedTestId && typeof testRaw === 'string' && testRaw.length > 0) {
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
          "Provide 'test_id' or 'test' (name or ID)."
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

        // Add run_id field for Source MCP Contract compliance
        const runsWithId = (
          runs as Array<{ id?: number | string; [key: string]: unknown }>
        ).map((run) => ({
          ...run,
          run_id: String(run.id ?? run.run_id ?? ''),
        }));

        return res.status(200).json({
          runs: runsWithId,
          pagination: {
            ...(nextPageToken ? { next_page_token: nextPageToken } : {}),
            has_more: hasMore,
            total_count: total,
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

      // Add run_id field for Source MCP Contract compliance
      const runsWithId = (
        finalRuns as Array<{ id?: number | string; [key: string]: unknown }>
      ).map((run) => ({
        ...run,
        run_id: String(run.id ?? run.run_id ?? ''),
      }));

      return res.status(200).json({
        runs: runsWithId,
        pagination: {
          ...(nextPageToken ? { next_page_token: nextPageToken } : {}),
          has_more: hasMore,
          total_count: withinRange.length,
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

        // Add test_id field for Source MCP Contract compliance
        const testsWithId = (
          tests as Array<{ id?: number | string; [key: string]: unknown }>
        ).map((test) => ({
          ...test,
          test_id: String(test.id ?? test.test_id ?? ''),
        }));

        return res.status(200).json({
          tests: testsWithId,
          pagination: {
            ...(nextPageToken ? { next_page_token: nextPageToken } : {}),
            has_more: hasMore,
            total_count: total,
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
            // Omit page parameter to get all results for aggregation
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

      // Add test_id field for Source MCP Contract compliance
      const testsWithId = (
        paged as Array<{ id?: number | string; [key: string]: unknown }>
      ).map((test) => ({
        ...test,
        test_id: String(test.id ?? test.test_id ?? ''),
      }));

      return res.status(200).json({
        tests: testsWithId,
        pagination: {
          ...(nextPageToken ? { next_page_token: nextPageToken } : {}),
          has_more: hasMore,
          total_count: total,
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

  // POST /api/tools/source_describe - Capability discovery
  app.post('/api/tools/source_describe', authMiddleware, async (req, res) => {
    try {
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
      return res.status(200).json(response);
    } catch (err) {
      logger.error({ err }, 'Unhandled error in source_describe');
      return sendContractError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
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

  // POST /api/tools/horreum_list_datasets
  app.post('/api/tools/horreum_list_datasets', authMiddleware, async (req, res) => {
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

      const testId = body.test_id as number | undefined;
      const testName = body.test_name as string | undefined;
      const schemaUri = body.schema_uri as string | undefined;
      const pageSize = body.page_size as number | undefined;
      const page = body.page as number | undefined;
      const sort = body.sort as string | undefined;
      const direction = body.direction as SortDirection | undefined;

      // Parse time range with natural language support
      const { fromMs, toMs } = parseTimeRange(
        body.from as string | undefined,
        body.to as string | undefined
      );

      // Resolve test ID from name if provided
      let resolvedTestId: number | undefined = testId;
      if (!resolvedTestId && testName) {
        const test = await TestService.testServiceGetByNameOrId({
          name: testName,
        });
        resolvedTestId = test.id;
      }

      // Determine which API endpoint to use based on filters
      let datasetList;
      const pageNum = page ?? 1; // Default to page 1 (1-based pagination)
      if (schemaUri) {
        // Use schema-based listing with 1-based pagination
        datasetList = await DatasetService.datasetServiceListDatasetsBySchema({
          uri: schemaUri,
          limit: pageSize ?? 100,
          page: pageNum,
          ...(sort ? { sort } : {}),
          ...(direction ? { direction } : {}),
        });
      } else if (resolvedTestId) {
        // Use test-based listing with 1-based pagination
        datasetList = await DatasetService.datasetServiceListByTest({
          testId: resolvedTestId,
          limit: pageSize ?? 100,
          page: pageNum,
          ...(sort ? { sort } : {}),
          ...(direction ? { direction } : {}),
        });
      } else {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          'Please provide either test_id, test_name, or schema_uri to filter datasets.'
        );
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

      return res.status(200).json(response);
    } catch (err) {
      const anyErr = err as { status?: number; message?: string; body?: unknown };
      if (anyErr?.status === 404) {
        return sendContractError(
          res,
          404,
          'NOT_FOUND',
          anyErr.message || 'Resource not found',
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
      logger.error({ err }, 'Unhandled error in horreum_list_datasets');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  // POST /api/tools/horreum_get_dataset
  app.post('/api/tools/horreum_get_dataset', authMiddleware, async (req, res) => {
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

      const datasetId = body.dataset_id as number | undefined;
      if (!datasetId || !Number.isFinite(datasetId)) {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          "Provide valid 'dataset_id' parameter."
        );
      }

      const dataset = await DatasetService.datasetServiceGetDataset({
        id: datasetId,
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

      return res.status(200).json(response);
    } catch (err) {
      const anyErr = err as { status?: number; message?: string; body?: unknown };
      if (anyErr?.status === 404) {
        return sendContractError(
          res,
          404,
          'NOT_FOUND',
          anyErr.message || 'Dataset not found',
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
      logger.error({ err }, 'Unhandled error in horreum_get_dataset');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  // POST /api/tools/horreum_get_run_count
  app.post('/api/tools/horreum_get_run_count', authMiddleware, async (req, res) => {
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
      const testId = body.test_id as number | undefined;
      if (!testId || !Number.isFinite(testId)) {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          "Provide valid 'test_id' parameter."
        );
      }
      const result = await RunService.runServiceRunCount({ testId });
      return res.status(200).json(result);
    } catch (err) {
      const anyErr = err as { status?: number; message?: string; body?: unknown };
      if (anyErr?.status === 404) {
        return sendContractError(
          res,
          404,
          'NOT_FOUND',
          anyErr.message || 'Test not found',
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
      logger.error({ err }, 'Unhandled error in horreum_get_run_count');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  // POST /api/tools/horreum_list_all_runs
  app.post('/api/tools/horreum_list_all_runs', authMiddleware, async (req, res) => {
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
      const query = body.query as string | undefined;
      const roles = body.roles as string | undefined;
      const trashed = body.trashed as boolean | undefined;
      const sort = body.sort as string | undefined;
      const direction = body.direction as SortDirection | undefined;
      const pageSize = Math.min(
        Math.max(1, (body.limit as number | undefined) ?? 100),
        1000
      );
      const page = (body.page as number | undefined) ?? 1;

      const { fromMs, toMs } = parseTimeRange(
        body.from as string | undefined,
        body.to as string | undefined
      );

      // If no time filters, defer to API pagination
      if (fromMs === undefined && toMs === undefined) {
        const result = await RunService.runServiceListAllRuns({
          ...(query ? { query } : {}),
          ...(roles ? { roles } : {}),
          ...(trashed !== undefined ? { trashed } : {}),
          limit: pageSize,
          page,
          ...(sort ? { sort } : {}),
          ...(direction ? { direction } : {}),
        });
        const runs = Array.isArray((result as { runs?: unknown }).runs)
          ? (result as { runs: unknown[] }).runs
          : [];
        const total = (result as { total?: number }).total ?? runs.length;
        const hasMore = runs.length >= pageSize;
        const runsWithId = (
          runs as Array<{ id?: number | string; [key: string]: unknown }>
        ).map((run) => ({
          ...run,
          run_id: String(run.id ?? (run as { run_id?: unknown }).run_id ?? ''),
        }));
        return res.status(200).json({
          runs: runsWithId,
          pagination: {
            has_more: hasMore,
            total_count: total,
            next_page_token: hasMore
              ? Buffer.from(
                  JSON.stringify({ page: page + 1, limit: pageSize })
                ).toString('base64')
              : undefined,
          },
        });
      }

      // Time-filtered path: aggregate client-side
      let apiPage = 1;
      const fetchSize = Math.min(pageSize, 500);
      const sortField = sort ?? 'start';
      const sortDir: SortDirection = direction ?? 'Descending';
      const aggregated: Array<{ start?: number | string }> = [];
      for (;;) {
        const chunk = await RunService.runServiceListAllRuns({
          ...(query ? { query } : {}),
          ...(roles ? { roles } : {}),
          ...(trashed !== undefined ? { trashed } : {}),
          limit: fetchSize,
          page: apiPage,
          sort: sortField,
          direction: sortDir,
        });
        const runs = Array.isArray((chunk as { runs?: unknown }).runs)
          ? ((chunk as { runs: unknown[] }).runs as unknown[])
          : [];
        aggregated.push(...(runs as Array<{ start?: number | string }>));
        if (runs.length < fetchSize) break;
        apiPage += 1;
      }
      const withinRange = aggregated.filter((r) => {
        const s = Number(r.start) || Date.parse(String(r.start));
        if (!Number.isFinite(s)) return false;
        if (fromMs !== undefined && s < fromMs) return false;
        if (toMs !== undefined && s > toMs) return false;
        return true;
      });
      const startIdx = Math.max(0, (page - 1) * pageSize);
      const finalRuns = withinRange.slice(startIdx, startIdx + pageSize);
      const hasMore = startIdx + pageSize < withinRange.length;
      const runsWithId = (
        finalRuns as Array<{ id?: number | string; [key: string]: unknown }>
      ).map((run) => ({
        ...run,
        run_id: String(run.id ?? (run as { run_id?: unknown }).run_id ?? ''),
      }));
      return res.status(200).json({
        runs: runsWithId,
        pagination: {
          has_more: hasMore,
          total_count: withinRange.length,
          next_page_token: hasMore
            ? Buffer.from(JSON.stringify({ page: page + 1, limit: pageSize })).toString(
                'base64'
              )
            : undefined,
        },
      });
    } catch (err) {
      const anyErr = err as { status?: number; message?: string; body?: unknown };
      if (anyErr?.status === 404) {
        return sendContractError(
          res,
          404,
          'NOT_FOUND',
          anyErr.message || 'Runs not found',
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
      logger.error({ err }, 'Unhandled error in horreum_list_all_runs');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  // POST /api/tools/horreum_get_dataset_summary
  app.post(
    '/api/tools/horreum_get_dataset_summary',
    authMiddleware,
    async (req, res) => {
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
        const datasetId = body.dataset_id as number | undefined;
        if (!datasetId || !Number.isFinite(datasetId)) {
          return sendContractError(
            res,
            400,
            'INVALID_REQUEST',
            "Provide valid 'dataset_id' parameter."
          );
        }
        const viewId = body.view_id as number | undefined;
        const result = await DatasetService.datasetServiceGetDatasetSummary({
          datasetId,
          ...(viewId ? { viewId } : {}),
        });
        return res.status(200).json(result);
      } catch (err) {
        const anyErr = err as { status?: number; message?: string; body?: unknown };
        if (anyErr?.status === 404) {
          return sendContractError(
            res,
            404,
            'NOT_FOUND',
            anyErr.message || 'Dataset not found',
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
        logger.error({ err }, 'Unhandled error in horreum_get_dataset_summary');
        return sendContractError(
          res,
          500,
          'INTERNAL_ERROR',
          anyErr?.message || 'Internal server error'
        );
      }
    }
  );

  // POST /api/tools/horreum_get_run_data
  app.post('/api/tools/horreum_get_run_data', authMiddleware, async (req, res) => {
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
      const schemaUri = body.schema_uri as string | undefined;
      const result = await RunService.runServiceGetData({
        id: runId,
        ...(schemaUri ? { schemaUri } : {}),
      });
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
      logger.error({ err }, 'Unhandled error in horreum_get_run_data');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  // POST /api/tools/horreum_get_run_metadata
  app.post('/api/tools/horreum_get_run_metadata', authMiddleware, async (req, res) => {
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
      const schemaUri = body.schema_uri as string | undefined;
      const result = await RunService.runServiceGetMetadata({
        id: runId,
        ...(schemaUri ? { schemaUri } : {}),
      });
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
      logger.error({ err }, 'Unhandled error in horreum_get_run_metadata');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  // POST /api/tools/horreum_get_run_summary
  app.post('/api/tools/horreum_get_run_summary', authMiddleware, async (req, res) => {
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
      const result = await RunService.runServiceGetRunSummary({ id: runId });
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
      logger.error({ err }, 'Unhandled error in horreum_get_run_summary');
      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Internal server error'
      );
    }
  });

  // POST /api/tools/horreum_list_runs_by_schema
  app.post(
    '/api/tools/horreum_list_runs_by_schema',
    authMiddleware,
    async (req, res) => {
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
        const uri = body.schema_uri as string | undefined;
        if (!uri) {
          return sendContractError(
            res,
            400,
            'INVALID_REQUEST',
            "Provide 'schema_uri'."
          );
        }
        const limit = Math.min(
          Math.max(1, (body.limit as number | undefined) ?? 100),
          1000
        );
        const page = (body.page as number | undefined) ?? 1;
        const sort = body.sort as string | undefined;
        const direction = body.direction as SortDirection | undefined;
        const result = await RunService.runServiceListRunsBySchema({
          uri,
          limit,
          page,
          ...(sort ? { sort } : {}),
          ...(direction ? { direction } : {}),
        });
        const runs = Array.isArray((result as { runs?: unknown }).runs)
          ? (result as { runs: unknown[] }).runs
          : [];
        const total = (result as { total?: number }).total ?? runs.length;
        const hasMore = runs.length >= limit;
        const runsWithId = (
          runs as Array<{ id?: number | string; [key: string]: unknown }>
        ).map((run) => ({
          ...run,
          run_id: String(run.id ?? (run as { run_id?: unknown }).run_id ?? ''),
        }));
        return res.status(200).json({
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
        });
      } catch (err) {
        const anyErr = err as { status?: number; message?: string; body?: unknown };
        if (anyErr?.status === 404) {
          return sendContractError(
            res,
            404,
            'NOT_FOUND',
            anyErr.message || 'Runs not found',
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
        logger.error({ err }, 'Unhandled error in horreum_list_runs_by_schema');
        return sendContractError(
          res,
          500,
          'INTERNAL_ERROR',
          anyErr?.message || 'Internal server error'
        );
      }
    }
  );

  // POST /api/tools/horreum_get_dataset_label_values
  app.post(
    '/api/tools/horreum_get_dataset_label_values',
    authMiddleware,
    async (req, res) => {
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

        const datasetId = body.dataset_id as number | undefined;
        if (!datasetId || !Number.isFinite(datasetId)) {
          return sendContractError(
            res,
            400,
            'INVALID_REQUEST',
            "Provide valid 'dataset_id' parameter."
          );
        }

        const result = await DatasetService.datasetServiceGetDatasetLabelValues({
          datasetId,
        });
        return res.status(200).json(result);
      } catch (err) {
        const anyErr = err as { status?: number; message?: string; body?: unknown };
        if (anyErr?.status === 404) {
          return sendContractError(
            res,
            404,
            'NOT_FOUND',
            anyErr.message || 'Dataset or label values not found',
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
        logger.error({ err }, 'Unhandled error in horreum_get_dataset_label_values');
        return sendContractError(
          res,
          500,
          'INTERNAL_ERROR',
          anyErr?.message || 'Internal server error'
        );
      }
    }
  );

  // POST /api/tools/horreum_get_run_label_values
  app.post(
    '/api/tools/horreum_get_run_label_values',
    authMiddleware,
    async (req, res) => {
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

        // Accept both string and number for run_id (Source MCP Contract uses string)
        const runIdRaw = body.run_id;
        let runId: number;
        if (typeof runIdRaw === 'string') {
          runId = parseInt(runIdRaw, 10);
          if (isNaN(runId) || runId <= 0) {
            return sendContractError(
              res,
              400,
              'INVALID_REQUEST',
              'run_id must be a positive integer or numeric string.'
            );
          }
        } else if (typeof runIdRaw === 'number') {
          if (!Number.isFinite(runIdRaw) || runIdRaw <= 0) {
            return sendContractError(
              res,
              400,
              'INVALID_REQUEST',
              'run_id must be a positive integer.'
            );
          }
          runId = runIdRaw;
        } else {
          return sendContractError(
            res,
            400,
            'INVALID_REQUEST',
            "Provide valid 'run_id' parameter (number or numeric string)."
          );
        }

        // Normalize filter: accept object or string
        const filter = body.filter;
        const filterStr =
          typeof filter === 'string'
            ? (filter as string)
            : filter && typeof filter === 'object'
              ? JSON.stringify(filter)
              : '{}';

        const sort = body.sort as string | undefined;
        const direction = body.direction as string | undefined;
        const limit = body.limit as number | undefined;
        const page = body.page as number | undefined; // 1-based
        const include = Array.isArray(body.include)
          ? (body.include as string[])
          : undefined;
        const exclude = Array.isArray(body.exclude)
          ? (body.exclude as string[])
          : undefined;
        const multiFilter = body.multiFilter as boolean | undefined;

        const result = await RunService.runServiceGetRunLabelValues({
          id: runId,
          filter: filterStr,
          ...(sort ? { sort } : {}),
          ...(direction ? { direction } : {}),
          ...(limit !== undefined ? { limit } : {}),
          ...(page !== undefined ? { page } : {}),
          ...(include ? { include } : {}),
          ...(exclude ? { exclude } : {}),
          ...(multiFilter !== undefined ? { multiFilter } : {}),
        });

        // Transform to Source MCP Contract format
        const transformed = transformLabelValues(
          Array.isArray(result) ? result : [result]
        );

        // Wrap in Source MCP Contract response structure
        const response = {
          items: transformed,
          pagination: {
            has_more: false,
            total_count: transformed.length,
          },
        };
        return res.status(200).json(response);
      } catch (err) {
        const anyErr = err as { status?: number; message?: string; body?: unknown };
        if (anyErr?.status === 404) {
          return sendContractError(
            res,
            404,
            'NOT_FOUND',
            anyErr.message || 'Run or label values not found',
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
        logger.error({ err }, 'Unhandled error in horreum_get_run_label_values');
        return sendContractError(
          res,
          500,
          'INTERNAL_ERROR',
          anyErr?.message || 'Internal server error'
        );
      }
    }
  );

  // POST /api/tools/horreum_get_test_label_values
  app.post(
    '/api/tools/horreum_get_test_label_values',
    authMiddleware,
    async (req, res) => {
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

        // Resolve test id - accept both string and number (Source MCP Contract uses string)
        const testIdRaw = body.test_id;
        const testName = body.test_name as string | undefined;
        let resolvedTestId: number | undefined;

        if (testIdRaw !== undefined) {
          if (typeof testIdRaw === 'string') {
            resolvedTestId = parseInt(testIdRaw, 10);
            if (isNaN(resolvedTestId) || resolvedTestId <= 0) {
              return sendContractError(
                res,
                400,
                'INVALID_REQUEST',
                'test_id must be a positive integer or numeric string.'
              );
            }
          } else if (typeof testIdRaw === 'number') {
            if (!Number.isFinite(testIdRaw) || testIdRaw <= 0) {
              return sendContractError(
                res,
                400,
                'INVALID_REQUEST',
                'test_id must be a positive integer.'
              );
            }
            resolvedTestId = testIdRaw;
          } else {
            return sendContractError(
              res,
              400,
              'INVALID_REQUEST',
              'test_id must be a number or numeric string.'
            );
          }
        } else if (testName) {
          const t = await TestService.testServiceGetByNameOrId({ name: testName });
          resolvedTestId = (t as { id?: number }).id;
        }

        if (!resolvedTestId) {
          return sendContractError(
            res,
            400,
            'INVALID_REQUEST',
            "Provide 'test_id' or 'test_name'."
          );
        }

        // Time parsing: before/after with natural language support via parseTimeRange
        const { fromMs, toMs } = parseTimeRange(
          (body.after as string | undefined) ?? undefined,
          (body.before as string | undefined) ?? undefined
        );
        const beforeStr = toMs !== undefined ? String(toMs) : undefined;
        const afterStr = fromMs !== undefined ? String(fromMs) : undefined;

        // Normalize filter: accept object or string
        const filter = body.filter;
        const filterStr =
          typeof filter === 'string'
            ? (filter as string)
            : filter && typeof filter === 'object'
              ? JSON.stringify(filter)
              : '{}';

        const filtering = body.filtering as boolean | undefined;
        const metrics = body.metrics as boolean | undefined;
        const sort = body.sort as string | undefined;
        const direction = body.direction as string | undefined;
        const limit = body.limit as number | undefined;
        const page = body.page as number | undefined;
        const include = Array.isArray(body.include)
          ? (body.include as string[])
          : undefined;
        const exclude = Array.isArray(body.exclude)
          ? (body.exclude as string[])
          : undefined;
        const multiFilter = body.multiFilter as boolean | undefined;

        const result = await TestService.testServiceGetTestLabelValues({
          id: resolvedTestId,
          ...(filtering !== undefined ? { filtering } : {}),
          ...(metrics !== undefined ? { metrics } : {}),
          filter: filterStr,
          ...(beforeStr ? { before: beforeStr } : {}),
          ...(afterStr ? { after: afterStr } : {}),
          ...(sort ? { sort } : {}),
          ...(direction ? { direction } : {}),
          ...(limit !== undefined ? { limit } : {}),
          ...(page !== undefined ? { page } : {}),
          ...(include ? { include } : {}),
          ...(exclude ? { exclude } : {}),
          ...(multiFilter !== undefined ? { multiFilter } : {}),
        });

        // Transform to Source MCP Contract format
        const transformed = transformLabelValues(
          Array.isArray(result) ? result : [result]
        );

        // Wrap in Source MCP Contract response structure
        const response = {
          items: transformed,
          pagination: {
            has_more: false,
            total_count: transformed.length,
          },
        };
        return res.status(200).json(response);
      } catch (err) {
        const anyErr = err as { status?: number; message?: string; body?: unknown };
        if (anyErr?.status === 404) {
          return sendContractError(
            res,
            404,
            'NOT_FOUND',
            anyErr.message || 'Test or label values not found',
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
        logger.error({ err }, 'Unhandled error in horreum_get_test_label_values');
        return sendContractError(
          res,
          500,
          'INTERNAL_ERROR',
          anyErr?.message || 'Internal server error'
        );
      }
    }
  );

  // POST /api/query - Natural language query endpoint (Phase 9)
  app.post('/api/query', authMiddleware, async (req, res) => {
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

      const query = body.query as string | undefined;
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return sendContractError(
          res,
          400,
          'INVALID_REQUEST',
          "Provide 'query' parameter with your natural language question."
        );
      }

      // Check if LLM is configured
      if (!llmClient || !QueryOrchestrator) {
        return sendContractError(
          res,
          503,
          'SERVICE_UNAVAILABLE',
          'Natural language query endpoint requires LLM configuration. Set LLM_PROVIDER, LLM_API_KEY, and LLM_MODEL environment variables.',
          {
            hint: 'Supported providers: openai, anthropic, gemini, azure',
            example_config: {
              LLM_PROVIDER: 'gemini',
              LLM_API_KEY: 'your-api-key',
              LLM_MODEL: 'gemini-1.5-pro',
            },
          },
          false
        );
      }

      logger.info(
        { query, req_id: getRequestId() },
        'Processing natural language query'
      );

      // Create orchestrator instance
      const orchestratorClass = QueryOrchestrator as new (
        llmClient: unknown,
        mcpServer: unknown,
        maxIterations?: number,
        temperature?: number
      ) => {
        executeQuery(query: string): Promise<{
          answer: string;
          tool_calls: Array<{
            tool: string;
            arguments: Record<string, unknown>;
            result: unknown;
            duration_ms: number;
          }>;
          total_duration_ms: number;
          llm_calls: number;
        }>;
      };

      const orchestrator = new orchestratorClass(llmClient, server, 10, 0.1);

      // Execute query
      const result = await orchestrator.executeQuery(query);

      logger.info(
        {
          query,
          req_id: getRequestId(),
          tool_calls: result.tool_calls.length,
          llm_calls: result.llm_calls,
          duration_ms: result.total_duration_ms,
        },
        'Natural language query completed'
      );

      return res.status(200).json({
        query,
        answer: result.answer,
        metadata: {
          tool_calls: result.tool_calls.length,
          llm_calls: result.llm_calls,
          duration_ms: result.total_duration_ms,
        },
        tool_calls: result.tool_calls,
      });
    } catch (err) {
      const anyErr = err as { status?: number; message?: string; body?: unknown };
      logger.error({ err, req_id: getRequestId() }, 'Natural language query failed');

      if (anyErr?.status === 429) {
        return sendContractError(
          res,
          429,
          'RATE_LIMITED',
          'LLM API rate limit exceeded',
          anyErr.body,
          true,
          60
        );
      }

      return sendContractError(
        res,
        500,
        'INTERNAL_ERROR',
        anyErr?.message || 'Query processing failed',
        anyErr?.body
      );
    }
  });

  const httpServer = app.listen(env.HTTP_PORT, () => {
    logger.info(
      `MCP server running in HTTP mode on port ${env.HTTP_PORT} (endpoint: /mcp)`
    );
    if (llmClient) {
      logger.info(
        `Natural language query endpoint available on port ${env.HTTP_PORT} (endpoint: /api/query)`
      );
    }
  });
  return httpServer;
}
