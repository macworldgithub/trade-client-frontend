"use client";

import {
  Home,
  ShoppingCart,
  PackageSearch,
  ClipboardList,
  Users,
  Store,
  Activity,
  LogOut,
  X,
  Building2,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";

export type NavKey =
  | "overview"
  | "orders"
  | "parts"
  | "partscheck"
  | "accounts"
  | "precincts"
  | "activity";

const navItems: { label: string; icon: typeof Home; key: NavKey; badgeKey?: string }[] = [
  { label: "Overview", icon: Home, key: "overview" },
  { label: "Orders & Queue", icon: ShoppingCart, key: "orders" },
  { label: "Parts Catalogue", icon: PackageSearch, key: "parts" },
  { label: "PartsCheck RFQs", icon: ClipboardList, key: "partscheck" },
  { label: "Trade Accounts", icon: Users, key: "accounts" },
  { label: "Precincts & Feeds", icon: Store, key: "precincts" },
  { label: "Audit & Stream", icon: Activity, key: "activity" },
];

export { navItems };

type Props = {
  activePage: NavKey;
  onNavigate: (key: NavKey) => void;
  open: boolean;
  onClose: () => void;
  partsCheckBadge?: number;
};

export default function Sidebar({
  activePage,
  onNavigate,
  open,
  onClose,
  partsCheckBadge = 0,
}: Props) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile Backdrop Overlay (<lg) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-slate-950 text-white border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-[76px] px-5 border-b border-slate-800/80 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-red-800 to-red-500 text-white font-black text-lg shadow-md shadow-red-600/30">
              B
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-wide text-white">BOORAN</span>
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  1965
                </span>
              </div>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400">
                TRADE EASY ORDER
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 lg:hidden transition-colors"
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Operations &amp; Catalogue
          </p>
          {navItems.map((item) => {
            const isActive = activePage === item.key;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                onClick={() => {
                  onNavigate(item.key);
                  if (typeof window !== "undefined" && window.innerWidth < 1024) {
                    onClose();
                  }
                }}
                className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${isActive
                  ? "bg-red-600 text-white shadow-md shadow-red-600/25 ring-1 ring-red-500"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-white" : "text-slate-400 group-hover:text-white"}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className="flex-1 text-left">{item.label}</span>

                {item.key === "partscheck" && partsCheckBadge > 0 && (
                  <span className="rounded-full bg-red-500/30 text-red-200 border border-red-400/40 px-2 py-0.5 text-[10px] font-bold">
                    {partsCheckBadge}
                  </span>
                )}

                {isActive && <ChevronRight size={14} className="text-white/80" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="mb-3 px-2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API Connected
            </span>
            <span className="font-mono text-[10px] text-slate-500">v1.0</span>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <LogOut size={17} className="text-slate-400" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
