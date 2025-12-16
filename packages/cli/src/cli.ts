#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { initCommand } from "./commands/init.js";
import { runCommand } from "./commands/run.js";
import { statusCommand } from "./commands/status.js";

const VERSION = "0.1.0";

/**
 * Create the CLI application
 */
export function createCli(): Command {
  const program = new Command();

  program
    .name("maestro")
    .description("Many agents. One concert. Orchestrate AI coding agents.")
    .version(VERSION);

  // maestro init
  program
    .command("init")
    .description("Initialize a new Maestro project")
    .option("-d, --dir <directory>", "Target directory", ".")
    .action(async (options) => {
      await initCommand(options);
    });

  // maestro run
  program
    .command("run <workflow>")
    .description("Run a workflow")
    .option("-i, --input <input>", "Input for the workflow")
    .option("--dry-run", "Preview without executing")
    .action(async (workflow, options) => {
      await runCommand(workflow, options);
    });

  // maestro status
  program
    .command("status [run-id]")
    .description("Show workflow run status")
    .option("-l, --limit <number>", "Number of runs to show", "10")
    .action(async (runId, options) => {
      await statusCommand(runId, { limit: parseInt(options.limit, 10) });
    });

  // maestro approve (placeholder for v0.3.0)
  program
    .command("approve <step-id>")
    .description("Approve a step waiting for human approval")
    .action(async (stepId) => {
      console.log(chalk.yellow(`Approval feature not yet implemented (v0.3.0)`));
      console.log(chalk.gray(`Step ID: ${stepId}`));
    });

  // maestro reject (placeholder for v0.3.0)
  program
    .command("reject <step-id>")
    .description("Reject a step")
    .option("-r, --reason <reason>", "Reason for rejection")
    .action(async (stepId, options) => {
      console.log(chalk.yellow(`Rejection feature not yet implemented (v0.3.0)`));
      console.log(chalk.gray(`Step ID: ${stepId}`));
      if (options.reason) {
        console.log(chalk.gray(`Reason: ${options.reason}`));
      }
    });

  // maestro logs (placeholder for v0.2.0)
  program
    .command("logs <run-id>")
    .description("View logs for a workflow run")
    .option("-f, --follow", "Follow log output")
    .action(async (runId, options) => {
      console.log(chalk.yellow(`Logs feature not yet implemented (v0.2.0)`));
      console.log(chalk.gray(`Run ID: ${runId}`));
      if (options.follow) {
        console.log(chalk.gray("Follow mode requested"));
      }
    });

  // maestro artifacts (placeholder for v0.2.0)
  program
    .command("artifacts <run-id>")
    .description("List artifacts for a workflow run")
    .action(async (runId) => {
      console.log(chalk.yellow(`Artifacts listing not yet implemented (v0.2.0)`));
      console.log(chalk.gray(`Run ID: ${runId}`));
    });

  // maestro workflows
  program
    .command("workflows")
    .description("List available workflows")
    .action(async () => {
      console.log(chalk.yellow(`Workflows listing not yet implemented`));
      console.log(chalk.gray("Check your workflows/ directory"));
    });

  // maestro agents
  program
    .command("agents")
    .description("List available agents")
    .action(async () => {
      console.log(chalk.yellow(`Agents listing not yet implemented`));
      console.log(chalk.gray("Check your agents/ directory"));
    });

  // maestro pending (placeholder for v0.3.0)
  program
    .command("pending")
    .description("List steps waiting for approval")
    .action(async () => {
      console.log(chalk.yellow(`Pending approvals feature not yet implemented (v0.3.0)`));
    });

  // maestro retry (placeholder for v0.4.0)
  program
    .command("retry <step-id>")
    .description("Retry a failed step")
    .action(async (stepId) => {
      console.log(chalk.yellow(`Retry feature not yet implemented (v0.4.0)`));
      console.log(chalk.gray(`Step ID: ${stepId}`));
    });

  // maestro abort (placeholder for v0.4.0)
  program
    .command("abort <run-id>")
    .description("Abort a running workflow")
    .action(async (runId) => {
      console.log(chalk.yellow(`Abort feature not yet implemented (v0.4.0)`));
      console.log(chalk.gray(`Run ID: ${runId}`));
    });

  // maestro skip (placeholder for v0.4.0)
  program
    .command("skip <step-id>")
    .description("Skip a step and continue")
    .action(async (stepId) => {
      console.log(chalk.yellow(`Skip feature not yet implemented (v0.4.0)`));
      console.log(chalk.gray(`Step ID: ${stepId}`));
    });

  return program;
}

// Only run CLI if this is the main entry point (not being imported for tests)
if (process.argv[1]?.includes("cli.js") || process.argv[1]?.includes("cli.ts")) {
  const cli = createCli();
  cli.parse();
}
