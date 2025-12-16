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
  Artifact,
  ArtifactStore,
  MaestroEvent,
  EventBus,
} from "@maestro/core";

// SDK exports
export { Maestro } from "./maestro.js";
export type { MaestroConfig, WorkflowRunHandle } from "./maestro.js";
