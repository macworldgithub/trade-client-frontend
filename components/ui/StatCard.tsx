import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "teal" | "coral";
};

export default function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "teal",
}: Props) {
  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-navy">
            {value}
          </p>
        </div>
        <span
          className={`rounded-xl p-3 ${
            tone === "coral"
              ? "bg-orange-50 text-coral"
              : "bg-teal/10 text-teal"
          }`}
        >
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-4 flex items-center gap-1 text-xs text-slate-500">
        {detail}
      </p>
    </div>
  );
}
