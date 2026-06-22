/**
 * Repository untuk modul M09 Backup/Restore.
 * Sumber: docs/TECHNICAL_PLAN.md §6
 */

import { db } from "./schema";
import { listEntities } from "./crud";
import {
  validateBackup,
  type BackupFile,
  type BackupSummary,
  type AcademicYear,
  type SchoolProfile,
  type TeacherProfile,
  type CalendarEvent,
  type ProtaProfile,
  type ProtaUnit,
  type TeachingSchedule,
  type TeachingAssignment,
  type LessonSession,
  type AttendanceRecord,
  type ClassRoster,
  type TeachingJournal,
  type SemesterReport,
  type GradeBook,
  type ATPEntry,
  type LKPD,
  type RppDocument,
  type RemedialProgram,
  type EnrichmentProgram,
  type DocumentSnapshot,
} from "@guru-admin/domain";
import { APP_VERSION, DATA_SCHEMA_VERSION, nowTimestamp } from "@guru-admin/shared";

/**
 * Export seluruh data lokal ke format BackupFile.
 * Lihat docs/TECHNICAL_PLAN.md §6.1 (format backup).
 */
export async function exportBackup(): Promise<BackupFile> {
  const [
    academicYears,
    schoolProfileArr,
    teacherProfileArr,
    calendarEvents,
    protaProfiles,
    protaUnits,
    teachingSchedules,
    teachingAssignments,
    lessonSessions,
    attendanceRecords,
    classRosters,
    teachingJournals,
    semesterReports,
    gradeBooks,
    atpEntries,
    lkpds,
    rppDocuments,
    remedialPrograms,
    enrichmentPrograms,
    documentSnapshots,
  ] = await Promise.all([
    listEntities<AcademicYear>("academicYears"),
    listEntities<SchoolProfile>("schoolProfile"),
    listEntities<TeacherProfile>("teacherProfile"),
    listEntities<CalendarEvent>("calendarEvents"),
    listEntities<ProtaProfile>("protaProfiles"),
    listEntities<ProtaUnit>("protaUnits"),
    listEntities<TeachingSchedule>("teachingSchedules"),
    listEntities<TeachingAssignment>("teachingAssignments"),
    listEntities<LessonSession>("lessonSessions"),
    listEntities<AttendanceRecord>("attendanceRecords"),
    listEntities<ClassRoster>("classRosters"),
    listEntities<TeachingJournal>("teachingJournals"),
    listEntities<SemesterReport>("semesterReports"),
    listEntities<GradeBook>("gradeBooks"),
    listEntities<ATPEntry>("atpEntries"),
    listEntities<LKPD>("lkpds"),
    listEntities<RppDocument>("rppDocuments"),
    listEntities<RemedialProgram>("remedialPrograms"),
    listEntities<EnrichmentProgram>("enrichmentPrograms"),
    listEntities<DocumentSnapshot>("documentSnapshots"),
  ]);

  // Re-attach units ke ProtaProfile
  const protaProfilesWithUnits = protaProfiles.map((p) => ({
    ...p,
    units: protaUnits.filter((u) => u.protaProfileId === p.id),
  }));

  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    exportedAt: nowTimestamp(),
    appVersion: APP_VERSION,
    data: {
      academicYears,
      schoolProfile: schoolProfileArr[0] ?? null,
      teacherProfile: teacherProfileArr[0] ?? null,
      calendarEvents,
      protaProfiles: protaProfilesWithUnits,
      teachingSchedules,
      teachingAssignments,
      lessonSessions,
      attendanceRecords,
      classRosters,
      teachingJournals,
      semesterReports,
      gradeBooks,
      atpEntries,
      lkpds,
      rppDocuments,
      remedialPrograms,
      enrichmentPrograms,
      documentSnapshots,
    },
  };
}

/**
 * Validasi file backup tanpa melakukan restore.
 * Lihat docs/TECHNICAL_PLAN.md §6.3.
 */
export function validateBackupFile(input: unknown):
  | { success: true; summary: BackupSummary }
  | { success: false; error: Error } {
  const result = validateBackup(input);
  if (!result.success) {
    return {
      success: false,
      error: result.error instanceof Error ? result.error : new Error(String(result.error)),
    };
  }
  return { success: true, summary: result.summary };
}

/**
 * Restore dari file backup.
 * Mode default: OVERWRITE PENUH (semua data lokal diganti).
 * Lihat docs/TECHNICAL_PLAN.md §6.4.
 *
 * PENTING: Tidak ada konfirmasi di sini. UI wajib menampilkan ringkasan
 * dan meminta konfirmasi eksplisit sebelum memanggil fungsi ini.
 */
export async function restoreBackup(input: unknown): Promise<BackupSummary> {
  const result = validateBackup(input);
  if (!result.success) {
    throw result.error instanceof Error ? result.error : new Error(String(result.error));
  }
  const backup = result.data;

  await db.transaction(
    "rw",
    [
      db.academicYears,
      db.schoolProfile,
      db.teacherProfile,
      db.calendarEvents,
      db.protaProfiles,
      db.protaUnits,
      db.teachingSchedules,
      db.teachingAssignments,
      db.lessonSessions,
      db.attendanceRecords,
      db.classRosters,
      db.teachingJournals,
      db.semesterReports,
      db.gradeBooks,
      db.atpEntries,
      db.lkpds,
      db.rppDocuments,
      db.remedialPrograms,
      db.enrichmentPrograms,
      db.documentSnapshots,
      db.syncQueue,
    ],
    async () => {
      // Clear semua tabel
      await Promise.all([
        db.academicYears.clear(),
        db.schoolProfile.clear(),
        db.teacherProfile.clear(),
        db.calendarEvents.clear(),
        db.protaProfiles.clear(),
        db.protaUnits.clear(),
        db.teachingSchedules.clear(),
        db.teachingAssignments.clear(),
        db.lessonSessions.clear(),
        db.attendanceRecords.clear(),
        db.classRosters.clear(),
        db.teachingJournals.clear(),
        db.semesterReports.clear(),
        db.gradeBooks.clear(),
        db.atpEntries.clear(),
        db.lkpds.clear(),
        db.rppDocuments.clear(),
        db.remedialPrograms.clear(),
        db.enrichmentPrograms.clear(),
        db.documentSnapshots.clear(),
        db.syncQueue.clear(),
      ]);

      // Insert data baru
      await db.academicYears.bulkPut(backup.data.academicYears);
      if (backup.data.schoolProfile) {
        await db.schoolProfile.put(backup.data.schoolProfile);
      }
      if (backup.data.teacherProfile) {
        await db.teacherProfile.put(backup.data.teacherProfile);
      }
      await db.calendarEvents.bulkPut(backup.data.calendarEvents);

      // Pisahkan units dari profiles
      const allUnits: ProtaUnit[] = [];
      for (const p of backup.data.protaProfiles) {
        allUnits.push(...p.units);
      }
      await db.protaProfiles.bulkPut(
        backup.data.protaProfiles.map((p) => ({ ...p, units: undefined as unknown as ProtaUnit[] }))
      );
      await db.protaUnits.bulkPut(allUnits);

      await db.teachingSchedules.bulkPut(backup.data.teachingSchedules);
      const assignments = (backup.data as { teachingAssignments?: TeachingAssignment[] }).teachingAssignments ?? [];
      await db.teachingAssignments.bulkPut(assignments);
      await db.lessonSessions.bulkPut(backup.data.lessonSessions);
      await db.attendanceRecords.bulkPut(backup.data.attendanceRecords);
      await db.classRosters.bulkPut(backup.data.classRosters);
      await db.teachingJournals.bulkPut(backup.data.teachingJournals);
      await db.semesterReports.bulkPut(backup.data.semesterReports);
      await db.gradeBooks.bulkPut(backup.data.gradeBooks);
      const atpEntries = (backup.data as { atpEntries?: ATPEntry[] }).atpEntries ?? [];
      const lkpds = (backup.data as { lkpds?: LKPD[] }).lkpds ?? [];
      const rppDocuments = (backup.data as { rppDocuments?: RppDocument[] }).rppDocuments ?? [];
      const remedialPrograms = (backup.data as { remedialPrograms?: RemedialProgram[] }).remedialPrograms ?? [];
      const enrichmentPrograms = (backup.data as { enrichmentPrograms?: EnrichmentProgram[] }).enrichmentPrograms ?? [];
      await db.atpEntries.bulkPut(atpEntries);
      await db.lkpds.bulkPut(lkpds);
      await db.rppDocuments.bulkPut(rppDocuments);
      await db.remedialPrograms.bulkPut(remedialPrograms);
      await db.enrichmentPrograms.bulkPut(enrichmentPrograms);
      await db.documentSnapshots.bulkPut(backup.data.documentSnapshots);
    }
  );

  return result.summary;
}

/**
 * Generate nama file backup sesuai konvensi.
 * Lihat docs/TECHNICAL_PLAN.md §6.2.
 */
export function generateBackupFilename(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `guru-admin-flow-backup-${yyyy}${mm}${dd}-${hh}${min}.json`;
}

/**
 * Download BackupFile sebagai JSON (browser only).
 */
export function downloadBackupFile(backup: BackupFile): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = generateBackupFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse file JSON dari input <input type="file">.
 */
export function parseBackupFileContent(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        resolve(json);
      } catch (e) {
        reject(new Error(`File bukan JSON valid: ${e instanceof Error ? e.message : String(e)}`));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsText(file);
  });
}
