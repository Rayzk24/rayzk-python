import { BookOpen, FileCode2, Pencil, Trash2, X } from "lucide-react";
import type { Entry } from "./model";
export function Library({
  entries,
  active,
  onOpen,
  onRename,
  onDelete,
  onClose,
}: {
  entries: Entry[];
  active: string;
  onOpen: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const docs = entries
    .filter((e) => e.doc.kind === "saved")
    .sort((a, b) => b.doc.updated_at.localeCompare(a.doc.updated_at));
  return (
    <aside className="library" aria-label="Bibliothèque">
      <div className="panel-heading">
        <span>
          <BookOpen size={16} />
          Bibliothèque <small>{docs.length}</small>
        </span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Fermer la bibliothèque"
        >
          <X size={17} />
        </button>
      </div>
      <div className="library-items">
        {entries
          .filter((e) => e.doc.kind === "draft")
          .map((e) => (
            <button
              key={e.doc.id}
              className={`library-draft ${active === e.doc.id ? "selected" : ""}`}
              onClick={() => onOpen(e.doc.id)}
            >
              <FileCode2 size={16} />
              <span>
                Brouillon<small>Ton espace de travail principal</small>
              </span>
            </button>
          ))}
        <p className="eyebrow">CODES SAUVEGARDÉS</p>
        {!docs.length && (
          <p className="library-empty">
            Un code à garder ?<br />
            Enregistre-le ici pour le retrouver plus tard.
          </p>
        )}
        {docs.map(({ doc, status }) => (
          <div
            className={`library-item ${active === doc.id ? "selected" : ""}`}
            key={doc.id}
          >
            <button className="library-open" onClick={() => onOpen(doc.id)}>
              <FileCode2 size={16} />
              <span>
                {doc.name}
                <small>
                  {status === "conflict"
                    ? "Conflit à résoudre"
                    : new Date(doc.updated_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                </small>
              </span>
            </button>
            <button
              className="icon-button"
              onClick={() => onRename(doc.id)}
              aria-label={`Renommer ${doc.name}`}
            >
              <Pencil size={14} />
            </button>
            <button
              className="icon-button"
              onClick={() => onDelete(doc.id)}
              aria-label={`Supprimer ${doc.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <p className="library-note">Privé · synchronisé avec ton compte</p>
    </aside>
  );
}
