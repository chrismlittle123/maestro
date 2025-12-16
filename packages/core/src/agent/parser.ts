import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import { AgentConfigSchema, type AgentConfig } from "../types/agent.js";

/**
 * Error thrown when agent parsing fails
 */
export class AgentParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AgentParseError";
  }
}

/**
 * Parsed agent definition with config and prompt
 */
export interface AgentDefinition {
  /**
   * Agent configuration from frontmatter
   */
  config: AgentConfig;

  /**
   * Agent prompt from markdown body
   */
  prompt: string;
}

/**
 * Parse agent markdown content with YAML frontmatter
 */
export function parseAgent(markdownContent: string): AgentDefinition {
  let parsed: matter.GrayMatterFile<string>;

  try {
    parsed = matter(markdownContent);
  } catch (error) {
    throw new AgentParseError("Failed to parse agent markdown", error);
  }

  const result = AgentConfigSchema.safeParse(parsed.data);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new AgentParseError(`Invalid agent frontmatter:\n${issues}`);
  }

  return {
    config: result.data,
    prompt: parsed.content.trim(),
  };
}

/**
 * Load and parse an agent from a file path
 */
export async function loadAgent(filePath: string): Promise<AgentDefinition> {
  let content: string;

  try {
    content = await readFile(filePath, "utf-8");
  } catch (error) {
    throw new AgentParseError(`Failed to read agent file: ${filePath}`, error);
  }

  return parseAgent(content);
}

/**
 * Find an agent file by name in a directory
 */
export async function findAgent(agentsDir: string, agentName: string): Promise<AgentDefinition> {
  const filePath = `${agentsDir}/${agentName}.md`;
  return loadAgent(filePath);
}
