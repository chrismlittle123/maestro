import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import type { MaestroEvent, AgentExecutor, WorkflowRun } from "@maestro-agents/core";
import {
  WorkflowEngine,
  FileSystemArtifactStore,
  InMemoryEventBus,
  DEFAULT_ARTIFACTS_DIR,
  parseWorkflow,
  parseAgent,
  tryLoadManifest,
  type AgentDefinition,
  type WorkflowConfig,
} from "@maestro-agents/core";
import { MockClaudeCodeExecutor } from "./executors/mock-executor.js";

/**
 * Configuration for Maestro SDK
 */
export interface MaestroConfig {
  /**
   * Directory containing workflow YAML files
   */
  workflowsDir: string;

  /**
   * Directory containing agent markdown files
   */
  agentsDir: string;

  /**
   * Directory for storing artifacts
   * @default ~/.maestro/artifacts
   */
  artifactsDir?: string;

  /**
   * Custom executor to use (defaults to MockClaudeCodeExecutor)
   */
  executor?: AgentExecutor;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Handle to a running workflow
 */
export interface WorkflowRunHandle {
  /**
   * Unique identifier for this run
   */
  id: string;

  /**
   * Name of the workflow
   */
  workflowName: string;

  /**
   * Current status
   */
  status: "pending" | "running" | "paused" | "completed" | "failed";

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Artifacts produced
   */
  artifacts: string[];

  /**
   * Wait for the workflow to complete
   */
  wait(): Promise<WorkflowRunHandle>;

  /**
   * Cancel the workflow
   */
  cancel(): Promise<void>;
}

/**
 * Event handler type
 */
type EventHandler<T extends MaestroEvent = MaestroEvent> = (event: T) => void | Promise<void>;

/**
 * Main SDK class for interacting with Maestro
 *
 * @example
 * ```typescript
 * import { Maestro } from 'maestro-agents-sdk'
 *
 * const maestro = new Maestro({
 *   workflowsDir: './workflows',
 *   agentsDir: './agents',
 * })
 *
 * const run = await maestro.runWorkflow('feature-development', {
 *   input: 'Add user authentication'
 * })
 *
 * maestro.on('step.completed', (event) => {
 *   console.log(`Step ${event.stepId} completed`)
 * })
 * ```
 */
export class Maestro {
  private config: MaestroConfig;
  private eventBus: InMemoryEventBus;
  private artifactStore: FileSystemArtifactStore;
  private executor: AgentExecutor;
  private engine: WorkflowEngine;
  private runs: Map<string, WorkflowRun> = new Map();

  constructor(config: MaestroConfig) {
    this.config = config;

    // Initialize infrastructure
    const artifactsDir = config.artifactsDir || DEFAULT_ARTIFACTS_DIR;
    this.eventBus = new InMemoryEventBus();
    this.artifactStore = new FileSystemArtifactStore(artifactsDir);
    this.executor = config.executor || new MockClaudeCodeExecutor();

    // Create workflow engine
    this.engine = new WorkflowEngine(this.executor, this.artifactStore, this.eventBus, {
      workflowsDir: config.workflowsDir,
      agentsDir: config.agentsDir,
      artifactsDir,
    });
  }

  /**
   * Run a workflow
   */
  async runWorkflow(workflowName: string, options: { input: string }): Promise<WorkflowRunHandle> {
    // Load workflow
    const workflow = await this.loadWorkflowFile(workflowName);

    // Load agents referenced in workflow
    const agents = new Map<string, AgentDefinition>();
    for (const step of workflow.steps) {
      if (!agents.has(step.agent)) {
        const agent = await this.loadAgentFile(step.agent);
        agents.set(step.agent, agent);
      }
    }

    // Run workflow
    const run = await this.engine.run(workflow, agents, options.input);
    this.runs.set(run.id, run);

    // Create handle
    const handle: WorkflowRunHandle = {
      id: run.id,
      workflowName: run.workflowName,
      status: run.status,
      error: run.error,
      artifacts: run.artifacts.map((a) => a.path),
      wait: async () => {
        // For now, workflows run synchronously, so just return current state
        const currentRun = this.runs.get(run.id);
        if (currentRun) {
          handle.status = currentRun.status;
          handle.error = currentRun.error;
          handle.artifacts = currentRun.artifacts.map((a) => a.path);
        }
        return handle;
      },
      cancel: async () => {
        if (run.currentStepId) {
          await this.executor.cancel(run.id, run.currentStepId);
        }
      },
    };

    return handle;
  }

  /**
   * Approve a step in a workflow
   */
  async approve(runId: string, stepId: string): Promise<void> {
    // TODO: Implement approval logic for v0.3.0
    if (this.config.debug) {
      console.log(`Approving step ${stepId} in run ${runId}`);
    }
  }

  /**
   * Reject a step in a workflow
   */
  async reject(runId: string, stepId: string, reason: string): Promise<void> {
    // TODO: Implement rejection logic for v0.3.0
    if (this.config.debug) {
      console.log(`Rejecting step ${stepId} in run ${runId}: ${reason}`);
    }
  }

  /**
   * Get the status of a workflow run
   */
  async getStatus(runId: string): Promise<WorkflowRunHandle | null> {
    // Check in-memory runs first
    const run = this.runs.get(runId);
    if (run) {
      return {
        id: run.id,
        workflowName: run.workflowName,
        status: run.status,
        error: run.error,
        artifacts: run.artifacts.map((a) => a.path),
        wait: async () => this.getStatus(runId) as Promise<WorkflowRunHandle>,
        cancel: async () => {
          if (run.currentStepId) {
            await this.executor.cancel(run.id, run.currentStepId);
          }
        },
      };
    }

    // Try to load from manifest
    const artifactsDir = this.config.artifactsDir || DEFAULT_ARTIFACTS_DIR;
    const runDir = join(artifactsDir, runId);
    const manifest = await tryLoadManifest(runDir);

    if (!manifest) {
      return null;
    }

    return {
      id: manifest.id,
      workflowName: manifest.workflowName,
      status: manifest.status,
      error: manifest.error,
      artifacts: manifest.steps.flatMap((s) => s.artifacts),
      wait: async () => this.getStatus(runId) as Promise<WorkflowRunHandle>,
      cancel: async () => {
        // Can't cancel completed runs
      },
    };
  }

  /**
   * List all available workflows
   */
  async listWorkflows(): Promise<string[]> {
    try {
      const entries = await readdir(this.config.workflowsDir, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile() && (e.name.endsWith(".yaml") || e.name.endsWith(".yml")))
        .map((e) => e.name.replace(/\.ya?ml$/, ""));
    } catch {
      return [];
    }
  }

  /**
   * List all available agents
   */
  async listAgents(): Promise<string[]> {
    try {
      const entries = await readdir(this.config.agentsDir, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => e.name.replace(/\.md$/, ""));
    } catch {
      return [];
    }
  }

  /**
   * List recent workflow runs
   */
  async listRuns(limit: number = 10): Promise<WorkflowRunHandle[]> {
    const artifactsDir = this.config.artifactsDir || DEFAULT_ARTIFACTS_DIR;

    try {
      const entries = await readdir(artifactsDir, { withFileTypes: true });
      const runDirs = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
        .reverse()
        .slice(0, limit);

      const handles: WorkflowRunHandle[] = [];

      for (const dir of runDirs) {
        const status = await this.getStatus(dir);
        if (status) {
          handles.push(status);
        }
      }

      return handles;
    } catch {
      return [];
    }
  }

  /**
   * Subscribe to events
   */
  on<T extends MaestroEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<MaestroEvent, { type: T }>>
  ): void {
    this.eventBus.on(eventType, handler);
  }

  /**
   * Subscribe to all events
   */
  onAny(handler: EventHandler): void {
    this.eventBus.onAny(handler);
  }

  /**
   * Unsubscribe from events
   */
  off<T extends MaestroEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<MaestroEvent, { type: T }>>
  ): void {
    this.eventBus.off(eventType, handler);
  }

  /**
   * Get the SDK configuration
   */
  getConfig(): MaestroConfig {
    return { ...this.config };
  }

  /**
   * Get the event bus (for advanced use cases)
   */
  getEventBus(): InMemoryEventBus {
    return this.eventBus;
  }

  /**
   * Get the artifact store (for advanced use cases)
   */
  getArtifactStore(): FileSystemArtifactStore {
    return this.artifactStore;
  }

  /**
   * Load a workflow file
   */
  private async loadWorkflowFile(name: string): Promise<WorkflowConfig> {
    const filePath = join(this.config.workflowsDir, `${name}.yaml`);
    const content = await readFile(filePath, "utf-8");
    return parseWorkflow(content);
  }

  /**
   * Load an agent file
   */
  private async loadAgentFile(name: string): Promise<AgentDefinition> {
    const filePath = join(this.config.agentsDir, `${name}.md`);
    const content = await readFile(filePath, "utf-8");
    return parseAgent(content);
  }
}
