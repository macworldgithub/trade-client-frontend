"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building,
  Layers,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Info,
  X,
} from "lucide-react";
import { api, money } from "../../lib/api";
import { backendApi } from "../../lib/backend-api";
import type { Part, PartsSearchResponse, ResolvePartResponse, PartSource } from "../../lib/types";
import PageTitle from "../ui/PageTitle";
import EmptyState from "../ui/EmptyState";
import { useAuth } from "../../lib/auth-context";

type Props = {
  selectedRooftop?: string;
  onRefreshNeeded?: () => void;
};

export default function PartsPage({
  selectedRooftop = "ROOFTOP-DANDENONG",
  onRefreshNeeded,
}: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [franchise, setFranchise] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // Federated Resolver Modal State
  const [resolvingPart, setResolvingPart] = useState<Part | null>(null);
  const [resolveResult, setResolveResult] = useState<ResolvePartResponse | null>(null);
  const [resolvingLoading, setResolvingLoading] = useState(false);
  const [resolveError, setResolveError] = useState("");

  // Quick Order State
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderingSource, setOrderingSource] = useState<string | null>(null);
  const [partDetail, setPartDetail] = useState<Part | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const runSearch = async () => {
    if (search.trim().length < 2 && !franchise && !vehicle) return;
    setLoading(true);
    setError("");
    setOrderSuccess(null);

    try {
      const params = new URLSearchParams({
        limit: "50",
      });
      if (search.trim()) params.set("q", search.trim());
      if (franchise) params.set("franchise", franchise);
      if (vehicle.trim()) params.set("vehicle", vehicle.trim());
      params.set("rooftopId", selectedRooftop);

      const data = await backendApi.parts.search(params.toString());
      setParts(data.results || []);
      setSearched(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
      setParts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSource = async (part: Part) => {
    setResolvingPart(part);
    setResolveResult(null);
    setResolveError("");
    setResolvingLoading(true);

    try {
      const accountId = user?.tradeAccountId || "ACC-000123";
      const result = await backendApi.parts.resolve(
        part.partNumber || "",
        selectedRooftop,
        accountId,
        part.brandCode
      );
      setResolveResult(result);
    } catch (err: unknown) {
      setResolveError(
        err instanceof Error
          ? err.message
          : "Failed to resolve federated source options for this part."
      );
    } finally {
      setResolvingLoading(false);
    }
  };

  const handleQuickOrder = async (partNumber: string, source: PartSource) => {
    setOrderingSource(source.sourceName || source.sourceKind || "SELECTED");
    try {
      await backendApi.orders.create({
        rooftopId: selectedRooftop,
        tradeAccountId: user?.tradeAccountId || undefined,
        customerReference: `Web Order: ${source.sourceKind || "OEM"}`,
        deliveryMethod: "COLLECTION",
        lines: [
          {
            partNumber,
            quantity: 1,
            unitPriceCents: source.tradePriceCents,
            sourceKind: source.sourceKind,
            sourceName: source.sourceName,
          },
        ],
      });

      setOrderSuccess(`Order placed successfully for ${partNumber} from ${source.sourceName || source.sourceKind}!`);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to place order line");
    } finally {
      setOrderingSource(null);
    }
  };

  const handlePartDetail = async (part: Part) => {
    const id = part._id || part.partNumber || "";
    if (!id) return;
    setDetailLoading(id);
    try {
      const detail = await backendApi.parts.get(id);
      setPartDetail(detail);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to load part detail");
    } finally {
      setDetailLoading(null);
    }
  };

  const sourceKindBadge = (kind?: string) => {
    switch (kind?.toUpperCase()) {
      case "OEM":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "BRANCH":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "AFTERMARKET":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "GREY":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-red-600">Unified Catalogue</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Parts Search &amp; Resolver
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Federated 4-tier waterfall: Own-Branch &rarr; Sister Rooftops &rarr; OEM Portal &rarr; Aftermarket.
          </p>
        </div>
      </div>

      {orderSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{orderSuccess}</span>
          </div>
          <button onClick={() => setOrderSuccess(null)} className="text-emerald-600 hover:underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* ─── SEARCH & FILTER CARD ─── */}
      <div className="card p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Search OEM Part #, keyword (e.g. 58101-D3A00, Brake Pad, Oil Filter)..."
                className="field pl-10"
              />
            </div>

            <button
              onClick={runSearch}
              disabled={loading}
              className="btn-primary px-6 shadow-md shadow-red-500/20"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Searching...</span>
                </div>
              ) : (
                <span>Search Parts</span>
              )}
            </button>
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Franchise Brand
              </label>
              <select
                value={franchise}
                onChange={(e) => setFranchise(e.target.value)}
                className="field py-2 text-xs bg-white"
              >
                <option value="">All Franchises (Booran Network)</option>
                <option value="HYUNDAI">Hyundai</option>
                <option value="KIA">Kia</option>
                <option value="MITSUBISHI">Mitsubishi</option>
                <option value="NISSAN">Nissan</option>
                <option value="ISUZU">Isuzu UTE</option>
                <option value="SKODA">Skoda</option>
                <option value="CHERY">Chery</option>
                <option value="MG">MG</option>
                <option value="BYD">BYD</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Vehicle Fitment
              </label>
              <input
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Model e.g. Tucson, D-MAX, Sportage"
                className="field py-2 text-xs"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-1 flex items-end">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 w-full flex items-center justify-between">
                <span>Rooftop Context:</span>
                <span className="font-bold text-slate-800">{selectedRooftop.replace("ROOFTOP-", "")}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── PARTS RESULT TABLE ─── */}
        <div className="mt-6">
          {loading ? (
            <div className="space-y-3 py-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : parts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="pb-3">Part Number</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Brand</th>
                    <th className="pb-3 hidden md:table-cell">Vehicle Fitment</th>
                    <th className="pb-3">Trade Unit</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parts.map((p, idx) => (
                    <tr key={p._id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 font-black text-slate-900">
                        {p.partNumber || "—"}
                      </td>
                      <td className="py-3.5 text-slate-700 max-w-xs truncate">
                        <span className="font-semibold block">{p.description || "—"}</span>
                        {p.category && (
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {p.category}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700">
                          {p.brandCode || "GENUINE"}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500 hidden md:table-cell text-xs">
                        {p.vehicleFitment?.join(", ") || p.fitment || "Multi-fitment"}
                      </td>
                      <td className="py-3.5 font-bold text-slate-900">
                        {p.sources?.[0]?.tradePriceCents
                          ? money(p.sources[0].tradePriceCents)
                          : "$—"}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handlePartDetail(p)}
                            disabled={detailLoading === (p._id || p.partNumber)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                          >
                            {detailLoading === (p._id || p.partNumber) ? "Loading..." : "Detail"}
                          </button>
                          <button
                            onClick={() => handleResolveSource(p)}
                            className="btn-primary py-1.5 px-3 text-xs shadow-none flex items-center gap-1.5"
                          >
                            <Layers size={13} />
                            <span>Resolve Source</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : searched ? (
            <div className="py-12">
              <EmptyState
                title="No parts match that enquiry"
                text="Try searching by exact OEM part number or adjusting your vehicle filter."
              />
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Search size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">Enter an enquiry to query the catalogue</p>
              <p className="text-xs text-slate-400 mt-1">
                E.g. Search &quot;58101-D3A00&quot; or &quot;26300-35505&quot; to test multi-tier resolution.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── FEDERATED SOURCE RESOLUTION MODAL (Scope Section 5.4) ─── */}
      {resolvingPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">
                    {resolvingPart.partNumber}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">
                    {resolvingPart.brandCode || "OEM"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {resolvingPart.description} · Requesting Rooftop: <b>{selectedRooftop}</b>
                </p>
              </div>
              <button
                onClick={() => setResolvingPart(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {resolvingLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="mx-auto w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-600">
                  Resolving 4-tier waterfall across Booran dealerships &amp; OEM feeds...
                </p>
              </div>
            ) : resolveError ? (
              <div className="my-6 p-4 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                {resolveError}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span>Sourcing Algorithm Priority:</span>
                  <span className="font-semibold text-slate-800">
                    1. Own Branch &rarr; 2. Sister Branches &rarr; 3. OEM Portals &rarr; 4. Aftermarket
                  </span>
                </div>

                {resolveResult?.sources?.length ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Source &amp; Kind</th>
                          <th className="p-3">List</th>
                          <th className="p-3">Trade Net</th>
                          <th className="p-3">On-Hand</th>
                          <th className="p-3">ETA / Run</th>
                          <th className="p-3 text-right">Order</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {resolveResult.sources.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${sourceKindBadge(s.sourceKind)}`}>
                                  {s.sourceKind || "OEM"}
                                </span>
                                <span className="font-bold text-slate-900">{s.sourceName}</span>
                              </div>
                              {s.binLocation && (
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  Bin: {s.binLocation}
                                </p>
                              )}
                            </td>
                            <td className="p-3 text-slate-400">{money(s.listPriceCents)}</td>
                            <td className="p-3 font-black text-slate-900">
                              {money(s.tradePriceCents)}
                            </td>
                            <td className="p-3">
                              <span className={`font-bold ${((s.stockQty ?? 0) > 0) ? "text-emerald-600" : "text-slate-400"}`}>
                                {s.stockQty ?? 0} units
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 font-medium">
                              {s.eta || "Same-day counter"}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                disabled={orderingSource !== null}
                                onClick={() => handleQuickOrder(resolvingPart.partNumber || "", s)}
                                className="btn-primary py-1 px-3 text-xs shadow-none"
                              >
                                {orderingSource === (s.sourceName || s.sourceKind) ? "Submitting..." : "Add to Order"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="No source rows returned"
                    text="The resolver could not find active inventory or OEM feeds for this part."
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {partDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {partDetail.partNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {partDetail.description || "Catalogue part detail"}
                </p>
              </div>
              <button
                onClick={() => setPartDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow">Brand</p>
                <p className="mt-1 font-black text-slate-900">{partDetail.brandCode || "GENUINE"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow">Category</p>
                <p className="mt-1 font-black text-slate-900">{partDetail.category || "Parts"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow">Known Sources</p>
                <p className="mt-1 font-black text-slate-900">{partDetail.sources?.length || 0}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <p className="font-bold text-slate-900 mb-1">Vehicle Fitment</p>
              <p>{partDetail.vehicleFitment?.join(", ") || partDetail.fitment || "No fitment detail returned."}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
