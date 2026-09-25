import {
  INPUT_BYTES,
  writeInput,
  type FromWorker,
  type ToWorker,
} from "./protocol";
export type RuntimeState = "loading" | "ready" | "running" | "input" | "error";
export type ConsoleChunk = {
  stream: "stdout" | "stderr" | "command" | "info";
  text: string;
};
export type RuntimeSnapshot = {
  state: RuntimeState;
  chunks: ConsoleChunk[];
  more: boolean;
  version: string;
  errorText: string;
};
export interface WorkerPort {
  postMessage(message: ToWorker): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<FromWorker>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}
export class PythonRuntime {
  private worker?: WorkerPort;
  private input?: SharedArrayBuffer;
  private listeners = new Set<() => void>();
  private snapshot: RuntimeSnapshot = {
    state: "loading",
    chunks: [],
    more: false,
    version: "",
    errorText: "",
  };
  constructor(
    private factory: () => WorkerPort = () =>
      new Worker(new URL("./python.worker.ts", import.meta.url), {
        type: "module",
      }),
  ) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.snapshot;
  private publish(change: Partial<RuntimeSnapshot>) {
    this.snapshot = { ...this.snapshot, ...change };
    this.listeners.forEach((fn) => fn());
  }
  private append(chunk: ConsoleChunk) {
    const chunks = [...this.snapshot.chunks];
    const last = chunks.at(-1);
    if (last?.stream === chunk.stream && last.text.length < 32768)
      chunks[chunks.length - 1] = { ...last, text: last.text + chunk.text };
    else chunks.push(chunk);
    // Bound React work even after many executions. Python output itself is limited in the Worker.
    while (
      chunks.length > 200 ||
      chunks.reduce((n, c) => n + c.text.length, 0) > 1200000
    )
      chunks.shift();
    this.publish({ chunks });
  }
  start = () => {
    this.worker?.terminate();
    this.publish({ state: "loading", more: false, errorText: "" });
    if (
      typeof SharedArrayBuffer === "undefined" ||
      !globalThis.crossOriginIsolated
    ) {
      this.publish({ state: "error" });
      this.append({
        stream: "stderr",
        text: "Python nécessite HTTPS (ou localhost) et les headers COOP/COEP. Consulte DEPLOYMENT.md.\n",
      });
      return;
    }
    this.input = new SharedArrayBuffer(INPUT_BYTES + 8);
    const worker = this.factory();
    this.worker = worker;
    worker.onmessage = ({ data }) => {
      if (worker !== this.worker) return;
      switch (data.type) {
        case "ready":
          this.publish({ state: "ready", version: data.version });
          break;
        case "output":
          if (data.stream === "stderr")
            this.publish({ errorText: this.snapshot.errorText + data.text });
          this.append(data);
          break;
        case "input":
          this.publish({ state: "input" });
          break;
        case "done":
          this.publish({ state: "ready", more: data.more });
          break;
        case "fatal":
          this.append({ stream: "stderr", text: `${data.message}\n` });
          this.publish({ state: "error" });
          break;
      }
    };
    worker.onerror = () => {
      if (worker === this.worker) {
        this.publish({ state: "error" });
        this.append({
          stream: "stderr",
          text: "Le Worker Python a échoué. Vérifie le réseau puis utilise Reset Python.\n",
        });
      }
    };
    worker.postMessage({ type: "init", input: this.input });
  };
  run(code: string, mode: "script" | "repl") {
    if (this.snapshot.state !== "ready") return false;
    this.append({
      stream: mode === "repl" ? "command" : "info",
      text:
        mode === "repl"
          ? `${this.snapshot.more ? "..." : ">>>"} ${code}\n`
          : "\n── main.py ──\n",
    });
    this.publish({ state: "running", errorText: "" });
    this.worker?.postMessage({ type: "run", code, mode });
    return true;
  }
  answer(value: string) {
    if (this.snapshot.state !== "input" || !this.input) return;
    writeInput(this.input, value);
    this.append({ stream: "command", text: `${value}\n` });
    this.publish({ state: "running" });
  }
  reset = () => {
    this.append({
      stream: "info",
      text: "\n── Environnement Python réinitialisé ──\n",
    });
    this.start();
  };
  stop = () => {
    this.append({
      stream: "info",
      text: "\n── Exécution arrêtée · mémoire Python réinitialisée ──\n",
    });
    this.start();
  };
  clear = () => this.publish({ chunks: [] });
  dispose() {
    this.worker?.terminate();
    this.worker = undefined;
    this.listeners.clear();
  }
}
