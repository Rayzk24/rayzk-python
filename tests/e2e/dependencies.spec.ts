import { test, expect, login, run } from "./fixture";

test("automatic dependencies: real numpy, aliases, from imports, caching, REPL and compatibility", async ({ page }) => {
  await login(page);
  const console = page.locator(".console-output");
  await run(page, '# import numpy\nimport math, random\nprint("standard", math.sqrt(9))\nprint("import numpy")');
  await expect(console).toContainText("standard 3.0");
  let downloads = 0;
  page.on("request", (request) => { if (request.url().includes("numpy-") && request.url().endsWith(".whl")) downloads++; });
  await run(page, 'import numpy as np\nfrom numpy import array\nprint(array([1, 2, 3]))');
  await expect(console).toContainText("[1 2 3]", { timeout: 60000 });
  expect(downloads).toBe(1);
  await run(page, 'import numpy\nprint("cached", numpy.sum([1, 2, 3]))');
  await expect(console).toContainText("cached 6");
  expect(downloads).toBe(1);
  await run(page, 'import snowballstemmer\nprint("stem", snowballstemmer.stemmer("english").stemWord("running"))');
  await expect(console).toContainText("stem run", { timeout: 60000 });
  await run(page, "import rayzk_nonexistent_library");
  await expect(console).toContainText("ModuleNotFoundError");
  await expect(console).toContainText("Aucun package PyPI arbitraire");
  await run(page, "import tensorflow");
  await expect(console).toContainText("No module named 'tensorflow'");
  await run(page, "import pygame");
  await expect(console).toContainText("HTMLCanvasElement");
  const repl = page.getByLabel("Expression Python");
  await repl.fill("def graphic():");
  await repl.press("Enter");
  await expect(repl).toBeEnabled();
  await repl.fill("    import pygame");
  await repl.press("Enter");
  await expect(repl).toBeEnabled();
  await repl.fill("6 * 7");
  await repl.press("Enter");
  await expect(console).toContainText("\n42\n");
  await run(page, 'import numpy\nwhile True: pass');
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByRole("button", { name: "Exécuter" })).toBeEnabled({ timeout: 60000 });
  await run(page, 'name = input("Nom : ")\nprint("Bonjour", name)');
  await page.getByLabel("Réponse Python").fill("Rayzk");
  await page.getByLabel("Réponse Python").press("Enter");
  await expect(console).toContainText("Bonjour Rayzk");
  await page.getByLabel("Expression Python").fill("12 ** 2");
  await page.getByLabel("Expression Python").press("Enter");
  await expect(console).toContainText("144");
  await page.getByLabel("Expression Python").fill("from numpy import array");
  await page.getByLabel("Expression Python").press("Enter");
  await expect(page.getByRole("button", { name: "Exécuter" })).toBeEnabled({ timeout: 60000 });
  await page.getByLabel("Expression Python").fill("array([4, 5])");
  await page.getByLabel("Expression Python").press("Enter");
  await expect(console).toContainText("\narray([4, 5])\n");
});

test("dependency loading: Run guard, Stop, stale downloads and recovery", async ({ page }) => {
  await login(page);
  let requested = false;
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/numpy-*.whl", async (route) => {
    requested = true;
    await blocked;
    await route.abort("failed");
  });
  await run(page, "import numpy");
  await expect(page.locator(".dependency-status")).toContainText("numpy");
  await expect.poll(() => requested).toBe(true);
  await expect(page.getByRole("button", { name: "Exécuter" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Stop", exact: true })).toBeEnabled();
  for (const theme of ["dark", "light"]) {
    for (const width of [1440, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator(".dependency-status")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const box = await page.getByRole("button", { name: "Exécuter" }).boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      if (width === 1440 || width === 375)
        await page.screenshot({ path: `work/dependencies-${theme}-${width}.png` });
    }
    if (theme === "dark") await page.getByLabel("Passer au thème clair").click();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  release();
  await expect(page.getByRole("button", { name: "Exécuter" })).toBeEnabled({ timeout: 60000 });
  await expect(page.locator(".dependency-status")).toHaveCount(0);
  await run(page, "import numpy");
  await expect(page.locator(".console-output")).toContainText("Impossible de préparer", { timeout: 60000 });
  await expect(page.getByRole("button", { name: "Exécuter" })).toBeEnabled();
  await run(page, 'print("recovered")');
  await expect(page.locator(".console-output")).toContainText("recovered");
});
