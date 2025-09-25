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

  app.get('/ready', (req, res) => {
    // When HTTP auth token is configured, enforce it for readiness, too
    if (env.HTTP_AUTH_TOKEN) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = authHeader.substring(7);
      if (token !== env.HTTP_AUTH_TOKEN) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
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

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
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

  app.listen(env.HTTP_PORT, () => {
    logger.info(
      `MCP server running in HTTP mode at http://localhost:${env.HTTP_PORT}/mcp`
    );
  });
}
