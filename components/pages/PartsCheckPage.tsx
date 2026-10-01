"use client";

import { useEffect, useState, useMemo } from "react";
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
import Pagination from "../ui/Pagination";
import Modal from "../ui/Modal";
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
  const [search, setSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

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
      const canReadGroupPartsCheck = ["admin", "csuites", "group_admin", "store_manager"].includes(
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
    setActionLoading(`quote-${rfqId}`);
    try {
      await backendApi.partsCheck.quote(rfqId);
      setQuoteSuccess(`RFQ ${rfqId} successfully auto-quoted to estimating package!`);
      await fetchPartsCheck();
      if (selectedRfq) setSelectedRfq(null);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to quote RFQ");
    } finally {
      setQuotingId(null);
      setActionLoading(null);
    }
  };

  const handleAcceptRfq = async (rfqId: string) => {
    setActionLoading(`accept-${rfqId}`);
    try {
      await backendApi.partsCheck.accept(rfqId);
      setQuoteSuccess(`RFQ ${rfqId} accepted and converted to active trade order!`);
      await fetchPartsCheck();
      if (selectedRfq) setSelectedRfq(null);
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
    setActionLoading(`override-${overrideLine.rfqId}`);
    try {
      await backendApi.partsCheck.override(overrideLine.rfqId, overrideLine.lineId, {
        tradePriceCents: overrideLine.priceCents,
        stockQty: overrideLine.stockQty,
        sourceName: overrideLine.sourceName,
        notes: overrideLine.notes,
      });
      setOverrideLine(null);
      await fetchPartsCheck();
      if (selectedRfq) {
        const fresh = await backendApi.partsCheck.get(selectedRfq._id || selectedRfq.rfqId || "");
        setSelectedRfq(fresh as Rfq);
      }
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to override line");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulateInboundRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      await backendApi.partsCheck.inbound({
        repairerName,
        rego,
        vin,
        rooftopId: selectedRooftop,
        lines: [
          {
            partNumber: simPart.toUpperCase().trim(),
            quantity: simQty,
            description: "Front Brake Pads",
          },
        ],
      });
      setSimulateModal(false);
      setQuoteSuccess("Inbound PartsCheck RFQ webhook simulated successfully!");
      fetchPartsCheck();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to simulate inbound RFQ");
    } finally {
      setSimulating(false);
    }
  };

  const filteredRfqs = useMemo(() => {
    return rfqs.filter((r) =>
      `${r.repairerName || r.buyerName || ""} ${r.rfqId || r._id || ""} ${r.rego || ""} ${r.tradeAccountId || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [rfqs, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRfqs.length / limit));
  const paginatedRfqs = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRfqs.slice(start, start + limit);
  }, [filteredRfqs, page, limit]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageTitle
          eyebrow="Collision & Estimator Integrations"
          title="PartsCheck RFQ Gateway"
          description={`Automated quotation and webhook integration for ${selectedRooftop}.`}
        />
        <button
          onClick={() => setSimulateModal(true)}
          className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Simulate Inbound RFQ</span>
        </button>
      </div>

      {quoteSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{quoteSuccess}</span>
          </div>
          <button onClick={() => setQuoteSuccess(null)} className="text-emerald-600 hover:text-emerald-800 p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5">
          <p className="eyebrow">Total Inbound RFQs</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
            {summary?.totalRfqs ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Auto-routed via PartsCheck</p>
        </div>

        <div className="card p-4 sm:p-5">
          <p className="eyebrow">Instant Auto-Quoted</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600">
            {summary?.autoQuotedCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">&lt; 30s response SLA</p>
        </div>

        <div className="card p-4 sm:p-5">
          <p className="eyebrow">Manual Review Required</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-amber-600">
            {summary?.pendingReviewCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Missing price / stock flags</p>
        </div>

        <div className="card p-4 sm:p-5">
          <p className="eyebrow">Quote Conversion Rate</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
            {summary?.conversionRate ?? 68}%
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Won order volume</p>
        </div>
      </div>

      {/* ─── RFQ Inbox Table ─── */}
      <div className="card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h2 className="section-title text-base">Inbound RFQ Queue</h2>
            <p className="text-xs text-slate-500">
              Live queue of PartsCheck requests awaiting quote responses or order conversion
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search repairer, RFQ #, rego..."
              className="field pl-8 py-2 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : paginatedRfqs.length > 0 ? (
          <div className="p-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="pb-3 font-semibold">RFQ # &amp; Repairer</th>
                    <th className="pb-3 font-semibold">Vehicle</th>
                    <th className="pb-3 font-semibold">Parts Lines</th>
                    <th className="pb-3 font-semibold">Quote Status</th>
                    <th className="pb-3 font-semibold">Total Estimate</th>
                    <th className="pb-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRfqs.map((r) => (
                    <tr
                      key={r._id || r.rfqId}
                      className="hover:bg-slate-50/60 transition cursor-pointer"
                      onClick={() => setSelectedRfq(r)}
                    >
                      <td className="py-3.5">
                        <p className="font-bold text-slate-900">{r.repairerName || r.buyerName || "Smash Repairer"}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{r.rfqId || r._id}</p>
                      </td>
                      <td className="py-3.5 text-slate-600">
                        <p className="font-semibold">{r.rego || "No Rego"}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{r.vin?.slice(0, 10)}...</p>
                      </td>
                      <td className="py-3.5 font-semibold text-slate-700">
                        {r.lines?.length || 1} line item{(r.lines?.length || 1) > 1 ? "s" : ""}
                      </td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {r.status || r.state || "RECEIVED"}
                        </span>
                      </td>
                      <td className="py-3.5 font-bold text-slate-900">
                        {money(r.totalCents || 8900)}
                      </td>
                      <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedRfq(r)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => handleTriggerQuote(r._id || r.rfqId || "")}
                            disabled={quotingId === (r._id || r.rfqId)}
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

            {/* ─── Pagination ─── */}
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredRfqs.length}
              pageSize={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              loading={loading}
            />
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

      {/* ─── INSPECT RFQ MODAL ─── */}
      <Modal
        isOpen={!!selectedRfq}
        onClose={() => setSelectedRfq(null)}
        maxWidth="3xl"
        title={selectedRfq ? `RFQ ${selectedRfq.rfqId || selectedRfq._id}` : undefined}
        subtitle={
          selectedRfq ? (
            <span>
              {selectedRfq.repairerName || selectedRfq.buyerName || "Repairer"} · {selectedRfq.rooftopId || selectedRooftop}
            </span>
          ) : undefined
        }
        footer={
          selectedRfq && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 w-full">
              <button
                onClick={() => handleTriggerQuote(selectedRfq._id || selectedRfq.rfqId || "")}
                disabled={!!actionLoading || !!quotingId}
                className="btn-soft text-xs"
              >
                <Send size={13} />
                <span>Trigger Quote</span>
              </button>
              <button
                onClick={() => handleAcceptRfq(selectedRfq._id || selectedRfq.rfqId || "")}
                disabled={!!actionLoading}
                className="btn-primary text-xs"
              >
                <CheckCircle2 size={13} />
                <span>{actionLoading?.startsWith("accept") ? "Accepting..." : "Accept & Raise Order"}</span>
              </button>
            </div>
          )
        }
      >
        {selectedRfq && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

            <div className="border border-slate-200 rounded-xl overflow-hidden">
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
          </div>
        )}
      </Modal>

      {/* ─── OVERRIDE RFQ LINE MODAL ─── */}
      <Modal
        isOpen={!!overrideLine}
        onClose={() => setOverrideLine(null)}
        maxWidth="md"
        title={overrideLine ? `Override ${overrideLine.partNumber}` : undefined}
      >
        {overrideLine && (
          <form onSubmit={handleOverrideLine} className="space-y-4">
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
        )}
      </Modal>

      {/* ─── SIMULATE INBOUND RFQ MODAL ─── */}
      <Modal
        isOpen={simulateModal}
        onClose={() => setSimulateModal(false)}
        maxWidth="md"
        title="Simulate Inbound PartsCheck RFQ"
      >
        <form onSubmit={handleSimulateInboundRfq} className="space-y-4">
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
      </Modal>
    </div>
  );
}
