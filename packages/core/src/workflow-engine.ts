import type { WorkflowConfig, WorkflowStep } from "./types/workflow.js";
import type { AgentExecutor, AgentExecutionInput } from "./types/agent.js";
import type { Artifact, ArtifactStore } from "./types/artifact.js";
import type { EventBus } from "./types/events.js";
import type { AgentDefinition } from "./agent/parser.js";
import {
  createManifest,
  addManifestStep,
  updateManifestStep,
  startManifest,
  completeManifest,
  failManifest,
  saveManifest,
  type WorkflowManifest,
} from "./artifacts/manifest.js";

/**
 * Workflow run state
 */
export interface WorkflowRun {
  id: string;
  workflowName: string;
  status: "pending" | "running" | "paused" | "completed" | "failed";
  currentStepId: string | null;
  completedSteps: string[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  artifacts: Artifact[];
}

/**
 * Configuration for the workflow engine
 */
export interface WorkflowEngineConfig {
  workflowsDir: string;
  agentsDir: string;
  artifactsDir: string;
}

/**
 * The WorkflowEngine is responsible for executing workflows
 */
export class WorkflowEngine {
  private executor: AgentExecutor;
  private artifactStore: ArtifactStore;
  private eventBus: EventBus;
  private config: WorkflowEngineConfig;
  private runs: Map<string, WorkflowRun> = new Map();
  private manifests: Map<string, WorkflowManifest> = new Map();

  constructor(
    executor: AgentExecutor,
    artifactStore: ArtifactStore,
    eventBus: EventBus,
    config: WorkflowEngineConfig
  ) {
    this.executor = executor;
    this.artifactStore = artifactStore;
    this.eventBus = eventBus;
    this.config = config;
  }

  /**
   * Run a workflow end-to-end
   */
  async run(
    workflow: WorkflowConfig,
    agentDefinitions: Map<string, AgentDefinition>,
    input: string
  ): Promise<WorkflowRun> {
    // Create run
    const runId = this.generateRunId();
    const run: WorkflowRun = {
      id: runId,
      workflowName: workflow.name,
      status: "pending",
      currentStepId: null,
      completedSteps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      artifacts: [],
    };
    this.runs.set(runId, run);

    // Create manifest
    let manifest = createManifest(runId, workflow.name, input, workflow.description);

    // Add steps to manifest
    for (const step of workflow.steps) {
      manifest = addManifestStep(manifest, step.id, step.agent);
    }

    // Start workflow
    manifest = startManifest(manifest);
    run.status = "running";
    this.manifests.set(runId, manifest);

    // Save initial manifest
    const runDir = this.artifactStore.getRunDir(runId);
    await saveManifest(runDir, manifest);

    // Emit workflow started
    await this.eventBus.emit({
      type: "workflow.started",
      timestamp: new Date(),
      workflowId: runId,
      workflowName: workflow.name,
    });

    try {
      // For v0.1.0, we only support single-step workflows
      const step = workflow.steps[0];
      if (!step) {
        throw new Error("Workflow has no steps");
      }

      // Get agent definition
      const agentDef = agentDefinitions.get(step.agent);
      if (!agentDef) {
        throw new Error(`Agent '${step.agent}' not found`);
      }

      // Update run state
      run.currentStepId = step.id;
      run.updatedAt = new Date();

      // Update manifest
      manifest = updateManifestStep(manifest, step.id, {
        status: "running",
        startedAt: new Date().toISOString(),
      });
      await saveManifest(runDir, manifest);

      // Emit step started
      await this.eventBus.emit({
        type: "step.started",
        timestamp: new Date(),
        workflowId: runId,
        stepId: step.id,
        agentName: step.agent,
      });

      // Execute agent
      const executionInput: AgentExecutionInput = {
        workflowId: runId,
        stepId: step.id,
        agent: agentDef.config,
        prompt: this.buildAgentPrompt(agentDef, input),
        inputs: [], // No input artifacts for first step
      };

      const result = await this.executor.execute(executionInput);

      if (result.success) {
        // Save artifacts
        for (const artifact of result.artifacts) {
          // For now, save a placeholder result
          await this.artifactStore.save(artifact, `# Result\n\nAgent completed successfully.`);
          run.artifacts.push(artifact);
        }

        // Update manifest
        manifest = updateManifestStep(manifest, step.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
          artifacts: result.artifacts.map((a) => `${step.id}/${a.name}`),
        });

        // Emit step completed
        await this.eventBus.emit({
          type: "step.completed",
          timestamp: new Date(),
          workflowId: runId,
          stepId: step.id,
          agentName: step.agent,
          artifacts: result.artifacts.map((a) => a.name),
        });

        run.completedSteps.push(step.id);
        run.currentStepId = null;
        run.status = "completed";
        manifest = completeManifest(manifest);
      } else {
        // Handle failure
        manifest = updateManifestStep(manifest, step.id, {
          status: "failed",
          completedAt: new Date().toISOString(),
          error: result.error,
        });

        await this.eventBus.emit({
          type: "step.failed",
          timestamp: new Date(),
          workflowId: runId,
          stepId: step.id,
          agentName: step.agent,
          error: result.error || "Unknown error",
        });

        run.status = "failed";
        run.error = result.error;
        manifest = failManifest(manifest, result.error || "Unknown error");
      }

      // Save final manifest
      await saveManifest(runDir, manifest);
      this.manifests.set(runId, manifest);

      // Emit workflow completed/failed
      if (run.status === "completed") {
        await this.eventBus.emit({
          type: "workflow.completed",
          timestamp: new Date(),
          workflowId: runId,
        });
      } else {
        await this.eventBus.emit({
          type: "workflow.failed",
          timestamp: new Date(),
          workflowId: runId,
          error: run.error || "Unknown error",
        });
      }

      run.updatedAt = new Date();
      return run;
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      run.status = "failed";
      run.error = errorMessage;
      run.updatedAt = new Date();

      manifest = failManifest(manifest, errorMessage);
      await saveManifest(runDir, manifest);
      this.manifests.set(runId, manifest);

      await this.eventBus.emit({
        type: "workflow.failed",
        timestamp: new Date(),
        workflowId: runId,
        error: errorMessage,
      });

      return run;
    }
  }

  /**
   * Get a workflow run by ID
   */
  getRun(runId: string): WorkflowRun | undefined {
    return this.runs.get(runId);
  }

  /**
   * Get manifest for a run
   */
  getManifest(runId: string): WorkflowManifest | undefined {
    return this.manifests.get(runId);
  }

  /**
   * Get the next step in the workflow (for future multi-step support)
   */
  getNextStep(workflow: WorkflowConfig, run: WorkflowRun): WorkflowStep | null {
    if (run.completedSteps.length === 0) {
      return workflow.steps[0] || null;
    }

    const lastCompletedId = run.completedSteps[run.completedSteps.length - 1];
    const lastStep = workflow.steps.find((s) => s.id === lastCompletedId);

    if (!lastStep?.next) {
      return null;
    }

    return workflow.steps.find((s) => s.id === lastStep.next) || null;
  }

  /**
   * Build the prompt for the agent
   */
  private buildAgentPrompt(agentDef: AgentDefinition, userInput: string): string {
    const parts: string[] = [];

    // Add agent persona
    parts.push(agentDef.prompt);
    parts.push("");

    // Add user input
    parts.push("# Task");
    parts.push(userInput);

    return parts.join("\n");
  }

  private generateRunId(): string {
    const timestamp = new Date().toISOString().split("T")[0];
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }
}
