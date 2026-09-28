import { expect, it } from "vitest";
import { memoryStorage } from "../../test/memoryStorage";
import { emptyLibraryFilters, readLibraryFilters, validTopicFilter } from "./libraryFilters";

it("restores saved filters and safely ignores invalid local values", () => {
  const storage = memoryStorage();
  expect(readLibraryFilters(storage, "filters")).toEqual(emptyLibraryFilters);
  storage.setItem("filters", JSON.stringify({ type: "Entraînement", topic: "classes", text: "Pokémon" }));
  expect(readLibraryFilters(storage, "filters")).toEqual({ type: "Entraînement", topic: "classes", text: "Pokémon" });
  storage.setItem("filters", JSON.stringify({ type: "Inconnu", topic: 5, text: null }));
  expect(readLibraryFilters(storage, "filters")).toEqual(emptyLibraryFilters);
  storage.setItem("filters", "not JSON");
  expect(readLibraryFilters(storage, "filters")).toEqual(emptyLibraryFilters);
  expect(validTopicFilter("classes", ["classes"])).toBe(true);
  expect(validTopicFilter("deleted", ["classes"])).toBe(false);
});
