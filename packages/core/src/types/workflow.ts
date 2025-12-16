import { z } from "zod";

/**
 * Schema for a workflow step
 */
export const WorkflowStepSchema = z.object({
  id: z.string(),
  agent: z.string(),
  automation: z.enum(["full", "partial"]).default("full"),
  inputs: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
  next: z.string().optional(),
  on_pass: z.string().optional(),
  on_fail: z.string().optional(),
  on_reject: z.string().optional(),
  condition: z.string().optional(),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

/**
 * Schema for workflow configuration
 */
export const WorkflowConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(WorkflowStepSchema),
  timeouts: z
    .object({
      default: z.string().optional(),
    })
    .passthrough()
    .optional(),
  budget: z
    .object({
      max_tokens: z.number().optional(),
      max_cost_usd: z.number().optional(),
      on_exceed: z.enum(["pause", "abort", "notify_and_continue"]).optional(),
    })
    .optional(),
});

export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;
