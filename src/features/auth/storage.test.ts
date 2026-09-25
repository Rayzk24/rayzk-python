import { describe, expect, it } from "vitest";
import { createAuthStorage, SESSION_KEY } from "./storage";
import { memoryStorage } from "../../test/memoryStorage";
describe("auth persistence", () => {
  it("keeps an unchecked session out of localStorage and loses it on a new browser session", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    const auth = createAuthStorage(local, session);
    auth.remember(false);
    auth.setItem(SESSION_KEY, "session");
    expect(local.getItem(SESSION_KEY)).toBeNull();
    expect(auth.getItem(SESSION_KEY)).toBe("session");
    expect(
      createAuthStorage(local, memoryStorage()).getItem(SESSION_KEY),
    ).toBeNull();
  });
  it("persists when checked and removes both copies on logout", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    const auth = createAuthStorage(local, session);
    auth.remember(true);
    auth.setItem(SESSION_KEY, "session");
    const reopened = createAuthStorage(local, memoryStorage());
    expect(reopened.getItem(SESSION_KEY)).toBe("session");
    reopened.removeItem(SESSION_KEY);
    expect(auth.getItem(SESSION_KEY)).toBeNull();
  });
  it("clears the old persistent session before selecting temporary mode", () => {
    const local = memoryStorage();
    const auth = createAuthStorage(local, memoryStorage());
    auth.remember(true);
    auth.setItem(SESSION_KEY, "old");
    auth.remember(false);
    expect(local.getItem(SESSION_KEY)).toBeNull();
  });
});
