import { test as base, expect, type Page } from "@playwright/test";
import type { PythonDocument } from "../../src/features/documents/model";
const uid = "a1111111-1111-4111-a111-111111111111";
const user = {
  id: uid,
  email: "test@example.invalid",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const session = () => ({
  user,
  access_token: `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })).toString("base64url")}.test`,
  refresh_token: "test-only-refresh",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
});
export const test = base.extend<{ backend: Map<string, PythonDocument> }>({
  backend: [
    async ({ page }, use) => {
      const docs = new Map<string, PythonDocument>();
      docs.set("b1111111-1111-4111-a111-111111111111", {
        id: "b1111111-1111-4111-a111-111111111111",
        user_id: uid,
        kind: "draft",
        name: "Brouillon",
        content: 'print("hello")\n',
        revision: 1,
        updated_at: new Date().toISOString(),
      });
      await page.route("**/auth/v1/**", async (route) => {
        const url = route.request().url();
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            url.includes("/user")
              ? user
              : url.includes("/logout")
                ? {}
                : session(),
          ),
        });
      });
      await page.route("**/rest/v1/python_documents**", async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        const id = url.searchParams.get("id")?.replace("eq.", "");
        let result: PythonDocument | PythonDocument[] | null = null;
        if (req.method() === "POST") {
          const doc = req.postDataJSON() as PythonDocument;
          result = {
            ...doc,
            revision: 1,
            updated_at: new Date().toISOString(),
          };
          docs.set(doc.id, result);
        } else if (req.method() === "PATCH") {
          const current = docs.get(id!);
          if (
            current &&
            `eq.${current.revision}` === url.searchParams.get("revision")
          ) {
            result = {
              ...current,
              ...req.postDataJSON(),
              revision: current.revision + 1,
              updated_at: new Date().toISOString(),
            };
            docs.set(current.id, result as PythonDocument);
          }
        } else if (req.method() === "DELETE") {
          result = docs.has(id!) ? [docs.get(id!)!] : [];
          docs.delete(id!);
        } else result = id ? (docs.get(id) ?? null) : [...docs.values()];
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(result),
        });
      });
      await use(docs);
    },
    { auto: true },
  ],
});
export { expect };
export async function login(page: Page, remember = false) {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill("test@example.invalid");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("test-only-password");
  if (remember) await page.getByLabel("Rester connecté").check();
  await page.getByRole("button", { name: "Connexion", exact: true }).click();
  await expect(page.getByLabel("Code Python")).toBeVisible();
  await expect(page.getByRole("button", { name: "Exécuter" })).toBeEnabled({
    timeout: 60000,
  });
}
export async function code(page: Page, value: string) {
  const editor = page.getByLabel("Code Python");
  await editor.fill(value);
}
export async function run(page: Page, value: string) {
  await code(page, value);
  await page.getByRole("button", { name: "Exécuter" }).click();
}
