import { describe, it, expect } from "vitest";

describe("@chrismlittle123/maestro-core", () => {
  it("should export core types", async () => {
    const core = await import("./index.js");
    expect(core).toBeDefined();
  });
});
