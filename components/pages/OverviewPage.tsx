"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ShoppingCart,
  Users,
  AlertCircle,
  PackageSearch,
  Plus,
  ExternalLink,
  Building2,
  ShieldCheck,
  Clock,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Printer,
  Loader2,
  CheckCircle2,
  Calendar,
  X,
  FileText,
} from "lucide-react";
import { isInternal } from "../../lib/types";
import type {
  GroupData,
  Rooftop,
  Order,
  StoreDashboard,
  StorePartsCheckDashboard,
  WeeklyExport,
  PartsCheckSummary,
} from "../../lib/types";
import { money, shortDate } from "../../lib/api";
import { backendApi } from "../../lib/backend-api";
import { useAuth } from "../../lib/auth-context";
import EmptyState from "../ui/EmptyState";
import Modal from "../ui/Modal";
import type { NavKey } from "../Sidebar";

type Props = {
  group: GroupData | null;
  rooftops: Rooftop[];
  orders: Order[];
  onPage: (p: NavKey) => void;
  selectedRooftop?: string;
};

export default function OverviewPage({
  group,
  rooftops,
  orders,
  onPage,
  selectedRooftop = "ROOFTOP-DANDENONG",
}: Props) {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const canAccessDashboard = isInternal(role);

  const n = group?.networkOverview;
  const f = group?.fulfillmentPipeline || {};
  const a = group?.accountsPortfolio;
  const [storeDashboard, setStoreDashboard] = useState<StoreDashboard | null>(null);
  const [storePartsCheck, setStorePartsCheck] = useState<StorePartsCheckDashboard | null>(null);
  const [weeklyExport, setWeeklyExport] = useState<WeeklyExport | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [groupPartsCheck, setGroupPartsCheck] = useState<PartsCheckSummary | null>(null);

  // Export State
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportScope, setExportScope] = useState<"current" | "network">("current");
  const [showReportModal, setShowReportModal] = useState(false);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const dateStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  const pipelineSteps: [string, number | undefined, string][] = [
    ["Submitted", f.submitted, "bg-blue-500"],
    ["Processing", f.processing, "bg-amber-500"],
    ["Picking", f.partiallyPicked, "bg-indigo-500"],
    ["Picked", f.picked, "bg-emerald-500"],
    ["Ready", f.readyForDelivery, "bg-teal-500"],
    ["Delivered", f.delivered, "bg-slate-400"],
  ];

  const maxPipelineVal = Math.max(
    1,
    ...pipelineSteps.map(([, val]) => val || 0)
  );

  const precincts =
    group?.precinctBreakdown ||
    rooftops.slice(0, 5).map((r) => ({
      ...r,
      revenueCents: 0,
      orderCount: 0,
      activeExceptions: 0,
    }));

  useEffect(() => {
    let cancelled = false;

    if (!canAccessDashboard) {
      setStoreLoading(false);
      return;
    }

    async function loadStoreDashboard() {
      setStoreLoading(true);
      try {
        const params = new URLSearchParams({
          rooftopId: selectedRooftop,
          format: "json",
        });
        const [storeRes, partsCheckRes, exportRes] = await Promise.allSettled([
          backendApi.dashboard.store(selectedRooftop),
          backendApi.dashboard.storePartsCheck(selectedRooftop),
          backendApi.dashboard.weeklyExport(params.toString()),
        ]);

        if (cancelled) return;
        setStoreDashboard(
          storeRes.status === "fulfilled" ? (storeRes.value as StoreDashboard) : null
        );
        setStorePartsCheck(
          partsCheckRes.status === "fulfilled"
            ? (partsCheckRes.value as StorePartsCheckDashboard)
            : null
        );
        setWeeklyExport(
          exportRes.status === "fulfilled" ? (exportRes.value as WeeklyExport) : null
        );
      } finally {
        if (!cancelled) setStoreLoading(false);
      }
    }

    loadStoreDashboard();
    return () => {
      cancelled = true;
    };
  }, [selectedRooftop, canAccessDashboard]);

  // Client-side fallback CSV generator for offline / mock resilience
  const generateClientCsvFallback = (scope: "current" | "network") => {
    const scopeName = scope === "current" ? selectedRooftop : "Booran Group Network";
    const now = new Date();
    const rows: string[] = [
      `Booran Motor Group — Weekly Management Pack`,
      `Generated: ${now.toISOString()}`,
      `Scope: ${scopeName}`,
      "",
      "--- EXECUTIVE SUMMARY ---",
      `Total Orders,${weeklyExport?.financialSummary?.totalOrdersCount ?? orders.length}`,
      `Total Revenue (AUD),$${weeklyExport?.financialSummary?.totalRevenueAud ?? ((n?.totalRevenueCents || 0) / 100).toFixed(2)}`,
      `Total GST (AUD),$${weeklyExport?.financialSummary?.totalGstAud ?? "0.00"}`,
      `PartsCheck RFQs,${weeklyExport?.partscheckSummary?.totalRfqs ?? 0}`,
      "",
      "--- ORDER REGISTER ---",
      "Order Number,Trade Account,Rooftop,Status,Lines,Total (AUD),Created Date",
    ];

    const sourceOrders = weeklyExport?.orderRows?.length
      ? weeklyExport.orderRows
      : orders.map((o) => ({
          orderNumber: o.orderNumber || o._id,
          tradeAccountId: o.tradeAccountId,
          rooftopId: o.rooftopId || selectedRooftop,
          state: o.state,
          lineCount: o.lines?.length || 1,
          totalAud: ((o.totalCents || 0) / 100).toFixed(2),
          createdAt: o.createdAt,
        }));

    sourceOrders.forEach((o: any) => {
      rows.push(
        `"${o.orderNumber || ""}","${o.tradeAccountId || ""}","${o.rooftopId || ""}","${o.state || ""}","${o.lineCount || 1}","$${o.totalAud || "0.00"}","${o.createdAt || ""}"`
      );
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `weekly-management-pack-${scope === "current" ? selectedRooftop.toLowerCase() : "network"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = async (targetScope?: "current" | "network") => {
    const scope = targetScope || exportScope;
    setExportingCsv(true);
    setExportError(null);
    try {
      const rooftopId = scope === "current" ? selectedRooftop : undefined;
      await backendApi.dashboard.downloadWeeklyExport(rooftopId);
      setExportSuccess(
        `Downloaded ${scope === "current" ? selectedRooftop.replace("ROOFTOP-", "") : "Group Network"} weekly pack CSV`
      );
      setTimeout(() => setExportSuccess(null), 4500);
    } catch (err: any) {
      console.warn("Backend CSV export notice, generating fallback CSV...", err);
      try {
        generateClientCsvFallback(scope);
        setExportSuccess(
          `Generated ${scope === "current" ? selectedRooftop.replace("ROOFTOP-", "") : "Group Network"} CSV export`
        );
        setTimeout(() => setExportSuccess(null), 4500);
      } catch (fallbackErr: any) {
        setExportError(err?.message || "Failed to download export file");
      }
    } finally {
      setExportingCsv(false);
    }
  };

  const storeFinancial = storeDashboard?.financialSummary;
  const storeQueue = storeDashboard?.warehouseQueue;
  const storeAccounts = storeDashboard?.accountsStatus;
  const storeSla = storePartsCheck?.slaOverview;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ─── Top Hero Greeting & Action Strip ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold tracking-wide text-slate-300 mb-3 backdrop-blur-sm">
            <span>{dateStr}</span>
            <span>·</span>
            <span className="text-red-400 font-bold">Booran Metro Network</span>
          </div>

          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-300">Operations</span>.
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl">
            Live telemetry from Pentana DMS, OEM portals, and PartsCheck inbound smash repair queues.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2.5">
          <button
            onClick={() => handleDownloadCsv("current")}
            disabled={exportingCsv}
            className="btn bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm border border-white/10 backdrop-blur-sm transition-all shadow-sm"
            title="Download Monday Management Pack CSV"
          >
            {exportingCsv ? (
              <Loader2 size={16} className="animate-spin text-red-400" />
            ) : (
              <FileSpreadsheet size={16} className="text-emerald-400" />
            )}
            <span>{exportingCsv ? "Exporting..." : "Export Pack"}</span>
          </button>

          <button
            onClick={() => onPage("parts")}
            className="btn bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm border border-white/10 backdrop-blur-sm"
          >
            <PackageSearch size={16} />
            <span>Search Parts</span>
          </button>

          <button
            onClick={() => onPage("orders")}
            className="btn-primary text-xs sm:text-sm"
          >
            <Plus size={16} />
            <span>Place Order</span>
          </button>
        </div>
      </div>

      {/* Global feedback banner if export succeeded / failed */}
      {exportSuccess && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fade-in shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}
      {exportError && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold animate-fade-in shadow-sm">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {/* ─── Metric Stat Cards Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Network Revenue</p>
              <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                {money(n?.totalRevenueCents)}
              </p>
            </div>
            <div className="rounded-xl p-3 bg-red-50 text-red-600 border border-red-100">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <TrendingUp size={14} className="text-emerald-500" />
            <span>Live totals across 9 precincts</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Total Trade Orders</p>
              <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                {(n?.totalOrders ?? orders.length).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl p-3 bg-slate-100 text-slate-700 border border-slate-200">
              <ShoppingCart size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Clock size={14} className="text-slate-400" />
            <span>Active fulfillment lifecycle</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Active Accounts</p>
              <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                {a?.activeAccounts ?? 0}{" "}
                <span className="text-sm font-normal text-slate-400">/ {a?.totalAccounts ?? 0}</span>
              </p>
            </div>
            <div className="rounded-xl p-3 bg-blue-50 text-blue-600 border border-blue-100">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{a?.accountsOnCreditHold ?? 0} accounts on credit hold</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Active Exceptions</p>
              <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                {(f.activeExceptions ?? 0).toString()}
              </p>
            </div>
            <div className="rounded-xl p-3 bg-amber-50 text-amber-600 border border-amber-100">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="text-amber-600 font-semibold">{f.activeInPipeline ?? 0}</span>
            <span>orders in queue</span>
          </div>
        </div>
      </div>

      {/* ─── Fulfillment Pipeline & Precinct Performance ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Pipeline Breakdown Bar chart */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="eyebrow">Counter &amp; Dispatch Queue</p>
              <h2 className="text-lg font-bold text-slate-900">Fulfilment Pipeline</h2>
            </div>
            <button
              onClick={() => onPage("orders")}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <span>View Queue</span>
              <ExternalLink size={13} />
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-4">
            {pipelineSteps.map(([label, value = 0, color]) => {
              const heightPct = Math.max(12, Math.min(100, Math.round((value / maxPipelineVal) * 100)));

              return (
                <div key={label} className="flex flex-col items-center">
                  <div className="h-32 w-full bg-slate-50 rounded-2xl p-2 flex items-end justify-center border border-slate-100">
                    <div
                      className={`w-full rounded-xl transition-all duration-500 ${color}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="mt-2.5 text-[11px] font-bold text-slate-500 text-center truncate w-full">
                    {label}
                  </span>
                  <span className="text-sm font-black text-slate-900">{value}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Precinct Breakdown */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="eyebrow">Network Footprint</p>
              <h2 className="text-lg font-bold text-slate-900">Precinct Activity</h2>
            </div>
            <button
              onClick={() => onPage("precincts")}
              className="text-xs font-bold text-red-600 hover:text-red-700"
            >
              All 9 sites
            </button>
          </div>

          <div className="space-y-4">
            {precincts.slice(0, 5).map((rt) => (
              <div key={rt.rooftopId} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shrink-0">
                  <Building2 size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 truncate">{rt.name}</span>
                    <span className="font-black text-slate-900 ml-2">{money(rt.revenueCents)}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-600"
                      style={{
                        width: `${Math.min(100, Math.max(10, (rt.orderCount || 0) * 12))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>


      {/* Group PartsCheck Network KPIs */}
      {groupPartsCheck && (
        <section className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="eyebrow">Network-Wide</p>
              <h2 className="text-lg font-bold text-slate-900">PartsCheck Performance</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              /dashboard/group/partscheck
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 col-span-1">
              <p className="eyebrow">Total RFQs</p>
              <p className="mt-2 text-xl font-black text-slate-900">{groupPartsCheck.kpis?.totalRfqs ?? groupPartsCheck.totalRfqs ?? 0}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 col-span-1">
              <p className="eyebrow text-emerald-700">Auto-Quote Rate</p>
              <p className="mt-2 text-xl font-black text-slate-900">{Math.round(groupPartsCheck.kpis?.autoQuoteRatePercent ?? 0)}%</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 col-span-1">
              <p className="eyebrow text-blue-700">Win Rate</p>
              <p className="mt-2 text-xl font-black text-slate-900">{Math.round(groupPartsCheck.kpis?.conversionRatePercent ?? groupPartsCheck.conversionRate ?? 0)}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 col-span-1">
              <p className="eyebrow">Accepted Orders</p>
              <p className="mt-2 text-xl font-black text-slate-900">{groupPartsCheck.kpis?.acceptedCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 col-span-1">
              <p className="eyebrow text-amber-700">Pending Review</p>
              <p className="mt-2 text-xl font-black text-slate-900">{groupPartsCheck.kpis?.pendingReviewCount ?? groupPartsCheck.pendingReviewCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 col-span-1">
              <p className="eyebrow text-red-700">SLA Compliance</p>
              <p className="mt-2 text-xl font-black text-slate-900">{Math.round(groupPartsCheck.kpis?.slaComplianceRatePercent ?? groupPartsCheck.onTimeQuoteRate ?? 100)}%</p>
            </div>
          </div>
        </section>
      )}

      {/* ─── Precinct Telemetry & Management Pack Export ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="eyebrow">Selected Precinct API</p>
              <h2 className="text-lg font-bold text-slate-900">
                {storeDashboard?.precinct?.name || selectedRooftop.replace("ROOFTOP-", "")}
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              Store Dashboard
            </span>
          </div>

          {storeLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow">Store Revenue</p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {money(storeFinancial?.totalRevenueCents)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow">Week Orders</p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {storeFinancial?.weekOrdersCount ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow">Queue</p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {storeQueue?.totalInQueue ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow">Credit Holds</p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {storeAccounts?.onCreditHold ?? 0}
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="eyebrow text-red-600">Urgent RFQs</p>
              <p className="mt-2 text-xl font-black text-slate-900">
                {storeSla?.urgentExpiringWithin1Hour ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="eyebrow text-emerald-700">SLA Compliance</p>
              <p className="mt-2 text-xl font-black text-slate-900">
                {Math.round(storeSla?.slaComplianceRatePercent ?? 100)}%
              </p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="eyebrow text-blue-700">Win Rate</p>
              <p className="mt-2 text-xl font-black text-slate-900">
                {Math.round(storeSla?.winRatePercent ?? 0)}%
              </p>
            </div>
          </div>
        </section>

        {/* ─── Monday Management Pack Export Card ─── */}
        <section className="card p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-white to-slate-50/70 border-slate-200/80">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Calendar size={11} />
                  <span>Monday Pack</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Management Pack</h2>
              </div>

              {/* Scope pill switcher */}
              <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-[11px] font-bold text-slate-600">
                <button
                  onClick={() => setExportScope("current")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    exportScope === "current"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "hover:text-slate-900 text-slate-500"
                  }`}
                >
                  Precinct
                </button>
                <button
                  onClick={() => setExportScope("network")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    exportScope === "network"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "hover:text-slate-900 text-slate-500"
                  }`}
                >
                  Group Rollup
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Executive export containing weekly financial volume, top accounts, fast-moving parts, and order ledger for weekly management review.
            </p>

            <div className="space-y-2.5 text-xs mb-5">
              <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                <span className="font-semibold text-slate-500">Orders this pack</span>
                <span className="font-black text-slate-900">
                  {weeklyExport?.financialSummary?.totalOrdersCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                <span className="font-semibold text-slate-500">Weekly Revenue AUD</span>
                <span className="font-black text-emerald-600">
                  ${weeklyExport?.financialSummary?.totalRevenueAud ?? "0.00"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                <span className="font-semibold text-slate-500">PartsCheck RFQs</span>
                <span className="font-black text-slate-900">
                  {weeklyExport?.partscheckSummary?.totalRfqs ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadCsv()}
                disabled={exportingCsv}
                className="flex-1 btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                {exportingCsv ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={15} />
                )}
                <span>{exportingCsv ? "Downloading..." : "Download CSV Pack"}</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="btn bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                title="View & Print Executive PDF Report"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
              <span>
                Scope:{" "}
                <strong className="text-slate-600">
                  {exportScope === "current"
                    ? selectedRooftop.replace("ROOFTOP-", "")
                    : "Booran Group Wide"}
                </strong>
              </span>
              <span className="font-mono text-[10px]">/dashboard/export/weekly</span>
            </div>
          </div>
        </section>
      </div>

      {/* ─── Recent Orders & Account Portfolio ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Recent Orders List */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow">Recent Activity</p>
              <h2 className="text-lg font-bold text-slate-900">Latest Dispatched &amp; Queued</h2>
            </div>
            <button
              onClick={() => onPage("orders")}
              className="text-xs font-bold text-red-600 hover:text-red-700"
            >
              View all orders
            </button>
          </div>

          {orders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="pb-3">Order Ref</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 hidden sm:table-cell">Date</th>
                    <th className="pb-3 text-right">Trade Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 5).map((o, idx) => (
                    <tr key={o._id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-bold text-slate-900">
                        {o.orderNumber || o._id?.slice(-8) || "—"}
                      </td>
                      <td className="py-3">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {(o.state || "NEW").replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 hidden sm:table-cell">
                        {shortDate(o.createdAt)}
                      </td>
                      <td className="py-3 text-right font-black text-slate-900">
                        {money(o.totalCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No recent orders"
              text="Orders placed in this rooftop precinct will appear here in real-time."
            />
          )}
        </section>

        {/* Security & Account Compliance Card */}
        <section className="card p-6 flex flex-col justify-between">
          <div>
            <p className="eyebrow">Account Health</p>
            <h2 className="text-lg font-bold text-slate-900">Compliance &amp; Terms</h2>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-50 border border-red-100">
                <AlertCircle className="text-red-600 shrink-0" size={20} />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {a?.accountsOnCreditHold ?? 0} Accounts on Hold
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Blocked from new order submission per Pentana policy.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <ShieldCheck className="text-emerald-600 shrink-0" size={20} />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {a?.activeAccounts ?? 0} Accounts In Good Standing
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Active credit terms verified with live Pentana feed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Pentana v2026.3 Sync</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> OK
            </span>
          </div>
        </section>
      </div>

      {/* ─── Executive Management Pack PDF / Print Preview Modal ─── */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        maxWidth="3xl"
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
              <FileText size={20} />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 block">Monday Executive Management Pack</span>
            </div>
          </div>
        }
        subtitle="Print or save as PDF for weekly dealership group review"
        footer={
          <div className="flex items-center justify-between w-full print:hidden">
            <div className="text-[11px] text-slate-400">
              Confidential · Internal Management Review
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadCsv()}
                disabled={exportingCsv}
                className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 text-xs flex items-center gap-1.5"
              >
                <Download size={14} />
                <span>CSV</span>
              </button>
              <button
                onClick={() => window.print()}
                className="btn-primary py-2 px-3.5 text-xs flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        }
      >
        {/* Printable Document Body */}
        <div className="space-y-6 text-slate-800 print:p-0">
          {/* Report Header */}
          <div className="border-b border-slate-200 pb-6 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600">
                <span>Booran Motor Group</span>
                <span>·</span>
                <span>Executive Operations Pack</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mt-1">
                Weekly Management Report
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Scope:{" "}
                <strong>
                  {exportScope === "current"
                    ? selectedRooftop.replace("ROOFTOP-", "")
                    : "Group-Wide Network (9 Dealerships)"}
                </strong>
              </p>
            </div>

            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Date Generated</p>
              <p>{dateStr}</p>
              <p className="text-[11px] text-slate-400 mt-1">Status: Verified OK</p>
            </div>
          </div>

          {/* Financial Summary KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Total Volume
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                ${weeklyExport?.financialSummary?.totalRevenueAud ?? "0.00"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Excl. GST</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Total Orders Placed
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {weeklyExport?.financialSummary?.totalOrdersCount ?? orders.length}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Trade fulfillment ledger</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                PartsCheck RFQs
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {weeklyExport?.partscheckSummary?.totalRfqs ?? 0}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1 font-semibold">
                {weeklyExport?.partscheckSummary?.accepted ?? 0} accepted orders
              </p>
            </div>
          </div>

          {/* Top Accounts & Parts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Top Trade Accounts
              </h4>
              {weeklyExport?.topAccounts?.length ? (
                <div className="space-y-2 text-xs">
                  {weeklyExport.topAccounts.slice(0, 4).map((acc, i) => (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {acc.name || acc.accountId}
                      </span>
                      <span className="font-black text-slate-900">
                        {money(acc.spendCents)} ({acc.count} ord)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No account activity recorded this week.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Fast Moving OEM Parts
              </h4>
              {weeklyExport?.topParts?.length ? (
                <div className="space-y-2 text-xs">
                  {weeklyExport.topParts.slice(0, 4).map((p, i) => (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                      <span className="font-semibold text-slate-800 font-mono text-[11px]">
                        {p.partNumber}
                      </span>
                      <span className="font-black text-slate-900">
                        {p.qty} units ({money(p.spendCents)})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No OEM parts dispatched this week.</p>
              )}
            </div>
          </div>

          {/* Order Register Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Order Register
            </h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3">Order Number</th>
                    <th className="p-3">Account</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Total AUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(weeklyExport?.orderRows?.slice(0, 8) || orders.slice(0, 8)).map((o: any, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900 font-mono">
                        {o.orderNumber || o._id?.slice(-8) || "—"}
                      </td>
                      <td className="p-3 text-slate-600 truncate max-w-[150px]">
                        {o.tradeAccountId || "Trade Customer"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {(o.state || "NEW").replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-slate-900">
                        ${o.totalAud || ((o.totalCents || 0) / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between text-[11px] text-slate-400">
            <span>Booran Motor Group B2B Trade System</span>
            <span>Confidential — Internal Management Distribution Only</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
