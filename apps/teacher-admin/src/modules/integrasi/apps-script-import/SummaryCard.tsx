export function SummaryCard({ title, data }: { title: string; data: { new: number; updated: number; skipped: number; errors: number } }) {
  return (
    <div className="p-3 border border-slate-200 rounded-md">
      <p className="font-semibold text-sm text-slate-900 mb-2">{title}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-emerald-600">Baru</span>
          <span className="font-bold">{data.new}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-brand-600">Update</span>
          <span className="font-bold">{data.updated}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Skip</span>
          <span className="font-bold">{data.skipped}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-rose-600">Error</span>
          <span className="font-bold">{data.errors}</span>
        </div>
      </div>
    </div>
  );
}
