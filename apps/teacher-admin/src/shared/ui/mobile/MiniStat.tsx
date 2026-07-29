/**
 * MiniStat — Small stat badge for attendance summary.
 *
 * Shows label + value with color-coded text.
 * Used in KBM Kilat Presensi summary grid.
 */

interface MiniStatProps {
  label: string;
  value: number;
  color: string; // Tailwind text color class
}

export function MiniStat({ label, value, color }: MiniStatProps) {
  return (
    <div className="rounded-xl bg-slate-50 p-2 text-center">
      <div className={`text-xl font-black ${color}`}>{value}</div>
      <div className="text-[9px] font-extrabold text-slate-500">{label}</div>
    </div>
  );
}
