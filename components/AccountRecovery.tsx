"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

type RecoveryChallenge = { challengeId: string; resendAfter: number; message: string };
export default function AccountRecovery({ mode }: { mode: "verify-email" | "reset-password" | "forgot-password" | "resend-verification" | "recover-account" }) {
  const [step, setStep] = useState<"email" | "code" | "password" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  useEffect(() => {
    // Retired email links must not leave credentials in browser history.
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }, []);
  useEffect(() => {
    if (!resendSeconds) return;
    const timer = setTimeout(() => setResendSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  async function requestCode() {
    const result = await api<RecoveryChallenge>("/auth/forgot-password", {
      method: "POST", auth: false, body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    if (!result.challengeId) throw new Error("The recovery service needs updating. Restart the backend and try again.");
    setChallengeId(result.challengeId); setCode(""); setResendSeconds(result.resendAfter ?? 60);
    setMessage(result.message); setStep("code");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      if (step === "email") await requestCode();
      else if (step === "code") {
        const result = await api<{ resetToken: string; message: string }>("/auth/recovery-otp/verify", {
          method: "POST", auth: false, body: JSON.stringify({ challengeId, code }),
        });
        if (!result.resetToken) throw new Error("Unable to verify recovery. Request a new code.");
        setResetToken(result.resetToken); setCode(""); setChallengeId("");
        setMessage(result.message); setStep("password");
      } else if (step === "password") {
        if (password !== confirmation) throw new Error("Passwords do not match.");
        if (password.length < 12 || new TextEncoder().encode(password).length > 72) throw new Error("Use at least 12 characters and at most 72 UTF-8 bytes.");
        const result = await api<{ message: string }>("/auth/reset-password", {
          method: "POST", auth: false, body: JSON.stringify({ token: resetToken, password }),
        });
        setResetToken(""); setPassword(""); setConfirmation(""); setMessage(result.message); setStep("done");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError(""); setMessage("");
    try { await requestCode(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to resend code."); }
    finally { setBusy(false); }
  }
  function startOver() {
    setStep("email"); setCode(""); setChallengeId(""); setResetToken(""); setPassword("");
    setConfirmation(""); setError(""); setMessage("");
  }
  if (mode === "verify-email") return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
    <section className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
      <h1 className="text-2xl font-bold mb-6">Use an email code</h1>
      <p className="mb-6 text-slate-600">Verification links have been replaced by email codes. Sign in with your email and password to receive a 6-digit code.</p>
      <nav className="flex flex-col gap-3 text-red-700"><a href="/">Continue to sign in</a><a href="/auth/recover-account">Set up or recover your account</a></nav>
    </section>
  </main>;
  return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
    <section className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
      <h1 className="text-2xl font-bold mb-6">{step === "code" ? "Enter your recovery code" : step === "password" ? "Set your new password" : step === "done" ? "Password updated" : "Set up or recover your account"}</h1>
      {step !== "done" && <p className="mb-5 text-sm text-slate-600">{step === "email"
        ? "Enter your account email. We’ll send a 6-digit code to verify it before you set a new password."
        : step === "code" ? `Enter the code sent to ${email.trim()}. It expires in 10 minutes. Only the latest code works.`
        : "Choose a new password. Existing sessions will be signed out. Authenticator two-factor authentication stays enabled."}</p>}
      {message && <p role="status" className="mb-4 text-green-700">{message}</p>}
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      {step !== "done" && <form onSubmit={submit} className="space-y-4">
        {step === "email" && <label className="block">Email<input className="field mt-2" disabled={busy} required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>}
        {step === "code" && <label className="block">6-digit recovery code<input className="field mt-2 tracking-widest font-mono" disabled={busy} required autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} /></label>}
        {step === "password" && <>
          <label className="block">New password<input className="field mt-2" disabled={busy} required type="password" minLength={12} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <p className="text-xs text-slate-600">Use at least 12 characters and at most 72 UTF-8 bytes.</p>
          <label className="block">Confirm password<input className="field mt-2" disabled={busy} required type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
        </>}
        <button className="btn-primary w-full" disabled={busy || (step === "email" && resendSeconds > 0)}>{busy ? "Please wait…" : step === "email" ? resendSeconds ? `Send code in ${resendSeconds}s` : "Send recovery code" : step === "code" ? "Verify code" : "Save password"}</button>
      </form>}
      {step === "code" && <button type="button" disabled={busy || resendSeconds > 0} onClick={resend} className="mt-4 text-sm text-red-700 disabled:opacity-50">{resendSeconds ? `Resend code in ${resendSeconds}s` : "Resend code"}</button>}
      <nav className="mt-6 flex flex-col gap-3 text-sm text-red-700">
        <a href="/">Back to sign in</a>
        {(step === "code" || step === "password") && <button type="button" disabled={busy} onClick={startOver} className="text-left">Start recovery again</button>}
      </nav>
    </section>
  </main>;
}
