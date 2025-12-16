import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileSystemArtifactStore } from "maestro-agents-core";
import type { Artifact } from "maestro-agents-core";

describe("FileSystemArtifactStore", () => {
  let store: FileSystemArtifactStore;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `maestro-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    store = new FileSystemArtifactStore(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("getRunDir()", () => {
    it("returns correct path for workflow run", () => {
      const runDir = store.getRunDir("run-123");

      expect(runDir).toBe(join(tempDir, "run-123"));
    });

    it("handles special characters in run ID", () => {
      const runDir = store.getRunDir("2024-01-15-abc123");

      expect(runDir).toBe(join(tempDir, "2024-01-15-abc123"));
    });
  });

  describe("save()", () => {
    it("saves artifact content to file system", async () => {
      const artifact: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact, "# Hello World");

      const content = await readFile(join(tempDir, "run-123", "step1", "result.md"), "utf-8");
      expect(content).toBe("# Hello World");
    });

    it("saves buffer content", async () => {
      const artifact: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "data.bin",
        type: "binary",
        path: "",
        createdAt: new Date(),
      };

      const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      await store.save(artifact, buffer);

      const content = await readFile(join(tempDir, "run-123", "step1", "data.bin"));
      expect(content.toString()).toBe("Hello");
    });

    it("creates nested directories", async () => {
      const artifact: Artifact = {
        id: "artifact-1",
        workflowId: "run-456",
        stepId: "step-deep",
        name: "output.txt",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact, "content");

      const entries = await readdir(join(tempDir, "run-456", "step-deep"));
      expect(entries).toContain("output.txt");
    });

    it("overwrites existing artifact", async () => {
      const artifact: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact, "First content");
      await store.save(artifact, "Second content");

      const content = await readFile(join(tempDir, "run-123", "step1", "result.md"), "utf-8");
      expect(content).toBe("Second content");
    });

    it("handles special characters in artifact name", async () => {
      const artifact: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "my-file_v2.test.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact, "content");

      const entries = await readdir(join(tempDir, "run-123", "step1"));
      expect(entries).toContain("my-file_v2.test.md");
    });
  });

  describe("load()", () => {
    it("loads artifact content", async () => {
      const artifact: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact, "# Hello World");

      const content = await store.load("artifact-1");
      expect(content.toString()).toBe("# Hello World");
    });

    it("throws for non-existent artifact", async () => {
      await expect(store.load("nonexistent")).rejects.toThrow("Artifact not found");
    });
  });

  describe("list()", () => {
    it("lists all artifacts for workflow", async () => {
      const artifact1: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result1.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      const artifact2: Artifact = {
        id: "artifact-2",
        workflowId: "run-123",
        stepId: "step2",
        name: "result2.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact1, "content1");
      await store.save(artifact2, "content2");

      const artifacts = await store.list("run-123");

      expect(artifacts).toHaveLength(2);
      expect(artifacts.map((a) => a.id)).toContain("artifact-1");
      expect(artifacts.map((a) => a.id)).toContain("artifact-2");
    });

    it("returns empty array for non-existent workflow", async () => {
      const artifacts = await store.list("nonexistent");

      expect(artifacts).toEqual([]);
    });

    it("only returns artifacts for specified workflow", async () => {
      const artifact1: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      const artifact2: Artifact = {
        id: "artifact-2",
        workflowId: "run-456",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact1, "content1");
      await store.save(artifact2, "content2");

      const artifacts = await store.list("run-123");

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].id).toBe("artifact-1");
    });
  });

  describe("get()", () => {
    it("returns artifact metadata", async () => {
      const artifact: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
        metadata: { custom: "value" },
      };

      await store.save(artifact, "content");

      const retrieved = await store.get("artifact-1");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe("artifact-1");
      expect(retrieved?.workflowId).toBe("run-123");
      expect(retrieved?.stepId).toBe("step1");
      expect(retrieved?.name).toBe("result.md");
      expect(retrieved?.metadata).toEqual({ custom: "value" });
    });

    it("returns null for non-existent artifact", async () => {
      const artifact = await store.get("nonexistent");

      expect(artifact).toBeNull();
    });

    it("includes updated path after save", async () => {
      const artifact: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact, "content");

      const retrieved = await store.get("artifact-1");

      expect(retrieved?.path).toBe(join(tempDir, "run-123", "step1", "result.md"));
    });
  });

  describe("delete()", () => {
    it("deletes artifact from file system", async () => {
      const artifact: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact, "content");
      await store.delete("artifact-1");

      const retrieved = await store.get("artifact-1");
      expect(retrieved).toBeNull();
    });

    it("handles deleting non-existent artifact gracefully", async () => {
      // Should not throw
      await store.delete("nonexistent");
    });
  });

  describe("deleteWorkflow()", () => {
    it("deletes all artifacts for workflow", async () => {
      const artifact1: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result1.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      const artifact2: Artifact = {
        id: "artifact-2",
        workflowId: "run-123",
        stepId: "step2",
        name: "result2.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact1, "content1");
      await store.save(artifact2, "content2");

      await store.deleteWorkflow("run-123");

      const artifacts = await store.list("run-123");
      expect(artifacts).toEqual([]);

      // Directory should be deleted
      const exists = await store.runExists("run-123");
      expect(exists).toBe(false);
    });

    it("handles deleting non-existent workflow gracefully", async () => {
      // Should not throw
      await store.deleteWorkflow("nonexistent");
    });

    it("does not affect other workflows", async () => {
      const artifact1: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      const artifact2: Artifact = {
        id: "artifact-2",
        workflowId: "run-456",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact1, "content1");
      await store.save(artifact2, "content2");

      await store.deleteWorkflow("run-123");

      const artifact = await store.get("artifact-2");
      expect(artifact).not.toBeNull();
    });
  });

  describe("listRuns()", () => {
    it("lists all workflow run IDs", async () => {
      const artifact1: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      const artifact2: Artifact = {
        id: "artifact-2",
        workflowId: "run-456",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact1, "content1");
      await store.save(artifact2, "content2");

      const runs = await store.listRuns();

      expect(runs).toContain("run-123");
      expect(runs).toContain("run-456");
    });

    it("returns empty array when no runs exist", async () => {
      const runs = await store.listRuns();

      expect(runs).toEqual([]);
    });
  });

  describe("runExists()", () => {
    it("returns true for existing run", async () => {
      const artifact: Artifact = {
        id: "artifact-1",
        workflowId: "run-123",
        stepId: "step1",
        name: "result.md",
        type: "text",
        path: "",
        createdAt: new Date(),
      };

      await store.save(artifact, "content");

      const exists = await store.runExists("run-123");
      expect(exists).toBe(true);
    });

    it("returns false for non-existent run", async () => {
      const exists = await store.runExists("nonexistent");
      expect(exists).toBe(false);
    });
  });
});
