import type { AgentExecutor, AgentExecutionInput, AgentExecutionOutput } from "../types/agent.js";
import type { Artifact } from "../types/artifact.js";

/**
 * Claude Code SDK executor for running agents
 *
 * This executor uses the @anthropic-ai/claude-agent-sdk to run agents
 * with Claude's capabilities including file operations, code execution,
 * and web search.
 */
export class ClaudeCodeExecutor implements AgentExecutor {
  private runningExecutions: Map<string, AbortController> = new Map();

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

      // Run the query
      const queryResult = query({
        prompt: fullPrompt,
        options: {
          abortController,
          systemPrompt: input.prompt,
          permissionMode: "bypassPermissions",
          allowDangerouslySkipPermissions: true,
        },
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

/**
 * Mock executor for testing without the Claude SDK
 */
export class MockClaudeCodeExecutor implements AgentExecutor {
  private mockResponse: string;
  private shouldFail: boolean;

  constructor(options: { mockResponse?: string; shouldFail?: boolean } = {}) {
    this.mockResponse = options.mockResponse || "Mock response from agent";
    this.shouldFail = options.shouldFail || false;
  }

  async execute(input: AgentExecutionInput): Promise<AgentExecutionOutput> {
    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (this.shouldFail) {
      return {
        success: false,
        artifacts: [],
        error: "Mock execution failed",
      };
    }

    const artifact: Artifact = {
      id: `${input.workflowId}-${input.stepId}-result`,
      workflowId: input.workflowId,
      stepId: input.stepId,
      name: "result.md",
      type: "text",
      path: "",
      createdAt: new Date(),
    };

    return {
      success: true,
      artifacts: [artifact],
      tokenUsage: {
        input: 100,
        output: 50,
        total: 150,
      },
    };
  }

  async cancel(_workflowId: string, _stepId: string): Promise<void> {
    // No-op for mock
  }

  async getStatus(
    _workflowId: string,
    _stepId: string
  ): Promise<"pending" | "running" | "completed" | "failed" | "cancelled"> {
    return "completed";
  }

  /**
   * Set mock response for testing
   */
  setMockResponse(response: string): void {
    this.mockResponse = response;
  }

  /**
   * Set whether execution should fail
   */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * Get the mock response
   */
  getMockResponse(): string {
    return this.mockResponse;
  }
}
