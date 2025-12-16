import type { EventBus, MaestroEvent } from "./types/events.js";
import type { WorkflowConfig } from "./types/workflow.js";

/**
 * The Conductor is the central orchestrator that:
 * - Routes messages to the right agent
 * - Enforces workflow rules
 * - Detects timeouts/failures
 * - Sends notifications for human review
 */
export class Conductor {
  private eventBus: EventBus;
  private workflows: Map<string, WorkflowConfig> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Register a workflow with the conductor
   */
  registerWorkflow(workflow: WorkflowConfig): void {
    this.workflows.set(workflow.name, workflow);
  }

  /**
   * Get a registered workflow
   */
  getWorkflow(name: string): WorkflowConfig | undefined {
    return this.workflows.get(name);
  }

  /**
   * Emit an event through the event bus
   */
  async emit(event: MaestroEvent): Promise<void> {
    await this.eventBus.emit(event);
  }
}
