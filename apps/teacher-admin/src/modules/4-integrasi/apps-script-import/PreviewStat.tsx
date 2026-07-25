export function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-2 bg-white rounded border border-emerald-200">
      <p className="text-2xl font-bold text-emerald-700">{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  );
}
