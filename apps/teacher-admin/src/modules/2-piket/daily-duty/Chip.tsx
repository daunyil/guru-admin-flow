/**
 * Chip — Compact filter chip matching KBM quality.
 *
 * V2: Consistent with KBM's active tab style (white bg, shadow, colored border).
 */

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-xs md:text-sm rounded-xl font-bold transition-all duration-200 min-h-[44px] ${
        active
          ? "bg-white text-indigo-700 shadow-sm border border-indigo-200"
          : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 active:scale-[0.98]"
      }`}
    >
      {children}
    </button>
  );
}
