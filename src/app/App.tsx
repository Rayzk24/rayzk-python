import { lazy, Suspense, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../features/auth/client";
import { Login } from "../features/auth/Login";
import { useTheme } from "./useTheme";
const Workspace = lazy(() => import("./Workspace"));
export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  useEffect(() => {
    let live = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (live) {
        setSession(next);
        setLoading(false);
      }
    });
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (live) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  if (loading)
    return <div className="loading-screen">Ouverture de ton espace…</div>;
  return session ? (
    <Suspense
      fallback={<div className="loading-screen">Ouverture de l’éditeur…</div>}
    >
      <Workspace key={session.user.id} user={session.user} theme={theme} />
    </Suspense>
  ) : (
    <Login />
  );
}
