import { describe, it, expect } from "vitest";
import { Maestro } from "./maestro.js";

describe("@chrismlittle123/maestro-sdk", () => {
  it("should create a Maestro instance", () => {
    const maestro = new Maestro({
      workflowsDir: "./workflows",
      agentsDir: "./agents",
    });

    expect(maestro).toBeDefined();
    expect(maestro.getConfig().workflowsDir).toBe("./workflows");
    expect(maestro.getConfig().agentsDir).toBe("./agents");
  });
});
