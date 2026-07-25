/**
 * Header component for the Roster page.
 */

export function RosterHeader({ yearLabel, count }: { yearLabel?: string; count?: number }) {
  return (
    <div className="page-header">
      <h1 className="text-2xl font-bold text-slate-900">Siswa</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel ? `TP ${yearLabel} · ${count ?? 0} kelas` : "Daftar siswa per kelas."}
      </p>
    </div>
  );
}
