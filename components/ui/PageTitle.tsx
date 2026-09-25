import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  text: string;
  action?: ReactNode;
};

export default function PageTitle({ eyebrow, title, text, action }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-in">
      <div>
        <p className="eyebrow text-red-600">{eyebrow}</p>
        <h1 className="mt-1.5 text-2xl xs:text-3xl font-black tracking-tight text-slate-900">
          {title}
          <span className="text-red-600">.</span>
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">{text}</p>
      </div>
      {action && <div className="flex items-center gap-2.5">{action}</div>}
    </div>
  );
}
