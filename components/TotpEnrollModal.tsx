"use client";

import { useState } from "react";
import {
  ShieldCheck,
  X,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import { backendApi } from "../lib/backend-api";

type Step = "intro" | "scan" | "verify" | "done";

type Props = {
  onClose: () => void;
};

export default function TotpEnrollModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("intro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Data from enrollTotp
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");

  // User input
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleStartEnroll = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await backendApi.auth.enrollTotp();
      setFactorId(result.factorId);
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setStep("scan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start 2FA setup.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await backendApi.auth.verifyTotp(factorId, code);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const STEPS: Step[] = ["intro", "scan", "verify"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-600/30">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Two-Factor Authentication</p>
              <p className="text-[10px] text-slate-400 font-medium">TOTP Authenticator Setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        {step !== "done" && (
          <div className="flex gap-1.5 px-6 pt-4">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  STEPS.indexOf(step) >= i ? "bg-red-600" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        )}

        <div className="px-6 py-6">

          {/* ── STEP 1: INTRO ── */}
          {step === "intro" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">Secure your account</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Two-factor authentication adds an extra layer of security. You will need an authenticator app on your phone.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Supported Apps
                </p>
                {["Google Authenticator", "Microsoft Authenticator", "Authy"].map((app) => (
                  <div
                    key={app}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <Smartphone size={15} className="text-slate-500 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700">{app}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3.5 border border-red-200 text-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                onClick={handleStartEnroll}
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-red-500/20 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>Begin Setup</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── STEP 2: SCAN QR ── */}
          {step === "scan" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">Scan the QR code</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Open your authenticator app, tap <strong>+</strong> or <strong>Add account</strong>, then scan this code.
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-3 rounded-2xl border-2 border-slate-200 bg-white shadow-inner">
                  {qrCode ? (
                    <img
                      src={qrCode}
                      alt="TOTP QR Code — scan with your authenticator app"
                      width={180}
                      height={180}
                      className="rounded-lg"
                    />
                  ) : (
                    <div className="w-[180px] h-[180px] flex items-center justify-center bg-slate-100 rounded-lg">
                      <Loader2 size={24} className="animate-spin text-slate-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Manual secret fallback */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Can't scan? Enter manually
                </p>
                <div className="flex items-center gap-2">
                  <KeyRound size={14} className="text-slate-400 shrink-0" />
                  <span className="font-mono text-xs text-slate-700 break-all flex-1 select-all leading-relaxed">
                    {secret}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                    title="Copy secret key"
                  >
                    {copied ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : (
                      <Copy size={14} className="text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep("verify")}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-red-500/20"
              >
                <span>I've scanned it</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── STEP 3: VERIFY CODE ── */}
          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">Confirm your code</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Enter the 6-digit code shown in your authenticator app to confirm setup is working.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  6-Digit Code *
                </label>
                <div className="relative">
                  <ShieldCheck size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    autoFocus
                    autoComplete="one-time-code"
                    className="field pl-10 tracking-[0.4em] font-mono text-xl text-center"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3.5 border border-red-200 text-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep("scan"); setError(""); }}
                  className="flex-1 py-3 text-sm font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-red-500/20 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify & Enable"}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP: DONE ── */}
          {step === "done" && (
            <div className="text-center space-y-5 py-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border-2 border-emerald-200 shadow-inner">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">2FA Enabled!</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Two-factor authentication is now active on your account. You'll be prompted for a code on your next login.
                </p>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                Your account is now protected
              </div>
              <button
                onClick={onClose}
                className="btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-red-500/20"
              >
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
