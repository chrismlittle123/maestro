import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { run, fixture } from "./runner.js";

describe("maestro run", () => {
  describe("single-step workflow", () => {
    it("completes successfully with exit code 0", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Say hello",
      ]);

      expect(result.exitCode).toBe(0);
    });

    it("outputs workflow started message", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Test task",
      ]);

      expect(result.stdout).toContain("Starting workflow");
      expect(result.stdout).toContain("hello");
    });

    it("outputs completion message", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Test task",
      ]);

      expect(result.stdout).toContain("completed");
    });

    it("shows run ID", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Test task",
      ]);

      // Run ID format: YYYY-MM-DD-xxxxxx
      expect(result.stdout).toMatch(/Run ID: \d{4}-\d{2}-\d{2}-[a-z0-9]+/);
    });

    it("shows step execution progress", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Test task",
      ]);

      // The step outputs artifacts as evidence of execution
      expect(result.stdout).toContain("result.md");
    });

    it("shows artifacts path", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Test task",
      ]);

      expect(result.stdout).toContain("Artifacts:");
    });

    it("creates manifest file in artifacts directory", async () => {
      await run(fixture("run/single-step"), ["run", "hello", "--input", "Test task"]);

      const artifactsDir = join(homedir(), ".maestro/artifacts");
      const runs = await readdir(artifactsDir);
      const latestRun = runs.sort().pop();

      expect(latestRun).toBeDefined();

      const manifestPath = join(artifactsDir, latestRun!, "manifest.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));

      expect(manifest.workflowName).toBe("hello");
      expect(manifest.status).toBe("completed");
    });
  });

  describe("error handling", () => {
    it("exits with code 1 for missing workflow", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "nonexistent",
        "--input",
        "Test",
      ]);

      expect(result.exitCode).toBe(1);
    });

    it("shows error message for missing workflow", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "nonexistent",
        "--input",
        "Test",
      ]);

      expect(result.stderr).toContain("Error");
    });

    it("exits with code 1 for missing agent", async () => {
      const result = await run(fixture("run/missing-agent"), [
        "run",
        "broken",
        "--input",
        "Test",
      ]);

      expect(result.exitCode).toBe(1);
    });

    it("shows error for missing agent", async () => {
      const result = await run(fixture("run/missing-agent"), [
        "run",
        "broken",
        "--input",
        "Test",
      ]);

      expect(result.stderr).toContain("Error");
    });

    it("exits with code 1 for invalid workflow YAML", async () => {
      const result = await run(fixture("run/invalid-workflow"), [
        "run",
        "broken",
        "--input",
        "Test",
      ]);

      expect(result.exitCode).toBe(1);
    });

    it("shows error for invalid workflow", async () => {
      const result = await run(fixture("run/invalid-workflow"), [
        "run",
        "broken",
        "--input",
        "Test",
      ]);

      expect(result.stderr).toContain("Error");
    });
  });

  describe("--input flag", () => {
    it("requires --input flag", async () => {
      const result = await run(fixture("run/single-step"), ["run", "hello"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("--input is required");
    });

    it("accepts input with spaces", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "This is a multi word input",
      ]);

      expect(result.exitCode).toBe(0);
    });

    it("accepts input with special characters", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Hello! How are you?",
      ]);

      expect(result.exitCode).toBe(0);
    });
  });

  describe("--dry-run flag", () => {
    it("does not execute workflow", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--dry-run",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("DRY RUN");
    });

    it("shows workflow information", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--dry-run",
      ]);

      expect(result.stdout).toContain("Workflow:");
      expect(result.stdout).toContain("hello");
    });

    it("shows step details", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--dry-run",
      ]);

      expect(result.stdout).toContain("Step");
      expect(result.stdout).toContain("greet");
      expect(result.stdout).toContain("greeter");
    });

    it("shows agent information", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--dry-run",
      ]);

      expect(result.stdout).toContain("Agent:");
      expect(result.stdout).toContain("greeter");
    });

    it("does not require --input flag", async () => {
      const result = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--dry-run",
      ]);

      // Should not fail for missing input in dry run mode
      expect(result.exitCode).toBe(0);
    });
  });
});

describe("maestro run with custom project", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `maestro-e2e-run-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    await mkdir(join(tempDir, "workflows"), { recursive: true });
    await mkdir(join(tempDir, "agents"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("runs workflow from custom project directory", async () => {
    // Create workflow
    await writeFile(
      join(tempDir, "workflows/test.yaml"),
      `name: test
description: Test workflow
steps:
  - id: step1
    agent: tester
`
    );

    // Create agent
    await writeFile(
      join(tempDir, "agents/tester.md"),
      `---
name: tester
role: Tester
automation: full
---

You are a tester.
`
    );

    const result = await run(tempDir, ["run", "test", "--input", "Run tests"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("completed");
  });

  it("uses config file if present", async () => {
    // Create config with custom paths
    await writeFile(
      join(tempDir, "maestro.config.yaml"),
      `workflowsDir: ./my-workflows
agentsDir: ./my-agents
`
    );

    // Create custom directories
    await mkdir(join(tempDir, "my-workflows"), { recursive: true });
    await mkdir(join(tempDir, "my-agents"), { recursive: true });

    // Create workflow in custom location
    await writeFile(
      join(tempDir, "my-workflows/custom.yaml"),
      `name: custom
steps:
  - id: step1
    agent: custom-agent
`
    );

    // Create agent in custom location
    await writeFile(
      join(tempDir, "my-agents/custom-agent.md"),
      `---
name: custom-agent
role: Custom Agent
---

Custom agent.
`
    );

    const result = await run(tempDir, ["run", "custom", "--input", "Custom task"]);

    expect(result.exitCode).toBe(0);
  });

  it("falls back to defaults without config file", async () => {
    // Create workflow in default location (no config file)
    await writeFile(
      join(tempDir, "workflows/default.yaml"),
      `name: default
steps:
  - id: step1
    agent: default-agent
`
    );

    await writeFile(
      join(tempDir, "agents/default-agent.md"),
      `---
name: default-agent
role: Default Agent
---

Default agent.
`
    );

    const result = await run(tempDir, ["run", "default", "--input", "Default task"]);

    expect(result.exitCode).toBe(0);
  });
});
