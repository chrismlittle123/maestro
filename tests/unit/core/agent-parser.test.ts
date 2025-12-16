import { describe, it, expect } from "vitest";
import { parseAgent, AgentParseError } from "@chrismlittle123/maestro-core";

describe("parseAgent", () => {
  describe("valid agents", () => {
    it("parses minimal agent markdown", () => {
      const markdown = `---
name: developer
role: Developer
---

You are a developer.
`;
      const agent = parseAgent(markdown);

      expect(agent.config.name).toBe("developer");
      expect(agent.config.role).toBe("Developer");
      expect(agent.prompt).toBe("You are a developer.");
    });

    it("parses agent with automation mode", () => {
      const markdown = `---
name: developer
role: Developer
automation: partial
---

You are a developer.
`;
      const agent = parseAgent(markdown);

      expect(agent.config.automation).toBe("partial");
    });

    it("defaults automation to full", () => {
      const markdown = `---
name: developer
role: Developer
---

You are a developer.
`;
      const agent = parseAgent(markdown);

      expect(agent.config.automation).toBe("full");
    });

    it("parses agent with allowed_actions", () => {
      const markdown = `---
name: developer
role: Developer
allowed_actions:
  - read_files
  - write_files
  - run_tests
---

You are a developer.
`;
      const agent = parseAgent(markdown);

      expect(agent.config.allowed_actions).toEqual(["read_files", "write_files", "run_tests"]);
    });

    it("parses agent with forbidden_actions", () => {
      const markdown = `---
name: developer
role: Developer
forbidden_actions:
  - deploy
  - modify_config
---

You are a developer.
`;
      const agent = parseAgent(markdown);

      expect(agent.config.forbidden_actions).toEqual(["deploy", "modify_config"]);
    });

    it("parses agent with both allowed and forbidden actions", () => {
      const markdown = `---
name: developer
role: Developer
allowed_actions:
  - read_files
  - write_files
forbidden_actions:
  - deploy
---

You are a developer.
`;
      const agent = parseAgent(markdown);

      expect(agent.config.allowed_actions).toEqual(["read_files", "write_files"]);
      expect(agent.config.forbidden_actions).toEqual(["deploy"]);
    });

    it("parses complex markdown content", () => {
      const markdown = `---
name: developer
role: Developer
---

## Identity

You are a senior software developer.

## Guidelines

- Write clean code
- Follow best practices
- Add tests

## Output Format

\`\`\`typescript
// Your code here
\`\`\`
`;
      const agent = parseAgent(markdown);

      expect(agent.prompt).toContain("## Identity");
      expect(agent.prompt).toContain("## Guidelines");
      expect(agent.prompt).toContain("```typescript");
    });

    it("preserves whitespace in markdown content", () => {
      const markdown = `---
name: developer
role: Developer
---

Line 1

Line 2

Line 3
`;
      const agent = parseAgent(markdown);

      expect(agent.prompt).toContain("Line 1\n\nLine 2\n\nLine 3");
    });

    it("handles empty allowed_actions array", () => {
      const markdown = `---
name: developer
role: Developer
allowed_actions: []
---

You are a developer.
`;
      const agent = parseAgent(markdown);

      expect(agent.config.allowed_actions).toEqual([]);
    });
  });

  describe("invalid agents", () => {
    it("throws for missing name", () => {
      const markdown = `---
role: Developer
---

You are a developer.
`;
      expect(() => parseAgent(markdown)).toThrow(AgentParseError);
    });

    it("throws for missing role", () => {
      const markdown = `---
name: developer
---

You are a developer.
`;
      expect(() => parseAgent(markdown)).toThrow(AgentParseError);
    });

    it("throws for invalid automation value", () => {
      const markdown = `---
name: developer
role: Developer
automation: invalid
---

You are a developer.
`;
      expect(() => parseAgent(markdown)).toThrow(AgentParseError);
    });

    it("throws for non-array allowed_actions", () => {
      const markdown = `---
name: developer
role: Developer
allowed_actions: read_files
---

You are a developer.
`;
      expect(() => parseAgent(markdown)).toThrow(AgentParseError);
    });

    it("throws for non-array forbidden_actions", () => {
      const markdown = `---
name: developer
role: Developer
forbidden_actions: deploy
---

You are a developer.
`;
      expect(() => parseAgent(markdown)).toThrow(AgentParseError);
    });

    it("provides helpful error messages with field paths", () => {
      const markdown = `---
name: developer
---

You are a developer.
`;
      try {
        parseAgent(markdown);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AgentParseError);
        expect((e as Error).message).toContain("role");
      }
    });
  });

  describe("edge cases", () => {
    it("handles empty markdown body", () => {
      const markdown = `---
name: developer
role: Developer
---
`;
      const agent = parseAgent(markdown);

      expect(agent.prompt).toBe("");
    });

    it("handles markdown without frontmatter delimiters", () => {
      const markdown = `You are a developer.`;

      // gray-matter returns empty data object when no frontmatter
      expect(() => parseAgent(markdown)).toThrow(AgentParseError);
    });

    it("handles special characters in name", () => {
      const markdown = `---
name: developer-v2_test
role: Developer
---

You are a developer.
`;
      const agent = parseAgent(markdown);

      expect(agent.config.name).toBe("developer-v2_test");
    });

    it("handles unicode in content", () => {
      const markdown = `---
name: developer
role: Developer
---

You are a developer. Use proper formatting.
`;
      const agent = parseAgent(markdown);

      expect(agent.prompt).toContain("formatting");
    });

    it("trims whitespace from prompt", () => {
      const markdown = `---
name: developer
role: Developer
---


   You are a developer.

`;
      const agent = parseAgent(markdown);

      expect(agent.prompt).toBe("You are a developer.");
    });
  });
});
