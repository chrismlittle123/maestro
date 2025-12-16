import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import ora from "ora";

/**
 * Example workflow YAML content
 */
const EXAMPLE_WORKFLOW = `# Example workflow: Simple task
# This workflow demonstrates a single-step workflow

name: example
description: A simple one-step workflow for demonstration

steps:
  - id: generate
    agent: developer
    outputs:
      - result.md
`;

/**
 * Example agent markdown content
 */
const EXAMPLE_AGENT = `---
name: developer
role: Software Developer
automation: full
allowed_actions:
  - read_files
  - write_files
  - run_tests
forbidden_actions:
  - deploy
  - modify_config
---

## Identity

You are a helpful software developer assistant.

## Guidelines

- Write clean, maintainable code
- Follow best practices for the language/framework
- Include appropriate comments and documentation
- Consider edge cases and error handling

## Output Format

Provide your response as a markdown document with:
- Summary of what was done
- Code or file changes made
- Any recommendations or notes
`;

/**
 * Maestro config YAML content
 */
const CONFIG_CONTENT = `# Maestro Configuration
workflowsDir: ./workflows
agentsDir: ./agents
artifactsDir: ~/.maestro/artifacts
`;

interface InitOptions {
  dir: string;
}

/**
 * Initialize a new Maestro project
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const targetDir = options.dir === "." ? process.cwd() : join(process.cwd(), options.dir);

  console.log(chalk.blue("\n🎼 Initializing Maestro project...\n"));

  const spinner = ora("Creating project structure").start();

  try {
    // Create directories
    const workflowsDir = join(targetDir, "workflows");
    const agentsDir = join(targetDir, "agents");

    await mkdir(workflowsDir, { recursive: true });
    await mkdir(agentsDir, { recursive: true });

    spinner.text = "Creating example workflow";

    // Create example workflow (don't overwrite if exists)
    const workflowPath = join(workflowsDir, "example.yaml");
    if (!(await fileExists(workflowPath))) {
      await writeFile(workflowPath, EXAMPLE_WORKFLOW);
    }

    spinner.text = "Creating example agent";

    // Create example agent (don't overwrite if exists)
    const agentPath = join(agentsDir, "developer.md");
    if (!(await fileExists(agentPath))) {
      await writeFile(agentPath, EXAMPLE_AGENT);
    }

    spinner.text = "Creating config file";

    // Create config file (don't overwrite if exists)
    const configPath = join(targetDir, "maestro.config.yaml");
    if (!(await fileExists(configPath))) {
      await writeFile(configPath, CONFIG_CONTENT);
    }

    spinner.succeed("Project initialized successfully!");

    // Print summary
    console.log(chalk.green("\n✅ Created Maestro project structure:\n"));
    console.log(chalk.gray("  " + targetDir));
    console.log(chalk.gray("  ├── workflows/"));
    console.log(chalk.gray("  │   └── example.yaml"));
    console.log(chalk.gray("  ├── agents/"));
    console.log(chalk.gray("  │   └── developer.md"));
    console.log(chalk.gray("  └── maestro.config.yaml"));

    console.log(chalk.blue("\n📖 Next steps:\n"));
    console.log(chalk.white("  1. Edit workflows/example.yaml to define your workflow"));
    console.log(chalk.white("  2. Edit agents/developer.md to customize the agent persona"));
    console.log(chalk.white('  3. Run: maestro run example --input "Your task here"'));
    console.log("");
  } catch (error) {
    spinner.fail("Failed to initialize project");
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\nError: ${message}`));
    process.exit(1);
  }
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
