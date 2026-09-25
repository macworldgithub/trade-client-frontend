"use client";

import { useState } from "react";
import {
  Bell,
  ChevronDown,
  Menu,
  ShieldCheck,
  Building2,
  Store,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { navItems, type NavKey } from "./Sidebar";
import type { Rooftop } from "../lib/types";

type Props = {
  activePage: NavKey;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedRooftop?: string;
  onSelectRooftop?: (rooftopId: string) => void;
  rooftops?: Rooftop[];
};

export default function Header({
  activePage,
  sidebarOpen,
  onToggleSidebar,
  selectedRooftop = "ROOFTOP-DANDENONG",
  onSelectRooftop,
  rooftops = [],
}: Props) {
  const { user } = useAuth();
  const currentLabel = navItems.find((x) => x.key === activePage)?.label || "Overview";
  const [showRooftopDropdown, setShowRooftopDropdown] = useState(false);

  const activeRooftop = rooftops.find((r) => r.rooftopId === selectedRooftop) || {
    name: "Dandenong Precinct",
    code: "DAN",
    suburb: "Lonsdale St, Dandenong",
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md transition-all">
      {/* Left: Sidebar Toggle + Precinct Switcher */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:ring-2 focus:ring-slate-300"
          aria-label="Toggle sidebar navigation"
        >
          <Menu size={20} />
        </button>

        <div className="h-6 w-px bg-slate-200 hidden xs:block" />

        {/* Active Precinct Selector / Badge */}
        <div className="relative">
          <button
            onClick={() => setShowRooftopDropdown(!showRooftopDropdown)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-white text-left transition-all text-xs max-w-[200px] sm:max-w-xs truncate"
          >
            <Store size={15} className="text-red-600 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-slate-900 block truncate">
                {activeRooftop.name}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {activeRooftop.suburb || "Booran Network"}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Precinct Dropdown */}
          {showRooftopDropdown && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-fade-in">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Switch Rooftop Precinct
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {(rooftops.length > 0
                  ? rooftops
                  : [
                      { rooftopId: "ROOFTOP-DANDENONG", name: "Dandenong Precinct", suburb: "25 Lonsdale St" },
                      { rooftopId: "ROOFTOP-CHELTENHAM", name: "Cheltenham / Southland", suburb: "1178 Nepean Hwy" },
                      { rooftopId: "ROOFTOP-CRANBOURNE", name: "Cranbourne Precinct", suburb: "180 Sth Gippsland" },
                      { rooftopId: "ROOFTOP-BERWICK", name: "Berwick Precinct", suburb: "34 Kangan Dr" },
                      { rooftopId: "ROOFTOP-SOUTH-MORANG", name: "South Morang", suburb: "Oleander / McDonalds Rd" },
                      { rooftopId: "ROOFTOP-WONTHAGGI", name: "Wonthaggi", suburb: "Bass Hwy" },
                      { rooftopId: "ROOFTOP-LEONGATHA", name: "Leongatha", suburb: "Hughes St" },
                      { rooftopId: "ROOFTOP-BALLARAT", name: "Ballarat", suburb: "Mair St" },
                    ]
                ).map((r) => (
                  <button
                    key={r.rooftopId}
                    onClick={() => {
                      if (onSelectRooftop) onSelectRooftop(r.rooftopId);
                      setShowRooftopDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      selectedRooftop === r.rooftopId ? "font-bold text-red-600 bg-red-50/50" : "text-slate-700"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[10px] text-slate-400">{r.suburb}</p>
                    </div>
                    {selectedRooftop === r.rooftopId && <CheckCircle2 size={15} className="text-red-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Status Pills + User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* PoC simulation indicator */}
        <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Simulation Mode
        </span>

        {/* Notification indicator */}
        <button
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="View notifications"
        >
          <Bell size={19} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User Card */}
        <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white font-bold text-xs shadow-sm ring-1 ring-slate-200">
            {(user?.fullName || user?.email || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
              {user?.fullName || "Trade User"}
            </p>
            <p className="text-[10px] font-medium text-slate-400 capitalize truncate max-w-[130px]">
              {user?.role?.replaceAll("_", " ") || "Partner"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
