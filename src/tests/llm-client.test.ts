import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLlmClient } from '../llm/client.js';
import type { Env } from '../config/env.js';

// Mock the logger
vi.mock('../observability/logging.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('LLM Client', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Client Creation', () => {
    it('should return undefined when LLM not configured', () => {
      const env = {
        LLM_PROVIDER: undefined,
        LLM_API_KEY: undefined,
        LLM_MODEL: undefined,
      } as unknown as Env;

      const client = createLlmClient(env);
      expect(client).toBeUndefined();
    });

    it('should return undefined when only provider is configured', () => {
      const env = {
        LLM_PROVIDER: 'openai',
        LLM_API_KEY: undefined,
        LLM_MODEL: undefined,
      } as unknown as Env;

      const client = createLlmClient(env);
      expect(client).toBeUndefined();
    });

    it('should create OpenAI client when fully configured', () => {
      const env = {
        LLM_PROVIDER: 'openai',
        LLM_API_KEY: 'sk-test-key',
        LLM_MODEL: 'gpt-4',
      } as unknown as Env;

      const client = createLlmClient(env);
      expect(client).toBeDefined();
      expect(client?.complete).toBeDefined();
    });

    it('should create Anthropic client when configured', () => {
      const env = {
        LLM_PROVIDER: 'anthropic',
        LLM_API_KEY: 'sk-ant-test',
        LLM_MODEL: 'claude-3-5-sonnet-20241022',
      } as unknown as Env;

      const client = createLlmClient(env);
      expect(client).toBeDefined();
      expect(client?.complete).toBeDefined();
    });

    it('should create Gemini client when configured', () => {
      const env = {
        LLM_PROVIDER: 'gemini',
        LLM_API_KEY: 'test-gemini-key',
        LLM_MODEL: 'gemini-1.5-pro',
      } as unknown as Env;

      const client = createLlmClient(env);
      expect(client).toBeDefined();
      expect(client?.complete).toBeDefined();
    });

    it('should create Azure client when fully configured', () => {
      process.env.LLM_AZURE_ENDPOINT = 'https://test.openai.azure.com';

      const env = {
        LLM_PROVIDER: 'azure',
        LLM_API_KEY: 'test-azure-key',
        LLM_MODEL: 'gpt-4',
      } as unknown as Env;

      const client = createLlmClient(env);
      expect(client).toBeDefined();
      expect(client?.complete).toBeDefined();

      delete process.env.LLM_AZURE_ENDPOINT;
    });

    it('should throw error for Azure without endpoint', () => {
      const env = {
        LLM_PROVIDER: 'azure',
        LLM_API_KEY: 'test-azure-key',
        LLM_MODEL: 'gpt-4',
      } as unknown as Env;

      expect(() => createLlmClient(env)).toThrow('LLM_AZURE_ENDPOINT is required');
    });

    it('should throw error for unsupported provider', () => {
      const env = {
        LLM_PROVIDER: 'invalid',
        LLM_API_KEY: 'test-key',
        LLM_MODEL: 'test-model',
      } as unknown as Env;

      expect(() => createLlmClient(env)).toThrow('Unsupported LLM provider');
    });
  });

  describe('OpenAI Client', () => {
    it('should make correct API call', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const env = {
        LLM_PROVIDER: 'openai',
        LLM_API_KEY: 'sk-test',
        LLM_MODEL: 'gpt-4',
      } as unknown as Env;

      const client = createLlmClient(env);
      const result = await client!.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.content).toBe('Test response');
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      const env = {
        LLM_PROVIDER: 'openai',
        LLM_API_KEY: 'invalid-key',
        LLM_MODEL: 'gpt-4',
      } as unknown as Env;

      const client = createLlmClient(env);

      await expect(
        client!.complete({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('401');
    });

    it('should include temperature and max_tokens when provided', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation((_, options) => {
        capturedBody = options?.body as string;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Response' } }],
          }),
        } as Response);
      });

      const env = {
        LLM_PROVIDER: 'openai',
        LLM_API_KEY: 'sk-test',
        LLM_MODEL: 'gpt-4',
      } as unknown as Env;

      const client = createLlmClient(env);
      await client!.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      expect(capturedBody).toBeDefined();
      const parsedBody = JSON.parse(capturedBody!);
      expect(parsedBody.temperature).toBe(0.7);
      expect(parsedBody.max_tokens).toBe(1000);
    });
  });

  describe('Gemini Client', () => {
    it('should make correct API call with system instruction', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Gemini response' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const env = {
        LLM_PROVIDER: 'gemini',
        LLM_API_KEY: 'test-key',
        LLM_MODEL: 'gemini-1.5-pro',
      } as unknown as Env;

      const client = createLlmClient(env);
      const result = await client!.complete({
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
        ],
      });

      expect(result.content).toBe('Gemini response');
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      });

      // Verify API URL format
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.any(Object)
      );
    });

    it('should convert message roles correctly', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation((_, options) => {
        capturedBody = options?.body as string;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'Response' }] } }],
          }),
        } as Response);
      });

      const env = {
        LLM_PROVIDER: 'gemini',
        LLM_API_KEY: 'test-key',
        LLM_MODEL: 'gemini-1.5-pro',
      } as unknown as Env;

      const client = createLlmClient(env);
      await client!.complete({
        messages: [
          { role: 'user', content: 'Question' },
          { role: 'assistant', content: 'Answer' },
          { role: 'user', content: 'Follow-up' },
        ],
      });

      expect(capturedBody).toBeDefined();
      const parsedBody = JSON.parse(capturedBody!);

      // Check that roles are converted: assistant -> model
      expect(parsedBody.contents).toHaveLength(3);
      expect(parsedBody.contents[0].role).toBe('user');
      expect(parsedBody.contents[1].role).toBe('model'); // assistant -> model
      expect(parsedBody.contents[2].role).toBe('user');
    });
  });

  describe('Anthropic Client', () => {
    it('should make correct API call with separate system message', async () => {
      const mockResponse = {
        content: [{ text: 'Claude response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const env = {
        LLM_PROVIDER: 'anthropic',
        LLM_API_KEY: 'sk-ant-test',
        LLM_MODEL: 'claude-3-5-sonnet-20241022',
      } as unknown as Env;

      const client = createLlmClient(env);
      const result = await client!.complete({
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ],
      });

      expect(result.content).toBe('Claude response');
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      });

      // Verify correct headers
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'sk-ant-test',
            'anthropic-version': '2023-06-01',
          }),
        })
      );
    });

    it('should separate system message from conversation', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation((_, options) => {
        capturedBody = options?.body as string;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            content: [{ text: 'Response' }],
          }),
        } as Response);
      });

      const env = {
        LLM_PROVIDER: 'anthropic',
        LLM_API_KEY: 'sk-ant-test',
        LLM_MODEL: 'claude-3-5-sonnet-20241022',
      } as unknown as Env;

      const client = createLlmClient(env);
      await client!.complete({
        messages: [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'User message' },
        ],
      });

      expect(capturedBody).toBeDefined();
      const parsedBody = JSON.parse(capturedBody!);

      // System message should be separate
      expect(parsedBody.system).toBe('System prompt');

      // Messages should not include system
      expect(parsedBody.messages).toHaveLength(1);
      expect(parsedBody.messages[0].role).toBe('user');
    });
  });

  describe('Streaming Support', () => {
    it('should support streaming for OpenAI', () => {
      const env = {
        LLM_PROVIDER: 'openai',
        LLM_API_KEY: 'sk-test',
        LLM_MODEL: 'gpt-4',
      } as unknown as Env;

      const client = createLlmClient(env);
      expect(client?.completeStream).toBeDefined();
    });

    it('should support streaming for Anthropic', () => {
      const env = {
        LLM_PROVIDER: 'anthropic',
        LLM_API_KEY: 'sk-ant-test',
        LLM_MODEL: 'claude-3-5-sonnet-20241022',
      } as unknown as Env;

      const client = createLlmClient(env);
      expect(client?.completeStream).toBeDefined();
    });

    it('should support streaming for Gemini', () => {
      const env = {
        LLM_PROVIDER: 'gemini',
        LLM_API_KEY: 'test-key',
        LLM_MODEL: 'gemini-1.5-pro',
      } as unknown as Env;

      const client = createLlmClient(env);
      expect(client?.completeStream).toBeDefined();
    });
  });
});
