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
  // but keep npm dependencies external to avoid CJS/ESM issues
  noExternal: ["@maestro-agents/core"],
  external: ["yaml", "pino", "bullmq", "gray-matter", "zod"],
});
