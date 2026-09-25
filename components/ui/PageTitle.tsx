import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  text: string;
  action?: ReactNode;
};

export default function PageTitle({ eyebrow, title, text, action }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-in">
      <div>
        <p className="eyebrow text-teal">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-navy">
          {title}
          <span className="text-coral">.</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">{text}</p>
      </div>
      {action}
    </div>
  );
}
