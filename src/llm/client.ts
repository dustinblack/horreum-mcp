/**
 * Client for external Large Language Model (LLM) APIs.
 */
import type { Env } from '../config/env.js';
import { logger } from '../observability/logging.js';

// Define inference types since they're not available in the current MCP SDK
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
 * Creates an inference completer that proxies requests to an external LLM API.
 *
 * @param env - The environment configuration containing LLM settings.
 * @returns An object with an `complete` method for the McpServer, or undefined.
 */
export function createLlmClient(
  env: Env
): { complete: InferenceCompleter } | undefined {
  if (!env.LLM_PROVIDER || !env.LLM_API_KEY || !env.LLM_MODEL) {
    logger.info('LLM client not configured. Skipping external inference engine.');
    return undefined;
  }

  logger.info(
    `Initializing LLM client for provider: ${env.LLM_PROVIDER} with model: ${env.LLM_MODEL}`
  );

  const complete: InferenceCompleter = async (
    request: InferenceRequest
  ): Promise<InferenceResponse> => {
    // This is a simplified example targeting an OpenAI-compatible API.
    // A real implementation would need to handle different provider formats.
    const url = 'https://api.openai.com/v1/chat/completions';

    const body = JSON.stringify({
      model: env.LLM_MODEL,
      messages: request.messages,
      stream: false, // MCP handles streaming; we request a single response
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.LLM_API_KEY}`,
        },
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `LLM API request failed with status ${response.status}: ${errorBody}`
        );
      }

      const data = await response.json();

      // Assuming the response has a structure like OpenAI's API
      const content = data.choices?.[0]?.message?.content ?? '';

      return {
        messages: [
          {
            role: 'assistant',
            content,
          },
        ],
      };
    } catch (error) {
      logger.error({ err: error }, 'LLM API request failed');
      // Propagate a structured error to the MCP client
      return {
        messages: [
          {
            role: 'assistant',
            content: `Error communicating with the LLM backend: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        // You can also add custom error metadata if the protocol supports it
      };
    }
  };

  return { complete };
}
