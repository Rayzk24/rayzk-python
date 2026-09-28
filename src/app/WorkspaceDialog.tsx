import { Download } from "lucide-react";
import { Dialog } from "../components/Dialog";
import { downloadPython } from "../features/documents/files";
import type { Entry, PythonDocument } from "../features/documents/model";
import { codeTypes, existingTopics, type CodeType } from "../features/documents/metadata";
export type Modal =
  | { type: "save" }
  | { type: "rename" | "delete"; id: string }
  | { type: "import"; content: string }
  | { type: "logout" };

type Props = {
  modal: Modal;
  doc?: PythonDocument;
  entries: Entry[];
  recentMetadata: { code_type: CodeType | null; topic: string | null };
  onClose: () => void;
  onSubmit: (data: FormData) => void;
};
export function WorkspaceDialog({
  modal,
  doc,
  entries,
  recentMetadata,
  onClose,
  onSubmit,
}: Props) {
  const modalDoc =
    "id" in modal ? entries.find((e) => e.doc.id === modal.id)?.doc : undefined;
  const selectedType = modal.type === "rename" ? modalDoc?.code_type ?? null : recentMetadata.code_type;
  const selectedTopic = modal.type === "rename" ? modalDoc?.topic ?? "" : recentMetadata.topic ?? "";
  return (
    <Dialog
      title={
        modal.type === "save"
          ? "Enregistrer dans la bibliothèque"
          : modal.type === "rename"
            ? "Modifier le code"
            : modal.type === "delete"
              ? "Supprimer ce code ?"
              : modal.type === "logout"
                ? "Des codes ne sont pas synchronisés"
                : "Remplacer le brouillon ?"
      }
      onClose={onClose}
      onSubmit={onSubmit}
      confirm={
        modal.type === "delete"
          ? "Supprimer"
          : modal.type === "import"
            ? "Remplacer"
            : modal.type === "logout"
              ? "Effacer et me déconnecter"
              : "Enregistrer"
      }
      danger={modal.type === "delete" || modal.type === "logout"}
    >
      {modal.type === "save" || modal.type === "rename" ? (
        <div className="document-fields">
          <label>
            Nom
            <input
              name="name"
              maxLength={100}
              required
              autoFocus
              defaultValue={
                modalDoc?.name ??
                (doc?.kind === "saved" ? `${doc.name} — copie` : "")
              }
              placeholder="Ex. Tri par insertion"
            />
          </label>
          <fieldset className="document-type">
            <legend>Type <small>facultatif</small></legend>
            {["", ...codeTypes].map((type) => (
              <label key={type}>
                <input type="radio" name="code_type" value={type} defaultChecked={(selectedType ?? "") === type} />
                <span>{type || "Aucun"}</span>
              </label>
            ))}
          </fieldset>
          <label>
            <span>Thème <small>facultatif</small></span>
            <input name="topic" list="existing-topics" maxLength={60} defaultValue={selectedTopic} placeholder="Ex. Classes" autoComplete="off" />
            <datalist id="existing-topics">
              {existingTopics(entries.map((entry) => entry.doc)).map((topic) => <option key={topic} value={topic} />)}
            </datalist>
          </label>
        </div>
      ) : modal.type === "delete" ? (
        <p>
          « {modalDoc?.name} » sera supprimé de ta bibliothèque. Cette action
          est définitive.
        </p>
      ) : modal.type === "logout" ? (
        <>
          <p>
            La déconnexion efface les copies locales. Télécharge les codes en
            attente avant de continuer, ou annule pour les synchroniser.
          </p>
          {entries
            .filter((e) => e.pending)
            .map((e) => (
              <button
                type="button"
                key={e.doc.id}
                onClick={() => downloadPython(e.doc.content, e.doc.name)}
              >
                <Download size={16} />
                {e.doc.name}
              </button>
            ))}
        </>
      ) : (
        <p>
          Le fichier importé remplacera le contenu du brouillon. Enregistre ou
          télécharge d’abord ton travail si tu veux le conserver.
        </p>
      )}
    </Dialog>
  );
}
