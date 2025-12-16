import { readdir } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import Table from "cli-table3";
import { tryLoadManifest, DEFAULT_ARTIFACTS_DIR, type WorkflowManifest } from "@maestro/sdk";

interface StatusOptions {
  limit?: number;
}

/**
 * Show status of workflow runs
 */
export async function statusCommand(runId?: string, options: StatusOptions = {}): Promise<void> {
  const artifactsDir = DEFAULT_ARTIFACTS_DIR;
  const limit = options.limit || 10;

  try {
    if (runId) {
      // Show specific run
      await showRunDetails(artifactsDir, runId);
    } else {
      // List recent runs
      await listRecentRuns(artifactsDir, limit);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\nError: ${message}`));
    process.exit(1);
  }
}

/**
 * Show details for a specific run
 */
async function showRunDetails(artifactsDir: string, runId: string): Promise<void> {
  const runDir = join(artifactsDir, runId);
  const manifest = await tryLoadManifest(runDir);

  if (!manifest) {
    console.error(chalk.red(`\nRun not found: ${runId}`));
    console.log(chalk.gray(`Expected location: ${runDir}`));
    process.exit(1);
  }

  console.log(chalk.blue(`\n📋 Workflow Run: ${chalk.bold(manifest.id)}\n`));

  // Basic info
  console.log(chalk.white(`Workflow: ${manifest.workflowName}`));
  if (manifest.workflowDescription) {
    console.log(chalk.gray(`Description: ${manifest.workflowDescription}`));
  }
  console.log(chalk.white(`Status: ${formatStatus(manifest.status)}`));
  console.log(chalk.gray(`Started: ${formatDate(manifest.startedAt)}`));
  if (manifest.completedAt) {
    console.log(chalk.gray(`Completed: ${formatDate(manifest.completedAt)}`));
    console.log(
      chalk.gray(`Duration: ${formatDuration(manifest.startedAt, manifest.completedAt)}`)
    );
  }
  if (manifest.input) {
    console.log(
      chalk.gray(
        `Input: ${manifest.input.substring(0, 100)}${manifest.input.length > 100 ? "..." : ""}`
      )
    );
  }
  if (manifest.error) {
    console.log(chalk.red(`Error: ${manifest.error}`));
  }

  // Steps
  if (manifest.steps.length > 0) {
    console.log(chalk.white("\nSteps:"));
    for (const step of manifest.steps) {
      const statusIcon = getStatusIcon(step.status);
      console.log(`  ${statusIcon} ${step.id} (${step.agent}) - ${formatStatus(step.status)}`);
      if (step.error) {
        console.log(chalk.red(`     Error: ${step.error}`));
      }
      if (step.artifacts.length > 0) {
        console.log(chalk.gray(`     Artifacts: ${step.artifacts.join(", ")}`));
      }
    }
  }

  // Location
  console.log(chalk.gray(`\nArtifacts: ${runDir}`));
  console.log("");
}

/**
 * List recent workflow runs
 */
async function listRecentRuns(artifactsDir: string, limit: number): Promise<void> {
  // Get all run directories
  let runDirs: string[];
  try {
    const entries = await readdir(artifactsDir, { withFileTypes: true });
    runDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse()
      .slice(0, limit);
  } catch {
    console.log(chalk.yellow("\nNo workflow runs found."));
    console.log(chalk.gray(`Artifacts directory: ${artifactsDir}`));
    console.log(chalk.gray('\nRun "maestro run <workflow> --input <task>" to start a workflow.'));
    return;
  }

  if (runDirs.length === 0) {
    console.log(chalk.yellow("\nNo workflow runs found."));
    return;
  }

  // Load manifests
  const manifests: WorkflowManifest[] = [];
  for (const dir of runDirs) {
    const manifest = await tryLoadManifest(join(artifactsDir, dir));
    if (manifest) {
      manifests.push(manifest);
    }
  }

  if (manifests.length === 0) {
    console.log(chalk.yellow("\nNo workflow runs found."));
    return;
  }

  console.log(chalk.blue("\n📊 Recent workflow runs:\n"));

  // Create table
  const table = new Table({
    head: [
      chalk.white("ID"),
      chalk.white("Workflow"),
      chalk.white("Status"),
      chalk.white("Started"),
      chalk.white("Duration"),
    ],
    style: {
      head: [],
      border: [],
    },
  });

  for (const manifest of manifests) {
    table.push([
      manifest.id,
      manifest.workflowName,
      formatStatus(manifest.status),
      formatRelativeTime(manifest.startedAt),
      manifest.completedAt ? formatDuration(manifest.startedAt, manifest.completedAt) : "-",
    ]);
  }

  console.log(table.toString());
  console.log(chalk.gray(`\nShowing ${manifests.length} most recent runs.`));
  console.log(chalk.gray('Use "maestro status <run-id>" for details.'));
  console.log("");
}

/**
 * Format status with color
 */
function formatStatus(status: string): string {
  switch (status) {
    case "completed":
      return chalk.green(status);
    case "running":
      return chalk.blue(status);
    case "failed":
      return chalk.red(status);
    case "pending":
      return chalk.yellow(status);
    default:
      return status;
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case "completed":
      return chalk.green("✓");
    case "running":
      return chalk.blue("●");
    case "failed":
      return chalk.red("✗");
    case "pending":
      return chalk.yellow("○");
    case "skipped":
      return chalk.gray("○");
    default:
      return "?";
  }
}

/**
 * Format date string
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

/**
 * Format relative time
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

/**
 * Format duration between two dates
 */
function formatDuration(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);

  if (diffSecs < 60) return `${diffSecs}s`;
  if (diffMins < 60) return `${diffMins}m ${diffSecs % 60}s`;
  const hours = Math.floor(diffMins / 60);
  return `${hours}h ${diffMins % 60}m`;
}
