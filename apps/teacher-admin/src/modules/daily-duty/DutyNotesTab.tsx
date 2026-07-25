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
  } = props;

  return (
    <Card>
      <CardHeader title="Catatan Piket Hari Ini" description={`${records.length} catatan · ${summary.totalPoints} total poin`} />
      {reportFinalized && <div className="p-2 bg-emerald-50 rounded text-xs text-emerald-700 mb-3">✓ Laporan sudah difinalisasi.</div>}
      {records.length === 0 ? <EmptyState title="Belum ada catatan" description="Belum ada catatan piket untuk hari ini." /> : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="p-3 border rounded-lg flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">{r.studentName} — {r.classLabel}</p><p className="text-xs text-slate-500">{r.ruleLabel} · {r.points} poin{r.note ? ` · ${r.note}` : ""}</p></div>
              {!reportFinalized && <Button variant="danger" className="text-xs px-2 py-1 shrink-0" onClick={() => void handleDeleteRecord(r.id)}>Hapus</Button>}
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 space-y-2">
        <Textarea label="Catatan Umum Guru Piket" id="duty-report-note" value={reportNote} onChange={setReportNote} rows={3} />
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" className="text-sm" onClick={handleSaveNote} disabled={reportFinalized}>Simpan Catatan</Button>
          {!reportFinalized && <Button variant="secondary" className="text-sm" onClick={() => void handleSyncAlpa()}>Sinkron Alpa dari Absen</Button>}
          {!reportFinalized ? <Button className="text-sm" onClick={handleFinalize}>Finalisasi</Button> : <Button variant="secondary" className="text-sm" onClick={handleUnlock}>Buka Revisi</Button>}
        </div>
      </div>
    </Card>
  );
}
