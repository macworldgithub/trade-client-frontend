"use client";

import { useMemo, useState } from "react";
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
  ArrowUpRight,
  Clock,
  Truck,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import type { GroupData, Rooftop, Order } from "../../lib/types";
import { money, shortDate } from "../../lib/api";
import StatCard from "../ui/StatCard";
import EmptyState from "../ui/EmptyState";
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
  const n = group?.networkOverview;
  const f = group?.fulfillmentPipeline || {};
  const a = group?.accountsPortfolio;

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

      {/* ─── Metric Stat Cards Grid (Responsive: 1 col on mobile, 2 col on sm, 4 on xl) ─── */}
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
    </div>
  );
}
