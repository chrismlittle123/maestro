/**
 * @maestro/sdk - Public SDK for Maestro
 *
 * Programmatic interface for building integrations:
 * - Custom CLI tools
 * - REST API servers
 * - Slack bots
 * - VS Code extensions
 * - Custom dashboards
 */

// Re-export types from core
export type {
  WorkflowConfig,
  WorkflowStep,
  AgentConfig,
  AgentExecutor,
  AgentExecutionInput,
  AgentExecutionOutput,
  Artifact,
  ArtifactStore,
  MaestroEvent,
  EventBus,
  WorkflowManifest,
  ManifestStep,
  StepStatus,
  AgentDefinition,
  WorkflowRun,
  WorkflowEngineConfig,
} from "@maestro/core";

// Re-export core utilities needed by consumers
export {
  WorkflowEngine,
  FileSystemArtifactStore,
  InMemoryEventBus,
  DEFAULT_ARTIFACTS_DIR,
  parseWorkflow,
  parseAgent,
  loadWorkflow,
  loadAgent,
  findWorkflow,
  findAgent,
  WorkflowParseError,
  AgentParseError,
  createManifest,
  addManifestStep,
  updateManifestStep,
  startManifest,
  completeManifest,
  failManifest,
  saveManifest,
  loadManifest,
  tryLoadManifest,
} from "@maestro/core";

// Executors (implementations live in SDK, not core)
export { ClaudeCodeExecutor, MockClaudeCodeExecutor } from "./executors/index.js";
export type { ClaudeCodeExecutorOptions } from "./executors/index.js";

// SDK exports
export { Maestro } from "./maestro.js";
export type { MaestroConfig, WorkflowRunHandle } from "./maestro.js";
