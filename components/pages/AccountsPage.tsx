"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { backendApi } from "../../lib/backend-api";
import { money, shortDate } from "../../lib/api";
import type { AccountSpend, TradeAccount } from "../../lib/types";
import PageTitle from "../ui/PageTitle";
import EmptyState from "../ui/EmptyState";

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

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await backendApi.accounts.list();
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      // In case role is trade_partner, fallback to mine
      try {
        const mine = await backendApi.accounts.mine();
        if (mine) setAccounts([mine]);
      } catch {
        setAccounts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleToggleCreditHold = async (accountId: string, currentHold: boolean) => {
    setSubmittingHold(accountId);
    try {
      await backendApi.accounts.creditHold(accountId, !currentHold);
      await fetchAccounts();
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
      await fetchAccounts();
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

  const filtered = accounts.filter(
    (a) =>
      `${a.companyName || ""} ${a.accountId || ""} ${a.contactName || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-red-600">Pentana Trade Ledger</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Trade Accounts &amp; Credit Holds
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Account-specific trade discount, payment terms, and credit exposure from Pentana DMS.
          </p>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, account ID, contact..."
              className="field pl-9 py-2 text-xs"
            />
          </div>

          <span className="text-xs font-semibold text-slate-400">
            {filtered.length} account{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="py-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3">Trade Account</th>
                  <th className="pb-3">Discount Tier</th>
                  <th className="pb-3">Terms</th>
                  <th className="pb-3">Current Balance</th>
                  <th className="pb-3">Credit Status</th>
                  <th className="pb-3 text-right">Controller Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => (
                  <tr key={a.accountId || a._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5">
                      <p className="font-bold text-slate-900">
                        {a.companyName || "Workshop Partner"}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {a.accountId || "ACC-UNKNOWN"}
                      </p>
                    </td>
                    <td className="py-3.5 font-bold text-slate-700">
                      {a.discountRate ? `${a.discountRate}% off list` : "Standard Trade"}
                    </td>
                    <td className="py-3.5 text-slate-500 text-xs">
                      {a.paymentTerms || "30 Days EOM"}
                    </td>
                    <td className="py-3.5 font-black text-slate-900">
                      {money(a.currentBalanceCents)}
                    </td>
                    <td className="py-3.5">
                      {a.creditHold ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <ShieldAlert size={12} /> CREDIT HOLD
                        </span>
                      ) : a.isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle size={12} /> OVERDUE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck size={12} /> IN GOOD STANDING
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={detailLoading === (a.accountId || a._id)}
                          onClick={() => handleInspectAccount(a.accountId || a._id || "")}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition border border-slate-200 text-slate-700 hover:bg-slate-100"
                        >
                          {detailLoading === (a.accountId || a._id) ? "Loading..." : "Detail"}
                        </button>
                        <button
                          disabled={submittingOverdue === (a.accountId || a._id)}
                          onClick={() => handleToggleOverdue(a.accountId || a._id || "", !!a.isOverdue)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        >
                          {submittingOverdue === (a.accountId || a._id)
                            ? "Saving..."
                            : a.isOverdue
                            ? "Clear Overdue"
                            : "Mark Overdue"}
                        </button>
                        <button
                          disabled={submittingHold === (a.accountId || a._id)}
                          onClick={() => handleToggleCreditHold(a.accountId || a._id || "", !!a.creditHold)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                            a.creditHold
                              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          }`}
                        >
                          {submittingHold === (a.accountId || a._id)
                            ? "Saving..."
                            : a.creditHold
                            ? "Release Hold"
                            : "Place Hold"}
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
              title="No trade accounts found"
              text="No accounts match your query or have been enrolled for this precinct."
            />
          </div>
        )}
      </div>

      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {selectedAccount.companyName || "Trade Account"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  {selectedAccount.accountId || selectedAccount._id}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedAccount(null);
                  setAccountSpend(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                X
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
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

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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

            <div className="mt-5 flex justify-end gap-2">
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
          </div>
        </div>
      )}
    </div>
  );
}
