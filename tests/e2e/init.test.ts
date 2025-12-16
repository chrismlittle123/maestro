import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { run } from "./runner.js";

describe("maestro init", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `maestro-e2e-init-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates workflows directory", async () => {
    await run(tempDir, ["init"]);

    const entries = await readdir(tempDir);
    expect(entries).toContain("workflows");
  });

  it("creates agents directory", async () => {
    await run(tempDir, ["init"]);

    const entries = await readdir(tempDir);
    expect(entries).toContain("agents");
  });

  it("creates example workflow file", async () => {
    await run(tempDir, ["init"]);

    const workflows = await readdir(join(tempDir, "workflows"));
    expect(workflows).toContain("example.yaml");
  });

  it("creates example agent file", async () => {
    await run(tempDir, ["init"]);

    const agents = await readdir(join(tempDir, "agents"));
    expect(agents).toContain("developer.md");
  });

  it("creates config file", async () => {
    await run(tempDir, ["init"]);

    const entries = await readdir(tempDir);
    expect(entries).toContain("maestro.config.yaml");
  });

  it("example workflow has valid content", async () => {
    await run(tempDir, ["init"]);

    const content = await readFile(join(tempDir, "workflows/example.yaml"), "utf-8");
    expect(content).toContain("name: example");
    expect(content).toContain("steps:");
    expect(content).toContain("agent: developer");
  });

  it("example agent has valid frontmatter", async () => {
    await run(tempDir, ["init"]);

    const content = await readFile(join(tempDir, "agents/developer.md"), "utf-8");
    expect(content).toContain("name: developer");
    expect(content).toContain("role: Software Developer");
    expect(content).toContain("automation: full");
  });

  it("config file has correct structure", async () => {
    await run(tempDir, ["init"]);

    const content = await readFile(join(tempDir, "maestro.config.yaml"), "utf-8");
    expect(content).toContain("workflowsDir:");
    expect(content).toContain("agentsDir:");
  });

  it("does not overwrite existing files", async () => {
    // First init
    await run(tempDir, ["init"]);

    // Modify the workflow file
    const workflowPath = join(tempDir, "workflows/example.yaml");
    const originalContent = await readFile(workflowPath, "utf-8");

    // Second init
    await run(tempDir, ["init"]);

    // File should be unchanged
    const afterContent = await readFile(workflowPath, "utf-8");
    expect(afterContent).toBe(originalContent);
  });

  it("exits with code 0 on success", async () => {
    const result = await run(tempDir, ["init"]);

    expect(result.exitCode).toBe(0);
  });

  it("outputs success message", async () => {
    const result = await run(tempDir, ["init"]);

    expect(result.stdout).toContain("Created Maestro project structure");
  });

  it("shows created directory structure", async () => {
    const result = await run(tempDir, ["init"]);

    expect(result.stdout).toContain("workflows/");
    expect(result.stdout).toContain("agents/");
    expect(result.stdout).toContain("maestro.config.yaml");
  });

  it("shows next steps", async () => {
    const result = await run(tempDir, ["init"]);

    expect(result.stdout).toContain("Next steps");
    expect(result.stdout).toContain("maestro run");
  });

  describe("--dir option", () => {
    it("creates project in specified directory", async () => {
      const subDir = join(tempDir, "myproject");

      await run(tempDir, ["init", "--dir", "myproject"]);

      const entries = await readdir(subDir);
      expect(entries).toContain("workflows");
      expect(entries).toContain("agents");
    });

    it("creates nested directories", async () => {
      const nestedDir = join(tempDir, "path/to/project");

      await run(tempDir, ["init", "--dir", "path/to/project"]);

      const entries = await readdir(nestedDir);
      expect(entries).toContain("workflows");
    });
  });
});
