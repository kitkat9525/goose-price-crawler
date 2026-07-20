import type { CSSProperties } from 'react';

export function SectionLabel({ title, sub, subStyle }: { title: string; sub?: string; subStyle?: CSSProperties }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'rgba(17,17,17,0.4)' }}>{title}</h2>
      <div className="flex-1 h-px" style={{ background: '#ebebeb' }} />
      {sub && <span className="text-xs whitespace-nowrap" style={{ color: 'rgba(0,0,0,0.4)', ...subStyle }}>{sub}</span>}
    </div>
  );
}
