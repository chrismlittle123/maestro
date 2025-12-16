import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  sourcemap: true,
  clean: true,
  target: "node22",
  // Don't bundle dependencies - they'll be installed
  external: ["@chrismlittle123/maestro-sdk"],
});
