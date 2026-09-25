import { MAX_CODE_BYTES } from "./model";
export async function readPythonFile(file: File) {
  if (!/\.py$/i.test(file.name))
    throw new Error("Choisis un fichier Python avec l’extension .py.");
  if (file.size > MAX_CODE_BYTES)
    throw new Error("Ce fichier dépasse la limite de 1 Mio.");
  const bytes = await file.arrayBuffer();
  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Enregistre le fichier en UTF-8 avant de l’importer.");
  }
  if (content.includes("\0"))
    throw new Error("Ce fichier contient des données binaires.");
  return content.replace(/\r\n?/g, "\n");
}
export function pythonFilename(name: string) {
  const clean = name
    .replace(/\.py$/i, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${clean || "main"}.py`;
}
export function downloadPython(content: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/x-python;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = pythonFilename(name);
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
