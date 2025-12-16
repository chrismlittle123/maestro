import { describe, it, expect } from "vitest";
import { createCli } from "./cli.js";

describe("maestro-cli", () => {
  it("should create a CLI instance", () => {
    const cli = createCli();
    expect(cli).toBeDefined();
    expect(cli.name()).toBe("maestro");
  });

  it("should have all expected commands", () => {
    const cli = createCli();
    const commands = cli.commands.map((cmd) => cmd.name());

    expect(commands).toContain("init");
    expect(commands).toContain("run");
    expect(commands).toContain("status");
    expect(commands).toContain("approve");
    expect(commands).toContain("reject");
    expect(commands).toContain("logs");
    expect(commands).toContain("artifacts");
    expect(commands).toContain("workflows");
    expect(commands).toContain("agents");
  });
});
