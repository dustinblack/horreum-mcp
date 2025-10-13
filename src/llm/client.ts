/**
 * Client for external Large Language Model (LLM) APIs.
 *
 * Supports multiple providers: OpenAI, Anthropic, and Azure OpenAI.
 */
import type { Env } from '../config/env.js';
import { logger } from '../observability/logging.js';

/**
 * Message in an LLM conversation.
 */
export interface LlmMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Request to the LLM API.
 */
export interface LlmRequest {
  messages: LlmMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Response from the LLM API.
 */
export interface LlmResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Streaming callback for LLM responses.
 */
export type StreamCallback = (chunk: string) => void;

/**
 * LLM client interface for different providers.
 */
export interface LlmClient {
  complete(request: LlmRequest): Promise<LlmResponse>;
  completeStream?(request: LlmRequest, callback: StreamCallback): Promise<void>;
}

// Legacy types for backward compatibility
interface InferenceRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

interface InferenceResponse {
  messages: Array<{
    role: 'assistant';
    content: string;
  }>;
}

type InferenceCompleter = (request: InferenceRequest) => Promise<InferenceResponse>;

/**
 * OpenAI-compatible client implementation.
 */
class OpenAIClient implements LlmClient {
  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl: string = 'https://api.openai.com/v1'
  ) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const body = JSON.stringify({
      model: this.model,
      messages: request.messages,
      stream: false,
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
      ...(request.max_tokens !== undefined ? { max_tokens: request.max_tokens } : {}),
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenAI API request failed with status ${response.status}: ${errorBody}`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
      };

      const content = data.choices?.[0]?.message?.content ?? '';

      const llmResponse: LlmResponse = {
        content,
        ...(data.usage ? { usage: data.usage } : {}),
      };
      return llmResponse;
    } catch (error) {
      logger.error({ err: error, provider: 'openai' }, 'LLM API request failed');
      throw error;
    }
  }

  async completeStream(request: LlmRequest, callback: StreamCallback): Promise<void> {
    const url = `${this.baseUrl}/chat/completions`;

    const body = JSON.stringify({
      model: this.model,
      messages: request.messages,
      stream: true,
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
      ...(request.max_tokens !== undefined ? { max_tokens: request.max_tokens } : {}),
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenAI API streaming request failed with status ${response.status}: ${errorBody}`
        );
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                callback(content);
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      logger.error({ err: error, provider: 'openai' }, 'LLM API streaming failed');
      throw error;
    }
  }
}

/**
 * Anthropic Claude client implementation.
 */
class AnthropicClient implements LlmClient {
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const url = 'https://api.anthropic.com/v1/messages';

    // Convert messages to Anthropic format (system message separate)
    const systemMessage = request.messages.find((m) => m.role === 'system')?.content;
    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const body = JSON.stringify({
      model: this.model,
      messages,
      max_tokens: request.max_tokens || 4096,
      ...(systemMessage ? { system: systemMessage } : {}),
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Anthropic API request failed with status ${response.status}: ${errorBody}`
        );
      }

      const data = (await response.json()) as {
        content?: Array<{ text?: string }>;
        usage?: { input_tokens: number; output_tokens: number };
      };

      const content = data.content?.[0]?.text ?? '';

      const result: LlmResponse = {
        content,
        ...(data.usage
          ? {
              usage: {
                prompt_tokens: data.usage.input_tokens,
                completion_tokens: data.usage.output_tokens,
                total_tokens: data.usage.input_tokens + data.usage.output_tokens,
              },
            }
          : {}),
      };
      return result;
    } catch (error) {
      logger.error({ err: error, provider: 'anthropic' }, 'LLM API request failed');
      throw error;
    }
  }

  async completeStream(request: LlmRequest, callback: StreamCallback): Promise<void> {
    const url = 'https://api.anthropic.com/v1/messages';

    const systemMessage = request.messages.find((m) => m.role === 'system')?.content;
    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const body = JSON.stringify({
      model: this.model,
      messages,
      max_tokens: request.max_tokens || 4096,
      stream: true,
      ...(systemMessage ? { system: systemMessage } : {}),
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Anthropic API streaming request failed with status ${response.status}: ${errorBody}`
        );
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                callback(parsed.delta.text);
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      logger.error({ err: error, provider: 'anthropic' }, 'LLM API streaming failed');
      throw error;
    }
  }
}

/**
 * Azure OpenAI client implementation.
 */
class AzureOpenAIClient implements LlmClient {
  constructor(
    private apiKey: string,
    private deployment: string,
    private endpoint: string,
    private apiVersion: string = '2024-02-15-preview'
  ) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;

    const body = JSON.stringify({
      messages: request.messages,
      stream: false,
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
      ...(request.max_tokens !== undefined ? { max_tokens: request.max_tokens } : {}),
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Azure OpenAI API request failed with status ${response.status}: ${errorBody}`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
      };

      const content = data.choices?.[0]?.message?.content ?? '';

      const result: LlmResponse = {
        content,
        ...(data.usage ? { usage: data.usage } : {}),
      };
      return result;
    } catch (error) {
      logger.error({ err: error, provider: 'azure' }, 'LLM API request failed');
      throw error;
    }
  }
}

/**
 * Google Gemini client implementation.
 */
class GeminiClient implements LlmClient {
  private baseUrl: string;
  private projectId?: string;

  constructor(
    private apiKey: string,
    private model: string,
    customEndpoint?: string,
    projectId?: string
  ) {
    this.baseUrl = customEndpoint || 'https://generativelanguage.googleapis.com/v1beta';
    this.projectId = projectId;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    // Gemini API uses different endpoint structure
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    // Convert messages to Gemini format
    // Gemini uses a different structure: system instructions separate, then alternating user/model
    const systemInstruction = request.messages.find(
      (m) => m.role === 'system'
    )?.content;
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    const contents = conversationMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const body = JSON.stringify({
      contents,
      ...(systemInstruction
        ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
        : {}),
      generationConfig: {
        ...(request.temperature !== undefined
          ? { temperature: request.temperature }
          : {}),
        ...(request.max_tokens !== undefined
          ? { maxOutputTokens: request.max_tokens }
          : {}),
      },
    });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add project header for corporate Gemini instances
      if (this.projectId) {
        headers['x-goog-user-project'] = this.projectId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Gemini API request failed with status ${response.status}: ${errorBody}`
        );
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      const result: LlmResponse = {
        content,
        ...(data.usageMetadata
          ? {
              usage: {
                prompt_tokens: data.usageMetadata.promptTokenCount ?? 0,
                completion_tokens: data.usageMetadata.candidatesTokenCount ?? 0,
                total_tokens: data.usageMetadata.totalTokenCount ?? 0,
              },
            }
          : {}),
      };
      return result;
    } catch (error) {
      logger.error({ err: error, provider: 'gemini' }, 'LLM API request failed');
      throw error;
    }
  }

  async completeStream(request: LlmRequest, callback: StreamCallback): Promise<void> {
    const url = `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;

    const systemInstruction = request.messages.find(
      (m) => m.role === 'system'
    )?.content;
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    const contents = conversationMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const body = JSON.stringify({
      contents,
      ...(systemInstruction
        ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
        : {}),
      generationConfig: {
        ...(request.temperature !== undefined
          ? { temperature: request.temperature }
          : {}),
        ...(request.max_tokens !== undefined
          ? { maxOutputTokens: request.max_tokens }
          : {}),
      },
    });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add project header for corporate Gemini instances
      if (this.projectId) {
        headers['x-goog-user-project'] = this.projectId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Gemini API streaming request failed with status ${response.status}: ${errorBody}`
        );
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
              }>;
            };
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              callback(text);
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      logger.error({ err: error, provider: 'gemini' }, 'LLM API streaming failed');
      throw error;
    }
  }
}

/**
 * Creates an LLM client based on the environment configuration.
 *
 * @param env - The environment configuration containing LLM settings.
 * @returns An LLM client, or undefined if not configured.
 */
export function createLlmClient(env: Env): LlmClient | undefined {
  if (!env.LLM_PROVIDER || !env.LLM_API_KEY || !env.LLM_MODEL) {
    logger.info('LLM client not configured. Skipping LLM integration.');
    return undefined;
  }

  logger.info(
    `Initializing LLM client for provider: ${env.LLM_PROVIDER} with model: ${env.LLM_MODEL}`
  );

  switch (env.LLM_PROVIDER) {
    case 'openai':
      return new OpenAIClient(env.LLM_API_KEY, env.LLM_MODEL);
    case 'anthropic':
      return new AnthropicClient(env.LLM_API_KEY, env.LLM_MODEL);
    case 'gemini':
      return new GeminiClient(
        env.LLM_API_KEY,
        env.LLM_MODEL,
        env.LLM_GEMINI_ENDPOINT,
        env.LLM_GEMINI_PROJECT
      );
    case 'azure': {
      const endpoint = process.env.LLM_AZURE_ENDPOINT;
      const deployment = process.env.LLM_AZURE_DEPLOYMENT || env.LLM_MODEL;
      if (!endpoint) {
        throw new Error('LLM_AZURE_ENDPOINT is required for Azure OpenAI provider');
      }
      return new AzureOpenAIClient(env.LLM_API_KEY, deployment, endpoint);
    }
    default:
      throw new Error(`Unsupported LLM provider: ${env.LLM_PROVIDER}`);
  }
}

/**
 * Legacy MCP inference completer adapter.
 *
 * @deprecated Use createLlmClient directly for new code.
 */
export function createInferenceCompleter(
  env: Env
): { complete: InferenceCompleter } | undefined {
  const client = createLlmClient(env);
  if (!client) {
    return undefined;
  }

  const complete: InferenceCompleter = async (
    request: InferenceRequest
  ): Promise<InferenceResponse> => {
    try {
      const response = await client.complete({
        messages: request.messages,
      });

      return {
        messages: [
          {
            role: 'assistant',
            content: response.content,
          },
        ],
      };
    } catch (error) {
      logger.error({ err: error }, 'LLM inference failed');
      return {
        messages: [
          {
            role: 'assistant',
            content: `Error communicating with the LLM backend: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  };

  return { complete };
}
