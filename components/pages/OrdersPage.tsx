"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowRight,
  FileText,
  Truck,
  RotateCcw,
} from "lucide-react";
import { api, money, shortDate } from "../../lib/api";
import { backendApi } from "../../lib/backend-api";
import type { Order, OrdersResponse, OrderLine } from "../../lib/types";
import PageTitle from "../ui/PageTitle";
import EmptyState from "../ui/EmptyState";
import { useAuth } from "../../lib/auth-context";

type Props = {
  selectedRooftop?: string;
  onRefreshNeeded?: () => void;
};

export default function OrdersPage({
  selectedRooftop = "ROOFTOP-DANDENONG",
  onRefreshNeeded,
}: Props) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "queue" | "exceptions">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [exceptionModal, setExceptionModal] = useState<{
    orderId: string;
    lineId: string;
    partNumber: string;
  } | null>(null);
  const [reSourceModal, setReSourceModal] = useState<{
    orderId: string;
    lineId: string;
    partNumber: string;
  } | null>(null);

  // Order creation form state
  const [customerReference, setCustomerReference] = useState("");
  const [tradeAccountId, setTradeAccountId] = useState(user?.tradeAccountId || "");
  const [deliveryMethod, setDeliveryMethod] = useState<"COLLECTION" | "DELIVERY">("COLLECTION");
  const [partLines, setPartLines] = useState<Array<{ partNumber: string; quantity: number }>>([
    { partNumber: "", quantity: 1 },
  ]);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [formError, setFormError] = useState("");

  // Exception form state
  const [exceptionReason, setExceptionReason] = useState("OUT_OF_STOCK");
  const [exceptionDesc, setExceptionDesc] = useState("");
  const [submittingException, setSubmittingException] = useState(false);
  const [reSourceKind, setReSourceKind] = useState("SISTER");
  const [reSourceName, setReSourceName] = useState("");
  const [reSourceRooftop, setReSourceRooftop] = useState("");
  const [reSourceBin, setReSourceBin] = useState("");
  const [reSourcePrice, setReSourcePrice] = useState("");
  const [reSourceEta, setReSourceEta] = useState("");
  const [reSourceNotes, setReSourceNotes] = useState("");
  const [submittingReSource, setSubmittingReSource] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "queue") {
        // Fetch queue endpoint for warehouse controllers
        const queueRes = await backendApi.orders.queue(`rooftopId=${encodeURIComponent(selectedRooftop)}`);
        const list = queueRes.orders || [];
        setOrders(list);
        setTotal(list.length);
        setTotalPages(1);
      } else {
        const params = new URLSearchParams({
          limit: "20",
          page: page.toString(),
        });
        if (q.trim()) params.set("search", q.trim());
        if (activeTab === "exceptions") params.set("state", "EXCEPTION");

        const data = await api<OrdersResponse>(`/orders?${params}`);
        const list = data.orders || data.results || [];
        setOrders(Array.isArray(list) ? list : []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || list.length);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, q, activeTab, selectedRooftop]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmittingOrder(true);

    const validLines = partLines.filter((l) => l.partNumber.trim().length > 0);
    if (!validLines.length) {
      setFormError("Please enter at least one valid part number.");
      setSubmittingOrder(false);
      return;
    }

    try {
      await backendApi.orders.create({
        rooftopId: selectedRooftop,
        tradeAccountId: tradeAccountId.trim() || user?.tradeAccountId || undefined,
        customerReference: customerReference.trim() || undefined,
        deliveryMethod,
        lines: validLines.map((l) => ({
          partNumber: l.partNumber.trim(),
          quantity: Number(l.quantity) || 1,
        })),
      });

      setCreateModal(false);
      setCustomerReference("");
      setTradeAccountId(user?.tradeAccountId || "");
      setPartLines([{ partNumber: "", quantity: 1 }]);
      fetchOrders();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleUpdateState = async (orderId: string, newState: string) => {
    try {
      await backendApi.orders.state(orderId, newState);
      fetchOrders();
      if (selectedOrder) {
        const updated = await backendApi.orders.get(orderId);
        setSelectedOrder(updated);
      }
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update state");
    }
  };

  const handlePickLine = async (orderId: string, lineId: string) => {
    try {
      await backendApi.orders.pick(orderId, lineId);
      const updated = await backendApi.orders.get(orderId);
      setSelectedOrder(updated);
      fetchOrders();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Pick confirmation failed");
    }
  };

  const handleRaiseException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionModal) return;
    setSubmittingException(true);

    try {
      await backendApi.orders.exception(
        exceptionModal.orderId,
        exceptionModal.lineId,
        exceptionReason,
        exceptionDesc || "Reported during counter inspection"
      );

      setExceptionModal(null);
      setExceptionDesc("");
      const updated = await backendApi.orders.get(exceptionModal.orderId);
      setSelectedOrder(updated);
      fetchOrders();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to flag exception");
    } finally {
      setSubmittingException(false);
    }
  };

  const handleReSourceLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reSourceModal) return;
    setSubmittingReSource(true);

    try {
      await backendApi.orders.reSource(
        reSourceModal.orderId,
        reSourceModal.lineId,
        {
          newSourceKind: reSourceKind,
          newSourceName: reSourceName || "Controller Re-source",
          newSourceRooftopId: reSourceRooftop || undefined,
          newBinLocation: reSourceBin || undefined,
          newUnitPriceCents: reSourcePrice ? Number(reSourcePrice) : undefined,
          newEta: reSourceEta || undefined,
          notes: reSourceNotes || "Controller re-sourced line item",
        }
      );

      setReSourceModal(null);
      setReSourceName("");
      setReSourceRooftop("");
      setReSourceBin("");
      setReSourcePrice("");
      setReSourceEta("");
      setReSourceNotes("");
      const updated = await backendApi.orders.get(reSourceModal.orderId);
      setSelectedOrder(updated);
      fetchOrders();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to re-source line");
    } finally {
      setSubmittingReSource(false);
    }
  };

  const stateBadge = (state?: string) => {
    const s = (state || "NEW").toUpperCase();
    if (s.includes("EXCEPTION")) {
      return "bg-red-50 text-red-700 border border-red-200";
    }
    if (s.includes("DELIVERED") || s.includes("COMPLETE")) {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (s.includes("PICKED") || s.includes("READY")) {
      return "bg-teal-50 text-teal-700 border border-teal-200";
    }
    if (s.includes("PROCESSING") || s.includes("AWAITING")) {
      return "bg-amber-50 text-amber-700 border border-amber-200";
    }
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-red-600">Operations &amp; Counter</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Trade Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track orders through Pentana dispatch, live exceptions, and picking queues.
          </p>
        </div>

        <button
          onClick={() => setCreateModal(true)}
          className="btn-primary shadow-md shadow-red-500/20"
        >
          <Plus size={16} />
          <span>New Trade Order</span>
        </button>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 max-w-fit text-xs font-bold">
            <button
              onClick={() => {
                setActiveTab("all");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => {
                setActiveTab("queue");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "queue" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Controller Queue (FIFO)
            </button>
            <button
              onClick={() => {
                setActiveTab("exceptions");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "exceptions"
                  ? "bg-white text-red-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Exceptions Only
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="field pl-9 py-2 text-xs"
              placeholder="Filter by PO, account, order #"
            />
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="py-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : orders.length ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3">Order Number</th>
                  <th className="pb-3">Account</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 hidden md:table-cell">Lines</th>
                  <th className="pb-3 hidden sm:table-cell">Date</th>
                  <th className="pb-3 text-right">Total (AUD)</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o._id || o.orderNumber} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{o.orderNumber || o._id?.slice(-8) || "—"}</span>
                        {o.hasExceptions && (
                          <span className="p-1 rounded-full bg-red-100 text-red-600" title="Order has exceptions">
                            <AlertTriangle size={12} />
                          </span>
                        )}
                      </div>
                      {o.customerReference && (
                        <p className="text-[11px] text-slate-400 font-normal">
                          Ref: {o.customerReference}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-600 font-medium text-xs">
                      {o.tradeAccountId || "Counter Sale"}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${stateBadge(o.state)}`}>
                        {(o.state || "NEW").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500 hidden md:table-cell text-xs">
                      {o.lines?.length || 0} line{(o.lines?.length || 0) !== 1 ? "s" : ""}
                    </td>
                    <td className="py-3.5 text-slate-500 hidden sm:table-cell text-xs">
                      {shortDate(o.createdAt)}
                    </td>
                    <td className="py-3.5 text-right font-black text-slate-900">
                      {money(o.totalCents)}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
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
              title="No orders found"
              text="No orders match your filter criteria or queue status."
            />
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
            <span className="text-slate-400">
              Page {page} of {totalPages} ({total} records)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-soft px-3 py-1.5 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-soft px-3 py-1.5 disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── CREATE ORDER MODAL ─── */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Submit Trade Order</h3>
                <p className="text-xs text-slate-400">Rooftop: {selectedRooftop}</p>
              </div>
              <button
                onClick={() => setCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Customer / Workshop PO Reference
                </label>
                <input
                  type="text"
                  value={customerReference}
                  onChange={(e) => setCustomerReference(e.target.value)}
                  placeholder="e.g. PO-8921 / Rego: 1ZV9AB"
                  className="field py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Trade Account ID
                </label>
                <input
                  type="text"
                  value={tradeAccountId}
                  onChange={(e) => setTradeAccountId(e.target.value)}
                  placeholder="ACC-000123"
                  className="field py-2 text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Collection Preference
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("COLLECTION")}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                      deliveryMethod === "COLLECTION"
                        ? "bg-red-50 border-red-500 text-red-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Counter Pickup
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("DELIVERY")}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                      deliveryMethod === "DELIVERY"
                        ? "bg-red-50 border-red-500 text-red-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Van Delivery Run
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Order Lines (Parts)
                  </label>
                  <button
                    type="button"
                    onClick={() => setPartLines([...partLines, { partNumber: "", quantity: 1 }])}
                    className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Line
                  </button>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {partLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        required
                        type="text"
                        placeholder="OEM Part # (e.g. 58101-D3A00)"
                        value={line.partNumber}
                        onChange={(e) => {
                          const updated = [...partLines];
                          updated[idx].partNumber = e.target.value;
                          setPartLines(updated);
                        }}
                        className="field py-1.5 text-xs flex-1 uppercase"
                      />
                      <input
                        required
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => {
                          const updated = [...partLines];
                          updated[idx].quantity = parseInt(e.target.value) || 1;
                          setPartLines(updated);
                        }}
                        className="field py-1.5 text-xs w-20 text-center"
                      />
                      {partLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPartLines(partLines.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-400 hover:text-red-600"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="btn-soft text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="btn-primary text-xs"
                >
                  {submittingOrder ? "Submitting to Pentana..." : "Confirm & Place Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ORDER INSPECTION & CONTROLLER DETAIL MODAL ─── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">
                    Order {selectedOrder.orderNumber || selectedOrder._id?.slice(-8)}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stateBadge(selectedOrder.state)}`}>
                    {selectedOrder.state?.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Placed {shortDate(selectedOrder.createdAt)} · Account: {selectedOrder.tradeAccountId || "Direct"} · Rooftop: {selectedOrder.rooftopId || "Metro"}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Controller State Advancement Action Strip */}
            <div className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">Controller Workflow:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleUpdateState(selectedOrder._id || selectedOrder.orderNumber || "", "PROCESSING")}
                  className="btn-soft py-1 px-2.5 text-xs"
                >
                  Mark Processing
                </button>
                <button
                  onClick={() => handleUpdateState(selectedOrder._id || selectedOrder.orderNumber || "", "READY_FOR_DELIVERY")}
                  className="btn-soft py-1 px-2.5 text-xs text-teal-700"
                >
                  Ready for Pickup
                </button>
                <button
                  onClick={() => handleUpdateState(selectedOrder._id || selectedOrder.orderNumber || "", "DELIVERED")}
                  className="btn bg-emerald-600 hover:bg-emerald-700 text-white py-1 px-2.5 text-xs"
                >
                  Complete / Dispatched
                </button>
              </div>
            </div>

            {/* Order Lines table */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Ordered Part Lines &amp; Picking State
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <tr>
                      <th className="p-3">Part</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Source &amp; Bin</th>
                      <th className="p-3">Line Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedOrder.lines || []).map((line: OrderLine, idx) => (
                      <tr key={line.lineId || idx} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{line.partNumber}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {line.description || "OEM Genuine Line"}
                          </p>
                        </td>
                        <td className="p-3 font-bold text-slate-800">{line.quantity}</td>
                        <td className="p-3 text-slate-600">
                          <span className="font-semibold block">{line.sourceKind || "OEM"}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Bin: {line.binLocation || "A-01-2"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${stateBadge(line.state)}`}>
                            {line.state || "PENDING"}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          <button
                            onClick={() => handlePickLine(selectedOrder._id || selectedOrder.orderNumber || "", line.lineId || line.partNumber || "")}
                            className="px-2 py-1 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-[11px] transition"
                            title="Confirm warehouse pick"
                          >
                            Pick
                          </button>
                          <button
                            onClick={() => setReSourceModal({
                              orderId: selectedOrder._id || selectedOrder.orderNumber || "",
                              lineId: line.lineId || line.partNumber || "",
                              partNumber: line.partNumber || "Line",
                            })}
                            className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition"
                            title="Re-source this line item"
                          >
                            Re-source
                          </button>
                          <button
                            onClick={() => setExceptionModal({
                              orderId: selectedOrder._id || selectedOrder.orderNumber || "",
                              lineId: line.lineId || line.partNumber || "",
                              partNumber: line.partNumber || "Line",
                            })}
                            className="px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 font-bold text-[11px] transition"
                            title="Flag exception on line"
                          >
                            Exception
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Immutable Snapshot Total:</span>
              <span className="text-lg font-black text-slate-900">
                {money(selectedOrder.totalCents)}
              </span>
            </div>
          </div>
        </div>
      )}

      {reSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Re-source Line
              </h3>
              <button onClick={() => setReSourceModal(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg">
                <X size={17} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Order: {reSourceModal.orderId} · Part: <b>{reSourceModal.partNumber}</b>
            </p>

            <form onSubmit={handleReSourceLine} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Source Kind
                  </label>
                  <select
                    value={reSourceKind}
                    onChange={(e) => setReSourceKind(e.target.value)}
                    className="field text-xs bg-white"
                  >
                    <option value="SISTER">Sister Branch</option>
                    <option value="BRANCH">Own Branch</option>
                    <option value="OEM">OEM Portal</option>
                    <option value="AFTERMARKET">Aftermarket</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Price Cents
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reSourcePrice}
                    onChange={(e) => setReSourcePrice(e.target.value)}
                    placeholder="Optional"
                    className="field text-xs py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Source Name
                </label>
                <input
                  required
                  value={reSourceName}
                  onChange={(e) => setReSourceName(e.target.value)}
                  placeholder="e.g. Cheltenham Parts / Repco"
                  className="field text-xs py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Rooftop ID
                  </label>
                  <input
                    value={reSourceRooftop}
                    onChange={(e) => setReSourceRooftop(e.target.value)}
                    placeholder="Optional"
                    className="field text-xs py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bin
                  </label>
                  <input
                    value={reSourceBin}
                    onChange={(e) => setReSourceBin(e.target.value)}
                    placeholder="Optional"
                    className="field text-xs py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ETA
                </label>
                <input
                  value={reSourceEta}
                  onChange={(e) => setReSourceEta(e.target.value)}
                  placeholder="e.g. Tomorrow 9:00 AM transfer"
                  className="field text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={reSourceNotes}
                  onChange={(e) => setReSourceNotes(e.target.value)}
                  className="field text-xs resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setReSourceModal(null)} className="btn-soft text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submittingReSource} className="btn-primary text-xs">
                  {submittingReSource ? "Saving..." : "Save Re-source"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RAISE EXCEPTION MODAL ─── */}
      {exceptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-600" />
                Raise Line Exception
              </h3>
              <button onClick={() => setExceptionModal(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg">
                <X size={17} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Order: {exceptionModal.orderId} · Part: <b>{exceptionModal.partNumber}</b>
            </p>

            <form onSubmit={handleRaiseException} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Reason Code
                </label>
                <select
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  className="field text-xs bg-white"
                >
                  <option value="OUT_OF_STOCK">Out of Stock / Stock Variance</option>
                  <option value="DAMAGED">Damaged in Bin</option>
                  <option value="INCORRECT_BIN">Empty / Incorrect Bin</option>
                  <option value="PRICE_OVERRIDE_NEEDED">Price Override Needed</option>
                  <option value="FITMENT_MISMATCH">Vehicle Fitment Mismatch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Description / Controller Notes
                </label>
                <textarea
                  rows={3}
                  value={exceptionDesc}
                  onChange={(e) => setExceptionDesc(e.target.value)}
                  placeholder="Detail the issue for counter callback or warehouse buyer re-sourcing..."
                  className="field text-xs resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExceptionModal(null)}
                  className="btn-soft text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingException}
                  className="btn-danger text-xs font-bold"
                >
                  {submittingException ? "Flagging..." : "Confirm Exception"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
