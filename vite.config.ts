import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
const headers = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};
export default defineConfig({
  plugins: [react()],
  server: { headers },
  preview: {
    headers: Object.fromEntries(
      readFileSync(new URL("./public/_headers", import.meta.url), "utf8")
        .split("/pyodide/")[0]!
        .split("\n")
        .filter((line) => line.startsWith("  "))
        .map((line) => {
          const colon = line.indexOf(":");
          return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
        }),
    ),
  },
  worker: { format: "es" },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
