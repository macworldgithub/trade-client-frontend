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
} from "lucide-react";
import { backendApi } from "../../lib/backend-api";
import { money, shortDate } from "../../lib/api";
import type { Rfq, PartsCheckSummary } from "../../lib/types";
import PageTitle from "../ui/PageTitle";
import EmptyState from "../ui/EmptyState";

type Props = {
  selectedRooftop?: string;
  onRefreshNeeded?: () => void;
};

export default function PartsCheckPage({
  selectedRooftop = "ROOFTOP-DANDENONG",
  onRefreshNeeded,
}: Props) {
  const [summary, setSummary] = useState<PartsCheckSummary | null>(null);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotingId, setQuotingId] = useState<string | null>(null);
  const [quoteSuccess, setQuoteSuccess] = useState<string | null>(null);

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
      const [sumRes, inboxRes] = await Promise.allSettled([
        backendApi.dashboard.groupPartsCheck(),
        backendApi.partsCheck.inbox(),
      ]);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value as PartsCheckSummary);
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
  }, []);

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

  const handleSimulateInboundRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);

    try {
      await backendApi.partsCheck.inbound({
        rfqId: `PC-RFQ-${Date.now().toString().slice(-5)}`,
        rooftopId: selectedRooftop,
        repairerName,
        repairerEmail: "quotes@dandenongsmash.com.au",
        vehicle: {
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
            requestedType: "OEM",
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
