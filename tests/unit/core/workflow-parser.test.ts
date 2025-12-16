import { describe, it, expect } from "vitest";
import { parseWorkflow, WorkflowParseError } from "@chrismlittle123/maestro-core";

describe("parseWorkflow", () => {
  describe("valid workflows", () => {
    it("parses minimal workflow", () => {
      const yaml = `
name: test
steps:
  - id: step1
    agent: developer
`;
      const config = parseWorkflow(yaml);

      expect(config.name).toBe("test");
      expect(config.steps).toHaveLength(1);
      expect(config.steps[0].id).toBe("step1");
      expect(config.steps[0].agent).toBe("developer");
    });

    it("parses workflow with description", () => {
      const yaml = `
name: test
description: A test workflow
steps:
  - id: step1
    agent: developer
`;
      const config = parseWorkflow(yaml);

      expect(config.description).toBe("A test workflow");
    });

    it("parses workflow with multiple steps", () => {
      const yaml = `
name: multi-step
steps:
  - id: step1
    agent: developer
    next: step2
  - id: step2
    agent: reviewer
`;
      const config = parseWorkflow(yaml);

      expect(config.steps).toHaveLength(2);
      expect(config.steps[0].next).toBe("step2");
    });

    it("parses workflow with inputs and outputs", () => {
      const yaml = `
name: test
steps:
  - id: step1
    agent: developer
    inputs: [design.md, requirements.md]
    outputs: [code, tests]
`;
      const config = parseWorkflow(yaml);

      expect(config.steps[0].inputs).toEqual(["design.md", "requirements.md"]);
      expect(config.steps[0].outputs).toEqual(["code", "tests"]);
    });

    it("parses workflow with automation modes", () => {
      const yaml = `
name: test
steps:
  - id: step1
    agent: developer
    automation: full
  - id: step2
    agent: reviewer
    automation: partial
`;
      const config = parseWorkflow(yaml);

      expect(config.steps[0].automation).toBe("full");
      expect(config.steps[1].automation).toBe("partial");
    });

    it("defaults automation to full", () => {
      const yaml = `
name: test
steps:
  - id: step1
    agent: developer
`;
      const config = parseWorkflow(yaml);

      expect(config.steps[0].automation).toBe("full");
    });

    it("parses workflow with conditional branching", () => {
      const yaml = `
name: test
steps:
  - id: step1
    agent: developer
    on_pass: step2
    on_fail: step3
    on_reject: step1
`;
      const config = parseWorkflow(yaml);

      expect(config.steps[0].on_pass).toBe("step2");
      expect(config.steps[0].on_fail).toBe("step3");
      expect(config.steps[0].on_reject).toBe("step1");
    });

    it("parses workflow with condition", () => {
      const yaml = `
name: test
steps:
  - id: step1
    agent: developer
    condition: "artifacts.review.approved == true"
`;
      const config = parseWorkflow(yaml);

      expect(config.steps[0].condition).toBe("artifacts.review.approved == true");
    });

    it("parses workflow with timeouts", () => {
      const yaml = `
name: test
steps:
  - id: step1
    agent: developer
timeouts:
  default: 30m
  step1: 2h
`;
      const config = parseWorkflow(yaml);

      expect(config.timeouts?.default).toBe("30m");
      expect(config.timeouts?.step1).toBe("2h");
    });

    it("parses workflow with budget", () => {
      const yaml = `
name: test
steps:
  - id: step1
    agent: developer
budget:
  max_tokens: 100000
  max_cost_usd: 10.00
  on_exceed: pause
`;
      const config = parseWorkflow(yaml);

      expect(config.budget?.max_tokens).toBe(100000);
      expect(config.budget?.max_cost_usd).toBe(10.0);
      expect(config.budget?.on_exceed).toBe("pause");
    });

    it("parses workflow with all budget on_exceed values", () => {
      const values = ["pause", "abort", "notify_and_continue"] as const;

      for (const value of values) {
        const yaml = `
name: test
steps:
  - id: step1
    agent: developer
budget:
  on_exceed: ${value}
`;
        const config = parseWorkflow(yaml);
        expect(config.budget?.on_exceed).toBe(value);
      }
    });
  });

  describe("invalid workflows", () => {
    it("throws for invalid YAML syntax", () => {
      const yaml = `
name: test
steps:
  - id: [invalid
`;
      expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
    });

    it("throws for missing name", () => {
      const yaml = `
steps:
  - id: step1
    agent: developer
`;
      expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
    });

    it("throws for missing steps", () => {
      const yaml = `
name: test
`;
      expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
    });

    it("allows empty steps array", () => {
      // Note: The schema currently allows empty steps arrays.
      // The WorkflowEngine will handle this at runtime.
      const yaml = `
name: test
steps: []
`;
      const config = parseWorkflow(yaml);
      expect(config.steps).toEqual([]);
    });

    it("throws for step missing id", () => {
      const yaml = `
name: test
steps:
  - agent: developer
`;
      expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
    });

    it("throws for step missing agent", () => {
      const yaml = `
name: test
steps:
  - id: step1
`;
      expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
    });

    it("throws for invalid automation value", () => {
      const yaml = `
name: test
steps:
  - id: step1
    agent: developer
    automation: invalid
`;
      expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
    });

    it("throws for invalid budget on_exceed value", () => {
      const yaml = `
name: test
steps:
  - id: step1
    agent: developer
budget:
  on_exceed: invalid
`;
      expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
    });

    it("provides helpful error messages with field paths", () => {
      const yaml = `
name: test
steps:
  - id: step1
`;
      try {
        parseWorkflow(yaml);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(WorkflowParseError);
        expect((e as Error).message).toContain("steps.0.agent");
      }
    });
  });

  describe("edge cases", () => {
    it("handles empty string values", () => {
      const yaml = `
name: test
description: ""
steps:
  - id: step1
    agent: developer
`;
      const config = parseWorkflow(yaml);
      expect(config.description).toBe("");
    });

    it("handles whitespace-only content", () => {
      const yaml = "   \n   \n   ";
      expect(() => parseWorkflow(yaml)).toThrow(WorkflowParseError);
    });

    it("handles special characters in step ids", () => {
      const yaml = `
name: test
steps:
  - id: step-1_test
    agent: developer
`;
      const config = parseWorkflow(yaml);
      expect(config.steps[0].id).toBe("step-1_test");
    });
  });
});
