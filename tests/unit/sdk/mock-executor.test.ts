import { describe, it, expect, beforeEach } from "vitest";
import { MockClaudeCodeExecutor } from "@chrismlittle123/maestro-sdk";
import type { AgentExecutionInput } from "@chrismlittle123/maestro-core";

describe("MockClaudeCodeExecutor", () => {
  let executor: MockClaudeCodeExecutor;

  const createInput = (overrides?: Partial<AgentExecutionInput>): AgentExecutionInput => ({
    workflowId: "test-workflow",
    stepId: "test-step",
    agent: {
      name: "test-agent",
      role: "Test Agent",
      automation: "full",
    },
    prompt: "Test prompt",
    inputs: [],
    ...overrides,
  });

  beforeEach(() => {
    executor = new MockClaudeCodeExecutor();
  });

  describe("execute()", () => {
    it("returns successful result by default", async () => {
      const input = createInput();

      const result = await executor.execute(input);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns artifact with correct metadata", async () => {
      const input = createInput({
        workflowId: "run-123",
        stepId: "step1",
      });

      const result = await executor.execute(input);

      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts[0].id).toBe("run-123-step1-result");
      expect(result.artifacts[0].workflowId).toBe("run-123");
      expect(result.artifacts[0].stepId).toBe("step1");
      expect(result.artifacts[0].name).toBe("result.md");
      expect(result.artifacts[0].type).toBe("text");
    });

    it("returns token usage information", async () => {
      const input = createInput();

      const result = await executor.execute(input);

      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage?.input).toBe(100);
      expect(result.tokenUsage?.output).toBe(50);
      expect(result.tokenUsage?.total).toBe(150);
    });

    it("stores mock response in artifact metadata", async () => {
      executor = new MockClaudeCodeExecutor({ mockResponse: "Custom response" });
      const input = createInput();

      const result = await executor.execute(input);

      expect(result.artifacts[0].metadata).toEqual({ mockResponse: "Custom response" });
    });

    it("returns failure when configured to fail", async () => {
      executor = new MockClaudeCodeExecutor({ shouldFail: true });
      const input = createInput();

      const result = await executor.execute(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Mock execution failed");
      expect(result.artifacts).toEqual([]);
    });

    it("simulates processing time", async () => {
      const input = createInput();

      const start = Date.now();
      await executor.execute(input);
      const duration = Date.now() - start;

      // Should take at least 100ms (the simulated delay)
      expect(duration).toBeGreaterThanOrEqual(90); // Allow small timing variance
    });

    it("sets createdAt timestamp on artifact", async () => {
      const input = createInput();
      const before = new Date();

      const result = await executor.execute(input);

      const after = new Date();
      expect(result.artifacts[0].createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.artifacts[0].createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("cancel()", () => {
    it("completes without error", async () => {
      // Mock executor cancel is a no-op, but should not throw
      await expect(executor.cancel("workflow-1", "step-1")).resolves.toBeUndefined();
    });
  });

  describe("getStatus()", () => {
    it("returns completed status", async () => {
      const status = await executor.getStatus("workflow-1", "step-1");

      expect(status).toBe("completed");
    });
  });

  describe("setMockResponse()", () => {
    it("changes the mock response", async () => {
      executor.setMockResponse("New response");
      const input = createInput();

      const result = await executor.execute(input);

      expect(result.artifacts[0].metadata).toEqual({ mockResponse: "New response" });
    });
  });

  describe("setShouldFail()", () => {
    it("changes failure behavior", async () => {
      const input = createInput();

      // Initially succeeds
      let result = await executor.execute(input);
      expect(result.success).toBe(true);

      // Set to fail
      executor.setShouldFail(true);
      result = await executor.execute(input);
      expect(result.success).toBe(false);

      // Set back to succeed
      executor.setShouldFail(false);
      result = await executor.execute(input);
      expect(result.success).toBe(true);
    });
  });

  describe("getMockResponse()", () => {
    it("returns current mock response", () => {
      expect(executor.getMockResponse()).toBe("Mock response from agent");
    });

    it("returns custom mock response", () => {
      executor = new MockClaudeCodeExecutor({ mockResponse: "Custom" });

      expect(executor.getMockResponse()).toBe("Custom");
    });

    it("reflects changes from setMockResponse", () => {
      executor.setMockResponse("Updated");

      expect(executor.getMockResponse()).toBe("Updated");
    });
  });

  describe("constructor options", () => {
    it("accepts mockResponse option", () => {
      executor = new MockClaudeCodeExecutor({ mockResponse: "Custom response" });

      expect(executor.getMockResponse()).toBe("Custom response");
    });

    it("accepts shouldFail option", async () => {
      executor = new MockClaudeCodeExecutor({ shouldFail: true });
      const input = createInput();

      const result = await executor.execute(input);

      expect(result.success).toBe(false);
    });

    it("accepts empty options object", () => {
      executor = new MockClaudeCodeExecutor({});

      expect(executor.getMockResponse()).toBe("Mock response from agent");
    });

    it("uses defaults when no options provided", () => {
      executor = new MockClaudeCodeExecutor();

      expect(executor.getMockResponse()).toBe("Mock response from agent");
    });
  });

  describe("multiple executions", () => {
    it("generates unique artifact IDs per execution", async () => {
      const input1 = createInput({ workflowId: "run-1", stepId: "step-1" });
      const input2 = createInput({ workflowId: "run-1", stepId: "step-2" });
      const input3 = createInput({ workflowId: "run-2", stepId: "step-1" });

      const result1 = await executor.execute(input1);
      const result2 = await executor.execute(input2);
      const result3 = await executor.execute(input3);

      const ids = [result1.artifacts[0].id, result2.artifacts[0].id, result3.artifacts[0].id];

      // All IDs should be unique
      expect(new Set(ids).size).toBe(3);
    });
  });
});
