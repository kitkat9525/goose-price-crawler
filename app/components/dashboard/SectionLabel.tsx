import { KEY } from './constants';

export function SectionLabel({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: KEY }}>{title}</h2>
      <div className="flex-1 h-px bg-black/6" />
      {sub && <span className="text-xs text-black/25 whitespace-nowrap">{sub}</span>}
    </div>
  );
}
