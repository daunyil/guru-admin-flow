/**
 * Helpers untuk absensi — generate default (semua hadir) + summary.
 * Sumber: docs/PROJECT_CONTRACT.md §8.2 (absensi default semua hadir)
 *
 * Filosofi: "Yang rutin dibuat otomatis. Yang berbeda saja yang diisi guru."
 * Mayoritas siswa hadir → default semua hadir → guru hanya ubah yang tidak hadir.
 */

import type { AttendanceRecord, ClassRoster } from "./attendance";
import { uuid, nowTimestamp } from "@guru-admin/shared";

/**
 * Generate AttendanceRecord[] default untuk satu sesi.
 * Semua siswa di ClassRoster di-set status "present".
 * Guru cukup ubah yang sakit/izin/alpa/terlambat.
 *
 * Pure function. Caller wajib simpan ke Dexie.
 */
export function generateDefaultAttendance(args: {
  roster: ClassRoster;
  sessionId: string;
  date: string;
}): AttendanceRecord[] {
  const { roster, sessionId, date } = args;
  const now = nowTimestamp();

  return roster.students.map((student) => {
    const record: AttendanceRecord = {
      id: uuid(),
      sessionId,
      studentId: student.id,
      studentName: student.name,
      studentNumber: student.number,
      classId: roster.classId,
      classLabel: roster.classLabel,
      date,
      status: "present", // default semua hadir
      note: undefined,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: "local_only",
    };
    return record;
  });
}

/** Ringkasan absensi per sesi. */
export type AttendanceSummary = {
  total: number;
  present: number;
  sick: number;
  excused: number;
  absent: number;
  late: number;
};

/** Hitung ringkasan dari daftar AttendanceRecord. */
export function summarizeAttendance(records: AttendanceRecord[]): AttendanceSummary {
  const summary: AttendanceSummary = {
    total: records.length,
    present: 0,
    sick: 0,
    excused: 0,
    absent: 0,
    late: 0,
  };
  for (const r of records) {
    if (r.status === "present") summary.present++;
    else if (r.status === "sick") summary.sick++;
    else if (r.status === "excused") summary.excused++;
    else if (r.status === "absent") summary.absent++;
    else if (r.status === "late") summary.late++;
  }
  return summary;
}

/**
 * Apply perubahan absensi guru ke records existing.
 * Guru hanya mengubah status siswa yang tidak hadir.
 *
 * Pure function: return salinan records dengan patch applied.
 */
export function applyAttendanceChanges(
  records: AttendanceRecord[],
  changes: Array<{ studentId: string; status: AttendanceRecord["status"]; note?: string }>
): AttendanceRecord[] {
  const changesMap = new Map(changes.map((c) => [c.studentId, c]));
  const now = nowTimestamp();

  return records.map((r) => {
    const change = changesMap.get(r.studentId);
    if (!change) return r;
    return {
      ...r,
      status: change.status,
      note: change.note,
      updatedAt: now,
    };
  });
}

/** Cek apakah semua siswa hadir (tidak ada perubahan dari default). */
export function isAllPresent(records: AttendanceRecord[]): boolean {
  return records.every((r) => r.status === "present");
}

/** Verifikasi konsistensi: total = present + sick + excused + absent. */
export function validateAttendanceConsistency(records: AttendanceRecord[]): {
  valid: boolean;
  expected: number;
  actual: number;
} {
  const summary = summarizeAttendance(records);
  const actual = summary.present + summary.sick + summary.excused + summary.absent;
  return {
    valid: actual === summary.total,
    expected: summary.total,
    actual,
  };
}
