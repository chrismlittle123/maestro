import type {
  AgentExecutor,
  AgentExecutionInput,
  AgentExecutionOutput,
  Artifact,
} from "maestro-agents-core";

/**
 * Options for the Claude Code executor
 */
export interface ClaudeCodeExecutorOptions {
  /**
   * Whether to bypass permission checks.
   * WARNING: Only enable this in trusted environments.
   * @default false
   */
  dangerouslyBypassPermissions?: boolean;

  /**
   * Working directory for the agent
   */
  workingDirectory?: string;

  /**
   * Maximum number of turns for the agent
   */
  maxTurns?: number;
}

/**
 * Claude Code SDK executor for running agents
 *
 * This executor uses the @anthropic-ai/claude-agent-sdk to run agents
 * with Claude's capabilities including file operations, code execution,
 * and web search.
 */
export class ClaudeCodeExecutor implements AgentExecutor {
  private runningExecutions: Map<string, AbortController> = new Map();
  private options: ClaudeCodeExecutorOptions;

  constructor(options: ClaudeCodeExecutorOptions = {}) {
    this.options = {
      dangerouslyBypassPermissions: false,
      ...options,
    };
  }

  /**
   * Execute an agent with the given input
   */
  async execute(input: AgentExecutionInput): Promise<AgentExecutionOutput> {
    const executionKey = `${input.workflowId}:${input.stepId}`;
    const abortController = new AbortController();
    this.runningExecutions.set(executionKey, abortController);

    try {
      // Dynamically import the SDK to avoid requiring it at module load time
      const { query } = await import("@anthropic-ai/claude-agent-sdk");

      // Build the full prompt combining agent persona and task
      const fullPrompt = this.buildPrompt(input);

      // Collect output
      let totalCostUsd = 0;
      let inputTokens = 0;
      let outputTokens = 0;

      // Build options based on configuration
      const queryOptions: Record<string, unknown> = {
        abortController,
        systemPrompt: input.prompt,
      };

      // Only bypass permissions if explicitly enabled
      if (this.options.dangerouslyBypassPermissions) {
        queryOptions.permissionMode = "bypassPermissions";
        queryOptions.allowDangerouslySkipPermissions = true;
      }

      if (this.options.workingDirectory) {
        queryOptions.workingDirectory = this.options.workingDirectory;
      }

      if (this.options.maxTurns) {
        queryOptions.maxTurns = this.options.maxTurns;
      }

      // Run the query
      const queryResult = query({
        prompt: fullPrompt,
        options: queryOptions,
      });

      // Process messages
      for await (const message of queryResult) {
        if (message.type === "result") {
          if (message.subtype === "success") {
            totalCostUsd = message.total_cost_usd;
            inputTokens = message.usage.input_tokens;
            outputTokens = message.usage.output_tokens;
          } else {
            // Error case
            const errorMessage = message.errors?.join("\n") || "Unknown error";
            return {
              success: false,
              artifacts: [],
              error: errorMessage,
              tokenUsage: {
                input: message.usage.input_tokens,
                output: message.usage.output_tokens,
                total: message.usage.input_tokens + message.usage.output_tokens,
              },
            };
          }
        }
      }

      // Create artifact from result
      const artifact: Artifact = {
        id: `${input.workflowId}-${input.stepId}-result`,
        workflowId: input.workflowId,
        stepId: input.stepId,
        name: "result.md",
        type: "text",
        path: "", // Will be set by artifact store
        createdAt: new Date(),
        metadata: {
          costUsd: totalCostUsd,
        },
      };

      return {
        success: true,
        artifacts: [artifact],
        tokenUsage: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        artifacts: [],
        error: errorMessage,
      };
    } finally {
      this.runningExecutions.delete(executionKey);
    }
  }

  /**
   * Cancel a running execution
   */
  async cancel(workflowId: string, stepId: string): Promise<void> {
    const executionKey = `${workflowId}:${stepId}`;
    const controller = this.runningExecutions.get(executionKey);
    if (controller) {
      controller.abort();
      this.runningExecutions.delete(executionKey);
    }
  }

  /**
   * Get the status of an execution
   */
  async getStatus(
    workflowId: string,
    stepId: string
  ): Promise<"pending" | "running" | "completed" | "failed" | "cancelled"> {
    const executionKey = `${workflowId}:${stepId}`;
    if (this.runningExecutions.has(executionKey)) {
      return "running";
    }
    return "completed";
  }

  /**
   * Build the full prompt for the agent
   */
  private buildPrompt(input: AgentExecutionInput): string {
    const parts: string[] = [];

    // Add task context
    parts.push(`# Task`);
    parts.push(input.prompt);
    parts.push("");

    // Add input artifacts if any
    if (input.inputs.length > 0) {
      parts.push(`# Input Artifacts`);
      for (const artifact of input.inputs) {
        parts.push(`- ${artifact.name} (${artifact.path})`);
      }
      parts.push("");
    }

    return parts.join("\n");
  }
}
