"use client";

import { useEffect, useState, useCallback } from "react";
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
import Pagination from "../ui/Pagination";
import Modal from "../ui/Modal";
import { useAuth } from "../../lib/auth-context";

type Props = {
  selectedRooftop?: string;
  onRefreshNeeded?: () => void;
};

type PartsSearchPayload = PartsSearchResponse & { parts?: Part[] };

function normalisePartsResponse(data: PartsSearchPayload | Part[]) {
  if (Array.isArray(data)) return data;
  return data.results || data.parts || [];
}

export default function PartsPage({
  selectedRooftop = "ROOFTOP-DANDENONG",
  onRefreshNeeded,
}: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [franchise, setFranchise] = useState("ALL");
  const [vehicle, setVehicle] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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

  const fetchParts = useCallback(async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: targetLimit.toString(),
        rooftopId: selectedRooftop,
      });
      if (search.trim()) params.set("q", search.trim());
      if (franchise && franchise !== "ALL") params.set("franchise", franchise);
      if (vehicle.trim()) params.set("vehicle", vehicle.trim());

      const data = await backendApi.parts.search(params.toString());
      const list = normalisePartsResponse(data);
      setParts(list);
      setSearched(true);

      const totalItems = data.total ?? (Array.isArray(data) ? data.length : list.length);
      setTotal(totalItems);
      setTotalPages(Math.max(1, Math.ceil(totalItems / targetLimit)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load active parts");
      setParts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, franchise, vehicle, selectedRooftop, page, limit]);

  useEffect(() => {
    fetchParts(page, limit);
  }, [page, limit, selectedRooftop]);

  const runSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    setOrderSuccess(null);
    fetchParts(1, limit);
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
            sourceRooftopId: source.sourceRooftopId,
            binLocation: source.binLocation,
            eta: source.eta,
          },
        ],
      });
      setOrderSuccess(`Order submitted for ${partNumber} from ${source.sourceName || "Source"}!`);
      setResolvingPart(null);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to place quick order");
    } finally {
      setOrderingSource(null);
    }
  };

  const handlePartDetail = async (part: Part) => {
    const partId = part._id || part.partNumber || "";
    setDetailLoading(partId);
    try {
      const detail = await backendApi.parts.get(partId);
      setPartDetail(detail);
    } catch {
      setPartDetail(part);
    } finally {
      setDetailLoading(null);
    }
  };

  const sourceKindBadge = (kind?: string) => {
    switch (kind?.toUpperCase()) {
      case "BRANCH":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "SISTER":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "OEM":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "AFTERMARKET":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header ─── */}
      <PageTitle
        eyebrow="Unified Catalogue"
        title="Parts Search & Resolver"
        description="Federated 4-tier waterfall: Own-Branch → Sister Rooftops → OEM Portal → Aftermarket."
      />

      {orderSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{orderSuccess}</span>
          </div>
          <button
            onClick={() => setOrderSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Search Bar & Filters ─── */}
      <div className="card p-5 sm:p-6 space-y-4">
        <form onSubmit={runSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search OEM Part #, keyword (e.g. 04152-YZZA6, Brake Pad, Oil Filter)..."
                className="field pl-10 py-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-3 px-6 text-sm flex items-center justify-center gap-2"
            >
              <Search size={16} />
              <span>{loading ? "Searching..." : "Search Parts"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                Franchise Brand
              </label>
              <select
                value={franchise}
                onChange={(e) => {
                  setFranchise(e.target.value);
                  setPage(1);
                }}
                className="field text-xs py-2 bg-white"
              >
                <option value="ALL">All Franchises (Booran Network)</option>
                <option value="TOYOTA">Toyota Genuine</option>
                <option value="HYUNDAI">Hyundai Genuine</option>
                <option value="NISSAN">Nissan Genuine</option>
                <option value="HOLDEN">Holden / GM Genuine</option>
                <option value="MITSUBISHI">Mitsubishi Genuine</option>
                <option value="KIA">Kia Genuine</option>
                <option value="SUZUKI">Suzuki Genuine</option>
                <option value="AFTERMARKET">Aftermarket Suppliers</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                Vehicle Fitment
              </label>
              <input
                type="text"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="Model (e.g. Corolla, Tucson, Navara)"
                className="field text-xs py-2"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                Unified Sourcing
              </label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-semibold">
                <Layers size={14} className="text-slate-400" />
                <span>4-Tier Federated Waterfall</span>
              </div>
            </div>
          </div>
        </form>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ─── Search Results Table ─── */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="section-title text-base">Parts Catalogue Results</h2>
            <p className="text-xs text-slate-500">
              Listing real-time inventory and active items for {selectedRooftop}
            </p>
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            {total} part{total === 1 ? "" : "s"} found
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-12 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : parts.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="pb-3 font-semibold">Part Number</th>
                      <th className="pb-3 font-semibold">Description</th>
                      <th className="pb-3 font-semibold">Brand</th>
                      <th className="pb-3 font-semibold">Fitment</th>
                      <th className="pb-3 font-semibold">Trade Net</th>
                      <th className="pb-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parts.map((p) => (
                      <tr key={p._id || p.partNumber} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 font-black text-slate-900 font-mono">
                          {p.partNumber}
                        </td>
                        <td className="py-3.5 text-slate-600 max-w-xs truncate">
                          {p.description}
                        </td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {p.brandCode || "OEM"}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-500">
                          {p.vehicleFitment?.join(", ") || p.fitment || "Universal / Multiple"}
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

              {/* ─── Pagination ─── */}
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={limit}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newSize) => {
                  setLimit(newSize);
                  setPage(1);
                }}
                loading={loading}
              />
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
              <p className="font-semibold text-slate-600 text-sm">No active catalogue parts loaded</p>
              <p className="text-xs text-slate-400 mt-1">
                Search a part number or keyword to query the catalogue directly.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── FEDERATED SOURCE RESOLUTION MODAL (Scope Section 5.4) ─── */}
      <Modal
        isOpen={!!resolvingPart}
        onClose={() => setResolvingPart(null)}
        maxWidth="3xl"
        title={
          resolvingPart ? (
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {resolvingPart.partNumber}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">
                {resolvingPart.brandCode || "OEM"}
              </span>
            </div>
          ) : undefined
        }
        subtitle={
          resolvingPart ? (
            <span>
              {resolvingPart.description} · Requesting Rooftop: <b className="text-slate-800">{selectedRooftop}</b>
            </span>
          ) : undefined
        }
      >
        {resolvingLoading ? (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-600">
              Resolving 4-tier waterfall across Booran dealerships &amp; OEM feeds...
            </p>
          </div>
        ) : resolveError ? (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
            {resolveError}
          </div>
        ) : (
          <div className="space-y-4">
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
                            onClick={() => resolvingPart && handleQuickOrder(resolvingPart.partNumber || "", s)}
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
      </Modal>

      {/* ─── PART DETAIL MODAL ─── */}
      <Modal
        isOpen={!!partDetail}
        onClose={() => setPartDetail(null)}
        maxWidth="2xl"
        title={partDetail?.partNumber}
        subtitle={partDetail?.description || "Catalogue part detail"}
      >
        {partDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <p className="font-bold text-slate-900 mb-1">Vehicle Fitment</p>
              <p>{partDetail.vehicleFitment?.join(", ") || partDetail.fitment || "No fitment detail returned."}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
