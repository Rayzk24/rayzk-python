import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { Eraser, Terminal } from "lucide-react";
import { PythonRuntime } from "./controller";
import { errorLine } from "./protocol";
export function Console({
  runtime,
  onLine,
}: {
  runtime: PythonRuntime;
  onLine: (line: number) => void;
}) {
  const { state, chunks, more, version } = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const index = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const resumeReplFocus = useRef(false);
  const allowInputFocus = useRef(false);
  useEffect(() => {
    function leaveConsole(event: PointerEvent | FocusEvent) {
      const target = event.target;
      if (target instanceof Node && !target.parentElement?.closest(".console-input")) {
        resumeReplFocus.current = false;
        allowInputFocus.current = false;
      }
    }
    document.addEventListener("pointerdown", leaveConsole, true);
    document.addEventListener("focusin", leaveConsole, true);
    return () => {
      document.removeEventListener("pointerdown", leaveConsole, true);
      document.removeEventListener("focusin", leaveConsole, true);
    };
  }, []);
  useEffect(() => {
    if (follow.current)
      scroll.current?.scrollTo({ top: scroll.current.scrollHeight });
  }, [chunks, state]);
  useEffect(() => {
    if (state === "running") allowInputFocus.current = true;
    if (state === "input") {
      setValue("");
      if (allowInputFocus.current) input.current?.focus({ preventScroll: true });
    }
    if (state === "ready" && resumeReplFocus.current)
      input.current?.focus({ preventScroll: true });
  }, [state]);
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    follow.current = true;
    try {
      if (state === "input") runtime.answer(value);
      else if (runtime.run(value, "repl")) {
        setHistory((h) => [...h, value]);
        index.current = history.length + 1;
      }
      setValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  const disabled = state !== "ready" && state !== "input";
  const last = chunks.at(-1);
  const prompt =
    state === "input" && last?.stream === "stdout"
      ? last.text.slice(last.text.lastIndexOf("\n") + 1)
      : "";
  return (
    <section className="console-panel" aria-label="Console Python">
      <div className="panel-heading">
        <span>
          <Terminal size={15} />
          Console
        </span>
        <button
          className="icon-button"
          aria-label="Effacer la console"
          onClick={runtime.clear}
        >
          <Eraser size={16} />
        </button>
      </div>
      <div
        className="console-scroll"
        ref={scroll}
        onScroll={() => {
          const el = scroll.current;
          if (el)
            follow.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        <div className="console-welcome">
          <span className="console-dot" />
          Python {version || "· initialisation"}
          <small>Exécute ton code ou essaie une expression ci-dessous.</small>
        </div>
        <div
          className="console-output"
          data-testid="console-output"
          role="log"
          aria-label="Sortie Python"
        >
          {chunks.map((chunk, i) => (
            <span
              key={i}
              className={`output-${chunk.stream}${
                chunk.stream === "command" &&
                chunks[i - 1]?.stream === "stdout" &&
                !chunks[i - 1]?.text.endsWith("\n")
                  ? " output-input-answer"
                  : ""
              }`}
            >
              {(prompt && i === chunks.length - 1
                ? chunk.text.slice(0, -prompt.length)
                : chunk.text
              )
                .split(/(File "main\.py", line \d+)/g)
                .map((part, j) => {
                  const line = errorLine(part);
                  return line ? (
                    <button
                      key={j}
                      className="trace-link"
                      onClick={() => onLine(line)}
                    >
                      {part}
                    </button>
                  ) : (
                    part
                  );
                })}
            </span>
          ))}
        </div>
        <form
          className={`console-input ${state === "input" ? "waiting" : ""}`}
          onSubmit={submit}
        >
          <label
            htmlFor="python-input"
            className={prompt ? "input-prompt" : ""}
          >
            {state === "input" ? prompt || "↳" : more ? "..." : ">>>"}
          </label>
          <input
            id="python-input"
            ref={input}
            aria-label={
              state === "input" ? "Réponse Python" : "Expression Python"
            }
            value={value}
            onFocus={() => {
              resumeReplFocus.current = true;
              allowInputFocus.current = true;
            }}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={
              state === "input"
                ? "Ta réponse, puis Entrée"
                : state === "loading"
                  ? "Chargement de Python…"
                  : state === "running"
                    ? "Exécution en cours…"
                    : state === "error"
                      ? "Utilise Reset Python pour réessayer"
                      : "Une expression, puis Entrée"
            }
            onKeyDown={(e) => {
              if (state !== "ready" || !history.length) return;
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                index.current = Math.min(
                  history.length,
                  Math.max(0, index.current + (e.key === "ArrowUp" ? -1 : 1)),
                );
                setValue(history[index.current] ?? "");
              }
            }}
          />
          <button disabled={disabled} aria-label="Envoyer à Python">
            ↵
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="console-footer">
        {state === "input"
          ? "En attente de ta réponse"
          : state === "ready"
            ? "REPL · même environnement que main.py"
            : state === "running"
              ? "Python travaille…"
              : state === "loading"
                ? "Premier chargement : quelques secondes"
                : "Runtime indisponible"}
      </div>
    </section>
  );
}
