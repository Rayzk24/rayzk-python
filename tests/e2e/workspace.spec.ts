import { readFile } from "node:fs/promises";
import { test, expect, login, code, run } from "./fixture";
test("real Pyodide: stdout, Unicode input, REPL, traceback, reset and infinite-loop Stop", async ({
  page,
}) => {
  await login(page);
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  const out = page.getByTestId("console-output");
  await run(page, 'print("hello")');
  await expect(out).toContainText("hello");
  await run(page, 'name = input("Quel est ton nom ?")\nprint("Bonjour", name)');
  await expect(
    page.getByText("Quel est ton nom ?", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Réponse Python").fill("Élodie 🐍");
  await page.getByLabel("Réponse Python").press("Enter");
  await expect(out).toContainText("Bonjour Élodie 🐍");
  await run(page, "for i in range(5):\n    print(i)");
  await expect(out).toContainText("0\n1\n2\n3\n4");
  await page.getByLabel("Expression Python").fill("12 ** 2");
  await page.getByLabel("Expression Python").press("Enter");
  await expect(out).toContainText("144");
  await page.getByLabel("Expression Python").fill('len("Rayzk")');
  await page.getByLabel("Expression Python").press("Enter");
  await expect(out).toContainText("\n5\n");
  await page.getByLabel("Expression Python").fill("name");
  await page.getByLabel("Expression Python").press("Enter");
  await expect(out).toContainText("'Élodie 🐍'");
  await run(page, 'print("avant")\n1 / 0');
  await expect(out).toContainText("ZeroDivisionError");
  await expect(page.locator(".cm-error-line")).toHaveCount(1);
  await page.getByRole("button", { name: 'File "main.py", line 2' }).click();
  await run(page, "while True:\n    pass");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByRole("button", { name: "Exécuter" })).toBeEnabled({
    timeout: 60000,
  });
  await run(page, 'print("après stop")');
  await expect(out).toContainText("après stop");
  await page.getByRole("button", { name: "Reset Python", exact: true }).click();
  await expect(page.getByRole("button", { name: "Exécuter" })).toBeEnabled({
    timeout: 60000,
  });
  await page.getByLabel("Expression Python").fill("name");
  await page.getByLabel("Expression Python").press("Enter");
  await expect(out).toContainText("NameError");
});
test("autosave, offline recovery, library, import confirmation and export", async ({
  page,
  backend,
}) => {
  await login(page);
  await code(page, "# sauvegarde\nprint(42)");
  await expect(page.getByRole("status")).toHaveText("Sauvegardé");
  expect(
    [...backend.values()].find((d) => d.kind === "draft")?.content,
  ).toContain("42");
  await page.reload();
  await expect(page.getByLabel("Code Python")).toContainText("print(42)");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.getByLabel("Nom", { exact: true }).fill("Boucles");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Sauvegardé");
  await page.getByLabel("Ouvrir la bibliothèque").click();
  await page.getByLabel("Renommer Boucles").click();
  await page.getByLabel("Nom", { exact: true }).fill("Tri insertion");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Enregistrer" })
    .click();
  await expect(page.getByRole("status")).toHaveText("Sauvegardé");
  await page
    .getByRole("button", { name: "Brouillon Ton espace de travail principal" })
    .click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "test.py",
      mimeType: "text/x-python",
      buffer: Buffer.from('print("importé")'),
    });
  await expect(page.getByRole("dialog")).toContainText(
    "Remplacer le brouillon",
  );
  await page.getByRole("button", { name: "Remplacer", exact: true }).click();
  await expect(page.getByLabel("Code Python")).toContainText("importé");
  const downloadPromise = page.waitForEvent("download");
  await page.getByLabel("Télécharger .py").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("main.py");
  expect(await readFile((await download.path())!, "utf8")).toBe(
    'print("importé")',
  );
  await expect(page.getByRole("status")).toHaveText("Sauvegardé");
  await page.context().setOffline(true);
  await code(page, 'print("hors ligne")');
  await expect(page.getByRole("status")).toContainText("sauvegardé localement");
  await page.context().setOffline(false);
  await expect(page.getByRole("status")).toHaveText("Sauvegardé");
  expect(
    [...backend.values()].find((d) => d.kind === "draft")?.content,
  ).toContain("hors ligne");
  await page.getByLabel("Supprimer Tri insertion").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Supprimer", exact: true })
    .click();
  await expect(page.getByLabel("Supprimer Tri insertion")).toHaveCount(0);
});
test("auth storage choices, logout, themes and responsive widths", async ({
  page,
}) => {
  await login(page, false);
  expect(
    await page.evaluate(() => localStorage.getItem("rayzk-python.auth")),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      Boolean(sessionStorage.getItem("rayzk-python.auth")),
    ),
  ).toBe(true);
  await page.getByLabel("Passer au thème clair").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByLabel("Code Python")).toBeVisible();
  await expect(page.getByRole("button", { name: "Exécuter" })).toBeEnabled({
    timeout: 60000,
  });
  await page.getByLabel("Passer au thème sombre").click();
  for (const width of [375, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width < 700) {
      await page.getByRole("button", { name: "Console", exact: true }).click();
      await expect(page.getByLabel("Console Python")).toBeVisible();
      await page.getByRole("button", { name: "Éditeur", exact: true }).click();
    }
    await page.screenshot({ path: `test-results/workspace-dark-${width}.png` });
  }
  await page.getByLabel("Passer au thème clair").click();
  await page.screenshot({ path: "test-results/workspace-light-1440.png" });
  await page.getByLabel("Compte", { exact: true }).click();
  await page.getByRole("button", { name: "Déconnexion", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Connexion", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("rayzk-python.auth")),
  ).toBeNull();
  await login(page, true);
  expect(
    await page.evaluate(() =>
      Boolean(localStorage.getItem("rayzk-python.auth")),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => sessionStorage.getItem("rayzk-python.auth")),
  ).toBeNull();
});
test("empty and repeated input, multiline REPL, keyboard execution and stdout flood", async ({
  page,
}) => {
  await login(page);
  const out = page.getByTestId("console-output");
  await run(
    page,
    'a = input("Premier : ")\nb = input("Second : ")\nprint(repr(a), repr(b))',
  );
  await page.getByLabel("Réponse Python").press("Enter");
  await expect(page.getByText("Second :", { exact: true })).toBeVisible();
  await page.getByLabel("Réponse Python").fill("fin");
  await page.getByLabel("Réponse Python").press("Enter");
  await expect(out).toContainText("'' 'fin'");
  for (const command of [
    "def double(x):",
    "    return x * 2",
    "",
    "double(21)",
  ]) {
    await expect(page.getByLabel("Expression Python")).toBeEnabled();
    await page.getByLabel("Expression Python").fill(command);
    await page.getByLabel("Expression Python").press("Enter");
  }
  await expect(out).toContainText("42");
  await expect(page.getByRole("button", { name: "Exécuter" })).toBeEnabled();
  await code(page, 'print("raccourci")');
  await page.getByLabel("Code Python").press("ControlOrMeta+Enter");
  await expect(out).toContainText("raccourci");
  await run(page, 'while True:\n    print("sortie")');
  await expect(out).toContainText("sortie");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByRole("button", { name: "Exécuter" })).toBeEnabled({
    timeout: 60000,
  });
});

test("visual polish: title, login controls and input answer in both themes", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Rayzk Python");
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  const checkbox = page.getByRole("checkbox", { name: "Rester connecté sur cet appareil" });
  await checkbox.check();
  expect(await checkbox.evaluate((node) => getComputedStyle(node).appearance)).toBe("none");
  await page.screenshot({ path: "test-results/login-dark-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/login-dark-mobile.png" });
  await login(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const out = page.getByTestId("console-output");
  await run(page, 'print("hello")');
  await expect(out).toContainText("hello");
  await run(page, 'age = input("salut")\nprint(age)');
  await page.getByLabel("Réponse Python").fill("J'ai 10 ans");
  await page.getByLabel("Réponse Python").press("Enter");
  const answer = page.locator(".output-input-answer");
  await expect(answer).toContainText("J'ai 10 ans");
  expect(await answer.evaluate((node) => getComputedStyle(node).marginLeft)).not.toBe("0px");
  await page.getByLabel("Expression Python").fill("12 ** 2");
  await page.getByLabel("Expression Python").press("Enter");
  await expect(out).toContainText("144");
  await page.screenshot({ path: "test-results/console-dark.png" });
  await page.getByLabel("Passer au thème clair").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({ path: "test-results/console-light.png" });
  await page.getByLabel("Compte", { exact: true }).click();
  await page.getByRole("button", { name: "Déconnexion", exact: true }).click();
  await expect(page.getByRole("button", { name: "Connexion", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/login-light-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/login-light-mobile.png" });
});

test("console focus and CodeMirror occurrence highlights", async ({ page }) => {
  await login(page);
  const repl = page.getByLabel("Expression Python");
  const output = page.getByTestId("console-output");
  await repl.focus();
  for (const expression of ["12 ** 2", "len('Rayzk')", "6 * 7"]) {
    await expect(repl).toBeFocused();
    await repl.fill(expression);
    await repl.press("Enter");
    await expect(repl).toBeEnabled();
    await expect(repl).toBeFocused();
  }
  await expect(output).toContainText("144");
  await expect(output).toContainText("42");

  await run(page, 'first = input("Premier : ")\nsecond = input("Second : ")\nprint(first, second)');
  const answer = page.getByLabel("Réponse Python");
  await expect(answer).toBeFocused();
  await answer.fill("un");
  await answer.press("Enter");
  await expect(answer).toBeFocused();
  await answer.fill("deux");
  await answer.press("Enter");
  await expect(output).toContainText("un deux");
  await expect(repl).toBeFocused();

  await run(page, 'import time\ntime.sleep(0.5)\nanswer = input("Encore : ")');
  const editor = page.getByLabel("Code Python");
  await editor.click();
  await expect(answer).toBeVisible();
  await expect(editor).toBeFocused();

  await code(page, "rayzk = 1\nprint(rayzk)\nprint(rayzk)");
  await editor.press("ControlOrMeta+Home");
  for (let i = 0; i < 5; i++) await editor.press("Shift+ArrowRight");
  for (const theme of ["dark", "light"]) {
    await expect(page.locator(".cm-selectionMatch")).toHaveCount(2);
    const colors = await page.evaluate(() => ({
      selection: getComputedStyle(document.querySelector(".cm-selectionBackground")!).backgroundColor,
      match: getComputedStyle(document.querySelector(".cm-selectionMatch")!).backgroundColor,
    }));
    expect(colors.selection).not.toBe(colors.match);
    expect(colors.match).toMatch(/^rgba?\(10, 132, 255/);
    if (theme === "dark") await page.getByLabel("Passer au thème clair").click();
  }
  await editor.click();
  await expect(editor).toBeFocused();
});

test("editor search, replace and bracket matching in both themes", async ({ page }) => {
  await login(page);
  const editor = page.getByLabel("Code Python");
  await code(page, "lait = 1\nprint(lait)\nprint(lait)");
  await editor.press("ControlOrMeta+Home");
  for (let i = 0; i < 4; i++) await editor.press("Shift+ArrowRight");
  for (const theme of ["dark", "light"]) {
    await expect(page.locator(".cm-selectionMatch")).toHaveCount(2);
    const colors = await page.evaluate(() => ({
      selection: getComputedStyle(document.querySelector(".cm-selectionBackground")!).backgroundColor,
      match: getComputedStyle(document.querySelector(".cm-selectionMatch")!).backgroundColor,
    }));
    expect(colors.selection).not.toBe(colors.match);
    expect(colors.match).toMatch(/^rgba?\(10, 132, 255/);
    if (theme === "dark") await page.getByLabel("Passer au thème clair").click();
  }

  await editor.press("ControlOrMeta+f");
  const find = page.getByRole("textbox", { name: "Rechercher" });
  const replace = page.getByRole("textbox", { name: "Remplacer par" });
  await expect(find).toBeFocused();
  await expect(find).toHaveValue("lait");
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.locator(".cm-searchMatch-selected")).toHaveCount(1);
  await page.getByRole("button", { name: "Précédent" }).click();
  await expect(page.locator(".cm-searchMatch-selected")).toHaveCount(1);
  await replace.fill("eau");
  await page.getByRole("button", { name: "Remplacer", exact: true }).click();
  await expect(editor).toContainText("eau");
  await page.getByRole("button", { name: "Tout remplacer" }).click();
  await expect(editor).not.toContainText("lait");
  await expect(editor).toContainText("print(eau)");
  await find.fill("eau");
  await replace.fill("");
  await page.getByRole("button", { name: "Tout remplacer" }).click();
  await expect(editor).not.toContainText("eau");

  await find.press("Escape");
  await editor.focus();
  await editor.press("ControlOrMeta+h");
  await expect(find).toBeFocused();
  await page.getByRole("button", { name: "Fermer" }).click();
  await page.getByRole("button", { name: "Rechercher et remplacer" }).click();
  await expect(find).toBeFocused();
  await expect(page.getByRole("button", { name: "Suivant" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Précédent" })).toBeVisible();
  await page.getByRole("button", { name: "Fermer" }).click();

  for (const theme of ["light", "dark"]) {
    await code(page, "value = ([{}])");
    for (const steps of [9, 10, 11]) {
      await editor.press("ControlOrMeta+Home");
      for (let i = 0; i < steps; i++) await editor.press("ArrowRight");
      await expect(page.locator(".cm-matchingBracket")).toHaveCount(2);
      const color = await page.locator(".cm-matchingBracket").first().evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      );
      expect(color).toMatch(/^rgba?\(10, 132, 255/);
    }
    if (theme === "light") await page.getByLabel("Passer au thème sombre").click();
  }
  await editor.press("ControlOrMeta+f");
  await expect(find).toBeFocused();
  expect(await page.locator(".cm-panels").evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  )).not.toBe("rgba(0, 0, 0, 0)");
});

test("whitespace selections and literal operator typography in both themes", async ({ page }) => {
  await login(page);
  const editor = page.getByLabel("Code Python");
  for (const theme of ["dark", "light"]) {
    for (const selection of [" ", "    ", "\t", "\n", "lait", " lait"]) {
      await code(page, `${selection}\nx\n${selection}\nx\n${selection}`);
      await editor.press("ControlOrMeta+Home");
      await expect(page.locator(".cm-selectionMatch")).toHaveCount(0);
      for (let i = 0; i < selection.length; i++) await editor.press("Shift+ArrowRight");
      await expect(page.locator(".cm-selectionMatch")).toHaveCount(/\S/.test(selection) ? 2 : 0);
    }
    await code(page, "# != == >= <= -> => ===");
    await expect(editor).toHaveText("# != == >= <= -> => ===");
    expect(await editor.evaluate((node) => getComputedStyle(node).fontVariantLigatures)).toBe("none");
    const features = await editor.evaluate((node) => getComputedStyle(node).fontFeatureSettings);
    for (const feature of ["liga", "clig", "dlig", "calt"]) expect(features).toContain(`"${feature}" 0`);
    if (theme === "dark") await page.getByLabel("Passer au thème clair").click();
  }
});

test("run shortcut is contextual and never submits REPL or pending input", async ({ page }) => {
  await login(page);
  const editor = page.getByLabel("Code Python");
  const repl = page.getByLabel("Expression Python");
  const output = page.getByTestId("console-output");
  await code(page, 'count = globals().get("count", 0) + 1\nprint("execution", count)');
  await editor.press("ControlOrMeta+Enter");
  await expect(output).toContainText("execution 1");
  await repl.fill('print("REPL-not-submitted")');
  await repl.press("ControlOrMeta+Enter");
  await expect(output).toContainText("execution 2");
  await expect(output).not.toContainText("REPL-not-submitted");
  await expect(repl).toBeEnabled();
  await editor.press("ControlOrMeta+f");
  const find = page.getByRole("textbox", { name: "Rechercher" });
  await find.fill("count");
  await find.press("ControlOrMeta+Enter");
  const replace = page.getByRole("textbox", { name: "Remplacer par" });
  await replace.fill("counter");
  await replace.press("ControlOrMeta+Enter");
  await page.getByRole("button", { name: "Fermer" }).click();
  await repl.fill("count");
  await repl.press("Enter");
  await expect(output).toContainText(">>> count\n2\n");
  await expect(output).not.toContainText("execution 3");
  await repl.fill("12 ** 2");
  await repl.press("Enter");
  await expect(output).toContainText("144");

  await run(page, 'name = input("Nom : ")\nprint("Bonjour", name)');
  const answer = page.getByLabel("Réponse Python");
  await expect(answer).toBeFocused();
  await answer.fill("Rayzk");
  await answer.press("ControlOrMeta+Enter");
  await expect(answer).toBeVisible();
  await expect(answer).toHaveValue("Rayzk");
  await expect(output).not.toContainText("Bonjour Rayzk");
  await editor.press("ControlOrMeta+Enter");
  await expect(answer).toBeVisible();
  await answer.press("Enter");
  await expect(output).toContainText("Bonjour Rayzk");
});

test("search panel polish preserves options, keyboard focus and compact layouts", async ({ page }) => {
  await login(page);
  await code(page, "lait Lait laitier\nlait");
  await page.getByLabel("Code Python").press("ControlOrMeta+f");
  const find = page.getByRole("textbox", { name: "Rechercher" });
  await find.fill("lait");
  await find.press("ArrowRight");
  await expect(page.locator(".cm-searchMatch")).toHaveCount(4);
  await find.press("Tab");
  await expect(page.getByRole("button", { name: "Suivant" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Précédent" })).toBeFocused();
  const caseOption = page.getByRole("checkbox", { name: "Respecter la casse" });
  await caseOption.focus();
  await page.keyboard.press("Space");
  await expect(caseOption).toBeChecked();
  await expect(page.locator(".cm-searchMatch")).toHaveCount(3);
  await page.getByRole("checkbox", { name: "Mot entier" }).check();
  await expect(page.locator(".cm-searchMatch")).toHaveCount(2);
  await page.getByRole("checkbox", { name: "Expression régulière" }).check();
  await find.fill("lait|Lait");
  await find.press("ArrowRight");
  await expect(page.locator(".cm-searchMatch")).toHaveCount(3);
  expect(await caseOption.evaluate((node) => getComputedStyle(node).appearance)).toBe("none");
  for (const theme of ["dark", "light"]) {
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(find).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator(".cm-search").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
      await find.focus();
      await expect(find).toBeFocused();
      await page.screenshot({ path: `test-results/search-panel-${theme}-${width}.png` });
    }
    if (theme === "dark") await page.getByLabel("Passer au thème clair").click();
  }
  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(find).toHaveCount(0);
});
