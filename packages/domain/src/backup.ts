/**
 * Backup JSON schema — format file backup sesuai docs/TECHNICAL_PLAN.md §6.1.
 */

import { z } from "zod";
import { academicYearSchema } from "./academic-year";
import { schoolProfileSchema } from "./school-profile";
import { teacherProfileSchema } from "./teacher-profile";
import { calendarEventSchema } from "./calendar-event";
import { protaProfileSchema } from "./prota";
import { teachingScheduleSchema } from "./teaching-schedule";
import { teachingAssignmentSchema } from "./teaching-assignment";
import { lessonSessionSchema } from "./lesson-session";
import { attendanceRecordSchema, classRosterSchema } from "./attendance";
import { teachingJournalSchema } from "./teaching-journal";
import { semesterReportSchema } from "./semester-report";
import { gradeBookSchema } from "./gradebook";
import { atpEntrySchema } from "./atp-entry";
import { lkpdSchema } from "./lkpd";
import { rppDocumentSchema } from "./rpp-document";
import { remedialProgramSchema } from "./remedial-program";
import { enrichmentProgramSchema } from "./enrichment-program";
import { documentSnapshotSchema } from "./snapshot-sync";
import { DATA_SCHEMA_VERSION } from "@guru-admin/shared";

export const backupFileSchema = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  appVersion: z.string(),
  data: z.object({
    academicYears: z.array(academicYearSchema),
    schoolProfile: schoolProfileSchema.nullable(),
    teacherProfile: teacherProfileSchema.nullable(),
    calendarEvents: z.array(calendarEventSchema),
    protaProfiles: z.array(protaProfileSchema),
    teachingSchedules: z.array(teachingScheduleSchema),
    teachingAssignments: z.array(teachingAssignmentSchema).default([]),
    lessonSessions: z.array(lessonSessionSchema),
    attendanceRecords: z.array(attendanceRecordSchema),
    classRosters: z.array(classRosterSchema),
    teachingJournals: z.array(teachingJournalSchema),
    semesterReports: z.array(semesterReportSchema),
    gradeBooks: z.array(gradeBookSchema).default([]),
    atpEntries: z.array(atpEntrySchema).default([]),
    lkpds: z.array(lkpdSchema).default([]),
    rppDocuments: z.array(rppDocumentSchema).default([]),
    remedialPrograms: z.array(remedialProgramSchema).default([]),
    enrichmentPrograms: z.array(enrichmentProgramSchema).default([]),
    documentSnapshots: z.array(documentSnapshotSchema),
  }),
});

export type BackupFile = z.infer<typeof backupFileSchema>;

/**
 * Validasi file backup.
 * Mengembalikan:
 *   - success=false dengan error bila skema tidak valid
 *   - success=false dengan warning bila schemaVersion > DATA_SCHEMA_VERSION
 *     (file dari versi app yang lebih baru, tidak bisa di-restore)
 *   - success=true dengan data + summary bila valid
 */
export function validateBackup(input: unknown):
  | { success: true; data: BackupFile; summary: BackupSummary }
  | { success: false; error: Error | z.ZodError } {

  const result = backupFileSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const backup = result.data;

  if (backup.schemaVersion > DATA_SCHEMA_VERSION) {
    return {
      success: false,
      error: new Error(
        `Backup schemaVersion ${backup.schemaVersion} lebih baru dari versi aplikasi (${DATA_SCHEMA_VERSION}). ` +
        `Update aplikasi terlebih dahulu sebelum restore.`
      ),
    };
  }

  const summary: BackupSummary = {
    schemaVersion: backup.schemaVersion,
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
    counts: {
      academicYears: backup.data.academicYears.length,
      calendarEvents: backup.data.calendarEvents.length,
      protaProfiles: backup.data.protaProfiles.length,
      teachingSchedules: backup.data.teachingSchedules.length,
      teachingAssignments: backup.data.teachingAssignments.length,
      lessonSessions: backup.data.lessonSessions.length,
      attendanceRecords: backup.data.attendanceRecords.length,
      classRosters: backup.data.classRosters.length,
      teachingJournals: backup.data.teachingJournals.length,
      semesterReports: backup.data.semesterReports.length,
      gradeBooks: backup.data.gradeBooks.length,
      atpEntries: backup.data.atpEntries.length,
      lkpds: backup.data.lkpds.length,
      rppDocuments: backup.data.rppDocuments.length,
      remedialPrograms: backup.data.remedialPrograms.length,
      enrichmentPrograms: backup.data.enrichmentPrograms.length,
      documentSnapshots: backup.data.documentSnapshots.length,
    },
    hasSchoolProfile: backup.data.schoolProfile !== null,
    hasTeacherProfile: backup.data.teacherProfile !== null,
  };

  return { success: true, data: backup, summary };
}

export type BackupSummary = {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  counts: {
    academicYears: number;
    calendarEvents: number;
    protaProfiles: number;
    teachingSchedules: number;
    teachingAssignments: number;
    lessonSessions: number;
    attendanceRecords: number;
    classRosters: number;
    teachingJournals: number;
    semesterReports: number;
    gradeBooks: number;
    atpEntries: number;
    lkpds: number;
    rppDocuments: number;
    remedialPrograms: number;
    enrichmentPrograms: number;
    documentSnapshots: number;
  };
  hasSchoolProfile: boolean;
  hasTeacherProfile: boolean;
};
