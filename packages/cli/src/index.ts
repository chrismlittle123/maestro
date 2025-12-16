/**
 * maestro-cli - Reference CLI for Maestro
 *
 * Commands:
 * - maestro init - scaffold a project
 * - maestro run <workflow> - run a workflow
 * - maestro status - show current workflow state
 * - maestro approve <step-id> - approve a step
 * - maestro reject <step-id> - reject a step
 * - maestro logs <workflow-id> - view logs
 * - maestro artifacts <workflow-id> - list/view artifacts
 * - maestro workflows - list available workflows
 * - maestro agents - list available agents
 */

export { createCli } from "./cli.js";
