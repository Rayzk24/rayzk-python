import type { Lockfile, PyodideInterface } from "pyodide";
import { createDependencyLoader, explainImportError } from "./dependencies";
import { version } from "pyodide/package.json";
import type { FromWorker, ToWorker } from "./protocol";
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
  postMessage: (message: FromWorker) => void;
  location: Location;
};
const send = (message: FromWorker) => scope.postMessage(message);
let python: PyodideInterface;
let prepareDependencies: (code: string) => Promise<void>;
let replLines: string[] = [];
let output: { stream: "stdout" | "stderr"; text: string } | undefined;
let lastFlush = 0;
let emitted = 0;
let truncated = false;
function flush() {
  if (output?.text) send({ type: "output", ...output });
  output = undefined;
  lastFlush = performance.now();
}
function write(stream: "stdout" | "stderr", text: string) {
  if (emitted > 1024 * 1024) {
    if (!truncated) {
      flush();
      send({
        type: "output",
        stream: "stderr",
        text: "\n[Sortie limitée à 1 Mio pour préserver la console. Stop reste disponible.]\n",
      });
      truncated = true;
    }
    return;
  }
  emitted += text.length;
  if (output?.stream !== stream) flush();
  output ??= { stream, text: "" };
  output.text += text;
  if (output.text.length > 8192 || performance.now() - lastFlush > 40) flush();
}
scope.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      const indexURL = new URL(`/pyodide/${version}/`, scope.location.href)
        .href;
      const moduleURL = `${indexURL}pyodide.mjs`;
      const { loadPyodide } = (await import(
        /* @vite-ignore */ moduleURL
      )) as typeof import("pyodide");
      const response = await fetch(`${indexURL}pyodide-lock.json`);
      if (!response.ok) throw new Error("Catalogue Pyodide indisponible.");
      const lock = await response.json() as Lockfile;
      python = await loadPyodide({
        indexURL,
        lockFileContents: lock,
        packageBaseUrl: `https://cdn.jsdelivr.net/pyodide/v${version}/full/`,
      });
      prepareDependencies = createDependencyLoader(python, lock.packages,
        (label) => send({ type: "dependencies", label }));
      for (const stream of ["stdout", "stderr"] as const) {
        const decoder = new TextDecoder();
        const options = {
          write: (bytes: Uint8Array) => {
            write(stream, decoder.decode(bytes, { stream: true }));
            return bytes.length;
          },
        };
        if (stream === "stdout") python.setStdout(options);
        else python.setStderr(options);
      }
      const control = new Int32Array(data.input, 0, 2);
      python.setStdin({
        stdin: () => {
          flush();
          Atomics.store(control, 0, 0);
          send({ type: "input" });
          while (Atomics.load(control, 0) === 0) Atomics.wait(control, 0, 0);
          // TextDecoder in browsers rejects views backed by SharedArrayBuffer.
          return new TextDecoder().decode(
            new Uint8Array(data.input, 8, Atomics.load(control, 1)).slice(),
          );
        },
      });
      python.runPython(
        `import code\n_rayzk_namespace = {"__name__": "__main__"}\n_rayzk_console = code.InteractiveConsole(_rayzk_namespace, filename="<console>")`,
      );
      send({
        type: "ready",
        version: String(python.runPython("import sys; sys.version.split()[0]")),
      });
    } catch (error) {
      send({
        type: "fatal",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }
  emitted = 0;
  truncated = false;
  let more = false;
  try {
    if (data.mode === "script") replLines = [];
    else replLines.push(data.code);
    await prepareDependencies(data.mode === "repl" ? replLines.join("\n") : data.code);
    if (data.mode === "repl") {
      python.globals.set("_rayzk_line", data.code);
      more = Boolean(
        await python.runPythonAsync("_rayzk_console.push(_rayzk_line)"),
      );
    } else {
      python.runPython("_rayzk_console.resetbuffer()");
      const namespace = python.globals.get("_rayzk_namespace");
      try {
        const result = await python.runPythonAsync(data.code, {
          globals: namespace,
          filename: "main.py",
        });
        result?.destroy?.();
      } finally {
        namespace.destroy();
      }
    }
  } catch (error) {
    // Preparation may fail in the middle of an InteractiveConsole suite.
    // Restore a fresh prompt instead of retaining an invisible partial buffer.
    python.runPython("_rayzk_console.resetbuffer()");
    const message = error instanceof Error ? error.message : String(error);
    write(
      "stderr",
      `${message}\n${explainImportError(message)}`,
    );
  } finally {
    if (!more) replLines = [];
    flush();
    send({ type: "done", more });
  }
};
