import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The "@/" path alias from tsconfig.json, so tests can import server modules the way the app does.
export default defineConfig({
  resolve: { alias: { "@/": fileURLToPath(new URL("./", import.meta.url)) } },
});
