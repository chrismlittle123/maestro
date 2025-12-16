import { mkdir, readFile, writeFile, readdir, rm, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { Artifact, ArtifactStore } from "../types/artifact.js";

/**
 * Default base directory for artifacts
 */
export const DEFAULT_ARTIFACTS_DIR = join(homedir(), ".maestro", "artifacts");

/**
 * File system implementation of artifact storage
 *
 * Directory structure:
 * ~/.maestro/artifacts/
 *   └── <workflow-run-id>/
 *       ├── manifest.json
 *       └── <step-id>/
 *           └── <artifact-name>
 */
export class FileSystemArtifactStore implements ArtifactStore {
  private baseDir: string;
  private artifacts: Map<string, Artifact> = new Map();

  constructor(baseDir: string = DEFAULT_ARTIFACTS_DIR) {
    this.baseDir = baseDir;
  }

  /**
   * Get the directory path for a workflow run
   */
  getRunDir(workflowId: string): string {
    return join(this.baseDir, workflowId);
  }

  /**
   * Get the file path for an artifact
   */
  private getArtifactPath(artifact: Artifact): string {
    return join(this.baseDir, artifact.workflowId, artifact.stepId, artifact.name);
  }

  /**
   * Save an artifact to the file system
   */
  async save(artifact: Artifact, content: Buffer | string): Promise<void> {
    const filePath = this.getArtifactPath(artifact);
    const dir = dirname(filePath);

    // Ensure directory exists
    await mkdir(dir, { recursive: true });

    // Write content
    await writeFile(filePath, content);

    // Store artifact metadata
    this.artifacts.set(artifact.id, {
      ...artifact,
      path: filePath,
    });
  }

  /**
   * Load an artifact's content
   */
  async load(artifactId: string): Promise<Buffer> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    return readFile(artifact.path);
  }

  /**
   * List all artifacts for a workflow run
   */
  async list(workflowId: string): Promise<Artifact[]> {
    return Array.from(this.artifacts.values()).filter((a) => a.workflowId === workflowId);
  }

  /**
   * Get artifact metadata by ID
   */
  async get(artifactId: string): Promise<Artifact | null> {
    return this.artifacts.get(artifactId) || null;
  }

  /**
   * Delete an artifact
   */
  async delete(artifactId: string): Promise<void> {
    const artifact = this.artifacts.get(artifactId);
    if (artifact) {
      try {
        await rm(artifact.path);
      } catch {
        // Ignore if file doesn't exist
      }
      this.artifacts.delete(artifactId);
    }
  }

  /**
   * Delete all artifacts for a workflow run
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    const runDir = this.getRunDir(workflowId);

    try {
      await rm(runDir, { recursive: true });
    } catch {
      // Ignore if directory doesn't exist
    }

    // Remove from in-memory cache
    for (const [id, artifact] of this.artifacts) {
      if (artifact.workflowId === workflowId) {
        this.artifacts.delete(id);
      }
    }
  }

  /**
   * List all workflow run IDs
   */
  async listRuns(): Promise<string[]> {
    try {
      const entries = await readdir(this.baseDir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }

  /**
   * Check if a workflow run exists
   */
  async runExists(workflowId: string): Promise<boolean> {
    try {
      const runDir = this.getRunDir(workflowId);
      const stats = await stat(runDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}
