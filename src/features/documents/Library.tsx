import { BookOpen, FileCode2, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Entry } from "./model";
import { codeTypes, documentMatches, existingTopics, topicKey } from "./metadata";
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
  const [type, setType] = useState("");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const allDocs = entries
    .filter((e) => e.doc.kind === "saved")
    .sort((a, b) => b.doc.updated_at.localeCompare(a.doc.updated_at));
  const topics = existingTopics(allDocs.map((entry) => entry.doc));
  const docs = allDocs.filter((entry) => documentMatches(entry.doc, { type, topic, text }));
  return (
    <aside className="library" aria-label="Bibliothèque">
      <div className="panel-heading">
        <span>
          <BookOpen size={16} />
          Bibliothèque <small>{allDocs.length}</small>
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
        <div className="library-filters">
          <select aria-label="Filtrer par type" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Tous les types</option>
            {codeTypes.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select aria-label="Filtrer par thème" value={topic} onChange={(event) => setTopic(event.target.value)}>
            <option value="">Tous les thèmes</option>
            {topics.map((value) => <option key={value} value={topicKey(value)}>{value}</option>)}
          </select>
          <input aria-label="Rechercher dans la bibliothèque" type="search" placeholder="Rechercher…" value={text} onChange={(event) => setText(event.target.value)} autoComplete="off" />
        </div>
        <p className="eyebrow">CODES SAUVEGARDÉS</p>
        {!allDocs.length && (
          <p className="library-empty">
            Un code à garder ?<br />
            Enregistre-le ici pour le retrouver plus tard.
          </p>
        )}
        {!!allDocs.length && !docs.length && <p className="library-empty">Aucun code ne correspond aux filtres.</p>}
        {docs.map(({ doc, status }) => (
          <div
            className={`library-item ${active === doc.id ? "selected" : ""}`}
            key={doc.id}
          >
            <button className="library-open" onClick={() => onOpen(doc.id)}>
              <FileCode2 size={16} />
              <span>
                {doc.name}
                {(doc.code_type || doc.topic) && <small className="library-metadata">{[doc.code_type, doc.topic].filter(Boolean).join(" · ")}</small>}
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
