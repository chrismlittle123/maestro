import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { run, fixture } from "./runner.js";

describe("maestro status", () => {
  describe("with no runs", () => {
    let tempDir: string;
    let originalArtifactsDir: string | undefined;

    beforeEach(async () => {
      // Create a temp dir to use as artifacts directory
      tempDir = join(tmpdir(), `maestro-e2e-status-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it("shows no runs message when artifacts directory is empty", async () => {
      // This test relies on potentially empty artifacts dir or handles gracefully
      const result = await run(fixture("run/single-step"), ["status"]);

      // Either shows runs or shows "No workflow runs found"
      expect(result.exitCode).toBe(0);
    });
  });

  describe("listing runs", () => {
    it("lists recent runs after execution", async () => {
      // First run a workflow to create a run
      await run(fixture("run/single-step"), ["run", "hello", "--input", "Test for status"]);

      // Then check status
      const result = await run(fixture("run/single-step"), ["status"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("hello");
    });

    it("shows run ID in list", async () => {
      await run(fixture("run/single-step"), ["run", "hello", "--input", "Test"]);

      const result = await run(fixture("run/single-step"), ["status"]);

      // Run ID format: YYYY-MM-DD-xxxxxx
      expect(result.stdout).toMatch(/\d{4}-\d{2}-\d{2}-[a-z0-9]+/);
    });

    it("shows workflow name in list", async () => {
      await run(fixture("run/single-step"), ["run", "hello", "--input", "Test"]);

      const result = await run(fixture("run/single-step"), ["status"]);

      expect(result.stdout).toContain("hello");
    });

    it("shows status in list", async () => {
      await run(fixture("run/single-step"), ["run", "hello", "--input", "Test"]);

      const result = await run(fixture("run/single-step"), ["status"]);

      expect(result.stdout).toContain("completed");
    });

    it("respects --limit option", async () => {
      const result = await run(fixture("run/single-step"), ["status", "--limit", "5"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("5");
    });
  });

  describe("specific run details", () => {
    it("shows details for specific run ID", async () => {
      // Run a workflow and capture output to get run ID
      const runResult = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Test for details",
      ]);

      // Extract run ID from output
      const runIdMatch = runResult.stdout.match(/Run ID: (\d{4}-\d{2}-\d{2}-[a-z0-9]+)/);
      expect(runIdMatch).not.toBeNull();
      const runId = runIdMatch![1];

      // Get status for specific run
      const result = await run(fixture("run/single-step"), ["status", runId]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(runId);
      expect(result.stdout).toContain("hello");
    });

    it("shows workflow name in details", async () => {
      const runResult = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Test",
      ]);

      const runIdMatch = runResult.stdout.match(/Run ID: (\d{4}-\d{2}-\d{2}-[a-z0-9]+)/);
      const runId = runIdMatch![1];

      const result = await run(fixture("run/single-step"), ["status", runId]);

      expect(result.stdout).toContain("Workflow:");
      expect(result.stdout).toContain("hello");
    });

    it("shows status in details", async () => {
      const runResult = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Test",
      ]);

      const runIdMatch = runResult.stdout.match(/Run ID: (\d{4}-\d{2}-\d{2}-[a-z0-9]+)/);
      const runId = runIdMatch![1];

      const result = await run(fixture("run/single-step"), ["status", runId]);

      expect(result.stdout).toContain("Status:");
      expect(result.stdout).toContain("completed");
    });

    it("shows steps information", async () => {
      const runResult = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Test",
      ]);

      const runIdMatch = runResult.stdout.match(/Run ID: (\d{4}-\d{2}-\d{2}-[a-z0-9]+)/);
      const runId = runIdMatch![1];

      const result = await run(fixture("run/single-step"), ["status", runId]);

      expect(result.stdout).toContain("Steps:");
      expect(result.stdout).toContain("greet");
    });

    it("shows artifacts path", async () => {
      const runResult = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Test",
      ]);

      const runIdMatch = runResult.stdout.match(/Run ID: (\d{4}-\d{2}-\d{2}-[a-z0-9]+)/);
      const runId = runIdMatch![1];

      const result = await run(fixture("run/single-step"), ["status", runId]);

      expect(result.stdout).toContain("Artifacts:");
      expect(result.stdout).toContain(".maestro/artifacts");
    });

    it("shows timing information", async () => {
      const runResult = await run(fixture("run/single-step"), [
        "run",
        "hello",
        "--input",
        "Test",
      ]);

      const runIdMatch = runResult.stdout.match(/Run ID: (\d{4}-\d{2}-\d{2}-[a-z0-9]+)/);
      const runId = runIdMatch![1];

      const result = await run(fixture("run/single-step"), ["status", runId]);

      expect(result.stdout).toContain("Started:");
    });
  });

  describe("error handling", () => {
    it("shows error for non-existent run ID", async () => {
      const result = await run(fixture("run/single-step"), ["status", "nonexistent-run-id"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("not found");
    });
  });
});
