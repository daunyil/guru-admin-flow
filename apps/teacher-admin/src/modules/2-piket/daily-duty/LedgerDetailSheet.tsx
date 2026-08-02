/**
 * LedgerDetailSheet — Bottom sheet showing student's discipline ledger detail.
 *
 * V2: Consistent card styling, MiniStat-style summary, better scroll.
 *     Uses existing BottomSheet with reliable overflow-y-auto.
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
function getStatusColor(totalPoints: number): { bg: string; dot: string } {
  if (totalPoints >= 100) return { bg: "bg-rose-100 text-rose-700", dot: "bg-rose-500" };
  if (totalPoints >= 75) return { bg: "bg-orange-100 text-orange-700", dot: "bg-orange-500" };
  if (totalPoints >= 50) return { bg: "bg-amber-100 text-amber-700", dot: "bg-amber-500" };
  if (totalPoints >= 25) return { bg: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" };
  return { bg: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
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
    <BottomSheet open={true} onClose={onClose} title="Detail Siswa" centered>
      <div className="space-y-3">
        {/* Student info */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900">{student.studentName}</h3>
            <p className="text-[10px] md:text-xs text-slate-500">
              {student.classLabel}
              {student.studentNumber ? ` · No. ${student.studentNumber}` : ""}
            </p>
          </div>
          <span className={`shrink-0 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full ${statusColor.bg}`}>
            {statusLabel}
          </span>
        </div>

        {/* Summary stats — MiniStat style */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-xl bg-slate-50 p-2">
            <div className="text-xl font-black text-slate-900">{student.totalPoints}</div>
            <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Total Poin</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2">
            <div className="text-xl font-black text-slate-900">{student.totalRecords}</div>
            <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Kejadian</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2">
            <div className="text-xl font-black text-slate-900">{records.length}</div>
            <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Catatan</div>
          </div>
        </div>

        {/* Cetak surat button — selalu tersedia */}
        <button
          type="button"
          onClick={() => onBuildLetter(defaultLetterType, student)}
          className={`w-full font-bold text-xs md:text-sm py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all min-h-[44px] ${
            student.totalPoints >= 25
              ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          <span>🖨️</span> {student.totalPoints >= 25 ? `Cetak Surat ${student.totalPoints >= 100 ? "SP 3" : student.totalPoints >= 75 ? "SP 2" : "SP 1"}` : "Cetak Surat Panggilan"}
        </button>

        {/* Record history */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] md:text-xs font-bold text-slate-700 uppercase tracking-wider">Riwayat Catatan</span>
              <span className="text-[10px] md:text-xs text-slate-500">{sortedRecords.length} catatan</span>
            </div>
          </div>
          {sortedRecords.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Belum ada catatan" description="Data riwayat belum tersedia." />
            </div>
          ) : (
            <div className="max-h-[40vh] overflow-y-auto overscroll-contain divide-y divide-slate-100">
              {sortedRecords.map((r) => (
                <div key={r.id} className="px-3 py-2.5 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">{r.ruleLabel}</span>
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
        </div>
      </div>
    </BottomSheet>
  );
}
