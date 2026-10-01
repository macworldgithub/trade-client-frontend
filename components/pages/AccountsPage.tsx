"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  Search,
  DollarSign,
  Percent,
  Calendar,
  Building,
  AlertTriangle,
  RotateCcw,
  X,
} from "lucide-react";
import { backendApi } from "../../lib/backend-api";
import { money, shortDate } from "../../lib/api";
import type { AccountSpend, TradeAccount } from "../../lib/types";
import PageTitle from "../ui/PageTitle";
import EmptyState from "../ui/EmptyState";
import Pagination from "../ui/Pagination";
import Modal from "../ui/Modal";

type Props = {
  selectedRooftop?: string;
  onRefreshNeeded?: () => void;
};

export default function AccountsPage({
  selectedRooftop = "ROOFTOP-DANDENONG",
  onRefreshNeeded,
}: Props) {
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submittingHold, setSubmittingHold] = useState<string | null>(null);
  const [submittingOverdue, setSubmittingOverdue] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<TradeAccount | null>(null);
  const [accountSpend, setAccountSpend] = useState<AccountSpend | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAccounts = useCallback(async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: targetLimit.toString(),
      });
      if (search.trim()) params.set("search", search.trim());
      if (selectedRooftop && selectedRooftop !== "ALL") params.set("rooftopId", selectedRooftop);

      const data = await backendApi.accounts.list(params.toString());
      if (Array.isArray(data)) {
        setAccounts(data);
        setTotal(data.length);
        setTotalPages(1);
      } else if (data && typeof data === "object") {
        const list = data.accounts || data.results || [];
        setAccounts(list);
        setTotal(data.total ?? list.length);
        setTotalPages(data.totalPages ?? Math.max(1, Math.ceil((data.total ?? list.length) / targetLimit)));
      }
    } catch {
      // In case role is trade_partner, fallback to mine
      try {
        const mine = await backendApi.accounts.mine();
        if (mine) {
          setAccounts([mine]);
          setTotal(1);
          setTotalPages(1);
        }
      } catch {
        setAccounts([]);
        setTotal(0);
        setTotalPages(1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedRooftop]);

  useEffect(() => {
    fetchAccounts(page, limit);
  }, [page, limit, selectedRooftop]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAccounts(1, limit);
  };

  const handleToggleCreditHold = async (accountId: string, currentHold: boolean) => {
    setSubmittingHold(accountId);
    try {
      await backendApi.accounts.creditHold(accountId, !currentHold);
      await fetchAccounts(page, limit);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle credit hold");
    } finally {
      setSubmittingHold(null);
    }
  };

  const handleToggleOverdue = async (accountId: string, currentOverdue: boolean) => {
    setSubmittingOverdue(accountId);
    try {
      await backendApi.accounts.overdue(accountId, !currentOverdue);
      await fetchAccounts(page, limit);
      if (selectedAccount) {
        const detail = await backendApi.accounts.get(accountId);
        setSelectedAccount(detail);
      }
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle overdue flag");
    } finally {
      setSubmittingOverdue(null);
    }
  };

  const handleInspectAccount = async (accountId: string) => {
    setDetailLoading(accountId);
    try {
      const [detail, spend] = await Promise.all([
        backendApi.accounts.get(accountId),
        backendApi.accounts.spend(accountId, new Date().getFullYear()),
      ]);
      setSelectedAccount(detail);
      setAccountSpend(spend as AccountSpend);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to load account detail");
    } finally {
      setDetailLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-red-600">Pentana Trade Ledger</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Accounts &amp; Credit Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time credit holds, payment terms, and YTD revenue controls across trade partner ledgers.
          </p>
        </div>

        <button
          onClick={() => fetchAccounts(page, limit)}
          className="btn-soft py-2 px-3 text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCcw size={14} className={loading ? "animate-spin" : ""} />
          <span>Sync Pentana DMS</span>
        </button>
      </div>

      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search account name, code, contact..."
            className="field pl-8 py-2 text-xs"
          />
        </form>

        <div className="text-xs font-semibold text-slate-500">
          Showing {accounts.length} of {total} accounts
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : accounts.length > 0 ? (
          <div className="p-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="pb-3 font-semibold">Account / Company</th>
                    <th className="pb-3 font-semibold">Contact</th>
                    <th className="pb-3 font-semibold">Terms</th>
                    <th className="pb-3 font-semibold">Credit Limit</th>
                    <th className="pb-3 font-semibold">Current Balance</th>
                    <th className="pb-3 font-semibold">Discount</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((acc) => {
                    const isHold = !!acc.creditHold;
                    const isOver = !!acc.isOverdue;
                    return (
                      <tr key={acc._id || acc.accountId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5">
                          <p className="font-bold text-slate-900">{acc.companyName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{acc.accountId}</p>
                        </td>
                        <td className="py-3.5 text-slate-600">
                          <p className="font-semibold">{acc.contactName || "Direct Workshop"}</p>
                          <p className="text-[11px] text-slate-400">{acc.contactEmail || acc.contactPhone || "No contact info"}</p>
                        </td>
                        <td className="py-3.5 text-slate-600 font-medium">
                          {acc.paymentTerms || "30 Days EOM"}
                        </td>
                        <td className="py-3.5 font-bold text-slate-900">
                          {money(acc.creditLimitCents)}
                        </td>
                        <td className="py-3.5 font-bold text-slate-900">
                          {money(acc.currentBalanceCents)}
                        </td>
                        <td className="py-3.5 font-bold text-emerald-600">
                          {acc.discountRate ?? 0}%
                        </td>
                        <td className="py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            {isHold ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200">
                                Credit Hold
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Good Standing
                              </span>
                            )}
                            {isOver && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Overdue 60+ Days
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleInspectAccount(acc.accountId || acc._id || "")}
                              disabled={detailLoading === (acc.accountId || acc._id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                            >
                              {detailLoading === (acc.accountId || acc._id) ? "Loading..." : "Inspect"}
                            </button>
                            <button
                              onClick={() => handleToggleCreditHold(acc.accountId || acc._id || "", isHold)}
                              disabled={submittingHold === acc.accountId}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                                isHold
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              }`}
                            >
                              {submittingHold === acc.accountId ? "Updating..." : isHold ? "Release Hold" : "Place Hold"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
              title="No trade accounts found"
              text="No accounts match your query or have been enrolled for this precinct."
            />
          </div>
        )}
      </div>

      {/* ─── INSPECT ACCOUNT MODAL ─── */}
      <Modal
        isOpen={!!selectedAccount}
        onClose={() => {
          setSelectedAccount(null);
          setAccountSpend(null);
        }}
        maxWidth="2xl"
        title={selectedAccount?.companyName || "Trade Account"}
        subtitle={selectedAccount ? <span className="font-mono">{selectedAccount.accountId || selectedAccount._id}</span> : undefined}
        footer={
          selectedAccount && (
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                onClick={() => handleToggleOverdue(selectedAccount.accountId || selectedAccount._id || "", !!selectedAccount.isOverdue)}
                className="btn-soft text-xs text-amber-700"
              >
                {selectedAccount.isOverdue ? "Clear Overdue" : "Mark Overdue"}
              </button>
              <button
                onClick={() => handleToggleCreditHold(selectedAccount.accountId || selectedAccount._id || "", !!selectedAccount.creditHold)}
                className="btn-primary text-xs"
              >
                {selectedAccount.creditHold ? "Release Credit Hold" : "Place Credit Hold"}
              </button>
            </div>
          )
        }
      >
        {selectedAccount && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow">YTD Spend</p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {money(accountSpend?.ytdSpendCents ?? selectedAccount.ytdSpendCents)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow">Orders</p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {accountSpend?.ytdOrderCount ?? selectedAccount.ytdOrderCount ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow">Credit Limit</p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {money(accountSpend?.creditLimitCents ?? selectedAccount.creditLimitCents)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow">Discount</p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {accountSpend?.discountPercent ?? selectedAccount.discountRate ?? 0}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-bold text-slate-900">Contact</p>
                <p className="mt-1 text-slate-500">{selectedAccount.contactName || "No contact name"}</p>
                <p className="text-slate-500">{selectedAccount.contactEmail || selectedAccount.contactPhone || "No contact detail"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-bold text-slate-900">Terms</p>
                <p className="mt-1 text-slate-500">{selectedAccount.paymentTerms || "30 Days EOM"}</p>
                <p className="text-slate-500">Balance: {money(accountSpend?.currentBalanceCents ?? selectedAccount.currentBalanceCents)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
