"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Building2,
  FileText,
  UserCheck,
  UserX,
  Plus,
  X,
  Search,
  Eye,
  DollarSign,
} from "lucide-react";
import { backendApi } from "../../lib/backend-api";
import { money, shortDate } from "../../lib/api";
import type { Rfq, PartsCheckSummary } from "../../lib/types";
import PageTitle from "../ui/PageTitle";
import EmptyState from "../ui/EmptyState";
import { useAuth } from "../../lib/auth-context";

type Props = {
  selectedRooftop?: string;
  onRefreshNeeded?: () => void;
};

export default function PartsCheckPage({
  selectedRooftop = "ROOFTOP-DANDENONG",
  onRefreshNeeded,
}: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PartsCheckSummary | null>(null);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotingId, setQuotingId] = useState<string | null>(null);
  const [quoteSuccess, setQuoteSuccess] = useState<string | null>(null);
  const [selectedRfq, setSelectedRfq] = useState<Rfq | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [overrideLine, setOverrideLine] = useState<{
    rfqId: string;
    lineId: string;
    partNumber: string;
    priceCents: number;
    stockQty: number;
    sourceName: string;
    notes: string;
  } | null>(null);

  // Inbound simulation modal
  const [simulateModal, setSimulateModal] = useState(false);
  const [repairerName, setRepairerName] = useState("Dandenong Smash Repairs");
  const [rego, setRego] = useState("1ZV-9AB");
  const [vin, setVin] = useState("KMHCT4AE8KU123456");
  const [simPart, setSimPart] = useState("58101-D3A00");
  const [simQty, setSimQty] = useState(1);
  const [simulating, setSimulating] = useState(false);

  const fetchPartsCheck = async () => {
    setLoading(true);
    try {
      const canReadGroupPartsCheck = ["admin", "controller", "csuites", "group_admin", "store_manager"].includes(
        (user?.role || "").toLowerCase()
      );
      const [sumRes, inboxRes] = await Promise.allSettled([
        canReadGroupPartsCheck
          ? backendApi.dashboard.groupPartsCheck()
          : backendApi.dashboard.storePartsCheck(selectedRooftop),
        backendApi.partsCheck.inbox(),
      ]);

      if (sumRes.status === "fulfilled") {
        const value = sumRes.value as PartsCheckSummary & {
          slaOverview?: {
            totalRfqs?: number;
            autoQuoted?: number;
            pendingReview?: number;
            winRatePercent?: number;
          };
        };
        setSummary(
          value.slaOverview
            ? {
                totalRfqs: value.slaOverview.totalRfqs,
                autoQuotedCount: value.slaOverview.autoQuoted,
                pendingReviewCount: value.slaOverview.pendingReview,
                conversionRate: value.slaOverview.winRatePercent,
              }
            : value
        );
      }
      if (inboxRes.status === "fulfilled") {
        const val = inboxRes.value as { rfqs?: Rfq[]; results?: Rfq[] };
        setRfqs(val.rfqs || val.results || []);
      }
    } catch {
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartsCheck();
  }, [selectedRooftop, user?.role]);

  const handleTriggerQuote = async (rfqId: string) => {
    setQuotingId(rfqId);
    setQuoteSuccess(null);
    try {
      await backendApi.partsCheck.quote(rfqId, "Manual quote triggered via Trade Client Controller console");
      setQuoteSuccess(`Automated quote-back written to PartsCheck for RFQ ${rfqId}!`);
      await fetchPartsCheck();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to quote RFQ");
    } finally {
      setQuotingId(null);
    }
  };

  const handleInspectRfq = async (rfqId: string) => {
    setDetailLoading(true);
    try {
      const detail = await backendApi.partsCheck.get(rfqId);
      setSelectedRfq(detail as Rfq);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to load RFQ detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAcceptRfq = async (rfqId: string) => {
    setActionLoading(`accept-${rfqId}`);
    try {
      await backendApi.partsCheck.accept(rfqId, {
        deliveryMethod: "DELIVERY",
        deliveryNotes: "Accepted from Trade Client controller console",
      });
      setQuoteSuccess(`PartsCheck RFQ ${rfqId} accepted and converted into a TradeOrder.`);
      setSelectedRfq(null);
      await fetchPartsCheck();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to accept RFQ");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOverrideLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideLine) return;
    setActionLoading(`override-${overrideLine.lineId}`);
    try {
      const updated = await backendApi.partsCheck.override(
        overrideLine.rfqId,
        overrideLine.lineId,
        {
          unitTradePriceCents: overrideLine.priceCents,
          stockQty: overrideLine.stockQty,
          inStock: overrideLine.stockQty > 0,
          sourceKind: "BRANCH",
          sourceName: overrideLine.sourceName,
          sourceRooftopId: selectedRooftop,
          eta: overrideLine.stockQty > 0 ? "Same day" : "Backorder",
          notes: overrideLine.notes,
        }
      );
      setSelectedRfq(updated as Rfq);
      setOverrideLine(null);
      await fetchPartsCheck();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to override RFQ line");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulateInboundRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);

    try {
      await backendApi.partsCheck.inbound({
        rfqId: `PC-RFQ-${Date.now().toString().slice(-5)}`,
        buyerId: "BUYER-DANDENONG-SMASH",
        rooftopId: selectedRooftop,
        repairerName,
        repairerEmail: "quotes@dandenongsmash.com.au",
        tradeAccountId: undefined,
        vehicleDetails: {
          rego,
          vin,
          make: "HYUNDAI",
          model: "TUCSON",
          year: 2020,
        },
        deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 60 min SLA
        lines: [
          {
            lineId: "PC-LIN-01",
            partNumber: simPart,
            description: "Front Brake Pad Kit",
            quantity: simQty,
          },
        ],
      });

      setSimulateModal(false);
      setQuoteSuccess("New PartsCheck RFQ received and queued for automated quote-back!");
      await fetchPartsCheck();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Inbound webhook failed");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-red-600">Smash Repair Integration</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            PartsCheck RFQs &amp; Auto-Quote
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Automates quote-backs to panel shops (Crashzone, iBodyShop, FlexiQuote) without counter keying.
          </p>
        </div>

        <button
          onClick={() => setSimulateModal(true)}
          className="btn-primary shadow-md shadow-red-500/20"
        >
          <Plus size={16} />
          <span>Simulate Inbound RFQ</span>
        </button>
      </div>

      {quoteSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{quoteSuccess}</span>
          </div>
          <button onClick={() => setQuoteSuccess(null)} className="text-emerald-600 hover:underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Tiles Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="eyebrow">Total Inbound RFQs</p>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {(summary?.totalRfqs ?? rfqs.length).toString()}
          </p>
          <p className="mt-3 text-xs text-slate-400">Panel shop quote requests</p>
        </div>

        <div className="card p-5">
          <p className="eyebrow">Auto-Quoted Rate</p>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {summary?.autoQuotedCount ?? rfqs.filter((r) => r.state === "AUTO_QUOTED").length}
          </p>
          <p className="mt-3 text-xs text-emerald-600 font-semibold">Zero counter keying needed</p>
        </div>

        <div className="card p-5">
          <p className="eyebrow">Pending Review (SLA)</p>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {summary?.pendingReviewCount ?? rfqs.filter((r) => r.state !== "AUTO_QUOTED").length}
          </p>
          <p className="mt-3 text-xs text-amber-600 font-semibold">Exceptions / Unmapped accounts</p>
        </div>

        <div className="card p-5">
          <p className="eyebrow">Quote Win Rate</p>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {Math.round(summary?.conversionRate ?? 68)}%
          </p>
          <p className="mt-3 text-xs text-slate-400">Accepted into TradeOrders</p>
        </div>
      </div>

      {/* RFQ Live Inbox Card */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Inbound PartsCheck RFQ Inbox
            </h3>
            <p className="text-xs text-slate-400">
              Auto-matches Pentana trade account, resolves pricing, and quotes back before SLA deadline.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
            {rfqs.length} open
          </span>
        </div>

        {loading ? (
          <div className="py-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : rfqs.length ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3">RFQ Ref</th>
                  <th className="pb-3">Smash Repairer</th>
                  <th className="pb-3">Vehicle Details</th>
                  <th className="pb-3">Buyer Mapping</th>
                  <th className="pb-3">SLA Deadline</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rfqs.map((r) => (
                  <tr key={r._id || r.rfqId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 font-bold text-slate-900">
                      {r.rfqId || r._id?.slice(-8)}
                    </td>
                    <td className="py-3.5">
                      <p className="font-semibold text-slate-800">{r.repairerName || r.buyerName || "Panel Shop"}</p>
                      <p className="text-[10px] text-slate-400">{r.repairerEmail || "estimator@repairer.com.au"}</p>
                    </td>
                    <td className="py-3.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        {r.vehicle?.rego || "1ZV-9AB"}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {r.vehicle?.make || "HYUNDAI"} {r.vehicle?.model || "TUCSON"}
                      </p>
                    </td>
                    <td className="py-3.5">
                      {r.isBuyerMapped !== false ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <UserCheck size={12} /> Pentana Mapped
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          <UserX size={12} /> Unmapped Buyer
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-xs font-mono text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-500" />
                        <span>{shortDate(r.deadline || r.slaDeadline)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={detailLoading}
                          onClick={() => handleInspectRfq(r._id || r.rfqId || "")}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                        >
                          <Eye size={12} />
                          <span>Detail</span>
                        </button>
                        <button
                          disabled={quotingId === (r._id || r.rfqId)}
                          onClick={() => handleTriggerQuote(r._id || r.rfqId || "")}
                          className="inline-flex items-center gap-1 btn-primary py-1 px-3 text-xs shadow-none"
                        >
                          <Send size={12} />
                          <span>
                            {quotingId === (r._id || r.rfqId) ? "Quoting..." : "Quote Back"}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12">
            <EmptyState
              title="No open PartsCheck RFQs"
              text="Inbound RFQs from estimating packages will appear here in real time."
            />
          </div>
        )}
      </div>

      {selectedRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  RFQ {selectedRfq.rfqId || selectedRfq._id}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedRfq.repairerName || selectedRfq.buyerName || "Repairer"} · {selectedRfq.rooftopId || selectedRooftop}
                </p>
              </div>
              <button
                onClick={() => setSelectedRfq(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="eyebrow">Status</p>
                <p className="mt-1 text-xs font-black text-slate-900">
                  {selectedRfq.status || selectedRfq.state || "RECEIVED"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="eyebrow">Mapped Account</p>
                <p className="mt-1 text-xs font-black text-slate-900">
                  {selectedRfq.tradeAccountId || selectedRfq.mappedTradeAccountId || "Unmapped"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="eyebrow">SLA Deadline</p>
                <p className="mt-1 text-xs font-black text-slate-900">
                  {shortDate(selectedRfq.deadline || selectedRfq.slaDeadline)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="eyebrow">Total</p>
                <p className="mt-1 text-xs font-black text-slate-900">
                  {money(selectedRfq.totalCents)}
                </p>
              </div>
            </div>

            <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Line</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Trade</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedRfq.lines || []).map((line, idx) => (
                    <tr key={line.lineId || idx}>
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{line.partNumber}</p>
                        <p className="text-[11px] text-slate-400">{line.description}</p>
                      </td>
                      <td className="p-3 text-slate-600">
                        <p className="font-semibold">{line.resolvedSourceName || "Pending"}</p>
                        <p className="text-[10px] text-slate-400">{line.status || line.state || "PENDING"}</p>
                      </td>
                      <td className="p-3 font-bold text-slate-800">{line.quantity ?? 1}</td>
                      <td className="p-3 font-black text-slate-900">
                        {money(line.unitTradePriceCents || line.tradePriceCents || line.resolvedPriceCents)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() =>
                            setOverrideLine({
                              rfqId: selectedRfq._id || selectedRfq.rfqId || "",
                              lineId: line.lineId || line.partNumber || "",
                              partNumber: line.partNumber || "Line",
                              priceCents:
                                line.unitTradePriceCents ||
                                line.tradePriceCents ||
                                line.resolvedPriceCents ||
                                0,
                              stockQty: line.stockQty ?? 1,
                              sourceName: line.resolvedSourceName || "Controller Override",
                              notes: line.overrideNotes || "Manual RFQ line resolution",
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100"
                        >
                          <DollarSign size={12} />
                          <span>Override</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-end gap-2">
              <button
                onClick={() => handleTriggerQuote(selectedRfq._id || selectedRfq.rfqId || "")}
                disabled={!!actionLoading || !!quotingId}
                className="btn-soft text-xs"
              >
                <Send size={13} />
                Trigger Quote
              </button>
              <button
                onClick={() => handleAcceptRfq(selectedRfq._id || selectedRfq.rfqId || "")}
                disabled={!!actionLoading}
                className="btn-primary text-xs"
              >
                <CheckCircle2 size={13} />
                {actionLoading?.startsWith("accept") ? "Accepting..." : "Accept & Raise Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {overrideLine && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Override {overrideLine.partNumber}
              </h3>
              <button onClick={() => setOverrideLine(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg">
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleOverrideLine} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Trade Price Cents
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={overrideLine.priceCents}
                    onChange={(e) =>
                      setOverrideLine({ ...overrideLine, priceCents: parseInt(e.target.value) || 0 })
                    }
                    className="field text-xs py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={overrideLine.stockQty}
                    onChange={(e) =>
                      setOverrideLine({ ...overrideLine, stockQty: parseInt(e.target.value) || 0 })
                    }
                    className="field text-xs py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Source Name
                </label>
                <input
                  value={overrideLine.sourceName}
                  onChange={(e) => setOverrideLine({ ...overrideLine, sourceName: e.target.value })}
                  className="field text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notes
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideLine.notes}
                  onChange={(e) => setOverrideLine({ ...overrideLine, notes: e.target.value })}
                  className="field text-xs resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setOverrideLine(null)} className="btn-soft text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={!!actionLoading} className="btn-primary text-xs">
                  {actionLoading?.startsWith("override") ? "Saving..." : "Save Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── SIMULATE INBOUND RFQ MODAL ─── */}
      {simulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Simulate Inbound PartsCheck RFQ
              </h3>
              <button onClick={() => setSimulateModal(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg">
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSimulateInboundRfq} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Smash Repairer Name
                </label>
                <input
                  required
                  type="text"
                  value={repairerName}
                  onChange={(e) => setRepairerName(e.target.value)}
                  className="field text-xs py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Vehicle Rego
                  </label>
                  <input
                    type="text"
                    value={rego}
                    onChange={(e) => setRego(e.target.value)}
                    className="field text-xs py-2 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    VIN
                  </label>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    className="field text-xs py-2 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Part Number
                  </label>
                  <input
                    type="text"
                    value={simPart}
                    onChange={(e) => setSimPart(e.target.value)}
                    className="field text-xs py-2 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={simQty}
                    onChange={(e) => setSimQty(parseInt(e.target.value) || 1)}
                    className="field text-xs py-2 text-center"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSimulateModal(false)}
                  className="btn-soft text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="btn-primary text-xs"
                >
                  {simulating ? "Sending Webhook..." : "Post RFQ to System"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
