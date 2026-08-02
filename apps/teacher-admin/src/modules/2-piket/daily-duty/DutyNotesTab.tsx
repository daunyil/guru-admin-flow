/**
 * PIKET-REDESIGN-V2: Tab "Catatan" — Ringkasan catatan piket hari ini.
 *
 * V2: Consistent card styling, better record list, professional buttons.
 */

import { Card, CardHeader, Button, EmptyState, Textarea } from "@shared/ui";
import type { DutyRecord } from "@guru-admin/domain";

interface DutyNotesTabProps {
  records: DutyRecord[];
  reportFinalized: boolean;
  reportNote: string;
  setReportNote: (n: string) => void;
  summary: { totalPoints: number };
  handleDeleteRecord: (id: string) => Promise<void>;
  handleSaveNote: () => Promise<void>;
  handleSyncAlpa: () => Promise<void>;
  handleFinalize: () => Promise<void>;
  handleUnlock: () => Promise<void>;
  isSubmitting: boolean;
}

export function DutyNotesTab(props: DutyNotesTabProps) {
  const {
    records,
    reportFinalized,
    reportNote,
    setReportNote,
    summary,
    handleDeleteRecord,
    handleSaveNote,
    handleSyncAlpa,
    handleFinalize,
    handleUnlock,
    isSubmitting,
  } = props;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-4 py-2.5 md:py-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider">Catatan Piket Hari Ini</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs font-bold text-slate-500">{records.length} catatan</span>
            <span className="text-[10px] md:text-xs font-bold text-rose-600">{summary.totalPoints} poin</span>
          </div>
        </div>
      </div>

      <div className="p-3 md:p-4 space-y-3">
        {reportFinalized && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs md:text-sm text-emerald-800">
            Laporan hari ini sudah selesai. Jika perlu mengubah, tekan <strong>Buka Revisi</strong> di bawah.
          </div>
        )}

        {records.length === 0 ? (
          <EmptyState
            title="Belum ada catatan"
            description="Belum ada pelanggaran yang dicatat untuk hari ini. Buka tab Laporkan untuk mencatat pelanggaran siswa."
          />
        ) : (
          <div className="space-y-1.5">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-bold text-slate-900">{r.studentName} <span className="text-slate-400 font-normal">· {r.classLabel}</span></p>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">{r.ruleLabel} · <span className="text-rose-600 font-bold">{r.points} poin</span>{r.note ? ` · ${r.note}` : ""}</p>
                </div>
                {!reportFinalized && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteRecord(r.id)}
                    className="shrink-0 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors min-h-[44px] flex items-center"
                  >
                    Hapus
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 pt-3 border-t border-slate-100">
          <Textarea
            label="Catatan Umum Guru Piket"
            id="duty-report-note"
            value={reportNote}
            onChange={setReportNote}
            rows={3}
            placeholder="Catatan tambahan tentang piket hari ini..."
          />

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={reportFinalized || isSubmitting}
              className="bg-white text-slate-700 border border-slate-300 font-bold text-xs md:text-sm py-2.5 px-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isSubmitting ? "Menyimpan…" : "Simpan Catatan"}
            </button>

            {!reportFinalized && (
              <button
                type="button"
                onClick={() => void handleSyncAlpa()}
                disabled={isSubmitting}
                className="bg-white text-slate-700 border border-slate-300 font-bold text-xs md:text-sm py-2.5 px-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                Sinkron Alpa dari Absen
              </button>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3">
            {!reportFinalized ? (
              <div className="space-y-2">
                <p className="text-[10px] md:text-xs text-slate-500">
                  Setelah selesai, tekan tombol di bawah untuk menyelesaikan laporan piket hari ini.
                </p>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={isSubmitting || records.length === 0}
                  className="w-full bg-indigo-600 text-white font-bold text-xs md:text-sm py-3 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] shadow-sm"
                >
                  {isSubmitting ? "Memproses…" : "Selesaikan Laporan"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] md:text-xs text-slate-500">
                  Laporan sudah selesai. Jika perlu mengubah, buka revisi terlebih dahulu.
                </p>
                <button
                  type="button"
                  onClick={handleUnlock}
                  disabled={isSubmitting}
                  className="w-full bg-white text-slate-700 border border-slate-300 font-bold text-xs md:text-sm py-3 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isSubmitting ? "Memproses…" : "Buka Revisi"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
