import { useEffect, useRef, useState, memo, useCallback } from "react";
import { MiniStat } from "@shared/ui/mobile";
import { StudentRow } from "@shared/ui/mobile";
import { ATTENDANCE_STATUS_OPTIONS } from "@shared/constants/attendance-status";
import type { AttendanceStatus, AttendanceRecord } from "@guru-admin/domain";

/* ============================================================ */
/*  Presensi Content — Shared StudentRow + MiniStat + Filter     */
/* ============================================================ */

type PresensiFilter = "all" | "absent";

export interface PresensiContentProps {
  effectiveRecords: AttendanceRecord[];
  changes: Map<string, AttendanceStatus>;
  summary: { present: number; sick: number; excused: number; late: number; absent: number };
  noteMap: Map<string, string>;
  setStatus: (studentId: string, status: AttendanceStatus) => void;
  setAllPresent: () => void;
  setStudentNote: (studentId: string, note: string) => void;
  donePresensi: () => void;
  undoLastStatus: () => void;
  absentList: string[];
}

export function PresensiContent({ effectiveRecords, changes, summary, noteMap, setStatus, setAllPresent, setStudentNote, donePresensi, undoLastStatus, absentList }: PresensiContentProps) {
  const [filter, setFilter] = useState<PresensiFilter>("all");
  const listRef = useRef<HTMLDivElement>(null);

  // 2b: Smart scroll — auto-scroll to first absent student on mount
  useEffect(() => {
    if (!listRef.current) return;
    const firstAbsent = listRef.current.querySelector("[data-absent='true']");
    if (firstAbsent) {
      firstAbsent.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Filter logic: show only absent students when filter is "absent"
  const filteredRecords = filter === "absent"
    ? effectiveRecords.filter((r) => {
        const status = changes.get(r.studentId) ?? r.status;
        return status !== "present" && status !== "late";
      })
    : effectiveRecords;

  const absentCount = effectiveRecords.filter((r) => {
    const status = changes.get(r.studentId) ?? r.status;
    return status !== "present" && status !== "late";
  }).length;

  return (
    <div className="space-y-3">
      {/* Summary stats — using MiniStat grid */}
      <div className="grid grid-cols-5 gap-1.5 md:gap-2 text-center">
        {ATTENDANCE_STATUS_OPTIONS.map((opt) => {
          const key = opt.value as keyof typeof summary;
          return (
            <MiniStat
              key={opt.value}
              label={opt.short}
              value={summary[key] as number}
              color={opt.textColor}
            />
          );
        })}
      </div>

      {/* Quick action: Set Semua Hadir + Undo + Filter toggle */}
      <div className="flex gap-2">
        <button
          onClick={setAllPresent}
          className="flex-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] md:text-xs font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 hover:bg-emerald-100 min-h-[44px]"
        >
          <span className="text-sm">⚡</span>
          Set Semua Hadir
        </button>
        {/* 2c: Quick Undo — 1-level undo last status change */}
        <button
          onClick={undoLastStatus}
          className="shrink-0 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] md:text-xs font-bold py-2.5 px-3 rounded-xl active:scale-[0.98] transition-transform flex items-center gap-1.5 hover:bg-amber-100 min-h-[44px]"
        >
          <span className="text-sm">↩️</span>
          Undo
        </button>
        <button
          onClick={() => setFilter(filter === "absent" ? "all" : "absent")}
          className={`shrink-0 border font-bold text-[11px] md:text-xs py-2.5 px-3 rounded-xl active:scale-[0.98] transition-transform flex items-center gap-1.5 min-h-[44px] ${
            filter === "absent"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}
        >
          <span className="text-sm">🔍</span>
          {filter === "absent" ? "Semua" : `Tidak Hadir (${absentCount})`}
        </button>
      </div>

      {/* Student rows — scrollable (memoized for performance) */}
      <div ref={listRef} className="space-y-1.5 max-h-[50vh] md:max-h-[55vh] overflow-y-auto">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400">
            Semua siswa hadir 🎉
          </div>
        ) : (
          filteredRecords.map((r) => {
            const originalIdx = effectiveRecords.indexOf(r);
            const currentStatus = changes.get(r.studentId) ?? r.status;
            const isAbsent = currentStatus !== "present" && currentStatus !== "late";
            return (
              <div key={r.studentId} data-absent={isAbsent ? "true" : undefined}>
                <MemoPresensiRow
                  studentId={r.studentId}
                  number={r.studentNumber ?? originalIdx + 1}
                  name={r.studentName}
                  currentStatus={currentStatus}
                  note={noteMap.get(r.studentId) ?? ""}
                  onStatusChange={setStatus}
                  onNoteChange={setStudentNote}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Absent summary */}
      {absentList.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-500">
          <span className="font-bold text-slate-700">Tidak Hadir:</span> {absentList.join(", ")}
        </div>
      )}

      {/* Done button — triggers auto-open Jurnal */}
      <button
        onClick={donePresensi}
        className="w-full bg-emerald-600 text-white text-xs md:text-sm font-bold py-3 md:py-3 rounded-xl active:scale-[0.98] transition-transform shadow-sm hover:bg-emerald-700 min-h-[44px]"
      >
        ✓ Selesai Presensi (Lanjut Jurnal)
      </button>
    </div>
  );
}

/* ============================================================ */
/*  Memoized Sub-Components — avoid re-rendering entire list     */
/* ============================================================ */

/** Memoized presensi row — only re-renders when this student's props change */
export const MemoPresensiRow = memo(function MemoPresensiRow({
  studentId,
  number,
  name,
  currentStatus,
  note,
  onStatusChange,
  onNoteChange,
}: {
  studentId: string;
  number: number;
  name: string;
  currentStatus: AttendanceStatus;
  note: string;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onNoteChange: (studentId: string, note: string) => void;
}) {
  const isNotHadir = currentStatus !== "present" && currentStatus !== "late";
  const handleStatusChange = useCallback(
    (status: AttendanceStatus) => onStatusChange(studentId, status),
    [studentId, onStatusChange]
  );

  return (
    <div>
      <StudentRow
        number={number}
        name={name}
        status={currentStatus}
        onStatusChange={handleStatusChange}
        compact
      />
      {isNotHadir && (
        <div className="mt-0.5 ml-2 mb-1">
          <input
            type="text"
            placeholder="💬 Catatan (opsional)..."
            value={note}
            onChange={(e) => onNoteChange(studentId, e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[10px] md:text-xs text-slate-600 outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-slate-400 min-h-[44px]"
          />
        </div>
      )}
    </div>
  );
});
