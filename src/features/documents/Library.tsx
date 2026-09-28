import { BookOpen, FileCode2, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Entry } from "./model";
import { codeTypes, documentMatches, existingTopics, topicKey } from "./metadata";
import { LibraryFilterSelect } from "./LibraryFilterSelect";
import { emptyLibraryFilters, readLibraryFilters, validTopicFilter } from "./libraryFilters";
export function Library({
  entries,
  userId,
  loaded,
  active,
  onOpen,
  onRename,
  onDelete,
  onClose,
}: {
  entries: Entry[];
  userId: string;
  loaded: boolean;
  active: string;
  onOpen: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const storageKey = `rayzk-python.library-filters.${userId}`;
  const [filters, setFilters] = useState(() => readLibraryFilters(localStorage, storageKey));
  const search = useRef<HTMLInputElement>(null);
  const allDocs = entries
    .filter((e) => e.doc.kind === "saved")
    .sort((a, b) => b.doc.updated_at.localeCompare(a.doc.updated_at));
  const topics = useMemo(() => existingTopics(entries.map((entry) => entry.doc)), [entries]);
  const topicOptions = useMemo(() => topics.map(topicKey), [topics]);
  useEffect(() => {
    if (loaded && !validTopicFilter(filters.topic, topicOptions))
      setFilters((current) => ({ ...current, topic: "" }));
  }, [loaded, filters.topic, topicOptions]);
  useEffect(() => {
    try {
      if (Object.values(filters).some(Boolean)) localStorage.setItem(storageKey, JSON.stringify(filters));
      else localStorage.removeItem(storageKey);
    } catch { /* Filters remain usable without local storage. */ }
  }, [filters, storageKey]);
  const docs = allDocs.filter((entry) => documentMatches(entry.doc, filters));
  const hasFilters = Object.values(filters).some(Boolean);
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
          <LibraryFilterSelect label="Filtrer par type" value={filters.type}
            options={[{ value: "", label: "Tous les types" }, ...codeTypes.map((value) => ({ value, label: value }))]}
            onChange={(type) => setFilters((current) => ({ ...current, type }))} />
          <LibraryFilterSelect label="Filtrer par thème" value={filters.topic} align="right"
            options={[{ value: "", label: "Tous les thèmes" }, ...topics.map((value) => ({ value: topicKey(value), label: value }))]}
            onChange={(topic) => setFilters((current) => ({ ...current, topic }))} />
          <div className="library-search">
            <input ref={search} aria-label="Rechercher dans la bibliothèque" type="text" placeholder="Rechercher…"
              value={filters.text} onChange={(event) => setFilters((current) => ({ ...current, text: event.target.value }))} autoComplete="off" />
            {filters.text && <button type="button" aria-label="Effacer la recherche" title="Effacer la recherche"
              onClick={() => { setFilters((current) => ({ ...current, text: "" })); search.current?.focus(); }}><X size={15} /></button>}
          </div>
          <button className="library-filter-reset" type="button" disabled={!hasFilters}
            onClick={() => setFilters(emptyLibraryFilters)}><RotateCcw size={12} /> Réinitialiser</button>
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
