export const INPUT_BYTES = 64 * 1024;
export type ToWorker =
  | { type: "init"; input: SharedArrayBuffer }
  | { type: "run"; code: string; mode: "script" | "repl" };
export type FromWorker =
  | { type: "ready"; version: string }
  | { type: "output"; stream: "stdout" | "stderr"; text: string }
  | { type: "input" }
  | { type: "done"; more: boolean }
  | { type: "fatal"; message: string };
export function writeInput(buffer: SharedArrayBuffer, value: string) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > INPUT_BYTES)
    throw new Error("Réponse trop longue (64 Kio maximum).");
  new Uint8Array(buffer, 8).set(bytes);
  const control = new Int32Array(buffer, 0, 2);
  Atomics.store(control, 1, bytes.length);
  Atomics.store(control, 0, 1);
  Atomics.notify(control, 0);
}
export function errorLine(text: string): number | undefined {
  const matches = [...text.matchAll(/File "main\.py", line (\d+)/g)];
  return matches.length ? Number(matches.at(-1)?.[1]) : undefined;
}
