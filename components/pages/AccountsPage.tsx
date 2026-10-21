"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  CheckCircle2,
  FileText,
  Clock,
  Layers,
  Phone,
  Mail,
  MapPin,
  Tag,
  AlertCircle,
  Hash,
  ExternalLink,
} from "lucide-react";
import { backendApi } from "../../lib/backend-api";
import { money, shortDate } from "../../lib/api";
import type { AccountSpend, TradeAccount, PentanaEntity, PentanaPriceLevel } from "../../lib/types";
import PageTitle from "../ui/PageTitle";
import EmptyState from "../ui/EmptyState";
import Pagination from "../ui/Pagination";
import Modal from "../ui/Modal";

type Props = {
  selectedRooftop?: string;
  onRefreshNeeded?: () => void;
};

type ActiveTab = "accounts" | "entities" | "price_levels";

export default function AccountsPage({
  selectedRooftop = "ROOFTOP-DANDENONG",
  onRefreshNeeded,
}: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("accounts");

  // Accounts state
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submittingHold, setSubmittingHold] = useState<string | null>(null);
  const [submittingOverdue, setSubmittingOverdue] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<TradeAccount | null>(null);
  const [accountSpend, setAccountSpend] = useState<AccountSpend | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Pagination state for Accounts
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Discovered Entities state
  const [entities, setEntities] = useState<PentanaEntity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entitySearch, setEntitySearch] = useState("");
  const [entitySuburb, setEntitySuburb] = useState<string>("ALL");
  const [entityOnlyTrade, setEntityOnlyTrade] = useState<boolean | undefined>(undefined);
  const [entityPage, setEntityPage] = useState(1);
  const [entityLimit, setEntityLimit] = useState(25);
  const [entityTotal, setEntityTotal] = useState(0);
  const [entityTotalPages, setEntityTotalPages] = useState(1);

  // Price Level Reference state
  const [priceLevels, setPriceLevels] = useState<PentanaPriceLevel[]>([]);
  const [priceLevelsLoading, setPriceLevelsLoading] = useState(false);

  // ─── Fetch Accounts ──────────────────────────────────────────────────────────

  const fetchAccounts = useCallback(
    async (targetPage = page, targetLimit = limit) => {
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
    },
    [page, limit, search, selectedRooftop],
  );

  // ─── Fetch Discovered Entities ───────────────────────────────────────────────

  const fetchEntities = useCallback(
    async (targetPage = entityPage, targetLimit = entityLimit) => {
      setEntitiesLoading(true);
      try {
        const params = new URLSearchParams({
          page: targetPage.toString(),
          limit: targetLimit.toString(),
        });
        if (entitySearch.trim()) params.set("search", entitySearch.trim());
        if (entitySuburb && entitySuburb !== "ALL") params.set("suburb", entitySuburb);
        if (entityOnlyTrade !== undefined) params.set("isTradeAccount", entityOnlyTrade ? "true" : "false");

        const data = await backendApi.accounts.pentanaEntities(params.toString());
        if (data) {
          setEntities(data.entities || []);
          setEntityTotal(data.total || 0);
          setEntityTotalPages(data.totalPages || 1);
        }
      } catch {
        setEntities([]);
        setEntityTotal(0);
      } finally {
        setEntitiesLoading(false);
      }
    },
    [entityPage, entityLimit, entitySearch, entitySuburb, entityOnlyTrade],
  );

  // ─── Fetch Price Levels ──────────────────────────────────────────────────────

  const fetchPriceLevels = useCallback(async () => {
    setPriceLevelsLoading(true);
    try {
      const data = await backendApi.accounts.pentanaPriceLevels();
      if (Array.isArray(data)) {
        setPriceLevels(data);
      }
    } catch {
      setPriceLevels([]);
    } finally {
      setPriceLevelsLoading(false);
    }
  }, []);

  // Sync Pentana
  const handleSyncPentana = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await backendApi.accounts.syncPentana();
      setSyncFeedback(
        `Synced ${res.tradeAccountsSynced} trade accounts & ${res.entitiesSynced} entities from Pentana Entity 50.`
      );
      await fetchAccounts(page, limit);
      if (activeTab === "entities") fetchEntities(entityPage, entityLimit);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to sync Pentana DMS");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchAccounts(page, limit);
  }, [page, limit, selectedRooftop]);

  useEffect(() => {
    if (activeTab === "entities") {
      fetchEntities(entityPage, entityLimit);
    } else if (activeTab === "price_levels") {
      fetchPriceLevels();
    }
  }, [activeTab, entityPage, entityLimit, entitySuburb, entityOnlyTrade]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAccounts(1, limit);
  };

  const handleEntitySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEntityPage(1);
    fetchEntities(1, entityLimit);
  };

  const handleToggleCreditHold = async (accountId: string, currentHold: boolean) => {
    setSubmittingHold(accountId);
    try {
      await backendApi.accounts.creditHold(accountId, !currentHold);
      await fetchAccounts(page, limit);
      if (selectedAccount && selectedAccount.accountId === accountId) {
        setSelectedAccount((prev) => (prev ? { ...prev, creditHold: !currentHold } : null));
      }
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
      if (selectedAccount && selectedAccount.accountId === accountId) {
        setSelectedAccount((prev) => (prev ? { ...prev, isOverdue: !currentOverdue } : null));
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

  // ─── Executive Rollup Stats ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    let totalBalanceCents = 0;
    let totalFyPartsSalesCents = 0;
    let totalFyTransactions = 0;
    let accountsWithWarnings = 0;
    let accountsOnHold = 0;
    let accountsOverdue = 0;

    for (const acc of accounts) {
      totalBalanceCents += acc.currentBalanceCents || 0;
      totalFyPartsSalesCents += acc.partsSalesFinancialYearCents || 0;
      totalFyTransactions += acc.partsTransactionsFinancialYear || 0;
      if (acc.warningNotes && acc.warningNotes.length > 0) accountsWithWarnings++;
      if (acc.creditHold) accountsOnHold++;
      if (acc.isOverdue) accountsOverdue++;
    }

    return {
      totalBalanceCents,
      totalFyPartsSalesCents,
      totalFyTransactions,
      accountsWithWarnings,
      accountsOnHold,
      accountsOverdue,
      verifiedCount: accounts.length,
    };
  }, [accounts]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Top Header & Synchronization ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="eyebrow text-red-600">Pentana eraPower Trade Ledger</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              Entity 50 · Dandenong Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Accounts &amp; Credit Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time debtor ledger, aged balances, price levels, and notepad warnings read from Pentana DMS.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSyncPentana}
            disabled={syncing}
            className="btn-soft py-2 px-3 text-xs flex items-center gap-1.5 font-bold border border-slate-300 hover:bg-slate-100 transition shadow-sm disabled:opacity-50"
          >
            <RotateCcw size={14} className={syncing ? "animate-spin text-red-600" : ""} />
            <span>{syncing ? "Ingesting Pentana..." : "Sync Pentana DMS"}</span>
          </button>
        </div>
      </div>

      {/* Sync Notification Banner */}
      {syncFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-emerald-600 hover:underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* ─── Executive Metric KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-300">Verified Trade Accounts</p>
            <Building size={16} className="text-red-400" />
          </div>
          <p className="text-2xl font-black mt-2 text-white">{total > 0 ? total : accounts.length}</p>
          <p className="text-[11px] text-slate-300 mt-1">Entity 50 Receivable Book</p>
        </div>

        <div className="card p-4 shadow-sm border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-slate-500">Ledger Balance</p>
            <DollarSign size={16} className="text-slate-400" />
          </div>
          <p className="text-xl font-black mt-2 text-slate-900">{money(stats.totalBalanceCents)}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.accountsOverdue > 0 ? `${stats.accountsOverdue} accounts overdue` : "Current on terms"}
          </p>
        </div>

        <div className="card p-4 shadow-sm border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-slate-500">FY 26/27 Parts Sales</p>
            <FileText size={16} className="text-emerald-500" />
          </div>
          <p className="text-xl font-black mt-2 text-emerald-600">{money(stats.totalFyPartsSalesCents)}</p>
          <p className="text-[11px] text-slate-400 mt-1">{stats.totalFyTransactions} posted invoice lines</p>
        </div>

        <div className="card p-4 shadow-sm border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-slate-500">Discovered Contacts</p>
            <Users size={16} className="text-indigo-500" />
          </div>
          <p className="text-xl font-black mt-2 text-slate-900">185</p>
          <p className="text-[11px] text-slate-400 mt-1">Smash repairers Melbourne</p>
        </div>

        <div className="card p-4 shadow-sm border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-slate-500">Counter Warnings</p>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-xl font-black mt-2 text-amber-600">{stats.accountsWithWarnings}</p>
          <p className="text-[11px] text-slate-400 mt-1">Active NotePadWarnings alerts</p>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 ${
            activeTab === "accounts"
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building size={14} />
          <span>Verified Trade Ledger (34)</span>
        </button>

        <button
          onClick={() => setActiveTab("entities")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 ${
            activeTab === "entities"
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={14} />
          <span>Pentana Smash Directory (185)</span>
        </button>

        <button
          onClick={() => setActiveTab("price_levels")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 ${
            activeTab === "price_levels"
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Tag size={14} />
          <span>Price Level Reference (52)</span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: VERIFIED TRADE LEDGER ACCOUNTS                                   */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search account ID, company, ABN, price level..."
                className="field pl-8 py-2 text-xs w-full"
              />
            </form>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Verified Pentana Book
              </span>
              <span>
                Showing {accounts.length} of {total} accounts
              </span>
            </div>
          </div>

          <div className="card overflow-hidden bg-white shadow-sm border border-slate-200">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : accounts.length > 0 ? (
              <div className="p-5 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="pb-3 font-semibold">Account / ABN</th>
                        <th className="pb-3 font-semibold">Contact &amp; Statement</th>
                        <th className="pb-3 font-semibold">Price Level</th>
                        <th className="pb-3 font-semibold">Terms &amp; Method</th>
                        <th className="pb-3 font-semibold">Credit Limit</th>
                        <th className="pb-3 font-semibold">Balance</th>
                        <th className="pb-3 font-semibold">FY 26/27 Sales</th>
                        <th className="pb-3 font-semibold">Status &amp; Warnings</th>
                        <th className="pb-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accounts.map((acc) => {
                        const isHold = !!acc.creditHold;
                        const isOver = !!acc.isOverdue;
                        const hasWarnings = acc.warningNotes && acc.warningNotes.length > 0;
                        const hasNegativeAvail = (acc.creditAvailableCents ?? 0) < 0;

                        return (
                          <tr key={acc._id || acc.accountId} className="hover:bg-slate-50/70 transition">
                            {/* Account / ABN */}
                            <td className="py-3.5 pr-2">
                              <p className="font-bold text-slate-900 leading-snug">{acc.companyName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  ID: {acc.accountId}
                                </span>
                                {acc.abn && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ABN: {acc.abn}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Contact & Statement */}
                            <td className="py-3.5 pr-2 text-slate-600">
                              <p className="font-semibold">{acc.contactName || "Direct Workshop"}</p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                {acc.statementEmail || acc.businessEmail || acc.contactPhone || "No email"}
                              </p>
                            </td>

                            {/* Price Level */}
                            <td className="py-3.5 pr-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                                {acc.priceLevelLabel || `${acc.discountPercent ?? 15}% TRADE`}
                              </span>
                            </td>

                            {/* Terms & Method */}
                            <td className="py-3.5 pr-2 text-slate-600 font-medium">
                              <p className="font-bold text-slate-800">{acc.paymentTerms || "30 DAYS"}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                {acc.paymentMethodLabel || "CHARGE"}
                              </p>
                            </td>

                            {/* Credit Limit */}
                            <td className="py-3.5 pr-2 font-bold text-slate-900">
                              <p>{money(acc.creditLimitCents)}</p>
                              <p
                                className={`text-[10px] font-semibold ${
                                  hasNegativeAvail ? "text-red-600" : "text-emerald-600"
                                }`}
                              >
                                Avail: {money(acc.creditAvailableCents)}
                              </p>
                            </td>

                            {/* Current Balance */}
                            <td className="py-3.5 pr-2 font-black text-slate-900 text-sm">
                              {money(acc.currentBalanceCents)}
                            </td>

                            {/* FY 26/27 Sales */}
                            <td className="py-3.5 pr-2">
                              <p className="font-bold text-slate-900">
                                {money(acc.partsSalesFinancialYearCents ?? acc.ytdSpendCents)}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {acc.partsTransactionsFinancialYear ?? acc.ytdOrderCount ?? 0} invoices
                              </p>
                            </td>

                            {/* Status & Warnings */}
                            <td className="py-3.5 pr-2">
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
                                    Overdue 60+
                                  </span>
                                )}
                                {hasWarnings && (
                                  <span
                                    title={acc.warningNotes?.join("\n")}
                                    className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1"
                                  >
                                    <AlertTriangle size={10} className="text-amber-600" />
                                    <span>Warning Note</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 text-right whitespace-nowrap">
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
                                  {submittingHold === acc.accountId ? "..." : isHold ? "Release" : "Hold"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

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
                  text="No verified accounts match your search query."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: DISCOVERED PENTANA SMASH ENTITIES (185)                           */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "entities" && (
        <div className="space-y-4">
          <div className="card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <form onSubmit={handleEntitySearchSubmit} className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
                placeholder="Search entity name, suburb, ABN, phone..."
                className="field pl-8 py-2 text-xs w-full"
              />
            </form>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={entityOnlyTrade === undefined ? "all" : entityOnlyTrade ? "trade" : "prospect"}
                onChange={(e) => {
                  const val = e.target.value;
                  setEntityOnlyTrade(val === "all" ? undefined : val === "trade");
                  setEntityPage(1);
                }}
                className="field py-1.5 px-3 text-xs"
              >
                <option value="all">All 185 Contacts</option>
                <option value="trade">Verified Trade Accounts Only (34)</option>
                <option value="prospect">Prospect Contacts Only (151)</option>
              </select>

              <span className="text-slate-500 font-semibold">
                Showing {entities.length} of {entityTotal}
              </span>
            </div>
          </div>

          <div className="card overflow-hidden bg-white shadow-sm border border-slate-200">
            {entitiesLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : entities.length > 0 ? (
              <div className="p-5 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="pb-3 font-semibold">Pentana ID</th>
                        <th className="pb-3 font-semibold">Business Name</th>
                        <th className="pb-3 font-semibold">Location / Suburb</th>
                        <th className="pb-3 font-semibold">Contact Info</th>
                        <th className="pb-3 font-semibold">ABN</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entities.map((ent) => (
                        <tr key={ent.entityId} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 font-mono font-bold text-slate-800 text-[11px]">
                            {ent.entityId}
                          </td>
                          <td className="py-3 font-bold text-slate-900">
                            <p>{ent.entityName}</p>
                            {ent.businessName && ent.businessName !== ent.entityName && (
                              <p className="text-[10px] text-slate-400 font-normal">{ent.businessName}</p>
                            )}
                          </td>
                          <td className="py-3 text-slate-600">
                            <p className="font-medium">{ent.addressLine1 || "Direct"}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold">
                              {ent.suburb ? `${ent.suburb} ${ent.state || "VIC"} ${ent.postcode || ""}` : "MELBOURNE METRO"}
                            </p>
                          </td>
                          <td className="py-3 text-slate-600 text-[11px]">
                            <p>{ent.businessPhone || ent.mobilePhone || "No phone recorded"}</p>
                            <p className="text-slate-400">{ent.businessEmail || ent.homeEmail || "No email"}</p>
                          </td>
                          <td className="py-3 font-mono text-[11px] text-slate-600">
                            {ent.abn || "—"}
                          </td>
                          <td className="py-3">
                            {ent.isTradeAccount ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Trade Account
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Discovered Contact
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {ent.isTradeAccount && (
                              <button
                                onClick={() => handleInspectAccount(ent.entityId)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                              >
                                View Ledger
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  page={entityPage}
                  totalPages={entityTotalPages}
                  totalItems={entityTotal}
                  pageSize={entityLimit}
                  onPageChange={(newPage) => setEntityPage(newPage)}
                  onPageSizeChange={(newSize) => {
                    setEntityLimit(newSize);
                    setEntityPage(1);
                  }}
                  loading={entitiesLoading}
                />
              </div>
            ) : (
              <div className="py-12">
                <EmptyState
                  title="No entities found"
                  text="No discovered smash contacts match your query."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: PRICE LEVEL REFERENCE (52 CODES)                                  */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "price_levels" && (
        <div className="space-y-4">
          <div className="card p-4 bg-white flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900 text-sm">Pentana Entity 50 Price Levels</p>
              <p className="text-xs text-slate-500">
                52 captured price level codes and discount rules from EntityParts.htm.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold font-mono">
              52 Codes Active
            </span>
          </div>

          <div className="card overflow-hidden bg-white shadow-sm border border-slate-200">
            {priceLevelsLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton h-10 w-full rounded-xl" />
                ))}
              </div>
            ) : priceLevels.length > 0 ? (
              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="pb-3 font-semibold">Code</th>
                        <th className="pb-3 font-semibold">Pentana Source Label</th>
                        <th className="pb-3 font-semibold">Source Screen</th>
                        <th className="pb-3 font-semibold">Rule Formula Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {priceLevels.map((pl, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 font-bold text-red-600">{pl.price_level_code}</td>
                          <td className="py-2.5 font-bold text-slate-900">{pl.source_label}</td>
                          <td className="py-2.5 text-slate-500">{pl.source_screen || "EntityParts.htm"}</td>
                          <td className="py-2.5 text-slate-400">
                            {pl.rule_formula_verified ? "Verified Formula" : "Captured Source Label"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-12">
                <EmptyState title="No price levels found" text="Unable to load price level reference." />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* INSPECT PENTANA ACCOUNT LEDGER MODAL                                    */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!selectedAccount}
        onClose={() => {
          setSelectedAccount(null);
          setAccountSpend(null);
        }}
        maxWidth="3xl"
        title={selectedAccount?.companyName || "Trade Account Ledger"}
        subtitle={
          selectedAccount ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Account ID: {selectedAccount.accountId}
              </span>
              <span className="text-xs text-slate-500">· Pentana Entity 50 (Dandenong)</span>
              {selectedAccount.abn && (
                <span className="text-xs text-slate-500 font-mono">· ABN: {selectedAccount.abn}</span>
              )}
            </div>
          ) : undefined
        }
        footer={
          selectedAccount && (
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-slate-400">
                Last synchronized: {shortDate(selectedAccount.lastSyncedAt || new Date().toISOString())}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleToggleOverdue(
                      selectedAccount.accountId || selectedAccount._id || "",
                      !!selectedAccount.isOverdue
                    )
                  }
                  disabled={submittingOverdue === selectedAccount.accountId}
                  className="btn-soft text-xs text-amber-700 border border-amber-300"
                >
                  {selectedAccount.isOverdue ? "Clear Overdue Flag" : "Mark Overdue"}
                </button>
                <button
                  onClick={() =>
                    handleToggleCreditHold(
                      selectedAccount.accountId || selectedAccount._id || "",
                      !!selectedAccount.creditHold
                    )
                  }
                  disabled={submittingHold === selectedAccount.accountId}
                  className={`btn-primary text-xs ${
                    selectedAccount.creditHold ? "bg-emerald-600 hover:bg-emerald-700" : ""
                  }`}
                >
                  {selectedAccount.creditHold ? "Release Credit Hold" : "Place Credit Hold"}
                </button>
              </div>
            </div>
          )
        }
      >
        {selectedAccount && (
          <div className="space-y-5">
            {/* ─── PENTANA NOTEPAD WARNING BANNER ─── */}
            {selectedAccount.warningNotes && selectedAccount.warningNotes.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm animate-pulse">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-wider text-amber-900">
                      Pentana Counter Alert (NotePadWarnings.htm)
                    </p>
                    {selectedAccount.warningNotes.map((note, idx) => (
                      <p key={idx} className="text-xs font-bold text-amber-950 font-mono whitespace-pre-line">
                        {note}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── 4 KPI SUMMARY CARDS ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow text-slate-500">Credit Limit</p>
                <p className="mt-1.5 text-lg font-black text-slate-900">
                  {money(accountSpend?.creditLimitCents ?? selectedAccount.creditLimitCents)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{selectedAccount.paymentTerms || "30 DAYS"}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow text-slate-500">Current Balance</p>
                <p className="mt-1.5 text-lg font-black text-slate-900">
                  {money(accountSpend?.currentBalanceCents ?? selectedAccount.currentBalanceCents)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Pentana ledger</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow text-slate-500">Credit Available</p>
                <p
                  className={`mt-1.5 text-lg font-black ${
                    (accountSpend?.creditAvailableCents ?? selectedAccount.creditAvailableCents ?? 0) < 0
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {money(accountSpend?.creditAvailableCents ?? selectedAccount.creditAvailableCents)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Approved headroom</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="eyebrow text-slate-500">FY 26/27 Sales</p>
                <p className="mt-1.5 text-lg font-black text-emerald-600">
                  {money(accountSpend?.partsSalesFinancialYearCents ?? selectedAccount.partsSalesFinancialYearCents)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {accountSpend?.partsTransactionsFinancialYear ?? selectedAccount.partsTransactionsFinancialYear ?? 0} invoices
                </p>
              </div>
            </div>

            {/* ─── PENTANA AGING LEDGER BREAKDOWN ─── */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-500" />
                  <span>Pentana Debtor Aging Ledger (EntityReceivable.htm)</span>
                </p>
                <span className="text-[11px] font-semibold text-slate-500">
                  Avg Days to Pay:{" "}
                  <strong className="text-slate-900">{selectedAccount.averageDaysToPay || 30} days</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Current</p>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {money(
                      (selectedAccount.currentBalanceCents ?? 0) -
                        (selectedAccount.agedBalanceTotalCents ?? 0)
                    )}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400">30 Days</p>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {money(accountSpend?.aged30DaysCents ?? selectedAccount.aged30DaysCents)}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400">60 Days</p>
                  <p
                    className={`text-sm font-black mt-1 ${
                      (accountSpend?.aged60DaysCents ?? selectedAccount.aged60DaysCents ?? 0) > 0
                        ? "text-amber-600"
                        : "text-slate-800"
                    }`}
                  >
                    {money(accountSpend?.aged60DaysCents ?? selectedAccount.aged60DaysCents)}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400">90 Days</p>
                  <p
                    className={`text-sm font-black mt-1 ${
                      (accountSpend?.aged90DaysCents ?? selectedAccount.aged90DaysCents ?? 0) > 0
                        ? "text-red-600"
                        : "text-slate-800"
                    }`}
                  >
                    {money(accountSpend?.aged90DaysCents ?? selectedAccount.aged90DaysCents)}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">120+ Days</p>
                  <p
                    className={`text-sm font-black mt-1 ${
                      (accountSpend?.aged120DaysCents ?? selectedAccount.aged120DaysCents ?? 0) > 0
                        ? "text-red-700"
                        : "text-slate-800"
                    }`}
                  >
                    {money(accountSpend?.aged120DaysCents ?? selectedAccount.aged120DaysCents)}
                  </p>
                </div>
              </div>
            </div>

            {/* ─── PRICING RULES & PAYMENT SETTINGS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Tag size={13} className="text-indigo-600" />
                  <span>Pricing &amp; Sale Settings (EntityParts.htm)</span>
                </p>
                <div className="space-y-1 text-slate-600 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Price Level:</span>
                    <strong className="text-indigo-700 font-mono">
                      {selectedAccount.priceLevelLabel || `${selectedAccount.discountPercent ?? 15}% TRADE`}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sale Type:</span>
                    <span className="font-semibold">{selectedAccount.partsSaleTypeLabel || "T, TRADE SALES"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Method:</span>
                    <span className="font-semibold uppercase">{selectedAccount.paymentMethodLabel || "CHARGE"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Purchase Order Required:</span>
                    <span className="font-semibold">
                      {selectedAccount.purchaseOrderRequired ? "YES (Mandatory PO)" : "NO"}
                    </span>
                  </div>
                  {selectedAccount.billToEntityId && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bill-To Entity:</span>
                      <span className="font-mono">{selectedAccount.billToEntityId}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-600" />
                  <span>Purchasing History &amp; Velocity</span>
                </p>
                <div className="space-y-1 text-slate-600 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Prior Year Purchases:</span>
                    <strong className="text-slate-900">
                      {money(accountSpend?.purchasePriorYearCents ?? selectedAccount.purchasePriorYearCents)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Purchase Date:</span>
                    <span className="font-semibold">{selectedAccount.lastPurchaseDate || "20/10/2026"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Payment Date:</span>
                    <span className="font-semibold">{selectedAccount.lastPaymentDate || "09/09/2026"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Financial Year Window:</span>
                    <span className="font-semibold">{selectedAccount.financialYearLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── CONTACT & DIRECT COMMUNICATIONS ─── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Phone size={13} className="text-emerald-600" />
                <span>Contact &amp; Statement Dispatch Details</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Contact</span>
                  <p className="font-semibold text-slate-900">{selectedAccount.contactName || "Accounts Desk"}</p>
                  <p className="text-[11px] text-slate-500">{selectedAccount.legalName}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Statement &amp; Billing Email</span>
                  <p className="font-semibold text-slate-900">
                    {selectedAccount.statementEmail || selectedAccount.businessEmail || "None recorded"}
                  </p>
                  <p className="text-[11px] text-slate-500">{selectedAccount.homeEmail}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Telephone</span>
                  <p className="font-semibold text-slate-900">
                    {selectedAccount.businessPhone || selectedAccount.contactPhone || "None"}
                  </p>
                  <p className="text-[11px] text-slate-500">{selectedAccount.mobilePhone}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
