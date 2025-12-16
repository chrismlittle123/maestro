/**
 * @maestro/core - Core orchestration engine
 *
 * This package contains the internal engine for Maestro:
 * - Workflow engine
 * - Agent parsers
 * - Event bus
 * - Artifact storage
 * - Executors
 */

// Types
export type { WorkflowConfig, WorkflowStep } from "./types/workflow.js";
export { WorkflowConfigSchema, WorkflowStepSchema } from "./types/workflow.js";
export type {
  AgentConfig,
  AgentExecutor,
  AgentExecutionInput,
  AgentExecutionOutput,
} from "./types/agent.js";
export { AgentConfigSchema } from "./types/agent.js";
export type { ArtifactStore, Artifact } from "./types/artifact.js";
export type { MaestroEvent, EventBus, EventHandler } from "./types/events.js";

// Workflow
export { parseWorkflow, loadWorkflow, findWorkflow, WorkflowParseError } from "./workflow/index.js";

// Agent
export { parseAgent, loadAgent, findAgent, AgentParseError } from "./agent/index.js";
export type { AgentDefinition } from "./agent/index.js";

// Events
export { InMemoryEventBus } from "./events/index.js";

// Artifacts
export {
  FileSystemArtifactStore,
  DEFAULT_ARTIFACTS_DIR,
  createManifest,
  addManifestStep,
  updateManifestStep,
  startManifest,
  completeManifest,
  failManifest,
  saveManifest,
  loadManifest,
  tryLoadManifest,
} from "./artifacts/index.js";
export type { WorkflowManifest, ManifestStep, StepStatus } from "./artifacts/index.js";

// Note: Executors (ClaudeCodeExecutor, MockClaudeCodeExecutor) have been moved to @maestro/sdk
// to maintain clean architecture. Core only defines the AgentExecutor interface.

// Core classes
export { Conductor } from "./conductor.js";
export { WorkflowEngine } from "./workflow-engine.js";
export type { WorkflowRun, WorkflowEngineConfig } from "./workflow-engine.js";
