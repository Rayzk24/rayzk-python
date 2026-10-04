import type { Lockfile, PyodideInterface } from "pyodide";

// Explicit, reviewed import → distribution mappings only. Never infer a PyPI
// distribution from an arbitrary import (names need not match).
export const PURE_PYTHON_PACKAGES: Readonly<Record<string, string>> = {
  snowballstemmer: "snowballstemmer==2.2.0",
};
export const PYGAME_LIMITATION =
  "Pygame n’est pas pris en charge dans cet IDE : le rendu SDL de Pyodide exige un HTMLCanvasElement dans le DOM, indisponible dans notre Web Worker. pygame-ce est disponible dans Pyodide, mais son installation seule ne permet pas un aperçu graphique. Utilise un environnement Python local pour ce programme.";

export function resolveDependencies(
  imports: string[],
  catalog: Lockfile["packages"],
  loaded: Readonly<Record<string, string>>,
) {
  const bundled = new Set<string>();
  const pure = new Set<string>();
  for (const name of imports) {
    if (name === "pygame") throw new Error(PYGAME_LIMITATION);
    const entry = Object.values(catalog).find((pkg) => pkg.imports.includes(name));
    if (entry) {
      if (!loaded[entry.name]) bundled.add(entry.name);
    } else if (PURE_PYTHON_PACKAGES[name]) pure.add(PURE_PYTHON_PACKAGES[name]);
  }
  return { bundled: [...bundled], pure: [...pure] };
}

// Python's official parser handles aliases, from imports, comments and strings.
// Incomplete REPL suites must still reach InteractiveConsole unchanged.
const DETECT_IMPORTS = `
def _rayzk_missing_imports(source):
    import json, sys, importlib.util
    from pyodide.code import find_imports
    try:
        names = find_imports(source)
    except SyntaxError:
        return "[]"
    missing = []
    for name in names:
        if name in sys.stdlib_module_names or name in sys.modules:
            continue
        if importlib.util.find_spec(name) is None:
            missing.append(name)
    return json.dumps(missing)
`;

export function createDependencyLoader(
  python: PyodideInterface,
  catalog: Lockfile["packages"],
  status: (label: string) => void,
) {
  python.runPython(DETECT_IMPORTS);
  return async (code: string) => {
    const detect = python.globals.get("_rayzk_missing_imports");
    let imports: string[];
    try {
      imports = JSON.parse(String(detect(code))) as string[];
    } finally {
      detect.destroy();
    }
    const { bundled, pure } = resolveDependencies(imports, catalog, python.loadedPackages);
    if (!bundled.length && !pure.length) return;
    status(`Préparation de ${[...bundled, ...pure.map((pkg) => pkg.split("==")[0])].join(", ")}…`);
    try {
      if (bundled.length) {
        const failures: string[] = [];
        await python.loadPackagesFromImports(code, {
          messageCallback: () => {},
          errorCallback: (message) => failures.push(message),
        });
        if (failures.length || bundled.some((pkg) => !python.loadedPackages[pkg]))
          throw new Error(failures.join("\n") || "Chargement incomplet des bibliothèques.");
      }
      if (pure.length) {
        await python.loadPackage("micropip", { messageCallback: () => {}, errorCallback: () => {} });
        const micropip = python.pyimport("micropip");
        try {
          for (const pkg of pure) await micropip.install(pkg);
        } finally {
          micropip.destroy();
        }
      }
    } catch (error) {
      throw new Error(`Impossible de préparer les bibliothèques. Vérifie la connexion réseau ; les extensions natives doivent disposer d’une version WebAssembly compatible.\n${error instanceof Error ? error.message : String(error)}`, { cause: error });
    } finally {
      status("");
    }
  };
}

export function explainImportError(message: string): string {
  return message.includes("ModuleNotFoundError")
    ? "\nCette bibliothèque est inconnue, indisponible dans le navigateur ou absente du catalogue autorisé. Aucun package PyPI arbitraire n’est installé automatiquement.\n"
    : "";
}
