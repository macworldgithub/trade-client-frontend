"use client";

import { useEffect, useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { backendApi } from "../lib/backend-api";

export default function TotpEnrollModal({ onClose }: { onClose: () => void }) {
  const [enabled, setEnabled] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    backendApi.auth.totpStatus().then(status => {
      setEnabled(status.enabled); setRemaining(status.recoveryCodesRemaining); setReady(true);
    }).catch(e => setError(e instanceof Error ? e.message : "Unable to load 2FA status."));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (enabled) {
        const result = await backendApi.auth.disableTotp(password, code);
        setEnabled(false); setMessage(result.message); setPassword(""); setCode("");
      } else if (setup) {
        const result = await backendApi.auth.confirmTotp(setup.factorId, code);
        setRecoveryCodes(result.recoveryCodes); setEnabled(true); setRemaining(result.recoveryCodes.length);
        setSetup(null); setPassword(""); setCode("");
      } else {
        setSetup(await backendApi.auth.enrollTotp(password)); setPassword("");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }

  function downloadCodes() {
    const blob = new Blob([`Trade Client recovery codes\nStore securely. Each code works once.\n\n${recoveryCodes.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "trade-client-recovery-codes.txt";
    a.click(); URL.revokeObjectURL(url);
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-slate-950/70 backdrop-blur-md">
    <section role="dialog" aria-modal="true" aria-labelledby="totp-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
      <header className="flex items-center justify-between p-6 bg-slate-900 text-white">
        <h2 id="totp-title" className="font-bold flex items-center gap-2"><ShieldCheck size={20} /> Two-factor authentication</h2>
        {!busy && (!recoveryCodes.length || saved) && <button aria-label="Close" onClick={onClose}><X size={20} /></button>}
      </header>
      <div className="p-6 space-y-5">
        {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{error}</p>}
        {message && <p role="status" className="text-sm text-green-700">{message}</p>}
        {!ready && !error && <p>Loading account security…</p>}
        {recoveryCodes.length > 0 ? <>
          <h3 className="font-bold text-lg">2FA enabled. Save your recovery codes.</h3>
          <p className="text-sm text-slate-600">These codes are shown once. Store them in a password manager or another secure place. Each code can replace one authenticator code if you lose your phone.</p>
          <ul className="rounded-xl bg-slate-100 p-4 grid gap-2 font-mono text-sm select-all">{recoveryCodes.map(value => <li key={value}>{value}</li>)}</ul>
          <button className="btn-primary w-full" onClick={downloadCodes}>Download recovery codes</button>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} /> I have saved these codes securely.</label>
          <button className="btn-primary w-full disabled:opacity-50" disabled={!saved} onClick={onClose}>Done</button>
        </> : ready && <form onSubmit={submit} className="space-y-4">
          {setup ? <>
            <h3 className="text-lg font-bold">Scan with your authenticator app</h3>
            <p className="text-sm text-slate-600">Add an account in your authenticator app and scan this QR code. Setup expires after 10 minutes.</p>
            <img src={setup.qrCode} alt="Authenticator setup QR code" width={240} height={240} className="mx-auto" />
            <details className="text-sm"><summary className="cursor-pointer">Enter the setup key manually</summary><code className="block mt-2 break-all select-all">{setup.secret}</code></details>
            <label className="block text-sm font-semibold">6-digit code<input required className="field mt-2 font-mono" autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} /></label>
            <p className="text-xs text-slate-500">Once enabled, other devices will be signed out. A code that has just been used cannot be reused; wait for the next code.</p>
          </> : <>
            <h3 className="text-lg font-bold">{enabled ? "2FA is enabled" : "Protect your account"}</h3>
            <p className="text-sm text-slate-600">{enabled ? `${remaining} recovery codes remain. To disable 2FA, confirm your password and an unused authenticator or recovery code. Other devices will be signed out.` : "After entering your password, scan a QR code and confirm the six-digit code to enable 2FA. You will also receive recovery codes."}</p>
            <label className="block text-sm font-semibold">Current password<input required className="field mt-2" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
            {enabled && <label className="block text-sm font-semibold">Authenticator or recovery code<input required className="field mt-2 font-mono" autoComplete="one-time-code" maxLength={23} value={code} onChange={e => setCode(e.target.value.replace(/[^a-fA-F0-9-]/g, ""))} /></label>}
          </>}
          <button className="btn-primary w-full disabled:opacity-50" disabled={busy}>{busy ? "Please wait…" : setup ? "Verify and enable 2FA" : enabled ? "Disable 2FA" : "Start setup"}</button>
          {setup && <button type="button" className="text-sm text-red-600" disabled={busy} onClick={() => { setSetup(null); setCode(""); setError(""); }}>Restart setup</button>}
        </form>}
      </div>
    </section>
  </div>;
}
