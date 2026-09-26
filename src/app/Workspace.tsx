import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import type { User } from "@supabase/supabase-js";
import { FileCode2, Search } from "lucide-react";
import { supabase } from "../features/auth/client";
import { DocumentStore } from "../features/documents/store";
import { repository } from "../features/documents/repository";
import { readPythonFile } from "../features/documents/files";
import { initialCode, MAX_CODE_BYTES } from "../features/documents/model";
import { Library } from "../features/documents/Library";
import { Editor } from "../features/editor/Editor";
import { Console } from "../features/runtime/Console";
import { PythonRuntime } from "../features/runtime/controller";
import { errorLine } from "../features/runtime/protocol";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceToolbar } from "./WorkspaceToolbar";
import { WorkspaceDialog, type Modal } from "./WorkspaceDialog";
export default function Workspace({
  user,
  theme,
}: {
  user: User;
  theme: { dark: boolean; toggle: () => void };
}) {
  const [store] = useState(
    () => new DocumentStore(user.id, repository(user.id), localStorage),
  );
  const [runtime] = useState(() => new PythonRuntime());
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const python = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
  const [activeId, setActiveId] = useState("");
  const [library, setLibrary] = useState(false);
  const [mobile, setMobile] = useState<"editor" | "console">("editor");
  const [modal, setModal] = useState<Modal | null>(null);
  const [message, setMessage] = useState("");
  const [split, setSplit] = useState(60);
  const [cursor, setCursor] = useState([1, 1]);
  const [jump, setJump] = useState<{ line: number; seq: number }>();
  const [searchSignal, setSearchSignal] = useState(0);
  const [runSource, setRunSource] = useState<{ id: string; code: string }>();
  const panes = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const active =
    data.entries.find((e) => e.doc.id === activeId) ??
    data.entries.find((e) => e.doc.kind === "draft");
  const doc = active?.doc;
  useEffect(() => {
    void store.load();
    runtime.start();
    const online = () => {
      void store.refresh().then(store.retry);
    };
    const flush = () => {
      void store.flushAll();
    };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (store.hasPending()) {
        e.preventDefault();
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("focus", online);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", beforeUnload);
    const retry = window.setInterval(store.retry, 15000);
    return () => {
      store.dispose();
      runtime.dispose();
      clearInterval(retry);
      window.removeEventListener("online", online);
      window.removeEventListener("focus", online);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [store, runtime]);
  const run = () => {
    if (doc && runtime.run(doc.content, "script")) {
      setRunSource({ id: doc.id, code: doc.content });
      setMobile("console");
      void store.flush(doc.id);
    }
  };
  const line =
    doc?.id === runSource?.id && doc?.content === runSource?.code
      ? errorLine(python.errorText)
      : undefined;
  const onCursor = useCallback(
    (line: number, column: number) => setCursor([line, column]),
    [],
  );
  async function logout(discard = false) {
    await store.flushAll();
    if (!discard && store.hasPending()) {
      setModal({ type: "logout" });
      return;
    }
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setMessage("Déconnexion impossible. Vérifie le réseau puis réessaie.");
      return;
    }
    store.clearLocal();
  }
  async function importFile(file: File) {
    try {
      const content = await readPythonFile(file);
      const draft = data.entries.find((e) => e.doc.kind === "draft");
      if (!draft)
        throw new Error("Le brouillon est encore en cours de chargement.");
      if (draft.doc.content.trim() && draft.doc.content !== initialCode)
        setModal({ type: "import", content });
      else {
        store.update(draft.doc.id, { content });
        setActiveId(draft.doc.id);
        setMobile("editor");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }
  function acceptModal(form: FormData) {
    if (!modal) return;
    const name = String(form.get("name") || "").trim();
    switch (modal.type) {
      case "save":
        if (name && doc) setActiveId(store.create(name, doc.content));
        else return;
        break;
      case "rename":
        if (name) store.update(modal.id, { name });
        else return;
        break;
      case "delete":
        void store
          .remove(modal.id)
          .catch((e) => setMessage(e instanceof Error ? e.message : String(e)));
        break;
      case "import": {
        const draft = data.entries.find((e) => e.doc.kind === "draft");
        if (draft) {
          store.update(draft.doc.id, { content: modal.content });
          setActiveId(draft.doc.id);
          setMobile("editor");
        }
        break;
      }
      case "logout":
        void logout(true);
        break;
    }
    setModal(null);
  }
  return (
    <main className="workspace">
      <WorkspaceHeader
        user={user}
        doc={doc}
        library={library}
        theme={theme}
        onToggleLibrary={() => setLibrary(!library)}
        onSave={() => setModal({ type: "save" })}
        onLogout={() => void logout()}
        onImport={(file) => void importFile(file)}
      />
      <WorkspaceToolbar
        status={active?.status}
        state={python.state}
        hasDocument={Boolean(doc)}
        onReset={() => {
          setRunSource(undefined);
          runtime.reset();
        }}
        onStop={runtime.stop}
        onRun={run}
      />
      {(message || data.notice) && (
        <div className="notice" role="alert">
          <span>{message || data.notice}</span>
          <button
            onClick={() => {
              setMessage("");
              void store.refresh().then(store.retry);
            }}
          >
            Réessayer
          </button>
          {message && (
            <button
              aria-label="Fermer le message"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          )}
        </div>
      )}
      {active?.status === "conflict" && (
        <div className="notice conflict">
          <span>Une autre version existe. Ton code local est conservé.</span>
          <button onClick={() => store.resolve(active.doc.id, "remote")}>
            Ouvrir la version distante + garder une copie locale
          </button>
          <button onClick={() => store.resolve(active.doc.id, "local")}>
            Remplacer par ma version
          </button>
        </div>
      )}
      <div className="mobile-tabs">
        <button
          className={mobile === "editor" ? "selected" : ""}
          onClick={() => setMobile("editor")}
        >
          Éditeur
        </button>
        <button
          className={mobile === "console" ? "selected" : ""}
          onClick={() => setMobile("console")}
        >
          Console{python.state === "input" ? " · saisie attendue" : ""}
        </button>
      </div>
      <div className="work-area">
        {library && (
          <Library
            entries={data.entries}
            active={doc?.id ?? ""}
            onClose={() => setLibrary(false)}
            onOpen={(id) => {
              setActiveId(id);
              setMobile("editor");
              if (window.innerWidth < 900) setLibrary(false);
            }}
            onRename={(id) => setModal({ type: "rename", id })}
            onDelete={(id) => setModal({ type: "delete", id })}
          />
        )}
        <div
          className={`panes show-${mobile}`}
          ref={panes}
          style={{ "--split": `${split}%` } as CSSProperties}
        >
          <section className="editor-panel" aria-label="Éditeur Python">
            <div className="panel-heading">
              <span>
                <FileCode2 size={15} />
                <span>{doc?.kind === "saved" ? doc.name : "main"}.py</span>
                <small>PYTHON</small>
              </span>
              <span className="editor-actions">
                <button
                  className="icon-button"
                  aria-label="Rechercher et remplacer"
                  title="Rechercher et remplacer (Ctrl/Cmd + F)"
                  onClick={() => setSearchSignal((value) => value + 1)}
                >
                  <Search size={15} />
                </button>
                <span className="editor-hint">UTF-8</span>
              </span>
            </div>
            {doc ? (
              <Editor
                key={doc.id}
                content={doc.content}
                dark={theme.dark}
                error={line}
                jump={jump}
                searchSignal={searchSignal}
                onRun={run}
                onCursor={onCursor}
                onChange={(content) => {
                  if (new TextEncoder().encode(content).length > MAX_CODE_BYTES)
                    setMessage(
                      "Code supérieur à 1 Mio : télécharge-le. La synchronisation Supabase est limitée à 1 Mio.",
                    );
                  store.update(doc.id, { content });
                }}
              />
            ) : (
              <div className="loading-screen">Récupération du brouillon…</div>
            )}
          </section>
          <div
            className="separator"
            role="separator"
            tabIndex={0}
            aria-label="Largeur de l’éditeur"
            aria-orientation="vertical"
            aria-valuemin={30}
            aria-valuemax={75}
            aria-valuenow={split}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                setSplit((value) =>
                  Math.min(
                    75,
                    Math.max(30, value + (e.key === "ArrowLeft" ? -2 : 2)),
                  ),
                );
              }
            }}
            onPointerDown={(e) => {
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (dragging.current && panes.current) {
                const rect = panes.current.getBoundingClientRect();
                setSplit(
                  Math.min(
                    75,
                    Math.max(30, ((e.clientX - rect.left) / rect.width) * 100),
                  ),
                );
              }
            }}
            onPointerUp={() => {
              dragging.current = false;
            }}
            onLostPointerCapture={() => {
              dragging.current = false;
            }}
          />
          <Console
            onRun={run}
            runtime={runtime}
            onLine={(line) => {
              if (!runSource) return;
              if (doc?.id !== runSource.id || doc.content !== runSource.code) {
                setMessage(
                  "Ce traceback concerne une version précédente du code. Relance le programme pour actualiser les lignes.",
                );
                return;
              }
              setJump({ line, seq: Date.now() });
              setMobile("editor");
            }}
          />
        </div>
      </div>
      <footer className="statusbar">
        <span>
          <span
            className={`runtime-dot ${python.state === "ready" ? "ready" : ""}`}
          />
          {python.state === "ready"
            ? `Python ${python.version} prêt`
            : python.state === "loading"
              ? "Chargement de Python…"
              : python.state === "input"
                ? "Saisie attendue"
                : python.state === "running"
                  ? "Exécution…"
                  : "Python indisponible"}
        </span>
        <span>
          Ln {cursor[0]}, Col {cursor[1]}
          <span className="footer-extra">
            Espaces : 4<span>Python · navigateur</span>
          </span>
        </span>
      </footer>
      {modal && (
        <WorkspaceDialog
          modal={modal}
          doc={doc}
          entries={data.entries}
          onClose={() => setModal(null)}
          onSubmit={acceptModal}
        />
      )}
    </main>
  );
}
