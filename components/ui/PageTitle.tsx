import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  text?: string;
  description?: string;
  action?: ReactNode;
};

export default function PageTitle({ eyebrow, title, text, description, action }: Props) {
  const subtitle = description || text || "";
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-in">
      <div>
        <p className="eyebrow text-red-600">{eyebrow}</p>
        <h1 className="mt-1.5 text-2xl xs:text-3xl font-black tracking-tight text-slate-900">
          {title}
          <span className="text-red-600">.</span>
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2.5">{action}</div>}
    </div>
  );
}
