import { describe, expect, it } from "vitest";
import { documentMatches, existingTopics, resolveTopic } from "./metadata";
import { newDocument } from "./model";

describe("library metadata", () => {
  const legacy = { ...newDocument("user", "saved", "", "Ancien code"), revision: 1 };
  const classes = { ...newDocument("user", "saved", "", "Classes Pokémon"), code_type: "Entraînement" as const, topic: "Classes" };
  const other = { ...newDocument("user", "saved", "", "Boucles"), code_type: "Cours" as const, topic: "Boucles" };
  it("deduplicates topics while keeping the original display spelling", () => {
    expect(existingTopics([classes, { ...classes, topic: "  classes  " }, { ...classes, topic: "CLASSES" }, other]))
      .toEqual(["Boucles", "Classes"]);
    expect(resolveTopic("  CLASSES ", ["Classes"])).toBe("Classes");
    expect(resolveTopic("  Récursivité  ", [])).toBe("Récursivité");
    expect(resolveTopic("CLASSES", [])).toBe("Classes");
  });
  it("combines filters and keeps legacy documents in Tous", () => {
    expect(documentMatches(legacy, { type: "", topic: "", text: "" })).toBe(true);
    expect(documentMatches(legacy, { type: "Cours", topic: "", text: "" })).toBe(false);
    expect(documentMatches(classes, { type: "Entraînement", topic: "classes", text: "pokémon" })).toBe(true);
    expect(documentMatches(classes, { type: "Cours", topic: "classes", text: "" })).toBe(false);
    expect(documentMatches(classes, { type: "", topic: "classes", text: "CLASSES" })).toBe(true);
    expect(documentMatches(other, { type: "", topic: "classes", text: "" })).toBe(false);
  });
});
