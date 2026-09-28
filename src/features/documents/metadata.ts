import type { PythonDocument } from "./model";

export const codeTypes = ["Cours", "Entraînement", "Projet", "Référence"] as const;
export type CodeType = (typeof codeTypes)[number];

export function normalizeTopic(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 60);
}

export function topicKey(value: string) {
  return normalizeTopic(value).toLocaleLowerCase("fr-FR");
}

export function existingTopics(documents: PythonDocument[]) {
  const topics = new Map<string, string>();
  for (const doc of documents) {
    const topic = normalizeTopic(doc.topic ?? "");
    if (doc.kind === "saved" && topic && !topics.has(topicKey(topic)))
      topics.set(topicKey(topic), topic);
  }
  return [...topics.values()].sort((a, b) => a.localeCompare(b, "fr"));
}

export function resolveTopic(value: string, topics: string[]) {
  const topic = normalizeTopic(value);
  const existing = topics.find((candidate) => topicKey(candidate) === topicKey(topic));
  if (existing) return existing;
  if (!topic) return null;
  if (topic === topic.toLocaleLowerCase("fr-FR") || topic === topic.toLocaleUpperCase("fr-FR")) {
    const lower = topic.toLocaleLowerCase("fr-FR");
    return lower.charAt(0).toLocaleUpperCase("fr-FR") + lower.slice(1);
  }
  return topic;
}

export function isCodeType(value: string): value is CodeType {
  return codeTypes.some((type) => type === value);
}

export function documentMatches(
  doc: PythonDocument,
  filters: { type: string; topic: string; text: string },
) {
  if (filters.type && doc.code_type !== filters.type) return false;
  if (filters.topic && topicKey(doc.topic ?? "") !== filters.topic) return false;
  const text = filters.text.normalize("NFKC").trim().toLocaleLowerCase("fr-FR");
  return !text || `${doc.name} ${doc.topic ?? ""}`.normalize("NFKC").toLocaleLowerCase("fr-FR").includes(text);
}
