"use client";

import { useState } from "react";
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

type Props = {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onRegister: (input: {
    email: string;
    fullName: string;
    password: string;
    role?: string;
    tradeAccountId?: string;
    rooftopId?: string;
  }) => Promise<string | null>;
  notice?: string;
};

export default function LoginPage({ onLogin, onRegister, notice: externalNotice }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("trade_partner");
  const [tradeAccountId, setTradeAccountId] = useState("");
  const [rooftopId, setRooftopId] = useState("ROOFTOP-DANDENONG");

  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState(externalNotice || "");
  const [successNotice, setSuccessNotice] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice("");
    setSuccessNotice("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        const err = await onLogin(email.trim().toLowerCase(), password);
        if (err) setErrorNotice(err);
      } else {
        const err = await onRegister({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          password,
          role,
          tradeAccountId: tradeAccountId.trim() || undefined,
          rooftopId: rooftopId || undefined,
        });

        if (err) {
          setErrorNotice(err);
        } else {
          setSuccessNotice(
            "Account registered successfully! Please check your email to verify your address, then sign in."
          );
          setMode("login");
        }
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
              {mode === "login" ? "Sign in to workspace" : "Register trade account"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {mode === "login"
                ? "Enter your credentials to access parts ordering & counter queues."
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

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="field bg-white"
                  >
                    <option value="trade_partner">Trade Partner (Workshop / Fleet)</option>
                    <option value="controller">Parts Controller (Counter Desk & Store)</option>
                    <option value="admin">Group Administrator / Operations</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Pentana A/C ID
                    </label>
                    <input
                      type="text"
                      value={tradeAccountId}
                      onChange={(e) => setTradeAccountId(e.target.value)}
                      placeholder="ACC-000123"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Home Precinct
                    </label>
                    <select
                      value={rooftopId}
                      onChange={(e) => setRooftopId(e.target.value)}
                      className="field bg-white text-xs"
                    >
                      <option value="ROOFTOP-DANDENONG">Dandenong (Metro)</option>
                      <option value="ROOFTOP-CHELTENHAM">Cheltenham / Southland</option>
                      <option value="ROOFTOP-CRANBOURNE">Cranbourne</option>
                      <option value="ROOFTOP-BERWICK">Berwick</option>
                      <option value="ROOFTOP-SOUTH-MORANG">South Morang</option>
                      <option value="ROOFTOP-WONTHAGGI">Wonthaggi</option>
                      <option value="ROOFTOP-LEONGATHA">Leongatha</option>
                      <option value="ROOFTOP-BALLARAT">Ballarat</option>
                    </select>
                  </div>
                </div>
              </>
            )}

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
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => alert("Please contact your Booran parts desk supervisor to reset your account password.")}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 transition"
                  >
                    Forgot?
                  </button>
                )}
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
                  <span>{mode === "login" ? "Sign in to Order App" : "Complete Registration"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login / Register */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            {mode === "login" ? (
              <p className="text-xs text-slate-600">
                New trade partner or workshop foreman?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorNotice("");
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
                    setErrorNotice("");
                  }}
                  className="font-bold text-red-600 hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          {/* Simulation disclaimer */}
          <div className="mt-8 text-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Trial Phase 1 · Connected to NestJS API
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
