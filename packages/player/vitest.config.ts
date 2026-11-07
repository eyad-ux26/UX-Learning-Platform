import { defineConfig } from "vitest/config";

// The player's tsconfig keeps JSX for Next to compile; tests render components themselves.
export default defineConfig({ oxc: { jsx: { runtime: "automatic" } } });
