/**
 * Manual Session helper — untuk absensi/jurnal manual atau susulan.
 *
 * Sumber: PATCH-FLOW-RC1 (senior audit f0478cb)
 *
 * Filosofi: kalau guru absen manual/susulan, kita buat LessonSession
 * "ad-hoc" yang sebenarnya (bukan virtual ID). Dengan begitu:
 *   - attendanceRecords bisa di-key per sessionId (hindari dobel)
 *   - teachingJournals bisa menemukan session yang sama
 *   - rantai Siswa → Absensi → Jurnal → Laporan tidak putus
 *
 * Pure function. Caller wajib simpan ke Dexie.
 */

import type { AcademicYear, LessonSession, ClassRoster } from "./index";
import { uuid, nowTimestamp } from "@guru-admin/shared";

export type ManualSessionMode = "manual" | "susulan";

/** Input untuk createManualLessonSession. */
export type CreateManualLessonSessionInput = {
  mode: ManualSessionMode;
  academicYear: AcademicYear;
  teacherId: string;
  roster: ClassRoster;
  subject: string;
  date: string; // ISO date
};

/**
 * Tentukan semester dari tanggal terhadap AcademicYear.
 * Return 1 bila date dalam rentang semester 1, 2 bila dalam semester 2.
 * Default 1 bila di luar rentang (untuk safety).
 */
export function semesterForDate(academicYear: AcademicYear, dateISO: string): 1 | 2 {
  if (dateISO >= academicYear.semester2Start && dateISO <= academicYear.semester2End) {
    return 2;
  }
  return 1;
}

/**
 * Buat LessonSession ad-hoc untuk mode manual/susulan.
 *
 * Karakteristik:
 *   - teachingScheduleId: "manual" / "susulan" (penanda)
 *   - startPeriod: 1, durationJP: 1 (default; guru bisa abaikan)
 *   - startTime/endTime: "00:00" (placeholder)
 *   - status: "planned"
 *
 * Tidak dicegah di sini: duplikasi. Caller wajib cek existing session
 * dengan findExistingManualSession sebelum memanggil ini.
 */
export function createManualLessonSession(
  input: CreateManualLessonSessionInput
): LessonSession {
  const { mode, academicYear, teacherId, roster, subject, date } = input;
  const now = nowTimestamp();
  const semester = semesterForDate(academicYear, date);

  return {
    id: uuid(),
    academicYearId: academicYear.id,
    teachingScheduleId: mode, // "manual" atau "susulan" sebagai penanda
    teacherId,
    classId: roster.classId,
    classLabel: roster.classLabel,
    subject,
    date,
    startPeriod: 1,
    durationJP: 1,
    startTime: "00:00",
    endTime: "00:00",
    semester,
    plannedUnitId: null,
    status: "planned",
    calendarEventId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

/**
 * Cek apakah sebuah LessonSession cocok dengan kriteria manual/susulan.
 * Cocok bila: classId, subject, date sama, dan teachingScheduleId adalah "manual" atau "susulan".
 *
 * Untuk dipakai caller saat mencari existing session sebelum membuat baru.
 */
export function isMatchingManualSession(
  session: LessonSession,
  criteria: { classId: string; subject: string; date: string }
): boolean {
  return (
    session.classId === criteria.classId &&
    session.subject === criteria.subject &&
    session.date === criteria.date &&
    (session.teachingScheduleId === "manual" ||
      session.teachingScheduleId === "susulan")
  );
}
