export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200" : "border-slate-200"}`}>{children}</button>;
}
