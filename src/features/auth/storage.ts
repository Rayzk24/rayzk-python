export const SESSION_KEY = "rayzk-python.auth";
const MODE_KEY = "rayzk-python.remember";
export function createAuthStorage(local: Storage, session: Storage) {
  const persistent = () =>
    session.getItem(MODE_KEY) !== "no" && local.getItem(MODE_KEY) === "yes";
  return {
    remember(value: boolean) {
      local.removeItem(SESSION_KEY);
      session.removeItem(SESSION_KEY);
      local.setItem(MODE_KEY, value ? "yes" : "no");
      session.setItem(MODE_KEY, value ? "yes" : "no");
    },
    getItem(key: string) {
      return (persistent() ? local : session).getItem(key);
    },
    setItem(key: string, value: string) {
      (persistent() ? local : session).setItem(key, value);
    },
    removeItem(key: string) {
      local.removeItem(key);
      session.removeItem(key);
    },
  };
}
