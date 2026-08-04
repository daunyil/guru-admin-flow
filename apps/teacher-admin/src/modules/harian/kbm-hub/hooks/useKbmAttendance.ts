/**
 * useKbmAttendance — Attendance state and actions.
 *
 * Responsibilities (receives selectedSession and roster as params):
 *   - records, changes, noteMap
 *   - effectiveRecords, summary, absentList
 *   - presensiStep, donePresensi, reopenPresensi
 *   - setStatus, setStudentNote, setAllPresent, undoLastStatus
 *   - Returns dirty state: isAttendanceDirty
 */

import { useMemo, useRef, useState } from "react";
import { summarizeAttendance } from "@guru-admin/domain";
import type {
  AttendanceRecord,
  AttendanceStatus,
} from "@guru-admin/domain";
import { ATTENDANCE_STATUS_OPTIONS } from "@shared/constants/attendance-status";
import type { StepState } from "../types";
import type { StepState as StepStateLocal } from "@shared/ui/mobile/AccordionCard";

export interface UseKbmAttendanceReturn {
  records: AttendanceRecord[];
  changes: Map<string, AttendanceStatus>;
  noteMap: Map<string, string>;
  effectiveRecords: AttendanceRecord[];
  summary: ReturnType<typeof summarizeAttendance>;
  absentList: string[];

  presensiStep: StepState;
  donePresensi: () => void;
  reopenPresensi: () => void;

  setStatus: (studentId: string, status: AttendanceStatus) => void;
  setStudentNote: (studentId: string, note: string) => void;
  setAllPresent: () => void;
  undoLastStatus: () => void;

  setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  setChanges: React.Dispatch<React.SetStateAction<Map<string, AttendanceStatus>>>;

  isAttendanceDirty: boolean;
}

export function useKbmAttendance(
  presensiStep: StepStateLocal,
  setPresensiStep: React.Dispatch<React.SetStateAction<StepStateLocal>>,
  /** Snapshot for dirty tracking — set externally after session load */
  savedChangesSnapshot: Map<string, AttendanceStatus> | null,
  savedNoteMapSnapshot: Map<string, string> | null,
) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [changes, setChanges] = useState<Map<string, AttendanceStatus>>(new Map());
  const [noteMap, setNoteMap] = useState<Map<string, string>>(new Map());

  // 2c: Undo support — track last status change for 1-level undo
  const lastStatusChange = useRef<{ studentId: string; prevStatus: AttendanceStatus } | null>(null);

  /* ---- Computed ---- */

  const effectiveRecords = useMemo(() => {
    return records.map((r) => ({ ...r, status: changes.get(r.studentId) ?? r.status }));
  }, [records, changes]);

  const summary = useMemo(() => summarizeAttendance(effectiveRecords), [effectiveRecords]);

  const absentList = useMemo(() => {
    return effectiveRecords
      .filter((r) => r.status !== "present" && r.status !== "late")
      .map((r) => {
        const opt = ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === r.status);
        return `${r.studentName} (${opt?.short ?? "?"})`;
      });
  }, [effectiveRecords]);

  /* ---- Dirty tracking ---- */

  const isAttendanceDirty = useMemo(() => {
    if (!savedChangesSnapshot) return false;
    if (changes.size !== savedChangesSnapshot.size) return true;
    for (const [k, v] of changes) { if (savedChangesSnapshot.get(k) !== v) return true; }
    if (!savedNoteMapSnapshot) return noteMap.size > 0;
    if (noteMap.size !== savedNoteMapSnapshot.size) return true;
    for (const [k, v] of noteMap) { if (savedNoteMapSnapshot.get(k) !== v) return true; }
    return false;
  }, [changes, noteMap, savedChangesSnapshot, savedNoteMapSnapshot]);

  /* ---- Actions ---- */

  function setStatus(studentId: string, status: AttendanceStatus) {
    // 2c: Track previous status for undo
    const prevStatus = changes.get(studentId) ?? records.find((r) => r.studentId === studentId)?.status ?? "present";
    lastStatusChange.current = { studentId, prevStatus };
    const next = new Map(changes);
    next.set(studentId, status);
    setChanges(next);
  }

  function undoLastStatus() {
    if (!lastStatusChange.current) return;
    const { studentId, prevStatus } = lastStatusChange.current;
    const next = new Map(changes);
    if (prevStatus === "present") {
      next.delete(studentId);
    } else {
      next.set(studentId, prevStatus);
    }
    setChanges(next);
    lastStatusChange.current = null;
  }

  function setAllPresent() {
    const next = new Map<string, AttendanceStatus>();
    for (const r of records) next.set(r.studentId, "present");
    setChanges(next);
    setNoteMap(new Map());
  }

  function setStudentNote(studentId: string, note: string) {
    const next = new Map(noteMap);
    if (note) next.set(studentId, note); else next.delete(studentId);
    setNoteMap(next);
  }

  function donePresensi() { setPresensiStep("done"); }
  function reopenPresensi() { setPresensiStep("active"); }

  return {
    records, changes, noteMap,
    effectiveRecords, summary, absentList,
    presensiStep, donePresensi, reopenPresensi,
    setStatus, setStudentNote, setAllPresent, undoLastStatus,
    setRecords, setChanges,
    isAttendanceDirty,
  };
}
