import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Download,
  LogOut,
  Moon,
  Save,
  Sun,
  Upload,
  UserRound,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { PythonDocument } from "../features/documents/model";
import { downloadPython } from "../features/documents/files";
type Props = {
  user: User;
  doc?: PythonDocument;
  library: boolean;
  theme: { dark: boolean; toggle: () => void };
  onToggleLibrary: () => void;
  onSave: () => void;
  onLogout: () => void;
  onImport: (file: File) => void;
};
export function WorkspaceHeader({
  user,
  doc,
  library,
  theme,
  onToggleLibrary,
  onSave,
  onLogout,
  onImport,
}: Props) {
  const [account, setAccount] = useState(false);
  const accountMenu = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!account) return;
    const close = (e: PointerEvent) => {
      if (!accountMenu.current?.contains(e.target as Node)) setAccount(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccount(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [account]);

  return (
    <header className="topbar">
      <a
        className="brand"
        href="/"
        aria-label="Rayzk Python, ouvrir le brouillon"
      >
        <img src="/favicon.svg" alt="" />
        <span>Python</span>
      </a>
      <span className="header-divider" />
      <button
        className={`icon-button ${library ? "selected" : ""}`}
        aria-label="Ouvrir la bibliothèque"
        aria-expanded={library}
        onClick={() => onToggleLibrary()}
      >
        <BookOpen size={18} />
      </button>
      <span className="document-title" title={doc?.name}>
        {doc?.name ?? "Brouillon"}
        <span className="title-dot">•</span>
      </span>
      <div className="header-actions">
        <button
          disabled={!doc}
          onClick={() => onSave()}
          title="Enregistrer dans la bibliothèque"
        >
          <Save size={16} />
          <span className="button-label">Enregistrer</span>
        </button>
        <button
          className="icon-button"
          aria-label="Importer .py"
          title="Importer .py"
          disabled={!doc}
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Télécharger .py"
          title="Télécharger .py"
          disabled={!doc}
          onClick={() =>
            doc &&
            downloadPython(
              doc.content,
              doc.kind === "draft" ? "main" : doc.name,
            )
          }
        >
          <Download size={17} />
        </button>
        <button
          className="icon-button"
          onClick={theme.toggle}
          aria-label={
            theme.dark ? "Passer au thème clair" : "Passer au thème sombre"
          }
          title="Changer de thème"
        >
          {theme.dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <div className="account" ref={accountMenu}>
          <button
            className="avatar"
            aria-label="Compte"
            aria-expanded={account}
            onClick={() => setAccount(!account)}
          >
            <UserRound size={16} />
          </button>
          {account && (
            <div className="account-menu">
              <small>CONNECTÉ EN TANT QUE</small>
              <p>{user.email}</p>
              <button onClick={() => onLogout()}>
                <LogOut size={16} />
                Déconnexion
              </button>
              <small>
                La déconnexion efface les copies locales de cet appareil.
              </small>
            </div>
          )}
        </div>
      </div>
      <input
        hidden
        ref={fileInput}
        type="file"
        accept=".py"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(file);
          e.target.value = "";
        }}
      />
    </header>
  );
}
