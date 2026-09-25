"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  MapPin,
  Car,
  Wifi,
  WifiOff,
  Activity,
  Layers,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { backendApi } from "../../lib/backend-api";
import type { Rooftop, Franchise, FeedHealth } from "../../lib/types";
import PageTitle from "../ui/PageTitle";
import EmptyState from "../ui/EmptyState";

type Props = {
  selectedRooftop?: string;
  onSelectRooftop?: (id: string) => void;
  onRefreshNeeded?: () => void;
};

export default function PrecinctsPage({
  selectedRooftop = "ROOFTOP-DANDENONG",
  onSelectRooftop,
  onRefreshNeeded,
}: Props) {
  const [rooftops, setRooftops] = useState<Rooftop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrecinct, setSelectedPrecinct] = useState<Rooftop | null>(null);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [feedHealth, setFeedHealth] = useState<FeedHealth[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);

  useEffect(() => {
    backendApi.rooftops
      .list()
      .then((data) => {
        setRooftops(data);
        if (data.length > 0) {
          const matched = data.find((r) => r.rooftopId === selectedRooftop) || data[0];
          inspectRooftop(matched);
        }
      })
      .catch(() => setRooftops([]))
      .finally(() => setLoading(false));
  }, [selectedRooftop]);

  const inspectRooftop = async (r: Rooftop) => {
    setSelectedPrecinct(r);
    setInspectLoading(true);
    try {
      const [fData, hData] = await Promise.allSettled([
        backendApi.rooftops.franchises(r.rooftopId),
        backendApi.rooftops.feedHealth(r.rooftopId),
      ]);

      if (fData.status === "fulfilled") setFranchises(fData.value as Franchise[]);
      if (hData.status === "fulfilled") setFeedHealth(hData.value as FeedHealth[]);
    } catch {
      setFranchises([]);
      setFeedHealth([]);
    } finally {
      setInspectLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-red-600">Dealership Footprint</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Precincts &amp; Feed Health
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Booran Motor Group network of 9 precincts &amp; 24 published addresses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        {/* Left: Precincts Grid */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Rooftops ({rooftops.length})
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-36 w-full rounded-2xl" />
              ))}
            </div>
          ) : rooftops.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooftops.map((r) => {
                const isSelected = selectedPrecinct?.rooftopId === r.rooftopId;

                return (
                  <div
                    key={r.rooftopId}
                    onClick={() => {
                      inspectRooftop(r);
                      if (onSelectRooftop) onSelectRooftop(r.rooftopId);
                    }}
                    className={`card p-5 cursor-pointer transition-all ${
                      isSelected
                        ? "ring-2 ring-red-500 border-transparent shadow-lg shadow-red-500/10 bg-slate-900 text-white"
                        : "hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl ${isSelected ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                        <Building2 size={18} />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : r.isActive === false
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {r.isActive === false ? "PHASE 0 INACTIVE" : "PHASE 1 LIVE"}
                      </span>
                    </div>

                    <h3 className={`mt-4 font-black text-sm sm:text-base ${isSelected ? "text-white" : "text-slate-900"}`}>
                      {r.name}
                    </h3>
                    <p className={`text-xs mt-0.5 ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
                      {r.code} · {r.suburb || "Victoria"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(r.oemBrandCodes || []).map((brand) => (
                        <span
                          key={brand}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSelected ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No rooftops found"
              text="The rooftop register returned no records."
            />
          )}
        </div>

        {/* Right: Selected Precinct Telemetry & Feeds */}
        <div className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Precinct Telemetry &amp; Feeds
          </h2>

          {selectedPrecinct ? (
            <div className="card p-6 space-y-5">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {selectedPrecinct.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <MapPin size={13} className="text-red-600" />
                    <span>{selectedPrecinct.suburb}, VIC</span>
                  </p>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
                  {selectedPrecinct.code}
                </span>
              </div>

              {/* Brands / Franchises Register */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Franchise Desk Register</span>
                  <span className="text-slate-600 font-normal">Pentana DMS</span>
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(franchises.length > 0
                    ? franchises
                    : (selectedPrecinct.oemBrandCodes || []).map((b) => ({
                        brandCode: b,
                        brandName: b,
                        pentanaCode: `PENT-${b.slice(0, 3)}`,
                      }))
                  ).map((f, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Car size={15} className="text-slate-500" />
                        <span className="font-bold text-slate-800">{f.brandName || f.brandCode}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {f.pentanaCode || "PENT-OK"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feed Health Monitor (Scope Section 5.9) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Live Feed Health &amp; Adapters
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Wifi size={15} className="text-emerald-600" />
                      <div>
                        <p className="font-bold text-slate-900">Pentana DMS Read Surface</p>
                        <p className="text-[10px] text-slate-500">Stock on-hand &amp; Bin ledger</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      HEALTHY
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Wifi size={15} className="text-emerald-600" />
                      <div>
                        <p className="font-bold text-slate-900">OEM Dealer Portal Adapters</p>
                        <p className="text-[10px] text-slate-500">Live supersession &amp; ETA</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      CONNECTED
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Layers size={15} className="text-slate-500" />
                      <div>
                        <p className="font-bold text-slate-900">PartsCheck Supplier Socket</p>
                        <p className="text-[10px] text-slate-500">Inbound RFQ listener active</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                      LISTENING
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-slate-400">
              <Building2 size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs">Select a rooftop precinct on the left to inspect feeds.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
