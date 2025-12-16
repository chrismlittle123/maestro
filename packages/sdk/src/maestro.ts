import type { MaestroEvent } from "@maestro/core";

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
   * Wait for the workflow to complete
   */
  wait(): Promise<void>;

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
 * import { Maestro } from '@maestro/sdk'
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
  private handlers: Map<string, Set<EventHandler>> = new Map();

  constructor(config: MaestroConfig) {
    this.config = config;
  }

  /**
   * Run a workflow
   */
  async runWorkflow(workflowName: string, _options: { input: string }): Promise<WorkflowRunHandle> {
    // TODO: Implement workflow execution
    const runId = this.generateRunId();

    return {
      id: runId,
      workflowName,
      status: "pending",
      wait: async () => {
        // TODO: Implement wait logic
      },
      cancel: async () => {
        // TODO: Implement cancel logic
      },
    };
  }

  /**
   * Approve a step in a workflow
   */
  async approve(runId: string, stepId: string): Promise<void> {
    // TODO: Implement approval logic
    console.log(`Approving step ${stepId} in run ${runId}`);
  }

  /**
   * Reject a step in a workflow
   */
  async reject(runId: string, stepId: string, reason: string): Promise<void> {
    // TODO: Implement rejection logic
    console.log(`Rejecting step ${stepId} in run ${runId}: ${reason}`);
  }

  /**
   * Get the status of a workflow run
   */
  async getStatus(_runId: string): Promise<WorkflowRunHandle | null> {
    // TODO: Implement status retrieval
    return null;
  }

  /**
   * List all available workflows
   */
  async listWorkflows(): Promise<string[]> {
    // TODO: Implement workflow listing
    return [];
  }

  /**
   * List all available agents
   */
  async listAgents(): Promise<string[]> {
    // TODO: Implement agent listing
    return [];
  }

  /**
   * Subscribe to events
   */
  on<T extends MaestroEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<MaestroEvent, { type: T }>>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);
  }

  /**
   * Unsubscribe from events
   */
  off<T extends MaestroEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<MaestroEvent, { type: T }>>
  ): void {
    this.handlers.get(eventType)?.delete(handler as EventHandler);
  }

  /**
   * Get the SDK configuration
   */
  getConfig(): MaestroConfig {
    return { ...this.config };
  }

  private generateRunId(): string {
    const timestamp = new Date().toISOString().split("T")[0];
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }
}
