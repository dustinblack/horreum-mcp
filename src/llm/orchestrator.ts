/**
 * Tool orchestration system for LLM-powered natural language queries.
 *
 * This module coordinates between the LLM and MCP tools, enabling multi-step
 * query execution where the LLM can call tools, analyze results, and make
 * additional tool calls as needed.
 */

import type { LlmClient, LlmMessage } from './client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../observability/logging.js';
import { getHorreumSystemPrompt, createUserPrompt } from './prompts.js';

/**
 * Tool call request parsed from LLM response.
 */
export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Result of a tool execution.
 */
export interface ToolResult {
  tool: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Orchestration result containing the final answer and execution trace.
 */
export interface OrchestrationResult {
  answer: string;
  tool_calls: Array<{
    tool: string;
    arguments: Record<string, unknown>;
    result: unknown;
    duration_ms: number;
  }>;
  total_duration_ms: number;
  llm_calls: number;
}

/**
 * Orchestrator for natural language queries using LLM + MCP tools.
 */
export class QueryOrchestrator {
  private conversationHistory: LlmMessage[] = [];

  constructor(
    private llmClient: LlmClient,
    private mcpServer: McpServer,
    private maxIterations: number = 10,
    private temperature: number = 0.1
  ) {
    // Initialize with system prompt
    this.conversationHistory.push({
      role: 'system',
      content: getHorreumSystemPrompt(),
    });
  }

  /**
   * Execute a natural language query.
   *
   * @param query - The user's natural language query.
   * @returns The orchestration result with answer and execution trace.
   */
  async executeQuery(query: string): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const toolCalls: Array<{
      tool: string;
      arguments: Record<string, unknown>;
      result: unknown;
      duration_ms: number;
    }> = [];
    let llmCalls = 0;

    try {
      // Add user query to conversation
      this.conversationHistory.push({
        role: 'user',
        content: createUserPrompt(query),
      });

      let iterations = 0;
      let finalAnswer: string | null = null;

      while (iterations < this.maxIterations && finalAnswer === null) {
        iterations++;
        llmCalls++;

        logger.info(
          { iteration: iterations, history_length: this.conversationHistory.length },
          'Executing LLM query'
        );

        // Call LLM
        const response = await this.llmClient.complete({
          messages: this.conversationHistory,
          temperature: this.temperature,
          max_tokens: 4096,
        });

        const content = response.content.trim();
        logger.debug({ content, iteration: iterations }, 'LLM response received');

        // Add assistant response to history
        this.conversationHistory.push({
          role: 'assistant',
          content,
        });

        // Parse response for tool calls
        const toolCallRequests = this.parseToolCalls(content);

        if (toolCallRequests.length === 0) {
          // No more tool calls - this is the final answer
          finalAnswer = content;
          break;
        }

        // Execute tool calls
        const results: ToolResult[] = [];
        for (const toolCall of toolCallRequests) {
          const toolStartTime = Date.now();
          try {
            logger.info(
              { tool: toolCall.name, args: toolCall.arguments },
              'Executing tool'
            );

            const result = await this.executeTool(toolCall);
            const duration = Date.now() - toolStartTime;

            results.push({
              tool: toolCall.name,
              success: true,
              result,
            });

            toolCalls.push({
              tool: toolCall.name,
              arguments: toolCall.arguments,
              result,
              duration_ms: duration,
            });

            logger.info(
              { tool: toolCall.name, duration_ms: duration },
              'Tool executed successfully'
            );
          } catch (error) {
            const duration = Date.now() - toolStartTime;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            results.push({
              tool: toolCall.name,
              success: false,
              error: errorMsg,
            });

            toolCalls.push({
              tool: toolCall.name,
              arguments: toolCall.arguments,
              result: { error: errorMsg },
              duration_ms: duration,
            });

            logger.error(
              { tool: toolCall.name, error: errorMsg, duration_ms: duration },
              'Tool execution failed'
            );
          }
        }

        // Add tool results to conversation
        const resultsMessage = this.formatToolResults(results);
        this.conversationHistory.push({
          role: 'user',
          content: resultsMessage,
        });

        // If all tools failed, stop iteration
        if (results.every((r) => !r.success)) {
          finalAnswer = `I encountered errors while trying to query Horreum:
\n\n${results.map((r) => `- ${r.tool}: ${r.error}`).join('\n')}
\n\nPlease check the tool names and parameters, or try a different query.`;
        }
      }

      if (finalAnswer === null) {
        finalAnswer = `I reached the maximum number of iterations (${this.maxIterations}) without completing the query. Please try a simpler or more specific query.`;
      }

      const totalDuration = Date.now() - startTime;

      return {
        answer: finalAnswer,
        tool_calls: toolCalls,
        total_duration_ms: totalDuration,
        llm_calls: llmCalls,
      };
    } catch (error) {
      logger.error({ err: error }, 'Query orchestration failed');
      throw error;
    }
  }

  /**
   * Parse tool call requests from LLM response.
   *
   * Looks for JSON-formatted tool calls in the response.
   * Expected format:
   * ```
   * TOOL_CALL: {"name": "tool_name", "arguments": {...}}
   * ```
   *
   * @param content - The LLM response content.
   * @returns Array of parsed tool calls.
   */
  private parseToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Look for TOOL_CALL: markers followed by JSON
    // We need to extract JSON carefully, handling nested objects
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const toolCallMatch = line.match(/TOOL_CALL:\s*(.+)/);
      if (toolCallMatch && toolCallMatch[1]) {
        try {
          // Try to parse the JSON starting from after TOOL_CALL:
          let jsonStr = toolCallMatch[1].trim();

          // If the JSON spans multiple lines, collect them
          if (jsonStr.startsWith('{') && !jsonStr.endsWith('}')) {
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j];
              if (nextLine) {
                jsonStr += '\n' + nextLine;
                if (nextLine.includes('}')) {
                  break;
                }
              }
            }
          }

          // Find the first complete JSON object
          let braceCount = 0;
          let jsonEnd = -1;
          for (let k = 0; k < jsonStr.length; k++) {
            if (jsonStr[k] === '{') braceCount++;
            if (jsonStr[k] === '}') braceCount--;
            if (braceCount === 0 && jsonStr[k] === '}') {
              jsonEnd = k + 1;
              break;
            }
          }

          if (jsonEnd > 0) {
            jsonStr = jsonStr.substring(0, jsonEnd);
            const toolCall = JSON.parse(jsonStr) as ToolCall;
            if (toolCall.name) {
              toolCalls.push({
                name: toolCall.name,
                arguments: toolCall.arguments || {},
              });
            }
          }
        } catch (error) {
          logger.warn({ raw: toolCallMatch[1], error }, 'Failed to parse tool call');
        }
      }
    }

    // Alternative: Look for explicit tool call format
    // ```json
    // {"tool": "name", "parameters": {...}}
    // ```
    const jsonBlockRegex = /```json\s*\n({[\s\S]*?})\s*\n```/g;
    let jsonMatch;
    while ((jsonMatch = jsonBlockRegex.exec(content)) !== null) {
      const jsonText = jsonMatch[1];
      if (!jsonText) continue;

      try {
        const parsed = JSON.parse(jsonText) as {
          tool?: string;
          name?: string;
          parameters?: Record<string, unknown>;
          arguments?: Record<string, unknown>;
        };
        const name = parsed.tool || parsed.name;
        const args = parsed.parameters || parsed.arguments || {};

        if (name) {
          toolCalls.push({
            name,
            arguments: args,
          });
        }
      } catch (error) {
        logger.warn({ raw: jsonText, error }, 'Failed to parse JSON block tool call');
      }
    }

    return toolCalls;
  }

  /**
   * Execute an MCP tool call.
   *
   * @param toolCall - The tool call to execute.
   * @returns The tool execution result.
   */
  private async executeTool(toolCall: ToolCall): Promise<unknown> {
    const toolName = toolCall.name;
    const args = toolCall.arguments;

    // Import toolHandlers dynamically to avoid circular dependency
    const { toolHandlers } = await import('../server/tools.js');

    // Look up the tool handler
    const handler = toolHandlers.get(toolName);
    if (!handler) {
      logger.error({ tool: toolName }, 'Tool not found');
      throw new Error(`Tool "${toolName}" not found`);
    }

    // Execute the tool handler directly
    logger.debug({ tool: toolName, args }, 'Executing MCP tool');
    const result = await handler(args);

    // Extract text content from MCP tool result
    if (result.isError) {
      // Tool execution failed
      const errorText = result.content?.[0]?.text || 'Unknown error';
      logger.warn({ tool: toolName, error: errorText }, 'Tool execution failed');
      return { error: errorText };
    }

    // Parse the text content as JSON if possible
    const textContent = result.content?.[0]?.text;
    if (textContent) {
      try {
        return JSON.parse(textContent);
      } catch {
        // Not JSON, return as-is
        return textContent;
      }
    }

    return result;
  }

  /**
   * Format tool results for the LLM.
   *
   * @param results - The tool execution results.
   * @returns Formatted message for the LLM.
   */
  private formatToolResults(results: ToolResult[]): string {
    const parts = results.map((result) => {
      if (result.success) {
        return `TOOL_RESULT [${result.tool}]: ${JSON.stringify(result.result, null, 2)}`;
      } else {
        return `TOOL_ERROR [${result.tool}]: ${result.error}`;
      }
    });

    return `Tool execution results:\n\n${parts.join('\n\n')}\n\nBased on these results, please provide your analysis or make additional tool calls if needed.`;
  }

  /**
   * Reset the conversation history.
   */
  reset(): void {
    this.conversationHistory = [
      {
        role: 'system',
        content: getHorreumSystemPrompt(),
      },
    ];
  }
}

/**
 * Create a query orchestrator instance.
 *
 * @param llmClient - The LLM client to use.
 * @param mcpServer - The MCP server instance.
 * @param maxIterations - Maximum number of LLM iterations (default: 10).
 * @param temperature - LLM temperature setting (default: 0.1 for deterministic
 *   responses).
 * @returns A new QueryOrchestrator instance.
 */
export function createOrchestrator(
  llmClient: LlmClient,
  mcpServer: McpServer,
  maxIterations = 10,
  temperature = 0.1
): QueryOrchestrator {
  return new QueryOrchestrator(llmClient, mcpServer, maxIterations, temperature);
}
