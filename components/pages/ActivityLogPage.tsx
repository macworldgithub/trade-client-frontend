"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ShieldCheck,
  Search,
  Clock,
  User,
  MapPin,
  FileText,
  Key,
  Database,
  ArrowRight,
} from "lucide-react";
import { backendApi } from "../../lib/backend-api";
import { shortDate } from "../../lib/api";
import type { AuditEventRecord } from "../../lib/types";
import PageTitle from "../ui/PageTitle";
import EmptyState from "../ui/EmptyState";

type Props = {
  selectedRooftop?: string;
};

export default function ActivityLogPage({ selectedRooftop }: Props) {
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    backendApi.audit
      .list("limit=100")
      .then((data) => {
        setEvents(data.events || []);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) =>
    `${e.action || ""} ${e.userId || ""} ${e.rooftopId || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const actionBadge = (action?: string) => {
    const a = (action || "").toUpperCase();
    if (a.includes("LOGIN") || a.includes("AUTH")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (a.includes("ORDER") || a.includes("SUBMIT")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (a.includes("EXCEPTION")) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (a.includes("RESOLVE") || a.includes("SEARCH")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="eyebrow text-red-600">Audit &amp; Compliance</p>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Session &amp; Activity Log
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          24-month immutable audit stream of search, resolve, basket add, pick, exception, and override events.
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, user ID, precinct..."
              className="field pl-9 py-2 text-xs"
            />
          </div>

          <span className="text-xs font-semibold text-slate-400">
            {filtered.length} audit entries
          </span>
        </div>

        {loading ? (
          <div className="py-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="divide-y divide-slate-100 mt-2">
            {filtered.map((item, idx) => (
              <div
                key={item._id || idx}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition px-2 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-red-600 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${actionBadge(item.action)}`}>
                        {item.action || "EVENT"}
                      </span>
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        {item.userId ? `User: ${item.userId.slice(-8)}` : "System Engine"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      Precinct: <span className="font-semibold text-slate-700">{item.rooftopId || "Network-Wide"}</span>
                      {item.tradeAccountId && (
                        <span> · Account: <span className="font-mono text-slate-700">{item.tradeAccountId}</span></span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-[11px] text-slate-400 font-mono">
                  <p>{shortDate(item.createdAt)}</p>
                  <p className="text-[10px] text-slate-400">IP: {item.ipAddress || item.ip || "127.0.0.1"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12">
            <EmptyState
              title="No audit events found"
              text="Audit events logged by MongoDB will stream here automatically."
            />
          </div>
        )}
      </div>
    </div>
  );
}
