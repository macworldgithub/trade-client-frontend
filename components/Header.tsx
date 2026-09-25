"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Menu,
  Store,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import type { NavKey } from "./Sidebar";
import type { Rooftop } from "../lib/types";
import { ROLES, type Role } from "../lib/types";

type Props = {
  activePage: NavKey;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedRooftop?: string;
  onSelectRooftop?: (rooftopId: string) => void;
  rooftops?: Rooftop[];
};

const DEFAULT_ROOFTOPS = [
  { rooftopId: "ROOFTOP-DANDENONG", name: "Dandenong Precinct", suburb: "25 Lonsdale St" },
  { rooftopId: "ROOFTOP-CHELTENHAM", name: "Cheltenham / Southland", suburb: "1178 Nepean Hwy" },
  { rooftopId: "ROOFTOP-CRANBOURNE", name: "Cranbourne Precinct", suburb: "180 Sth Gippsland" },
  { rooftopId: "ROOFTOP-BERWICK", name: "Berwick Precinct", suburb: "34 Kangan Dr" },
  { rooftopId: "ROOFTOP-SOUTH-MORANG", name: "South Morang", suburb: "Oleander / McDonalds Rd" },
  { rooftopId: "ROOFTOP-FRANKSTON", name: "Frankston", suburb: "88 Dandenong Rd W" },
  { rooftopId: "ROOFTOP-WONTHAGGI", name: "Wonthaggi", suburb: "Bass Hwy" },
  { rooftopId: "ROOFTOP-LEONGATHA", name: "Leongatha", suburb: "Hughes St" },
  { rooftopId: "ROOFTOP-BALLARAT", name: "Ballarat", suburb: "Mair St" },
];

export default function Header({
  activePage,
  sidebarOpen,
  onToggleSidebar,
  selectedRooftop = "ROOFTOP-DANDENONG",
  onSelectRooftop,
  rooftops = [],
}: Props) {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayRooftops = rooftops.length > 0 ? rooftops : DEFAULT_ROOFTOPS;
  const activeRooftop = displayRooftops.find((r) => r.rooftopId === selectedRooftop) || {
    name: "Dandenong Precinct",
    suburb: "Lonsdale St, Dandenong",
    rooftopId: selectedRooftop,
  };

  const roleLabel = ROLES[(user?.role as Role) || "trade_partner"]?.label || user?.role?.replaceAll("_", " ") || "Partner";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      {/* Left: Menu + Rooftop Switcher */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Toggle sidebar navigation"
        >
          <Menu size={20} />
        </button>

        <div className="h-6 w-px bg-slate-200 hidden xs:block" />

        {/* Rooftop Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-left transition-all text-xs max-w-[220px]"
          >
            <Store size={15} className="text-brand-600 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-slate-900 block truncate text-[13px]">
                {activeRooftop.name}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {activeRooftop.suburb || "Booran Network"}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-dropdown py-1.5 z-50 animate-fade-in">
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Switch Precinct
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {displayRooftops.map((r) => (
                  <button
                    key={r.rooftopId}
                    onClick={() => {
                      if (onSelectRooftop) onSelectRooftop(r.rooftopId);
                      setShowDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                      selectedRooftop === r.rooftopId
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{r.suburb}</p>
                    </div>
                    {selectedRooftop === r.rooftopId && (
                      <CheckCircle2 size={15} className="text-brand-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Simulation Badge + User */}
      <div className="flex items-center gap-3">
        {/* Simulation indicator */}
        <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Simulation
        </span>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User Avatar */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-xs shadow-sm">
            {(user?.fullName || user?.email || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
              {user?.fullName || "Trade User"}
            </p>
            <p className="text-[10px] font-medium text-slate-400 truncate max-w-[130px]">
              {roleLabel}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
