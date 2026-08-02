/**
 * LedgerDetailSheet — Bottom sheet showing student's discipline ledger detail.
 *
 * FIX: Previously `handleOpenLedgerDetail` set `ledgerDetailStudent` and
 * `ledgerDetailRecords` state but nothing rendered them. This component
 * renders the detail view with the student's full record history.
 */

import { Card, CardHeader, Button, EmptyState } from "@shared/ui";
import { formatLongDateID } from "@guru-admin/shared";
import type { DutyRecord, StudentDutyLedgerItem } from "@guru-admin/domain";
import type { PiketLetterType } from "./piket-letter";
import { BottomSheet } from "@shared/ui/mobile";

interface LedgerDetailSheetProps {
  student: StudentDutyLedgerItem;
  records: DutyRecord[];
  onClose: () => void;
  onBuildLetter: (type: PiketLetterType, item?: StudentDutyLedgerItem) => void;
}

/** Status badge color mapping */
function getStatusColor(totalPoints: number): string {
  if (totalPoints >= 100) return "bg-rose-100 text-rose-800 border-rose-200";
  if (totalPoints >= 75) return "bg-orange-100 text-orange-800 border-orange-200";
  if (totalPoints >= 50) return "bg-amber-100 text-amber-800 border-amber-200";
  if (totalPoints >= 25) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function getStatusLabel(totalPoints: number): string {
  if (totalPoints >= 100) return "SP 3 / Skorsing";
  if (totalPoints >= 75) return "SP 2";
  if (totalPoints >= 50) return "SP 1";
  if (totalPoints >= 25) return "Pembinaan";
  return "Aman";
}

export function LedgerDetailSheet({
  student,
  records,
  onClose,
  onBuildLetter,
}: LedgerDetailSheetProps) {
  const statusColor = getStatusColor(student.totalPoints);
  const statusLabel = getStatusLabel(student.totalPoints);

  // Determine letter type based on points
  const defaultLetterType: PiketLetterType =
    student.totalPoints >= 100 ? "student_statement" : "parent_summons";

  // Sort records by date descending
  const sortedRecords = [...records]
    .filter((r) => !r.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <BottomSheet open={true} onClose={onClose} title="Detail Siswa">
      <div className="space-y-3">
        {/* Student info */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">{student.studentName}</h3>
            <p className="text-xs text-slate-500">
              {student.classLabel}
              {student.studentNumber ? ` · No. ${student.studentNumber}` : ""}
            </p>
          </div>
          <span className={`shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 rounded-lg p-2">
            <div className="text-lg font-bold text-slate-900">{student.totalPoints}</div>
            <div className="text-[10px] text-slate-500">Total Poin</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2">
            <div className="text-lg font-bold text-slate-900">{student.totalRecords}</div>
            <div className="text-[10px] text-slate-500">Kejadian</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2">
            <div className="text-lg font-bold text-slate-900">{records.length}</div>
            <div className="text-[10px] text-slate-500">Catatan</div>
          </div>
        </div>

        {/* Cetak surat button */}
        {student.totalPoints >= 25 && (
          <Button
            onClick={() => onBuildLetter(defaultLetterType, student)}
            className="w-full"
          >
            🖨️ Cetak Surat {student.totalPoints >= 100 ? "SP 3" : student.totalPoints >= 75 ? "SP 2" : "SP 1"}
          </Button>
        )}

        {/* Record history */}
        <Card>
          <CardHeader title="Riwayat Catatan" description={`${sortedRecords.length} catatan (terbaru dulu)`} />
          {sortedRecords.length === 0 ? (
            <EmptyState title="Belum ada catatan" description="Data riwayat belum tersedia." />
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedRecords.map((r) => (
                <div key={r.id} className="px-3 py-2 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-800">{r.ruleLabel}</span>
                    <span className="text-xs font-bold text-rose-600">+{r.points}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{formatLongDateID(r.date)}</span>
                    <span>·</span>
                    <span>{r.classLabel}</span>
                  </div>
                  {r.note && (
                    <p className="text-[10px] text-slate-600 italic">💬 {r.note}</p>
                  )}
                  {r.followUp && (
                    <p className="text-[10px] text-blue-600">🚀 {r.followUp}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </BottomSheet>
  );
}
