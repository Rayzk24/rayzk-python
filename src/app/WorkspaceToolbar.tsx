import { Check, CloudOff, Play, RotateCcw, Square } from "lucide-react";
import type { SaveState } from "../features/documents/model";
import type { RuntimeState } from "../features/runtime/controller";
const saveLabels = {
  saved: "Sauvegardé",
  saving: "Sauvegarde…",
  local: "Hors ligne · sauvegardé localement",
  error: "Erreur de synchronisation",
  conflict: "Conflit entre appareils",
};

type Props = {
  status?: SaveState;
  state: RuntimeState;
  hasDocument: boolean;
  onReset: () => void;
  onStop: () => void;
  onRun: () => void;
};
export function WorkspaceToolbar({
  status,
  state,
  hasDocument,
  onReset,
  onStop,
  onRun,
}: Props) {
  const busy = state === "running" || state === "input";
  return (
    <div className="toolbar">
      <span className={`save-status status-${status}`} role="status">
        {status === "saved" ? (
          <Check size={13} />
        ) : status === "local" ? (
          <CloudOff size={13} />
        ) : (
          <span className="status-dot" />
        )}
        {status ? saveLabels[status] : "Chargement du brouillon…"}
      </span>
      <div className="run-actions">
        <button
          className="reset-button"
          onClick={onReset}
          title="Efface toutes les variables Python"
        >
          <RotateCcw size={14} />
          <span>Reset Python</span>
        </button>
        <button disabled={!busy && state !== "loading"} onClick={onStop}>
          <Square size={13} />
          <span>Stop</span>
        </button>
        <button
          className="primary run-button"
          disabled={!hasDocument || state !== "ready"}
          onClick={onRun}
        >
          <Play size={14} fill="currentColor" />
          Exécuter<kbd>⌘ / Ctrl ↵</kbd>
        </button>
      </div>
    </div>
  );
}
