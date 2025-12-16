import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  sourcemap: true,
  clean: true,
  target: "node22",
  // Bundle @maestro-agents/core (internal package) into SDK
  noExternal: ["@maestro-agents/core"],
});
