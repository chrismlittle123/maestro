/**
 * Represents an artifact produced by an agent
 */
export interface Artifact {
  id: string;
  workflowId: string;
  stepId: string;
  name: string;
  type: "file" | "directory" | "text";
  path: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for artifact storage
 * Allows for different storage backends (filesystem, S3, etc.)
 */
export interface ArtifactStore {
  /**
   * Get the directory path for a workflow run
   */
  getRunDir(workflowId: string): string;

  /**
   * Save an artifact
   */
  save(artifact: Artifact, content: Buffer | string): Promise<void>;

  /**
   * Load an artifact's content
   */
  load(artifactId: string): Promise<Buffer>;

  /**
   * List artifacts for a workflow
   */
  list(workflowId: string): Promise<Artifact[]>;

  /**
   * Get artifact metadata
   */
  get(artifactId: string): Promise<Artifact | null>;

  /**
   * Delete an artifact
   */
  delete(artifactId: string): Promise<void>;

  /**
   * Delete all artifacts for a workflow
   */
  deleteWorkflow(workflowId: string): Promise<void>;
}
