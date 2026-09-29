"use client";

import {
  LayoutDashboard,
  ShoppingCart,
  PackageSearch,
  ClipboardList,
  Users,
  Building2,
  Activity,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { isAdmin, isPartsController, isTradePartner } from "../lib/types";

export type NavKey =
  | "overview"
  | "orders"
  | "parts"
  | "partscheck"
  | "accounts"
  | "precincts"
  | "activity";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  key: NavKey;
  visibleFor?: "all" | "partner" | "controller" | "admin" | "controller_admin";
};

const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, key: "overview", visibleFor: "all" },
  { label: "Orders & Queue", icon: ShoppingCart, key: "orders", visibleFor: "controller_admin" },
  { label: "Parts Catalogue", icon: PackageSearch, key: "parts", visibleFor: "partner" },
  { label: "PartsCheck RFQs", icon: ClipboardList, key: "partscheck", visibleFor: "controller" },
  { label: "Trade Accounts", icon: Users, key: "accounts", visibleFor: "controller_admin" },
  { label: "Precincts & Feeds", icon: Building2, key: "precincts", visibleFor: "admin" },
  { label: "Audit & Stream", icon: Activity, key: "activity", visibleFor: "admin" },
];

export { navItems };

function canSeeNavItem(role: string, item: NavItem) {
  const visibility = item.visibleFor || "all";
  if (visibility === "all") return true;
  if (visibility === "partner") return isTradePartner(role);
  if (visibility === "controller") return isPartsController(role);
  if (visibility === "admin") return isAdmin(role);
  if (visibility === "controller_admin") return isPartsController(role) || isAdmin(role);
  return false;
}

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
  const role = user?.role || "trade_partner";

  const visibleItems = navItems.filter((item) => canSeeNavItem(role, item));

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-slate-950 text-white border-r border-white/[0.06] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-[72px] px-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white font-black text-lg shadow-lg shadow-brand-600/25">
              B
            </div>
            <div>
              <span className="text-[15px] font-black tracking-wide text-white">BOORAN</span>
              <p className="text-[10px] font-medium tracking-[0.15em] text-slate-400">
                TRADE EASY ORDER
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden transition-colors"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Navigation
          </p>

          {visibleItems.map((item) => {
            const active = activePage === item.key;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                onClick={() => {
                  onNavigate(item.key);
                  if (typeof window !== "undefined" && window.innerWidth < 1024) onClose();
                }}
                className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                  active
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                    : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Icon
                  size={18}
                  className={active ? "text-white" : "text-slate-400 group-hover:text-white"}
                  strokeWidth={active ? 2.2 : 1.7}
                />
                <span className="flex-1 text-left">{item.label}</span>

                {item.key === "partscheck" && partsCheckBadge > 0 && (
                  <span className="rounded-full bg-brand-500/20 text-brand-200 border border-brand-400/30 px-2 py-0.5 text-[10px] font-bold">
                    {partsCheckBadge}
                  </span>
                )}

                {active && <ChevronRight size={14} className="text-white/70" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="mb-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              API Connected
            </span>
            <span className="font-mono text-[10px] text-slate-500">v1.0</span>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <LogOut size={17} className="text-slate-500" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

type BottomTabsProps = {
  activePage: NavKey;
  onNavigate: (key: NavKey) => void;
};

const bottomTabKeys: NavKey[] = [
  "orders",
  "parts",
  "partscheck",
  "accounts",
  "precincts",
];

const bottomTabLabels: Partial<Record<NavKey, string>> = {
  orders: "Order",
  parts: "Catalogue",
  partscheck: "RFQs",
  accounts: "Accounts",
  precincts: "Precincts",
};

export function BottomTabs({ activePage, onNavigate }: BottomTabsProps) {
  const { user } = useAuth();
  const role = user?.role || "trade_partner";

  const visibleItems = navItems.filter((item) => bottomTabKeys.includes(item.key) && canSeeNavItem(role, item));

  if (!visibleItems.length) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-slate-950 text-slate-400 shadow-2xl lg:hidden">
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}>
        {visibleItems.map((item) => {
          const active = activePage === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold transition-colors ${
                active ? "text-brand-500" : "text-slate-400 hover:text-white"
              }`}
              aria-label={item.label}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
              <span className="max-w-full truncate">{bottomTabLabels[item.key] || item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
