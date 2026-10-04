import { describe, expect, it, vi } from "vitest";
import type { Lockfile, PyodideInterface } from "pyodide";
import { createDependencyLoader, explainImportError, resolveDependencies } from "./dependencies";

const catalog = {
  numpy: { name: "numpy", imports: ["numpy"] },
  pillow: { name: "pillow", imports: ["PIL"] },
} as unknown as Lockfile["packages"];

describe("Python dependencies", () => {
  it("resolves official mappings, deduplicates and skips loaded packages", () => {
    expect(resolveDependencies(["numpy", "numpy", "PIL", "math"], catalog, {}))
      .toEqual({ bundled: ["numpy", "pillow"], pure: [] });
    expect(resolveDependencies(["numpy"], catalog, { numpy: "default channel" }).bundled).toEqual([]);
  });
  it("only permits reviewed pure Python distributions and explains native/unknown imports", () => {
    expect(resolveDependencies(["unknown", "tensorflow", "snowballstemmer"], catalog, {}))
      .toEqual({ bundled: [], pure: ["snowballstemmer==2.2.0"] });
    expect(() => resolveDependencies(["pygame"], catalog, {})).toThrow("HTMLCanvasElement");
    expect(explainImportError("ModuleNotFoundError: No module named 'unknown'")).toContain("Aucun package PyPI arbitraire");
    expect(explainImportError("ZeroDivisionError")).toBe("");
  });
  it("keeps preparation quiet without external packages and reports network failure", async () => {
    let imports: string[] = [];
    const detect = Object.assign(() => JSON.stringify(imports), { destroy: vi.fn() });
    const python = {
      runPython: vi.fn(), globals: { get: () => detect }, loadedPackages: {},
      loadPackagesFromImports: vi.fn().mockRejectedValue(new Error("Failed to fetch")),
    } as unknown as PyodideInterface;
    const status = vi.fn();
    const prepare = createDependencyLoader(python, catalog, status);
    await prepare('print("hello")');
    expect(status).not.toHaveBeenCalled();
    expect(python.loadPackagesFromImports).not.toHaveBeenCalled();
    imports = ["numpy"];
    await expect(prepare("import numpy")).rejects.toThrow("connexion réseau");
    expect(status.mock.calls).toEqual([["Préparation de numpy…"], [""]]);
    expect(detect.destroy).toHaveBeenCalledTimes(2);
  });
});
