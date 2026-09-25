import { describe, expect, it } from "vitest";
import { pythonFilename, readPythonFile } from "./files";
describe("Python files", () => {
  it("normalizes portable filenames", () => {
    expect(pythonFilename("../Tri récursif.py")).toBe("Tri-recursif.py");
    expect(pythonFilename("???")).toBe("main.py");
  });
  it("accepts UTF-8 Python and normalizes newlines", async () => {
    expect(
      await readPythonFile(new File(["# été\r\nprint(1)"], "test.py")),
    ).toBe("# été\nprint(1)");
  });
  it("rejects other extensions, binary and oversized files", async () => {
    await expect(readPythonFile(new File(["hi"], "a.exe"))).rejects.toThrow(
      "extension",
    );
    await expect(readPythonFile(new File(["\0"], "a.py"))).rejects.toThrow(
      "binaires",
    );
    await expect(
      readPythonFile(new File([new Uint8Array(1048577)], "a.py")),
    ).rejects.toThrow("1 Mio");
    await expect(
      readPythonFile(new File([new Uint8Array([255])], "a.py")),
    ).rejects.toThrow("UTF-8");
  });
});
