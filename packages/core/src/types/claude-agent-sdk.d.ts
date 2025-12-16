/**
 * Type declarations for @anthropic-ai/claude-agent-sdk
 * This allows TypeScript to compile without the SDK installed
 * The actual SDK is loaded dynamically at runtime
 */

declare module "@anthropic-ai/claude-agent-sdk" {
  export interface QueryOptions {
    prompt: string;
    options?: {
      maxTurns?: number;
      systemPrompt?: string;
      allowedTools?: string[];
      workingDirectory?: string;
      abortController?: AbortController;
      permissionMode?: "default" | "bypassPermissions";
      allowDangerouslySkipPermissions?: boolean;
    };
  }

  export interface MessageUsage {
    input_tokens: number;
    output_tokens: number;
  }

  export interface SuccessResultMessage {
    type: "result";
    subtype: "success";
    result: string;
    total_cost_usd: number;
    usage: MessageUsage;
  }

  export interface ErrorResultMessage {
    type: "result";
    subtype: "error";
    errors?: string[];
    usage: MessageUsage;
  }

  export interface AssistantMessage {
    type: "assistant";
    message: string;
  }

  export interface ToolUseMessage {
    type: "tool_use";
    tool: string;
    input: unknown;
  }

  export type QueryMessage =
    | SuccessResultMessage
    | ErrorResultMessage
    | AssistantMessage
    | ToolUseMessage;

  export interface QueryResult {
    [Symbol.asyncIterator](): AsyncIterator<QueryMessage>;
  }

  export function query(options: QueryOptions): QueryResult;
}
