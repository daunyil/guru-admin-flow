/**
 * AttendanceEditor — inline editor for attendance records of a single session.
 */

import { useEffect, useState } from "react";
import { Card, Button, EmptyState, LoadingState } from "@shared/ui";
import { getLessonSession } from "@shared/db/lesson-session-repo";
import { getAttendanceBySession, saveDefaultAttendance, updateAttendance } from "@shared/db/attendance-repo";
import { findClassRoster } from "@shared/db/class-roster-repo";
import { generateDefaultAttendance, summarizeAttendance } from "@guru-admin/domain";
import type { AcademicYear, AttendanceRecord, ClassRoster, LessonSession } from "@guru-admin/domain";
import { formatLongDateID, nowTimestamp } from "@guru-admin/shared";
import { ATTENDANCE_STATUS_OPTIONS, INACTIVE_STATUS_BTN } from "@shared/constants/attendance-status";
import type { Status, SaveInfo } from "./quick-attendance-types";

interface AttendanceEditorProps {
  sessionId: string;
  date: string;
  year: AcademicYear | null;
  onSaved: (info: SaveInfo) => void | Promise<void>;
  onError: (msg: string) => void;
  /** B4-01: Callback when dirty state changes (changes.size > 0) */
  onDirtyChange?: (dirty: boolean) => void;
}

export function AttendanceEditor({ sessionId, date, year, onSaved, onError, onDirtyChange }: AttendanceEditorProps) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [changes, setChanges] = useState<Map<string, Status>>(new Map());
  const [isNew, setIsNew] = useState(false);

  // B4-01: Notify parent when dirty state changes
  useEffect(() => {
    onDirtyChange?.(changes.size > 0);
  }, [changes.size, onDirtyChange]);

  useEffect(() => {
    void (async () => {
      const s = await getLessonSession(sessionId);
      if (!s) { onError("Sesi tidak ditemukan"); setLoading(false); return; }
      setSession(s);
      const r = year ? await findClassRoster(year.id, s.classId) : null;
      setRoster(r ?? null);
      const existing = await getAttendanceBySession(s.id);
      if (existing.length > 0) setRecords(existing);
      else if (r) { setRecords(generateDefaultAttendance({ roster: r, sessionId: s.id, date: s.date })); setIsNew(true); }
      setLoading(false);
    })();
  }, [sessionId]);

  function eff(r: AttendanceRecord): Status { return changes.get(r.studentId) ?? (r.status as Status); }

  async function save() {
    if (!session) return;
    try {
      const next = isNew
        ? records.map((r) => changes.has(r.studentId) ? { ...r, status: changes.get(r.studentId) as AttendanceRecord["status"], updatedAt: nowTimestamp() } : r)
        : (changes.size
          ? await updateAttendance(session.id, Array.from(changes.entries()).map(([studentId, status]) => ({ studentId, status: status as AttendanceRecord["status"] })))
          : records);
      if (isNew) { await saveDefaultAttendance(next); setIsNew(false); }
      setRecords(next); setChanges(new Map()); // B4-01: changes cleared → onDirtyChange fires via useEffect
      await onSaved({ sessionId: session.id, subject: session.subject, classLabel: session.classLabel, date: session.date, summary: summarizeAttendance(next) });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan absensi. Coba lagi.");
    }
  }

  if (loading) return <Card><LoadingState message="Memuat absensi..." /></Card>;
  if (!roster) return <Card><EmptyState title="Belum ada daftar siswa" description="Buat roster kelas dulu di menu Siswa." /></Card>;

  const summary = summarizeAttendance(records.map((r) => ({ ...r, status: eff(r) })));

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">Absensi — {roster.classLabel}</h3>
        <p className="text-xs text-slate-500">{session?.subject ?? "Mapel"} · {formatLongDateID(session?.date ?? date)}</p>
      </div>
      {/* Summary stats — using unified ATTENDANCE_STATUS_OPTIONS */}
      <div className="grid grid-cols-5 gap-2 mb-4 text-center no-print">
        {ATTENDANCE_STATUS_OPTIONS.map((opt) => {
          const key = opt.value as keyof typeof summary;
          return (
            <div key={opt.value} className="p-2 rounded">
              <span className={`font-bold ${opt.textColor}`}>{opt.short} {summary[key] as number}</span>
            </div>
          );
        })}
      </div>
      {/* Student rows — using unified ATTENDANCE_STATUS_OPTIONS */}
      <div className="space-y-2 max-h-96 overflow-y-auto no-print">
        {records.map((r) => (
          <div key={r.id} className="p-2 border rounded-md flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{r.studentNumber ?? ""}. {r.studentName}</span>
            <div className="flex gap-1">
              {ATTENDANCE_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { const m = new Map(changes); m.set(r.studentId, opt.value); setChanges(m); }}
                  className={`px-3 py-1.5 text-xs rounded-md font-bold transition-all active:scale-95 ${eff(r) === opt.value ? opt.color : INACTIVE_STATUS_BTN}`}
                >
                  {opt.short}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 mt-4 pt-3 bg-white border-t no-print">
        <Button onClick={save} disabled={changes.size === 0} className="w-full">{changes.size === 0 ? "Tidak Ada Perubahan" : "Simpan Absensi"}</Button>
      </div>
    </div>
  );
}
