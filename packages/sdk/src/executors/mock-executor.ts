import type {
  AgentExecutor,
  AgentExecutionInput,
  AgentExecutionOutput,
  Artifact,
} from "@maestro/core";

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
      metadata: {
        mockResponse: this.mockResponse,
      },
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
