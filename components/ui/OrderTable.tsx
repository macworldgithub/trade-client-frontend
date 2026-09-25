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

  const stateColor = (state?: string) => {
    const s = (state || "").toUpperCase();
    if (s.includes("EXCEPTION") || s.includes("CANCELLED"))
      return "bg-orange-50 text-coral";
    if (s.includes("DELIVERED") || s.includes("PICKED") || s.includes("READY"))
      return "bg-emerald-50 text-emerald-600";
    return "bg-teal/10 text-teal";
  };

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            <th className="pb-3">Order</th>
            <th className="pb-3">Status</th>
            <th className="pb-3">Date</th>
            <th className="pb-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o, i) => (
            <tr
              key={o._id || i}
              className="transition-colors hover:bg-slate-50/50"
            >
              <td className="py-4 font-bold text-navy">
                {o.orderNumber || o._id?.slice(-8) || "—"}
              </td>
              <td className="py-4">
                <span
                  className={`rounded-md px-2 py-1 text-[11px] font-bold ${stateColor(o.state)}`}
                >
                  {(o.state || "UNKNOWN").replaceAll("_", " ")}
                </span>
              </td>
              <td className="py-4 text-slate-400">{shortDate(o.createdAt)}</td>
              <td className="py-4 text-right font-bold text-navy">
                {money(o.totalCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
