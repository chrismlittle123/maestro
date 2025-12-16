import { join } from "node:path";
import { readFile } from "node:fs/promises";
import chalk from "chalk";
import ora from "ora";
import YAML from "yaml";
import {
  parseWorkflow,
  parseAgent,
  WorkflowEngine,
  FileSystemArtifactStore,
  InMemoryEventBus,
  MockClaudeCodeExecutor,
  DEFAULT_ARTIFACTS_DIR,
  type WorkflowConfig,
  type AgentDefinition,
  type MaestroEvent,
} from "@maestro/sdk";

interface RunOptions {
  input?: string;
  dryRun?: boolean;
}

interface MaestroConfig {
  workflowsDir: string;
  agentsDir: string;
  artifactsDir?: string;
}

/**
 * Run a workflow
 */
export async function runCommand(workflowName: string, options: RunOptions): Promise<void> {
  const cwd = process.cwd();

  // Handle dry run
  if (options.dryRun) {
    await dryRun(workflowName, cwd);
    return;
  }

  // Check for input
  if (!options.input) {
    console.error(chalk.red("\nError: --input is required"));
    console.log(chalk.gray('Usage: maestro run <workflow> --input "Your task description"'));
    process.exit(1);
  }

  console.log(chalk.blue(`\n🚀 Starting workflow: ${chalk.bold(workflowName)}\n`));

  try {
    // Load config
    const config = await loadConfig(cwd);
    const workflowsDir = join(cwd, config.workflowsDir);
    const agentsDir = join(cwd, config.agentsDir);
    const artifactsDir = config.artifactsDir || DEFAULT_ARTIFACTS_DIR;

    // Load workflow
    const spinner = ora("Loading workflow...").start();
    const workflow = await loadWorkflowFile(workflowsDir, workflowName);
    spinner.succeed(`Loaded workflow: ${workflow.name}`);

    // Load agents referenced in workflow
    spinner.start("Loading agents...");
    const agents = new Map<string, AgentDefinition>();
    for (const step of workflow.steps) {
      if (!agents.has(step.agent)) {
        const agent = await loadAgentFile(agentsDir, step.agent);
        agents.set(step.agent, agent);
      }
    }
    spinner.succeed(`Loaded ${agents.size} agent(s)`);

    // Create engine components
    const eventBus = new InMemoryEventBus();
    const artifactStore = new FileSystemArtifactStore(artifactsDir);

    // Use mock executor for now (real executor requires Claude SDK)
    const executor = new MockClaudeCodeExecutor();

    const engine = new WorkflowEngine(executor, artifactStore, eventBus, {
      workflowsDir,
      agentsDir,
      artifactsDir,
    });

    // Subscribe to events for UI updates
    let stepSpinner: ReturnType<typeof ora> | null = null;
    const startTime = Date.now();

    eventBus.onAny(async (event: MaestroEvent) => {
      switch (event.type) {
        case "workflow.started":
          console.log(chalk.gray(`📋 Run ID: ${event.workflowId}`));
          console.log("");
          break;

        case "step.started":
          if ("stepId" in event && "agentName" in event) {
            stepSpinner = ora({
              text: `Step: ${event.stepId} (${event.agentName})`,
              prefixText: "⏳",
            }).start();
          }
          break;

        case "step.completed":
          if (stepSpinner && "artifacts" in event) {
            stepSpinner.succeed(`Step completed`);
            if (event.artifacts && event.artifacts.length > 0) {
              console.log(chalk.gray("   Artifacts:"));
              for (const artifact of event.artifacts) {
                console.log(chalk.gray(`   - ${artifact}`));
              }
            }
            console.log("");
          }
          break;

        case "step.failed":
          if (stepSpinner && "error" in event) {
            stepSpinner.fail(`Step failed: ${event.error}`);
            console.log("");
          }
          break;

        case "workflow.completed":
          break;

        case "workflow.failed":
          break;
      }
    });

    // Run workflow
    const run = await engine.run(workflow, agents, options.input);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Print final status
    if (run.status === "completed") {
      console.log(chalk.green(`🎉 Workflow completed successfully!`));
      console.log(chalk.gray(`   Total time: ${duration}s`));
      console.log(chalk.gray(`   Artifacts: ${artifactStore.getRunDir(run.id)}`));
    } else {
      console.log(chalk.red(`❌ Workflow failed`));
      if (run.error) {
        console.log(chalk.red(`   Error: ${run.error}`));
      }
      process.exit(1);
    }

    console.log("");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\nError: ${message}`));
    process.exit(1);
  }
}

/**
 * Dry run - show what would happen without executing
 */
async function dryRun(workflowName: string, cwd: string): Promise<void> {
  console.log(chalk.yellow("\n🔍 DRY RUN - No agents will execute\n"));

  try {
    const config = await loadConfig(cwd);
    const workflowsDir = join(cwd, config.workflowsDir);
    const agentsDir = join(cwd, config.agentsDir);

    // Load workflow
    const workflow = await loadWorkflowFile(workflowsDir, workflowName);

    console.log(chalk.white(`Workflow: ${chalk.bold(workflow.name)}`));
    if (workflow.description) {
      console.log(chalk.gray(`Description: ${workflow.description}`));
    }
    console.log("");

    // Show steps
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      console.log(chalk.white(`Step ${i + 1}: ${chalk.bold(step.id)}`));
      console.log(chalk.gray(`  Agent: ${step.agent}`));

      // Try to load agent to show info
      try {
        const agent = await loadAgentFile(agentsDir, step.agent);
        console.log(chalk.gray(`  Role: ${agent.config.role}`));
        console.log(chalk.gray(`  Automation: ${agent.config.automation}`));
      } catch {
        console.log(chalk.yellow(`  (Agent file not found)`));
      }

      if (step.inputs && step.inputs.length > 0) {
        console.log(chalk.gray(`  Inputs: ${step.inputs.join(", ")}`));
      }
      if (step.outputs && step.outputs.length > 0) {
        console.log(chalk.gray(`  Outputs: ${step.outputs.join(", ")}`));
      }
      console.log("");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }
}

/**
 * Load maestro config from project directory
 */
async function loadConfig(cwd: string): Promise<MaestroConfig> {
  const configPath = join(cwd, "maestro.config.yaml");

  try {
    const content = await readFile(configPath, "utf-8");
    const config = YAML.parse(content) as MaestroConfig;

    return {
      workflowsDir: config.workflowsDir || "./workflows",
      agentsDir: config.agentsDir || "./agents",
      artifactsDir: config.artifactsDir,
    };
  } catch {
    // Use defaults if no config file
    return {
      workflowsDir: "./workflows",
      agentsDir: "./agents",
    };
  }
}

/**
 * Load a workflow file
 */
async function loadWorkflowFile(workflowsDir: string, name: string): Promise<WorkflowConfig> {
  const filePath = join(workflowsDir, `${name}.yaml`);
  const content = await readFile(filePath, "utf-8");
  return parseWorkflow(content);
}

/**
 * Load an agent file
 */
async function loadAgentFile(agentsDir: string, name: string): Promise<AgentDefinition> {
  const filePath = join(agentsDir, `${name}.md`);
  const content = await readFile(filePath, "utf-8");
  return parseAgent(content);
}
