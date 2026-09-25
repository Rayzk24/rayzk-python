import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { authStorage, configured, supabase } from "./client";
export function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      authStorage.remember(data.get("remember") === "on");
      const { error } = await supabase.auth.signInWithPassword({
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
      });
      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("Invalid login")
          ? "Email ou mot de passe incorrect."
          : "Connexion impossible. Vérifie le réseau, tes identifiants et la configuration Supabase.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <img src="/favicon.svg" alt="Rayzk" />
          <span>Python</span>
          <LockKeyhole size={18} />
        </div>
        <p className="eyebrow">ESPACE PERSONNEL</p>
        <h1>
          Une idée.
          <br />
          Quelques lignes.
        </h1>
        <p className="muted">Retrouve ton Python, là où tu l’as laissé.</p>
        <form onSubmit={(e) => void submit(e)}>
          <label>
            Email
            <input type="email" name="email" autoComplete="username" required />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label className="checkbox">
            <input type="checkbox" name="remember" />
            Rester connecté sur cet appareil
          </label>
          {(!configured || error) && (
            <p role="alert" className="error">
              {!configured
                ? "Configure .env.local pour connecter Supabase."
                : error}
            </p>
          )}
          <button className="primary" disabled={busy || !configured}>
            {busy ? "Connexion…" : "Connexion"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="login-foot">
          Ton compte Rayzk habituel. Ton espace Python.
        </p>
      </section>
      <span className="login-caption">RAYZK / PYTHON WORKSPACE</span>
    </main>
  );
}
