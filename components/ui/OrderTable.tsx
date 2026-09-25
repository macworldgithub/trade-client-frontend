import type { Order } from "../../lib/types";
import { money, shortDate } from "../../lib/api";
import EmptyState from "./EmptyState";

type Props = {
  orders: Order[];
};

export default function OrderTable({ orders }: Props) {
  if (!orders.length) {
    return (
      <EmptyState
        title="No orders returned"
        text="Live order activity will appear here once available."
      />
    );
  }

  const stateBadge = (state?: string) => {
    const s = (state || "").toUpperCase();
    if (s.includes("EXCEPTION") || s.includes("CANCELLED") || s.includes("BACKORDER"))
      return "badge-red";
    if (s.includes("DELIVERED") || s.includes("PICKED") || s.includes("READY"))
      return "badge-green";
    if (s.includes("ALLOCATED") || s.includes("TRANSIT") || s.includes("PICKING"))
      return "badge-blue";
    return "badge-neutral";
  };

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="pb-3 font-semibold">Order</th>
            <th className="pb-3 font-semibold">Status</th>
            <th className="pb-3 font-semibold">Date</th>
            <th className="pb-3 font-semibold text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o, i) => (
            <tr
              key={o._id || i}
              className="transition-colors hover:bg-slate-50/80"
            >
              <td className="py-3.5 font-bold text-slate-900 font-mono text-xs">
                {o.orderNumber || o._id?.slice(-8) || "—"}
              </td>
              <td className="py-3.5">
                <span className={stateBadge(o.state)}>
                  {(o.state || "UNKNOWN").replaceAll("_", " ")}
                </span>
              </td>
              <td className="py-3.5 text-xs text-slate-500">{shortDate(o.createdAt)}</td>
              <td className="py-3.5 text-right font-bold text-slate-900 font-mono text-xs">
                {money(o.totalCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
