import { afterEach, describe, expect, it, vi } from "vitest";
import { PythonRuntime, type WorkerPort } from "./controller";
import {
  INPUT_BYTES,
  errorLine,
  writeInput,
  type FromWorker,
} from "./protocol";
afterEach(() => vi.unstubAllGlobals());
describe("Worker protocol", () => {
  it("encodes empty and Unicode input and signals Atomics", () => {
    const buffer = new SharedArrayBuffer(INPUT_BYTES + 8);
    writeInput(buffer, "Élodie 🐍");
    const control = new Int32Array(buffer, 0, 2);
    expect(control[0]).toBe(1);
    expect(
      new TextDecoder().decode(new Uint8Array(buffer, 8, control[1])),
    ).toBe("Élodie 🐍");
    writeInput(buffer, "");
    expect(control[1]).toBe(0);
    expect(() => writeInput(buffer, "a".repeat(INPUT_BYTES + 1))).toThrow();
  });
  it("isolates generations, prevents concurrent runs and terminates on Stop", () => {
    vi.stubGlobal("crossOriginIsolated", true);
    const workers: WorkerPort[] = [];
    const runtime = new PythonRuntime(() => {
      const worker = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
        onmessage: null,
        onerror: null,
      };
      workers.push(worker);
      return worker;
    });
    runtime.start();
    const first = workers[0]!;
    const message = (worker: WorkerPort, data: FromWorker) =>
      worker.onmessage?.({ data } as MessageEvent<FromWorker>);
    message(first, { type: "ready", version: "3.14" });
    expect(runtime.run("while True: pass", "script")).toBe(true);
    expect(runtime.run("1", "repl")).toBe(false);
    runtime.stop();
    expect(first.terminate).toHaveBeenCalled();
    expect(workers).toHaveLength(2);
    message(first, { type: "output", stream: "stdout", text: "stale output" });
    expect(
      runtime.getSnapshot().chunks.some((c) => c.text.includes("stale output")),
    ).toBe(false);
    runtime.dispose();
  });
  it("extracts the deepest main.py line without changing the traceback", () => {
    expect(
      errorLine(
        'File "main.py", line 2\nFile "main.py", line 7\nZeroDivisionError',
      ),
    ).toBe(7);
    expect(errorLine('File "<console>", line 1')).toBeUndefined();
  });
});
