import { Card, CardHeader, Input, Button, EmptyState } from "@shared/ui";
import { Chip } from "./Chip";
import { RecordCard } from "./RecordCard";
import { LedgerItemCard } from "./LedgerItemCard";
import { LetterPreview } from "./LetterPreview";
import type { ClassRoster, DutyRecord, StudentDutyLedgerItem } from "@guru-admin/domain";
import type { PiketLetterDocument, PiketLetterType } from "./piket-letter";

interface PointLedgerTabProps {
  ledger: StudentDutyLedgerItem[];
  ledgerRecords: DutyRecord[];
  ledgerClassFilter: string;
  setLedgerClassFilter: (f: string) => void;
  ledgerStatusFilter: string;
  setLedgerStatusFilter: (f: string) => void;
  ledgerStudentQuery: string;
  setLedgerStudentQuery: (q: string) => void;
  filteredLedger: StudentDutyLedgerItem[];
  ledgerDetailStudent: StudentDutyLedgerItem | null;
  ledgerDetailRecords: DutyRecord[];
  letterPreview: PiketLetterDocument | null;
  setLetterPreview: (l: PiketLetterDocument | null) => void;
  rosters: ClassRoster[];
  yearLabel: string;
  handleOpenLedgerDetail: (item: StudentDutyLedgerItem) => void;
  handleCloseLedgerDetail: () => void;
  handleBuildLetter: (letterType: PiketLetterType) => void;
}

export function PointLedgerTab(props: PointLedgerTabProps) {
  const {
    ledger,
    ledgerRecords,
    ledgerClassFilter, setLedgerClassFilter,
    ledgerStatusFilter, setLedgerStatusFilter,
    ledgerStudentQuery, setLedgerStudentQuery,
    filteredLedger,
    ledgerDetailStudent,
    ledgerDetailRecords,
    letterPreview,
    setLetterPreview,
    rosters,
    yearLabel,
    handleOpenLedgerDetail,
    handleCloseLedgerDetail,
    handleBuildLetter,
  } = props;

  return (
    <Card>
      <CardHeader title="Rekap Poin Siswa" description={`${ledger.length} siswa · ${ledgerRecords.length} catatan total · TP ${yearLabel}`} />
      {/* PIKET-AUDIT-05C: summary stats per status */}
      {ledger.length > 0 && (
        <div className="grid grid-cols-5 gap-2 text-center mb-3 text-xs">
          <div className="p-2 bg-emerald-50 rounded"><p className="font-bold text-emerald-700">{ledger.filter((i) => i.statusLabel === "Aman").length}</p><p>Aman</p></div>
          <div className="p-2 bg-amber-50 rounded"><p className="font-bold text-amber-700">{ledger.filter((i) => i.statusLabel === "Pembinaan ringan").length}</p><p>Pembinaan</p></div>
          <div className="p-2 bg-orange-50 rounded"><p className="font-bold text-orange-700">{ledger.filter((i) => i.statusLabel === "Panggilan orang tua").length}</p><p>Panggilan</p></div>
          <div className="p-2 bg-rose-50 rounded"><p className="font-bold text-rose-700">{ledger.filter((i) => i.statusLabel === "Kesiswaan/BK").length}</p><p>BK</p></div>
          <div className="p-2 bg-rose-100 rounded"><p className="font-bold text-rose-900">{ledger.filter((i) => i.statusLabel === "Tindak lanjut khusus").length}</p><p>Khusus</p></div>
        </div>
      )}
      {ledgerDetailStudent ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div><p className="font-bold text-sm">Riwayat {ledgerDetailStudent.studentName} — {ledgerDetailStudent.classLabel}</p><p className="text-xs text-slate-500">Total {ledgerDetailStudent.totalPoints} poin · {ledgerDetailStudent.totalRecords} kejadian · Status: {ledgerDetailStudent.statusLabel}</p></div>
            <Button variant="secondary" className="text-xs" onClick={handleCloseLedgerDetail}>Tutup Riwayat</Button>
          </div>
          {ledgerDetailStudent.totalPoints >= 50 && <div className="p-2 rounded bg-amber-50 text-xs text-amber-800">Rekomendasi: Surat Panggilan Orang Tua/Wali.</div>}
          {ledgerDetailStudent.totalPoints >= 75 && <div className="p-2 rounded bg-rose-50 text-xs text-rose-800">Rekomendasi lanjutan: koordinasikan dengan Kesiswaan/BK.</div>}
          <div className="flex gap-2 flex-wrap">
            <Button className="text-xs" onClick={() => handleBuildLetter("parent_summons")}>Buat Surat Panggilan</Button>
            <Button variant="secondary" className="text-xs" onClick={() => handleBuildLetter("student_statement")}>Buat Surat Pernyataan</Button>
          </div>
          {letterPreview && <LetterPreview letter={letterPreview} onClose={() => setLetterPreview(null)} />}
          {ledgerDetailRecords.length === 0 ? <EmptyState title="Belum ada riwayat" description="Siswa ini belum punya catatan piket." /> : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ledgerDetailRecords.map((r) => <RecordCard key={r.id} record={r} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Input label="Cari siswa" id="ledger-search" value={ledgerStudentQuery} onChange={setLedgerStudentQuery} placeholder="Cari siswa... (nama / nomor / NIS)" />
          <div><label className="label">Filter kelas</label><div className="flex gap-2 flex-wrap"><Chip active={ledgerClassFilter === "all"} onClick={() => setLedgerClassFilter("all")}>Semua Kelas</Chip>{rosters.map((r) => <Chip key={r.classId} active={ledgerClassFilter === r.classId} onClick={() => setLedgerClassFilter(r.classId)}>{r.classLabel}</Chip>)}</div></div>
          <div><label className="label">Filter status</label><div className="flex gap-2 flex-wrap">{["all", "Aman", "Pembinaan ringan", "Panggilan orang tua", "Kesiswaan/BK", "Tindak lanjut khusus"].map((s) => <Chip key={s} active={ledgerStatusFilter === s} onClick={() => setLedgerStatusFilter(s)}>{s === "all" ? "Semua Status" : s}</Chip>)}</div></div>
          {filteredLedger.length === 0 ? <EmptyState title="Belum ada catatan" description={ledgerRecords.length === 0 ? "Belum ada catatan piket tahun ini." : "Tidak ada siswa yang cocok dengan filter."} /> : (
            <div className="space-y-2">
              {filteredLedger.map((item) => <LedgerItemCard key={`${item.studentId}__${item.classId}`} item={item} onOpen={() => handleOpenLedgerDetail(item)} />)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
