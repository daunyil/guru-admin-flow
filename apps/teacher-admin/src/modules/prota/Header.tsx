/**
 * Header component for Prota page.
 * Displays title and context information.
 */

export function Header({ yearLabel, count }: { yearLabel?: string; count?: number }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Program Tahunan (Prota)</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel
          ? `Tahun pelajaran aktif: ${yearLabel} · ${count ?? 0} Prota`
          : "Sumber kebenaran untuk materi dan JP."}
      </p>
    </div>
  );
}
