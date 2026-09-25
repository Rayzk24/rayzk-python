import { createClient } from "@supabase/supabase-js";
import { createAuthStorage, SESSION_KEY } from "./storage";
export const authStorage = createAuthStorage(localStorage, sessionStorage);
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url?.startsWith("https://") && key);
export const supabase = createClient(
  url || "https://unconfigured.supabase.co",
  key || "unconfigured",
  {
    auth: {
      storage: authStorage,
      storageKey: SESSION_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
