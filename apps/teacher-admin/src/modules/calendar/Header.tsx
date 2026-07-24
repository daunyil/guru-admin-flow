/**
 * Header — simple page header for the Kalender module.
 */

export function Header({ yearLabel, count }: { yearLabel?: string; count?: number }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Kalender Pendidikan</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel ? `Tahun pelajaran aktif: ${yearLabel} · ${count ?? 0} event` : "Impor JSON atau tambah manual."}
      </p>
    </div>
  );
}
