"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AuthStep, LoginResponse } from "../lib/types";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Building,
  KeyRound,
  ShieldCheck,
  Truck,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";

type Props = {
  onLogin: (email: string, password: string) => Promise<AuthStep | null>;
  onRegister: (input: {
    email: string;
    fullName: string;
    password: string;
    role?: string;
    tradeAccountId?: string;
    rooftopId?: string;
  }) => Promise<AuthStep | null>;
  notice?: string;
};

export default function LoginPage({ onLogin, onRegister, notice: externalNotice }: Props) {
  const { verifyTotp, verifyEmailOtp } = useAuth();
  const [emailChallenge, setEmailChallenge] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  useEffect(() => {
    if (!resendSeconds) return;
    const timer = setTimeout(() => setResendSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState("");
  const [fullName, setFullName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState(externalNotice || "");
  const [successNotice, setSuccessNotice] = useState("");

  function acceptStep(result: AuthStep | null) {
    if (result?.error) { setErrorNotice(result.error); return; }
    if (result?.requiresEmailOtp && result.challengeId) {
      setEmailChallenge(result.challengeId); setEmailCode(""); setPassword("");
      setMode("login"); setResendSeconds(result.resendAfter ?? 60);
      setSuccessNotice(`We sent a 6-digit code to ${email.trim()}. It expires in 10 minutes.`);
    } else if (result?.requiresTotp && result.factorId) {
      setEmailChallenge(""); setEmailCode(""); setPendingFactorId(result.factorId);
      setPassword(""); setSuccessNotice("Please enter the 6-digit code from your authenticator app.");
    }
  }

  async function resendEmailCode() {
    setSubmitting(true); setErrorNotice(""); setSuccessNotice("");
    try {
      acceptStep(await api<LoginResponse>("/auth/email-otp/resend", {
        method: "POST", auth: false, body: JSON.stringify({ challengeId: emailChallenge }),
      }));
    } catch (e) { setErrorNotice(e instanceof Error ? e.message : "Unable to resend code"); }
    finally { setSubmitting(false); }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice("");
    setSuccessNotice("");
    setSubmitting(true);

    try {
      if (emailChallenge) {
        acceptStep(await verifyEmailOtp(emailChallenge, emailCode));
      } else if (mode === "login") {
        if (pendingFactorId) {
          const err = await verifyTotp(pendingFactorId, totpCode);
          if (err) setErrorNotice(err);
        } else {
          const result = await onLogin(email.trim().toLowerCase(), password);
          acceptStep(result);
        }
      } else {
        const result = await onRegister({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          password,
        });

        acceptStep(result);
      }
    } catch (err: unknown) {
      setErrorNotice(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_0.9fr] bg-slate-900 selection:bg-red-500 selection:text-white">
      {/* ─── LEFT BRANDING PANEL (Responsive: hidden on mobile, visible lg+) ─── */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 overflow-hidden bg-slate-950 text-white border-r border-slate-800">
        {/* Decorative Grid & Glows */}
        <div className="absolute inset-0 dark-grid-paper opacity-30 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

        {/* Top Header / Brand */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-red-500 text-white font-black text-xl shadow-lg shadow-red-600/30 ring-1 ring-white/20">
            B
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-wider text-white">BOORAN</span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                1965
              </span>
            </div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-400">
              MOTOR GROUP · AFTERSALES / PARTS
            </p>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 my-auto py-12 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-6">
            <Sparkles size={14} className="text-red-400" />
            Module 01 · Trade Client Easy Order
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.1] text-white">
            Direct Pentana &amp; OEM parts <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
              at live trade pricing.
            </span>
          </h1>

          <p className="mt-6 text-base text-slate-400 leading-relaxed max-w-lg">
            Streamlined self-service trade portal connecting 9 Booran precincts and 24 dealership
            addresses directly to workshop repairers and counter queues.
          </p>

          {/* Value Props */}
          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 text-slate-200 font-semibold text-sm">
                <Truck size={17} className="text-red-400" />
                Federated Stock
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Own-branch, sister rooftops &amp; OEM portal availability in one view.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center gap-2.5 text-slate-200 font-semibold text-sm">
                <Layers size={17} className="text-slate-200" />
                PartsCheck Auto-Quote
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Inbound smash repairer RFQs quoted automatically with SLA countdown.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between pt-6 border-t border-slate-800/80 text-xs text-slate-500">
          <span>Good Showroom Platform · OmniSuiteAI</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" /> ACMA &amp; Privacy Act 1988
          </span>
        </div>
      </div>

      {/* ─── RIGHT FORM PANEL (Mobile down to 390px + Desktop) ─── */}
      <div className="flex flex-col justify-center items-center p-6 xs:p-8 sm:p-12 lg:p-16 bg-white min-h-screen">
        <div className="w-full max-w-[420px] mx-auto animate-fade-in">
          {/* Mobile Top Brand (visible < lg) */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white font-black text-lg shadow-md shadow-red-600/30">
              B
            </div>
            <div>
              <span className="font-black tracking-wide text-slate-900 text-base">BOORAN MOTORS</span>
              <p className="text-[10px] text-slate-500 font-medium">Trade Client Portal</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600">
              <span>{mode === "login" ? "Authentication" : "Trade Onboarding"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>Phase 1</span>
            </div>
            <h2 className="mt-2 text-2xl xs:text-3xl font-black tracking-tight text-slate-900">
              {emailChallenge ? "Enter your email code" : mode === "login"
                ? pendingFactorId
                  ? "Two-Factor Authentication"
                  : "Sign in to workspace"
                : "Register trade account"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {emailChallenge ? "Enter the 6-digit code sent to your email address." : mode === "login"
                ? pendingFactorId
                  ? "Enter the 6-digit code generated by your authenticator app."
                  : "Enter your credentials to access parts ordering & counter queues."
                : "Create your Booran Motor Group trade account login."}
            </p>
          </div>

          {/* Alerts */}
          {errorNotice && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 border border-red-200 text-sm text-red-700 animate-fade-in">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">{errorNotice}</div>
            </div>
          )}

          {successNotice && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-800 animate-fade-in">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 font-medium">{successNotice}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      required
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. David Vance"
                      className="field pl-10"
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500">Register as a Trade Partner. An administrator will assign your trade account and precinct. Use a password of at least 12 characters.</p>
              </>
            )}

            {emailChallenge ? (
              <div>
                <label htmlFor="email-otp" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">6-digit email code *</label>
                <input id="email-otp" required autoFocus type="text" inputMode="numeric" autoComplete="one-time-code"
                  pattern="[0-9]{6}" maxLength={6} value={emailCode}
                  onChange={e => setEmailCode(e.target.value.replace(/\D/g, ""))}
                  className="field tracking-widest font-mono text-lg" />
                <div className="mt-3 flex justify-between text-xs text-red-600">
                  <button type="button" disabled={submitting || resendSeconds > 0} onClick={resendEmailCode}>
                    {resendSeconds ? `Resend code in ${resendSeconds}s` : "Resend code"}
                  </button>
                  <button type="button" disabled={submitting} onClick={() => { setEmailChallenge(""); setEmailCode(""); setErrorNotice(""); setSuccessNotice(""); }}>Start sign-in again</button>
                </div>
              </div>
            ) : mode === "login" && pendingFactorId ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {useRecoveryCode ? "Recovery code" : "6-digit authenticator code"} *
                </label>
                <div className="relative">
                  <ShieldCheck size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    required
                    type="text"
                    maxLength={useRecoveryCode ? 23 : 6}
                    inputMode={useRecoveryCode ? "text" : "numeric"}
                    value={totpCode}
                    onChange={(e) => setTotpCode(useRecoveryCode ? e.target.value.replace(/[^a-fA-F0-9-]/g, "") : e.target.value.replace(/\D/g, ""))}
                    placeholder={useRecoveryCode ? "xxxxx-xxxxx-xxxxx-xxxxx" : "123456"}
                    className="field pl-10 tracking-widest font-mono text-lg"
                    autoComplete="one-time-code"
                  />
                </div>
                <div className="mt-3 flex justify-between text-xs text-red-600">
                  <button type="button" onClick={() => { setUseRecoveryCode(!useRecoveryCode); setTotpCode(""); setErrorNotice(""); }}>
                    {useRecoveryCode ? "Use authenticator app" : "Use a recovery code"}
                  </button>
                  <button type="button" onClick={() => { setPendingFactorId(""); setTotpCode(""); setErrorNotice(""); setSuccessNotice(""); }}>Start sign-in again</button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Work Email *
                  </label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@workshop.com.au"
                      className="field pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Password *
                    </label>
                  </div>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="field pl-10 pr-10"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 mt-4 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{mode === "login" ? "Verifying..." : "Creating Account..."}</span>
                </>
              ) : (
                <>
                  <span>{emailChallenge ? "Verify code and continue" : mode === "login" ? pendingFactorId ? "Verify Code" : "Sign in to Order App" : "Complete Registration"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
          {mode === "login" && <div className="mt-4 text-center text-sm text-red-600">
            <a href="/auth/recover-account">Set up or recover your account</a>
          </div>}

          {/* Toggle Login / Register */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            {mode === "login" ? (
              <p className="text-xs text-slate-600">
                New trade partner or workshop foreman?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setEmailChallenge(""); setEmailCode(""); setPassword("");
                    setPendingFactorId("");
                    setTotpCode("");
                    setErrorNotice("");
                    setSuccessNotice("");
                  }}
                  className="font-bold text-red-600 hover:underline"
                >
                  Create account
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-600">
                Already registered with Booran?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setEmailChallenge(""); setEmailCode(""); setPassword("");
                    setPendingFactorId("");
                    setTotpCode("");
                    setErrorNotice("");
                    setSuccessNotice("");
                  }}
                  className="font-bold text-red-600 hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
