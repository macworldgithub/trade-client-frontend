"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export default function AccountRecovery({ mode }: { mode: "verify-email" | "reset-password" | "forgot-password" | "resend-verification" | "recover-account" }) {
  const [token, setToken] = useState<string | null>(null);
  const tokenRead = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const needsToken = mode === "verify-email" || mode === "reset-password";
  useEffect(() => {
    // StrictMode replays effects. The fragment is scrubbed after the first read,
    // so a second read would erase the token already held in component state.
    if (tokenRead.current) return;
    tokenRead.current = true;
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }, []);

  const titles = { "verify-email": "Verify your email", "reset-password": "Set your password and verify email", "forgot-password": "Set up or recover your account", "resend-verification": "Set up or recover your account", "recover-account": "Set up or recover your account" };
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if (needsToken && !token) { setError("Open the full link from your account email or request a new one."); return; }
    if (mode === "reset-password" && password !== confirmation) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const body = mode === "verify-email" ? { token } : mode === "reset-password" ? { token, password } : { email };
      const endpoint = needsToken ? mode : "forgot-password";
      const result = await api<{ message: string }>(`/auth/${endpoint}`, { method: "POST", auth: false, body: JSON.stringify(body) });
      setMessage(result.message); setDone(true); setToken(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
    <section className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
      <h1 className="text-2xl font-bold mb-6">{titles[mode]}</h1>
      {!done && <p className="mb-5 text-sm text-slate-600">{needsToken
        ? mode === "reset-password" ? "Saving your password also verifies your email. Existing sessions will be signed out; enabled 2FA remains active." : "Confirm your email address to finish registration."
        : "Enter your account email. We’ll send one secure link to set a password and verify your email together."}</p>}
      {message && <p role="status" className="mb-4 text-green-700">{message}</p>}
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      {!done && <form onSubmit={submit} className="space-y-4">
        {needsToken && token === null && <p role="status" className="text-slate-600">Reading your account link…</p>}
        {needsToken && token === "" && <p className="text-red-700">This link is missing its {mode === "reset-password" ? "password reset" : "verification"} token. Request a new email below.</p>}
        {!needsToken && <label className="block">Email<input className="field mt-2" required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>}
        {mode === "reset-password" && <>
          <label className="block">New password<input className="field mt-2" required type="password" minLength={12} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <p className="text-xs text-slate-600">Use at least 12 characters and at most 72 UTF-8 bytes.</p>
          <label className="block">Confirm password<input className="field mt-2" required type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
        </>}
        <button className="btn-primary w-full" disabled={busy || (needsToken && !token)}>{busy ? "Please wait…" : mode === "verify-email" ? "Verify email" : mode === "reset-password" ? "Save password and verify email" : "Send account setup link"}</button>
      </form>}
      <nav className="mt-6 flex flex-col gap-3 text-sm text-red-700">
        <a href="/">Back to sign in</a>
        {needsToken && <a href="/auth/recover-account">Request a new account setup link</a>}
      </nav>
    </section>
  </main>;
}
