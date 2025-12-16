import { z } from "zod";
import type { Artifact } from "./artifact.js";

/**
 * Schema for agent configuration (from markdown frontmatter)
 */
export const AgentConfigSchema = z.object({
  name: z.string(),
  role: z.string(),
  automation: z.enum(["full", "partial"]).default("full"),
  allowed_actions: z.array(z.string()).optional(),
  forbidden_actions: z.array(z.string()).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * Input for agent execution
 */
export interface AgentExecutionInput {
  workflowId: string;
  stepId: string;
  agent: AgentConfig;
  prompt: string;
  inputs: Artifact[];
}

/**
 * Output from agent execution
 */
export interface AgentExecutionOutput {
  success: boolean;
  artifacts: Artifact[];
  error?: string;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
}

/**
 * Interface for agent executors
 * This abstraction allows for different LLM backends
 */
export interface AgentExecutor {
  /**
   * Execute an agent with the given input
   */
  execute(input: AgentExecutionInput): Promise<AgentExecutionOutput>;

  /**
   * Cancel a running execution
   */
  cancel(workflowId: string, stepId: string): Promise<void>;

  /**
   * Get the status of an execution
   */
  getStatus(
    workflowId: string,
    stepId: string
  ): Promise<"pending" | "running" | "completed" | "failed" | "cancelled">;
}
