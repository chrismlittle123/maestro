import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { WorkflowConfigSchema, type WorkflowConfig } from "../types/workflow.js";

/**
 * Error thrown when workflow parsing fails
 */
export class WorkflowParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "WorkflowParseError";
  }
}

/**
 * Parse workflow YAML content and validate with Zod
 */
export function parseWorkflow(yamlContent: string): WorkflowConfig {
  let parsed: unknown;

  try {
    parsed = YAML.parse(yamlContent);
  } catch (error) {
    throw new WorkflowParseError("Invalid YAML syntax", error);
  }

  const result = WorkflowConfigSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new WorkflowParseError(`Invalid workflow configuration:\n${issues}`);
  }

  return result.data;
}

/**
 * Load and parse a workflow from a file path
 */
export async function loadWorkflow(filePath: string): Promise<WorkflowConfig> {
  let content: string;

  try {
    content = await readFile(filePath, "utf-8");
  } catch (error) {
    throw new WorkflowParseError(`Failed to read workflow file: ${filePath}`, error);
  }

  return parseWorkflow(content);
}

/**
 * Find a workflow file by name in a directory
 */
export async function findWorkflow(
  workflowsDir: string,
  workflowName: string
): Promise<WorkflowConfig> {
  const filePath = `${workflowsDir}/${workflowName}.yaml`;
  return loadWorkflow(filePath);
}
