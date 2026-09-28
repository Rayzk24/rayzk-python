import { isCodeType } from "./metadata";

export type LibraryFilters = { type: string; topic: string; text: string };
export const emptyLibraryFilters: LibraryFilters = { type: "", topic: "", text: "" };

export function readLibraryFilters(storage: Pick<Storage, "getItem">, key: string): LibraryFilters {
  try {
    const stored = JSON.parse(storage.getItem(key) || "{}");
    return {
      type: isCodeType(stored.type) ? stored.type : "",
      topic: typeof stored.topic === "string" ? stored.topic : "",
      text: typeof stored.text === "string" ? stored.text : "",
    };
  } catch {
    return emptyLibraryFilters;
  }
}

export function validTopicFilter(value: string, options: string[]) {
  return !value || options.includes(value);
}
