import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

/**
 * Step status in the manifest
 */
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

/**
 * Step entry in the manifest
 */
export interface ManifestStep {
  id: string;
  agent: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  artifacts: string[];
}

/**
 * Workflow run manifest
 */
export interface WorkflowManifest {
  id: string;
  workflowName: string;
  workflowDescription?: string;
  status: "pending" | "running" | "completed" | "failed";
  input?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  steps: ManifestStep[];
}

/**
 * Create a new manifest for a workflow run
 */
export function createManifest(
  runId: string,
  workflowName: string,
  input?: string,
  description?: string
): WorkflowManifest {
  return {
    id: runId,
    workflowName,
    workflowDescription: description,
    status: "pending",
    input,
    startedAt: new Date().toISOString(),
    steps: [],
  };
}

/**
 * Add a step to the manifest
 */
export function addManifestStep(
  manifest: WorkflowManifest,
  stepId: string,
  agentName: string
): WorkflowManifest {
  return {
    ...manifest,
    steps: [
      ...manifest.steps,
      {
        id: stepId,
        agent: agentName,
        status: "pending",
        artifacts: [],
      },
    ],
  };
}

/**
 * Update a step in the manifest
 */
export function updateManifestStep(
  manifest: WorkflowManifest,
  stepId: string,
  update: Partial<ManifestStep>
): WorkflowManifest {
  return {
    ...manifest,
    steps: manifest.steps.map((step) => (step.id === stepId ? { ...step, ...update } : step)),
  };
}

/**
 * Mark manifest as running
 */
export function startManifest(manifest: WorkflowManifest): WorkflowManifest {
  return {
    ...manifest,
    status: "running",
  };
}

/**
 * Mark manifest as completed
 */
export function completeManifest(manifest: WorkflowManifest): WorkflowManifest {
  return {
    ...manifest,
    status: "completed",
    completedAt: new Date().toISOString(),
  };
}

/**
 * Mark manifest as failed
 */
export function failManifest(manifest: WorkflowManifest, error: string): WorkflowManifest {
  return {
    ...manifest,
    status: "failed",
    completedAt: new Date().toISOString(),
    error,
  };
}

/**
 * Save manifest to file system
 */
export async function saveManifest(runDir: string, manifest: WorkflowManifest): Promise<void> {
  const filePath = join(runDir, "manifest.json");
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(manifest, null, 2));
}

/**
 * Load manifest from file system
 */
export async function loadManifest(runDir: string): Promise<WorkflowManifest> {
  const filePath = join(runDir, "manifest.json");
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content) as WorkflowManifest;
}

/**
 * Try to load manifest, return null if not found
 */
export async function tryLoadManifest(runDir: string): Promise<WorkflowManifest | null> {
  try {
    return await loadManifest(runDir);
  } catch {
    return null;
  }
}
