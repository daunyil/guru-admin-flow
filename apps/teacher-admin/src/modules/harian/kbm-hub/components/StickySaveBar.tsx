/* ============================================================ */
/*  Sticky Save Bar — Mobile bottom save button                  */
/* ============================================================ */

export interface StickySaveBarProps {
  saveAll: () => void;
  saving: boolean;
  justSaved: boolean;
}

export function StickySaveBar({ saveAll, saving, justSaved }: StickySaveBarProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <button
        onClick={saveAll}
        disabled={saving || justSaved}
        className={`w-full font-bold py-3.5 px-4 rounded-xl text-sm flex justify-center items-center gap-2 transition-all active:scale-[0.98] min-h-[44px] ${
          justSaved
            ? "bg-emerald-500 text-white"
            : saving
              ? "bg-slate-400 text-white cursor-wait"
              : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700"
        }`}
      >
        {justSaved ? (
          <>
            <span className="text-base">✅</span>
            Tersimpan!
          </>
        ) : saving ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            Menyimpan...
          </>
        ) : (
          <>
            <span className="text-base">💾</span>
            SIMPAN KBM
          </>
        )}
      </button>
    </div>
  );
}
