import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools, toolHandlers } from '../server/tools.js';
import type { Env } from '../config/env.js';

/**
 * Tests for source_describe ui_url field (GitHub Issue #18).
 *
 * Verifies that the source_describe tool exposes the Horreum UI base URL
 * from HORREUM_BASE_URL so consumers can construct authoritative links
 * (e.g., run URLs) without redundant configuration.
 */
describe('source_describe ui_url', () => {
  const TEST_BASE_URL = 'https://horreum.example.com';

  const fakeEnv: Env = {
    HORREUM_BASE_URL: TEST_BASE_URL,
    HORREUM_RATE_LIMIT: 10,
    HORREUM_TIMEOUT: 30000,
    HORREUM_API_VERSION: 'latest',
    METRICS_ENABLED: false,
    METRICS_PORT: 9464,
    METRICS_PATH: '/metrics',
    TRACING_ENABLED: false,
    LOG_LEVEL: 'silent',
    HTTP_MODE_ENABLED: false,
    HTTP_PORT: 3000,
    HORREUM_TLS_VERIFY: true,
    LLM_GEMINI_USE_PROJECT_HEADER: false,
  };

  // Minimal stub for McpServer — registerTools calls server.tool() and server.resource()
  const stubServer = {
    tool: vi.fn(),
    resource: vi.fn(),
  } as unknown as McpServer;

  beforeEach(async () => {
    toolHandlers.clear();
    await registerTools(stubServer, {
      getEnv: async () => fakeEnv,
      fetchImpl: vi.fn() as unknown as undefined,
    });
  });

  it('should include ui_url in source_describe response', async () => {
    const handler = toolHandlers.get('source_describe');
    expect(handler).toBeDefined();

    const result = await handler!({});
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.ui_url).toBe(TEST_BASE_URL);
  });

  it('should place ui_url at the top level alongside source_type', async () => {
    const handler = toolHandlers.get('source_describe');
    const result = await handler!({});
    const parsed = JSON.parse(result.content[0].text);

    // Verify structure: ui_url is a sibling of source_type, not nested
    expect(parsed).toHaveProperty('source_type');
    expect(parsed).toHaveProperty('ui_url');
    expect(parsed).toHaveProperty('capabilities');
    expect(parsed).toHaveProperty('limits');
  });

  it('should reflect a different HORREUM_BASE_URL value', async () => {
    toolHandlers.clear();
    const altUrl = 'https://horreum.corp.internal.io';
    await registerTools(stubServer, {
      getEnv: async () => ({ ...fakeEnv, HORREUM_BASE_URL: altUrl }),
      fetchImpl: vi.fn() as unknown as undefined,
    });

    const handler = toolHandlers.get('source_describe');
    const result = await handler!({});
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.ui_url).toBe(altUrl);
  });
});
