import { FileText } from "lucide-react";

type Props = {
  title: string;
  text: string;
};

export default function EmptyState({ title, text }: Props) {
  return (
    <div className="py-12 text-center animate-fade-in">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <FileText size={20} />
      </div>
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{text}</p>
    </div>
  );
}
