import { defineConfig } from "tsup";

// Один бандл на процес: пакети робочого простору (TypeScript-сирці) вбудовуються, сторонні — з node_modules.
export default defineConfig({
  entry: ["src/server.ts", "src/worker.ts"],
  format: "esm",
  platform: "node",
  target: "node24",
  sourcemap: true,
  clean: true,
  splitting: false,
  noExternal: [/^@musicdb\//],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
