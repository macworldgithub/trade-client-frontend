import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "red" | "brand" | "slate" | "teal" | "coral";
  trend?: string;
  trendPositive?: boolean;
};

export default function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "brand",
}: Props) {
  const iconStyle =
    tone === "red" || tone === "coral"
      ? "bg-red-50 text-red-600 border border-red-100"
      : "bg-slate-100 text-slate-800 border border-slate-200";

  return (
    <div className="card p-5 animate-fade-in hover:border-slate-300 transition duration-150">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <span className={`rounded-xl p-2.5 ${iconStyle}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        {detail}
      </p>
    </div>
  );
}
