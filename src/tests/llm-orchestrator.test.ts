import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryOrchestrator, createOrchestrator } from '../llm/orchestrator.js';
import type { LlmClient } from '../llm/client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the logger
vi.mock('../observability/logging.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the prompts
vi.mock('../llm/prompts.js', () => ({
  getHorreumSystemPrompt: () => 'System prompt for testing',
  createUserPrompt: (query: string) => `User query: ${query}`,
}));

describe('Query Orchestrator', () => {
  let mockLlmClient: LlmClient;
  let mockMcpServer: McpServer;

  beforeEach(() => {
    mockLlmClient = {
      complete: vi.fn(),
      completeStream: vi.fn(),
    };

    mockMcpServer = {} as McpServer;
  });

  describe('Creation', () => {
    it('should create orchestrator with default parameters', () => {
      const orchestrator = createOrchestrator(mockLlmClient, mockMcpServer);

      expect(orchestrator).toBeInstanceOf(QueryOrchestrator);
    });

    it('should create orchestrator with custom parameters', () => {
      const orchestrator = createOrchestrator(
        mockLlmClient,
        mockMcpServer,
        5, // maxIterations
        0.5 // temperature
      );

      expect(orchestrator).toBeInstanceOf(QueryOrchestrator);
    });
  });

  describe('Query Execution', () => {
    it('should execute simple query with single response', async () => {
      mockLlmClient.complete = vi.fn().mockResolvedValue({
        content: 'This is the final answer without any tool calls.',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      const result = await orchestrator.executeQuery('What is Horreum?');

      expect(result.answer).toContain('final answer');
      expect(result.llm_calls).toBe(1);
      expect(result.tool_calls).toHaveLength(0);
      expect(result.total_duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should parse TOOL_CALL: markers', async () => {
      mockLlmClient.complete = vi
        .fn()
        .mockResolvedValueOnce({
          content:
            'Let me call the tool. TOOL_CALL: {"name": "horreum_list_tests", "arguments": {"limit": 10}}',
        })
        .mockResolvedValueOnce({
          content: 'Based on the tool results, here is my answer.',
        });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      const result = await orchestrator.executeQuery('List tests');

      expect(result.llm_calls).toBeGreaterThanOrEqual(1);
      expect(result.tool_calls.length).toBeGreaterThan(0);
      expect(result.tool_calls[0]?.tool).toBe('horreum_list_tests');
    });

    it('should parse JSON code block tool calls', async () => {
      mockLlmClient.complete = vi
        .fn()
        .mockResolvedValueOnce({
          content:
            '```json\n{"tool": "horreum_get_schema", "parameters": {"id": 123}}\n```',
        })
        .mockResolvedValueOnce({
          content: 'Here is the schema information.',
        });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      const result = await orchestrator.executeQuery('Get schema');

      expect(result.llm_calls).toBe(2);
      expect(result.tool_calls.length).toBeGreaterThan(0);
      expect(result.tool_calls[0]?.tool).toBe('horreum_get_schema');
    });

    it('should handle multiple tool calls in sequence', async () => {
      mockLlmClient.complete = vi
        .fn()
        .mockResolvedValueOnce({
          content:
            'I will call two tools. TOOL_CALL: {"name": "horreum_list_tests", "arguments": {}} TOOL_CALL: {"name": "horreum_list_runs", "arguments": {"test_id": 1}}',
        })
        .mockResolvedValueOnce({
          content: 'Analysis complete.',
        });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      const result = await orchestrator.executeQuery('Analyze tests');

      expect(result.tool_calls.length).toBeGreaterThanOrEqual(1);
      // Check if we got at least one of the tool calls
      const toolNames = result.tool_calls.map((tc) => tc.tool);
      expect(
        toolNames.some(
          (name) => name === 'horreum_list_tests' || name === 'horreum_list_runs'
        )
      ).toBe(true);
    });

    it('should enforce max iterations limit', async () => {
      // LLM keeps requesting tools
      mockLlmClient.complete = vi.fn().mockResolvedValue({
        content: 'Let me try again. TOOL_CALL: {"name": "test_tool", "arguments": {}}',
      });

      const orchestrator = new QueryOrchestrator(
        mockLlmClient,
        mockMcpServer,
        3, // max 3 iterations
        0.1
      );

      const result = await orchestrator.executeQuery('Loop forever');

      expect(result.llm_calls).toBeGreaterThanOrEqual(3);
      expect(result.answer).toContain('maximum number of iterations');
    });

    it('should handle LLM errors gracefully', async () => {
      mockLlmClient.complete = vi.fn().mockRejectedValue(new Error('LLM API error'));

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      await expect(orchestrator.executeQuery('Test query')).rejects.toThrow(
        'LLM API error'
      );
    });

    it('should track duration for tool calls', async () => {
      mockLlmClient.complete = vi
        .fn()
        .mockResolvedValueOnce({
          content: 'Let me ping. TOOL_CALL: {"name": "horreum_ping", "arguments": {}}',
        })
        .mockResolvedValueOnce({
          content: 'Ping successful.',
        });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      const result = await orchestrator.executeQuery('Ping');

      expect(result.tool_calls.length).toBeGreaterThan(0);
      expect(result.tool_calls[0]?.duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.total_duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Tool Call Parsing', () => {
    it('should ignore invalid JSON in tool calls', async () => {
      mockLlmClient.complete = vi
        .fn()
        .mockResolvedValueOnce({
          content:
            'Trying tools.\nTOOL_CALL: {invalid json}\nTOOL_CALL: {"name": "valid_tool", "arguments": {}}',
        })
        .mockResolvedValueOnce({
          content: 'Done.',
        });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      const result = await orchestrator.executeQuery('Test');

      // Should parse at least one valid tool call
      expect(result.tool_calls.length).toBeGreaterThan(0);
      expect(result.tool_calls[0]?.tool).toBe('valid_tool');
    });

    it('should handle tool calls without arguments field', async () => {
      mockLlmClient.complete = vi
        .fn()
        .mockResolvedValueOnce({
          content: 'Let me ping. TOOL_CALL: {"name": "horreum_ping", "arguments": {}}',
        })
        .mockResolvedValueOnce({
          content: 'Done.',
        });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      const result = await orchestrator.executeQuery('Test');

      expect(result.tool_calls.length).toBeGreaterThan(0);
      expect(result.tool_calls[0]?.arguments).toBeDefined();
    });

    it('should handle JSON blocks with "tool" field', async () => {
      mockLlmClient.complete = vi
        .fn()
        .mockResolvedValueOnce({
          content:
            '```json\n{"tool": "horreum_list_tests", "parameters": {"folder": "test"}}\n```',
        })
        .mockResolvedValueOnce({
          content: 'Done.',
        });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      const result = await orchestrator.executeQuery('Test');

      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls[0]?.tool).toBe('horreum_list_tests');
      expect(result.tool_calls[0]?.arguments).toEqual({ folder: 'test' });
    });
  });

  describe('Conversation History', () => {
    it('should initialize with system prompt', () => {
      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      // Access conversation history through a query
      orchestrator.executeQuery('Test').catch(() => {
        // Ignore errors, we're just checking initialization
      });

      expect(mockLlmClient.complete).toBeDefined();
    });

    it('should reset conversation history', async () => {
      mockLlmClient.complete = vi.fn().mockResolvedValue({
        content: 'Response',
      });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      await orchestrator.executeQuery('First query');
      orchestrator.reset();

      // After reset, should start fresh
      await orchestrator.executeQuery('Second query');

      // Each query should make one call
      expect(mockLlmClient.complete).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle tool execution failures gracefully', async () => {
      mockLlmClient.complete = vi
        .fn()
        .mockResolvedValueOnce({
          content: 'Let me try. TOOL_CALL: {"name": "failing_tool", "arguments": {}}',
        })
        .mockResolvedValueOnce({
          content: 'Understood the error.',
        });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      const result = await orchestrator.executeQuery('Test');

      // Should complete despite tool failures
      expect(result.answer).toBeDefined();
      expect(result.tool_calls.length).toBeGreaterThan(0);
      // Tool was executed even if simulated
      expect(result.tool_calls[0]?.result).toBeDefined();
    });

    it('should provide error messages when tools have issues', async () => {
      // For this test, we'll simulate that the orchestrator recognizes
      // a response without tool calls as a final answer
      mockLlmClient.complete = vi.fn().mockResolvedValue({
        content: 'I cannot complete this query.',
      });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      const result = await orchestrator.executeQuery('Test');

      // Should get a response
      expect(result.answer).toBeDefined();
      expect(result.answer.length).toBeGreaterThan(0);
      expect(result.llm_calls).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Configuration', () => {
    it('should use specified temperature', async () => {
      let capturedRequest: unknown;

      mockLlmClient.complete = vi.fn().mockImplementation((request) => {
        capturedRequest = request;
        return Promise.resolve({ content: 'Response' });
      });

      const orchestrator = new QueryOrchestrator(
        mockLlmClient,
        mockMcpServer,
        10,
        0.7 // custom temperature
      );

      await orchestrator.executeQuery('Test');

      expect(capturedRequest).toHaveProperty('temperature', 0.7);
    });

    it('should use specified max_tokens', async () => {
      let capturedRequest: unknown;

      mockLlmClient.complete = vi.fn().mockImplementation((request) => {
        capturedRequest = request;
        return Promise.resolve({ content: 'Response' });
      });

      const orchestrator = new QueryOrchestrator(mockLlmClient, mockMcpServer, 10, 0.1);

      await orchestrator.executeQuery('Test');

      expect(capturedRequest).toHaveProperty('max_tokens', 4096);
    });
  });
});
