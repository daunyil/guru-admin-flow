/**
 * PIKET-REDESIGN: Tab "Catatan" — Ringkasan catatan piket hari ini.
 *
 * Perubahan dari versi sebelumnya:
 *   - Bahasa ramah: "Selesaikan Laporan" bukan "Finalisasi"
 *   - Layout lebih lega: space-y-4, padding p-4
 *   - Tombol lebih jelas dan terpisah
 *   - Panduan untuk guru yang belum familiar
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
    <Card>
      <CardHeader
        title="📝 Catatan Piket Hari Ini"
        description={`${records.length} catatan · ${summary.totalPoints} total poin`}
      />

      {reportFinalized && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 mb-4">
          ✅ Laporan hari ini sudah selesai. Jika perlu mengubah, tekan <strong>Buka Revisi</strong> di bawah.
        </div>
      )}

      {records.length === 0 ? (
        <EmptyState
          title="Belum ada catatan"
          description="Belum ada pelanggaran yang dicatat untuk hari ini. Buka tab Laporkan untuk mencatat pelanggaran siswa."
        />
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="p-3 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{r.studentName} — {r.classLabel}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.ruleLabel} · {r.points} poin{r.note ? ` · ${r.note}` : ""}</p>
              </div>
              {!reportFinalized && (
                <Button
                  variant="danger"
                  className="text-xs px-3 py-1.5 shrink-0"
                  onClick={() => void handleDeleteRecord(r.id)}
                >
                  Hapus
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-4">
        <Textarea
          label="Catatan Umum Guru Piket"
          id="duty-report-note"
          value={reportNote}
          onChange={setReportNote}
          rows={3}
          placeholder="Catatan tambahan tentang piket hari ini..."
        />

        <div className="flex gap-3 flex-wrap">
          <Button
            variant="secondary"
            className="text-sm"
            onClick={handleSaveNote}
            disabled={reportFinalized || isSubmitting}
          >
            {isSubmitting ? "Menyimpan…" : "Simpan Catatan"}
          </Button>

          {!reportFinalized && (
            <Button
              variant="secondary"
              className="text-sm"
              onClick={() => void handleSyncAlpa()}
              disabled={isSubmitting}
            >
              Sinkron Alpa dari Absen
            </Button>
          )}
        </div>

        <div className="border-t border-slate-200 pt-4">
          {!reportFinalized ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                Setelah selesai, tekan tombol di bawah untuk menyelesaikan laporan piket hari ini. Laporan yang sudah selesai tidak bisa diubah kecuali dibuka revisi.
              </p>
              <Button
                className="text-sm"
                onClick={handleFinalize}
                disabled={isSubmitting || records.length === 0}
              >
                {isSubmitting ? "Memproses…" : "✅ Selesaikan Laporan"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                Laporan sudah selesai. Jika perlu mengubah, buka revisi terlebih dahulu.
              </p>
              <Button
                variant="secondary"
                className="text-sm"
                onClick={handleUnlock}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Memproses…" : "🔓 Buka Revisi"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
