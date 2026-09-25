import { mkdir, copyFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const source = dirname(require.resolve("pyodide/package.json"));
const version = require("pyodide/package.json").version;
const target = new URL(`../public/pyodide/${version}/`, import.meta.url);
await mkdir(target, { recursive: true });
// Self-host exactly the runtime; arbitrary third-party packages are outside V1.
for (const name of [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
]) {
  if ((await stat(join(source, name))).size > 25 * 1024 * 1024)
    throw new Error(`${name} dépasse la limite Cloudflare Pages de 25 Mio`);
  await copyFile(join(source, name), new URL(name, target));
}
console.log("Runtime Python copié dans public/pyodide.");
