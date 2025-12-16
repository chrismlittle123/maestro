import { describe, it, expect, vi, beforeEach } from "vitest";
import { InMemoryEventBus } from "@chrismlittle123/maestro-core";
import type { MaestroEvent } from "@chrismlittle123/maestro-core";

describe("InMemoryEventBus", () => {
  let bus: InMemoryEventBus;

  beforeEach(() => {
    bus = new InMemoryEventBus();
  });

  describe("on() and emit()", () => {
    it("calls handler for specific event type", async () => {
      const handler = vi.fn();

      bus.on("workflow.started", handler);

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "workflow.started",
          workflowName: "test",
        })
      );
    });

    it("does not call handler for different event type", async () => {
      const handler = vi.fn();

      bus.on("workflow.started", handler);

      await bus.emit({
        type: "workflow.completed",
        timestamp: new Date(),
        workflowId: "test-123",
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("calls multiple handlers for same event type", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on("workflow.started", handler1);
      bus.on("workflow.started", handler2);

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it("handles async handlers", async () => {
      const results: number[] = [];

      bus.on("workflow.started", async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(1);
      });

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });

      expect(results).toEqual([1]);
    });

    it("calls handlers in registration order", async () => {
      const order: number[] = [];

      bus.on("workflow.started", () => order.push(1));
      bus.on("workflow.started", () => order.push(2));
      bus.on("workflow.started", () => order.push(3));

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe("onAny()", () => {
    it("calls handler for all event types", async () => {
      const handler = vi.fn();

      bus.onAny(handler);

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });

      await bus.emit({
        type: "workflow.completed",
        timestamp: new Date(),
        workflowId: "test-123",
      });

      await bus.emit({
        type: "step.started",
        timestamp: new Date(),
        workflowId: "test-123",
        stepId: "step1",
        agentName: "developer",
      });

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it("calls both specific and any handlers", async () => {
      const specificHandler = vi.fn();
      const anyHandler = vi.fn();

      bus.on("workflow.started", specificHandler);
      bus.onAny(anyHandler);

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });

      expect(specificHandler).toHaveBeenCalledOnce();
      expect(anyHandler).toHaveBeenCalledOnce();
    });

    it("calls specific handlers before any handlers", async () => {
      const order: string[] = [];

      bus.on("workflow.started", () => order.push("specific"));
      bus.onAny(() => order.push("any"));

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });

      expect(order).toEqual(["specific", "any"]);
    });
  });

  describe("off()", () => {
    it("unsubscribes handler from event type", async () => {
      const handler = vi.fn();

      bus.on("workflow.started", handler);
      bus.off("workflow.started", handler);

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("only unsubscribes the specified handler", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on("workflow.started", handler1);
      bus.on("workflow.started", handler2);
      bus.off("workflow.started", handler1);

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it("handles unsubscribing non-existent handler gracefully", () => {
      const handler = vi.fn();

      // Should not throw
      bus.off("workflow.started", handler);
    });
  });

  describe("offAny()", () => {
    it("unsubscribes any handler", async () => {
      const handler = vi.fn();

      bus.onAny(handler);
      bus.offAny(handler);

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("clear()", () => {
    it("removes all handlers", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const anyHandler = vi.fn();

      bus.on("workflow.started", handler1);
      bus.on("workflow.completed", handler2);
      bus.onAny(anyHandler);

      bus.clear();

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(anyHandler).not.toHaveBeenCalled();
    });
  });

  describe("event types", () => {
    it("handles workflow.started event", async () => {
      const handler = vi.fn();
      bus.on("workflow.started", handler);

      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test-workflow",
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "workflow.started",
          workflowName: "test-workflow",
        })
      );
    });

    it("handles workflow.completed event", async () => {
      const handler = vi.fn();
      bus.on("workflow.completed", handler);

      await bus.emit({
        type: "workflow.completed",
        timestamp: new Date(),
        workflowId: "test-123",
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "workflow.completed",
          workflowId: "test-123",
        })
      );
    });

    it("handles workflow.failed event", async () => {
      const handler = vi.fn();
      bus.on("workflow.failed", handler);

      await bus.emit({
        type: "workflow.failed",
        timestamp: new Date(),
        workflowId: "test-123",
        error: "Something went wrong",
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "workflow.failed",
          error: "Something went wrong",
        })
      );
    });

    it("handles step.started event", async () => {
      const handler = vi.fn();
      bus.on("step.started", handler);

      await bus.emit({
        type: "step.started",
        timestamp: new Date(),
        workflowId: "test-123",
        stepId: "step1",
        agentName: "developer",
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "step.started",
          stepId: "step1",
          agentName: "developer",
        })
      );
    });

    it("handles step.completed event", async () => {
      const handler = vi.fn();
      bus.on("step.completed", handler);

      await bus.emit({
        type: "step.completed",
        timestamp: new Date(),
        workflowId: "test-123",
        stepId: "step1",
        agentName: "developer",
        artifacts: ["code.ts", "test.ts"],
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "step.completed",
          artifacts: ["code.ts", "test.ts"],
        })
      );
    });

    it("handles step.failed event", async () => {
      const handler = vi.fn();
      bus.on("step.failed", handler);

      await bus.emit({
        type: "step.failed",
        timestamp: new Date(),
        workflowId: "test-123",
        stepId: "step1",
        agentName: "developer",
        error: "Agent failed",
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "step.failed",
          error: "Agent failed",
        })
      );
    });

    it("handles approval.required event", async () => {
      const handler = vi.fn();
      bus.on("approval.required", handler);

      await bus.emit({
        type: "approval.required",
        timestamp: new Date(),
        workflowId: "test-123",
        stepId: "step1",
        agentName: "reviewer",
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "approval.required",
          stepId: "step1",
        })
      );
    });

    it("handles budget.warning event", async () => {
      const handler = vi.fn();
      bus.on("budget.warning", handler);

      await bus.emit({
        type: "budget.warning",
        timestamp: new Date(),
        workflowId: "test-123",
        currentUsage: 80000,
        limit: 100000,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "budget.warning",
          currentUsage: 80000,
          limit: 100000,
        })
      );
    });

    it("handles budget.exceeded event", async () => {
      const handler = vi.fn();
      bus.on("budget.exceeded", handler);

      await bus.emit({
        type: "budget.exceeded",
        timestamp: new Date(),
        workflowId: "test-123",
        currentUsage: 110000,
        limit: 100000,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "budget.exceeded",
          currentUsage: 110000,
          limit: 100000,
        })
      );
    });
  });

  describe("edge cases", () => {
    it("handles emit with no handlers registered", async () => {
      // Should not throw
      await bus.emit({
        type: "workflow.started",
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      });
    });

    it("preserves event data integrity", async () => {
      const events: MaestroEvent[] = [];

      bus.onAny((event) => events.push(event));

      const originalEvent = {
        type: "workflow.started" as const,
        timestamp: new Date(),
        workflowId: "test-123",
        workflowName: "test",
      };

      await bus.emit(originalEvent);

      expect(events[0]).toEqual(originalEvent);
    });
  });
});
