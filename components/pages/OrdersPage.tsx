"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
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
import Pagination from "../ui/Pagination";
import Modal from "../ui/Modal";
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
  const [limit, setLimit] = useState(20);
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

  const fetchOrders = useCallback(async (targetPage = page, targetLimit = limit) => {
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
          limit: targetLimit.toString(),
          page: targetPage.toString(),
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
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, activeTab, selectedRooftop]);

  useEffect(() => {
    fetchOrders(page, limit);
  }, [page, limit, activeTab, selectedRooftop]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmittingOrder(true);
    try {
      const validLines = partLines.filter((l) => l.partNumber.trim());
      if (validLines.length === 0) {
        throw new Error("Please add at least one part number to the order.");
      }

      await backendApi.orders.create({
        customerReference,
        tradeAccountId: tradeAccountId.trim() || undefined,
        rooftopId: selectedRooftop,
        deliveryMethod,
        lines: validLines.map((l) => ({
          partNumber: l.partNumber.trim().toUpperCase(),
          quantity: l.quantity,
          unitPriceCents: 4500, // standard placeholder trade net
          sourceKind: "BRANCH",
          sourceRooftopId: selectedRooftop,
        })),
      });

      setCreateModal(false);
      setPartLines([{ partNumber: "", quantity: 1 }]);
      setCustomerReference("");
      setPage(1);
      fetchOrders(1, limit);
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
      fetchOrders(page, limit);
      if (selectedOrder) {
        const fresh = await backendApi.orders.get(orderId);
        setSelectedOrder(fresh);
      }
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update order state");
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
        exceptionDesc
      );
      setExceptionModal(null);
      setExceptionDesc("");
      fetchOrders(page, limit);
      if (selectedOrder) {
        const fresh = await backendApi.orders.get(exceptionModal.orderId);
        setSelectedOrder(fresh);
      }
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to raise exception");
    } finally {
      setSubmittingException(false);
    }
  };

  const handleReSourceLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reSourceModal) return;
    setSubmittingReSource(true);
    try {
      await api(`/orders/${encodeURIComponent(reSourceModal.orderId)}/lines/${encodeURIComponent(reSourceModal.lineId)}/re-source`, {
        method: "POST",
        body: JSON.stringify({
          sourceKind: reSourceKind,
          sourceName: reSourceName,
          sourceRooftopId: reSourceRooftop || undefined,
          binLocation: reSourceBin || undefined,
          priceCents: reSourcePrice ? parseInt(reSourcePrice) : undefined,
          eta: reSourceEta || undefined,
          notes: reSourceNotes || undefined,
        }),
      });
      setReSourceModal(null);
      setReSourceName("");
      setReSourceRooftop("");
      setReSourceBin("");
      setReSourcePrice("");
      setReSourceEta("");
      setReSourceNotes("");
      fetchOrders(page, limit);
      if (selectedOrder) {
        const fresh = await backendApi.orders.get(reSourceModal.orderId);
        setSelectedOrder(fresh);
      }
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to re-source line");
    } finally {
      setSubmittingReSource(false);
    }
  };

  const handlePickLine = async (orderId: string, lineId: string) => {
    try {
      await api(`/orders/${encodeURIComponent(orderId)}/lines/${encodeURIComponent(lineId)}/pick`, {
        method: "POST",
      });
      fetchOrders(page, limit);
      if (selectedOrder) {
        const fresh = await backendApi.orders.get(orderId);
        setSelectedOrder(fresh);
      }
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to pick line");
    }
  };

  const stateBadge = (state?: string) => {
    switch (state?.toUpperCase()) {
      case "SUBMITTED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PROCESSING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "PARTIALLY_PICKED":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "PICKED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "READY_FOR_DELIVERY":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "DISPATCHED":
      case "DELIVERED":
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "EXCEPTION":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageTitle
          eyebrow="Order Processing"
          title="Orders & Controller Queue"
          description={`Real-time fulfillment queue, exceptions management, and dispatch for ${selectedRooftop}.`}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrders(page, limit)}
            className="btn-soft py-2 px-3 text-xs flex items-center gap-1.5"
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setCreateModal(true)}
            className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* ─── Filter Tabs & Search Bar ─── */}
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex rounded-xl bg-slate-100 p-1 w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveTab("all");
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All Orders
          </button>
          <button
            onClick={() => {
              setActiveTab("queue");
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "queue"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Picking Queue</span>
            <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
          </button>
          <button
            onClick={() => {
              setActiveTab("exceptions");
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "exceptions"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Exceptions</span>
            <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 text-[10px] font-black">
              Active
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search order # or reference..."
            className="field pl-8 py-2 text-xs"
          />
        </div>
      </div>

      {/* ─── Orders Table ─── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="p-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="pb-3 font-semibold">Order Number</th>
                    <th className="pb-3 font-semibold">Account &amp; Reference</th>
                    <th className="pb-3 font-semibold">Lines</th>
                    <th className="pb-3 font-semibold">Fulfillment State</th>
                    <th className="pb-3 font-semibold">Total Net</th>
                    <th className="pb-3 font-semibold">Placed Date</th>
                    <th className="pb-3 text-right font-semibold">Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr
                      key={o._id || o.orderNumber}
                      className="hover:bg-slate-50/60 transition cursor-pointer"
                      onClick={() => setSelectedOrder(o)}
                    >
                      <td className="py-3.5 font-black text-slate-900 font-mono">
                        {o.orderNumber || o._id?.slice(-8)}
                      </td>
                      <td className="py-3.5">
                        <p className="font-bold text-slate-800">
                          {o.tradeAccountId || "Direct Account"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {o.customerReference || "No PO Ref"}
                        </p>
                      </td>
                      <td className="py-3.5 text-slate-600 font-semibold">
                        {o.lines?.length || 1} line{(o.lines?.length || 1) > 1 ? "s" : ""}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${stateBadge(o.state)}`}>
                          {o.state?.replaceAll("_", " ") || "PROCESSING"}
                        </span>
                      </td>
                      <td className="py-3.5 font-bold text-slate-900">
                        {money(o.totalCents)}
                      </td>
                      <td className="py-3.5 text-slate-500">
                        {shortDate(o.createdAt)}
                      </td>
                      <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-1 ml-auto"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
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
        ) : (
          <div className="py-12">
            <EmptyState
              title="No orders found"
              text="No orders match your filter criteria or queue status."
            />
          </div>
        )}
      </div>

      {/* ─── CREATE ORDER MODAL ─── */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        maxWidth="lg"
        title="Submit Trade Order"
        subtitle={<span>Rooftop: <b className="text-slate-800">{selectedRooftop}</b></span>}
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

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

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
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
      </Modal>

      {/* ─── ORDER INSPECTION & CONTROLLER DETAIL MODAL ─── */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        maxWidth="2xl"
        title={
          selectedOrder ? (
            <div className="flex items-center gap-2">
              <span>Order {selectedOrder.orderNumber || selectedOrder._id?.slice(-8)}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stateBadge(selectedOrder.state)}`}>
                {selectedOrder.state?.replaceAll("_", " ")}
              </span>
            </div>
          ) : undefined
        }
        subtitle={
          selectedOrder ? (
            <span>
              Placed {shortDate(selectedOrder.createdAt)} · Account: {selectedOrder.tradeAccountId || "Direct"} · Rooftop: {selectedOrder.rooftopId || "Metro"}
            </span>
          ) : undefined
        }
      >
        {selectedOrder && (
          <div className="space-y-4">
            {/* Controller State Advancement Action Strip */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
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
            <div>
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Immutable Snapshot Total:</span>
              <span className="text-lg font-black text-slate-900">
                {money(selectedOrder.totalCents)}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── RE-SOURCE MODAL ─── */}
      <Modal
        isOpen={!!reSourceModal}
        onClose={() => setReSourceModal(null)}
        maxWidth="md"
        title="Re-source Line"
        subtitle={
          reSourceModal ? (
            <span>Order: {reSourceModal.orderId} · Part: <b>{reSourceModal.partNumber}</b></span>
          ) : undefined
        }
      >
        {reSourceModal && (
          <form onSubmit={handleReSourceLine} className="space-y-3.5">
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

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setReSourceModal(null)} className="btn-soft text-xs">
                Cancel
              </button>
              <button type="submit" disabled={submittingReSource} className="btn-primary text-xs">
                {submittingReSource ? "Saving..." : "Save Re-source"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── RAISE EXCEPTION MODAL ─── */}
      <Modal
        isOpen={!!exceptionModal}
        onClose={() => setExceptionModal(null)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <span>Raise Line Exception</span>
          </div>
        }
        subtitle={
          exceptionModal ? (
            <span>Order: {exceptionModal.orderId} · Part: <b>{exceptionModal.partNumber}</b></span>
          ) : undefined
        }
      >
        {exceptionModal && (
          <form onSubmit={handleRaiseException} className="space-y-3.5">
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

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
        )}
      </Modal>
    </div>
  );
}
