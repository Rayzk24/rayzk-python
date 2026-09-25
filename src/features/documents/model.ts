export type PythonDocument = {
  id: string;
  user_id: string;
  kind: "draft" | "saved";
  name: string;
  content: string;
  revision: number;
  updated_at: string;
};
export type SaveState = "saved" | "saving" | "local" | "error" | "conflict";
export type Entry = {
  doc: PythonDocument;
  pending: boolean;
  status: SaveState;
  remote?: PythonDocument | null;
};
export interface DocumentRepository {
  list(): Promise<PythonDocument[]>;
  save(doc: PythonDocument): Promise<PythonDocument | null>;
  get(id: string): Promise<PythonDocument | null>;
  remove(doc: PythonDocument): Promise<boolean>;
}
export const MAX_CODE_BYTES = 1024 * 1024;
export const initialCode =
  '# Ton espace Python. À toi de jouer.\n\nprint("Hello, Rayzk !")\n';
export function newDocument(
  user: string,
  kind: PythonDocument["kind"],
  content: string,
  name = "Brouillon",
): PythonDocument {
  return {
    id: crypto.randomUUID(),
    user_id: user,
    kind,
    name,
    content,
    revision: 0,
    updated_at: new Date().toISOString(),
  };
}
