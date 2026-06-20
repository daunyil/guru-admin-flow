/**
 * Helpers untuk jurnal mengajar — auto-fill dari sesi + Prota + absensi.
 * Sumber: docs/PROJECT_CONTRACT.md §8.3 (jurnal otomatis)
 *
 * Filosofi: "Yang rutin dibuat otomatis. Yang berbeda saja yang diisi guru."
 * Jurnal tidak dimulai dari kosong. Aplikasi mengisi otomatis:
 *   - tanggal, jam ke, kelas, mapel
 *   - materi dari Promes (plannedUnitId)
 *   - tujuan pembelajaran
 *   - jumlah hadir/sakit/izin/alpa (dari absensi)
 *   - guru pengampu
 * Guru hanya memilih realisasi + tambah catatan.
 */

import type { TeachingJournal, LessonSession, ProtaUnit, AttendanceRecord } from "./index";
import type { AttendanceSummary } from "./attendance-helpers";
import { summarizeAttendance } from "./attendance-helpers";
import { uuid, nowTimestamp } from "@guru-admin/shared";

/**
 * Auto-generate TeachingJournal dari LessonSession + ProtaUnit + AttendanceRecord[].
 *
 * Pure function. Caller wajib simpan ke Dexie.
 *
 * Field yang di-auto-fill:
 *   - sessionId, academicYearId, teacherId, classId, classLabel, subject, date, semester
 *   - plannedUnitId, plannedMaterialTitle, plannedLearningOutcome (dari ProtaUnit bila ada)
 *   - presentCount, sickCount, excusedCount, absentCount, totalStudents (dari AttendanceRecord)
 *   - status: "draft"
 *   - realizationStatus: "done" (default, guru bisa ubah)
 *   - locked: false
 *
 * Field yang guru isi:
 *   - realizationStatus (done/continued/cancelled) — default "done"
 *   - actualMaterialTitle (bila berbeda dari rencana)
 *   - note
 *   - followUp
 */
export function generateJournalFromSession(args: {
  session: LessonSession;
  plannedUnit?: ProtaUnit | null;
  attendanceRecords: AttendanceRecord[];
}): TeachingJournal {
  const { session, plannedUnit, attendanceRecords } = args;
  const now = nowTimestamp();
  const summary: AttendanceSummary = summarizeAttendance(attendanceRecords);

  return {
    id: uuid(),
    sessionId: session.id,
    academicYearId: session.academicYearId,
    teacherId: session.teacherId,
    classId: session.classId,
    classLabel: session.classLabel,
    subject: session.subject,
    date: session.date,
    semester: session.semester,

    // Auto-filled dari Promes/Prota
    plannedUnitId: plannedUnit?.id ?? session.plannedUnitId ?? null,
    plannedMaterialTitle: plannedUnit?.title ?? null,
    plannedLearningOutcome: plannedUnit?.learningOutcome ?? null,

    // Auto-filled dari AttendanceRecord
    presentCount: summary.present,
    sickCount: summary.sick,
    excusedCount: summary.excused,
    absentCount: summary.absent,
    totalStudents: summary.total,

    // Default — guru bisa ubah
    realizationStatus: "done",
    actualMaterialTitle: undefined,
    note: undefined,
    followUp: undefined,

    status: "draft",
    locked: false,
    finalizedAt: null,

    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

/**
 * Update jurnal dengan input guru.
 * Hanya field yang guru isi yang di-update, field auto-fill tetap.
 */
export function applyJournalInput(
  journal: TeachingJournal,
  input: {
    realizationStatus?: TeachingJournal["realizationStatus"];
    actualMaterialTitle?: string;
    note?: string;
    followUp?: string;
  }
): TeachingJournal {
  const now = nowTimestamp();
  return {
    ...journal,
    ...input,
    updatedAt: now,
  };
}

/**
 * Re-sync field auto-fill bila absensi berubah.
 * Update presentCount/sickCount/excusedCount/absentCount/totalStudents.
 */
export function resyncJournalAttendance(
  journal: TeachingJournal,
  attendanceRecords: AttendanceRecord[]
): TeachingJournal {
  const summary = summarizeAttendance(attendanceRecords);
  const now = nowTimestamp();
  return {
    ...journal,
    presentCount: summary.present,
    sickCount: summary.sick,
    excusedCount: summary.excused,
    absentCount: summary.absent,
    totalStudents: summary.total,
    updatedAt: now,
  };
}

/** Cek apakah jurnal lengkap (bisa di-finalize). */
export function isJournalComplete(journal: TeachingJournal): {
  complete: boolean;
  missingFields: string[];
} {
  const missing: string[] = [];

  if (!journal.plannedMaterialTitle && !journal.actualMaterialTitle) {
    missing.push("Materi (planned atau actual)");
  }
  if (journal.totalStudents === 0) {
    missing.push("Absensi (totalStudents=0, mungkin belum ada siswa di roster)");
  }
  if (!journal.realizationStatus) {
    missing.push("Status realisasi");
  }

  return {
    complete: missing.length === 0,
    missingFields: missing,
  };
}

/**
 * Finalize jurnal: set status "final", locked=true, finalizedAt=now.
 * Hanya bisa bila isJournalComplete=true.
 */
export function finalizeJournal(journal: TeachingJournal): {
  success: boolean;
  journal?: TeachingJournal;
  errors: string[];
} {
  const check = isJournalComplete(journal);
  if (!check.complete) {
    return {
      success: false,
      errors: [`Jurnal belum lengkap: ${check.missingFields.join(", ")}`],
    };
  }
  const now = nowTimestamp();
  return {
    success: true,
    journal: {
      ...journal,
      status: "final",
      locked: true,
      finalizedAt: now,
      updatedAt: now,
    },
    errors: [],
  };
}
