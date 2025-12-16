import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RunOptions {
  timeout?: number;
  env?: Record<string, string>;
}

/**
 * Run the Maestro CLI in a test project directory
 */
export async function run(
  projectDir: string,
  args: string[],
  options: RunOptions = {}
): Promise<RunResult> {
  const timeout = options.timeout ?? 30000;
  const cliPath = join(__dirname, "../../packages/cli/dist/cli.js");

  return new Promise((resolve, reject) => {
    const proc = spawn("node", [cliPath, ...args], {
      cwd: projectDir,
      env: {
        ...process.env,
        NO_COLOR: "1",
        ...options.env,
      },
    });

    let stdout = "";
    let stderr = "";
    let resolved = false;

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        reject(new Error(`Timeout after ${timeout}ms`));
      }
    }, timeout);

    proc.on("close", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
        });
      }
    });

    proc.on("error", (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(error);
      }
    });
  });
}

/**
 * Get the absolute path to a test fixture project
 */
export function fixture(name: string): string {
  return join(__dirname, "projects", name);
}

/**
 * Get the path to the CLI entry point
 */
export function getCliPath(): string {
  return join(__dirname, "../../packages/cli/dist/cli.js");
}
