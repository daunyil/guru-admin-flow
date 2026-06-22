/**
 * Repository untuk SemesterReport.
 * Sumber: docs/DATA_MODEL_DRAFT.md §10, docs/PROJECT_CONTRACT.md §4.1 (M08)
 *
 * APP-USABLE-RC1B: generateAndSaveSemesterReport + finalizeSemesterReport
 * sekarang wajib accept assignment context (5-tuple) untuk filter data
 * sesuai Data Mengajar yang dipilih.
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type { SemesterReport, AcademicYear, ProtaProfile, DocumentSnapshot, TeachingAssignment } from "@guru-admin/domain";
import {
  generateSemesterReport,
  canFinalizeSemesterReport,
  type GenerateSemesterReportResult,
} from "@guru-admin/domain";
import { uuid, nowTimestamp } from "@guru-admin/shared";
import { listProtaProfiles } from "./prota-repo";
import { listLessonSessions } from "./lesson-session-repo";
import { listJournals } from "./journal-repo";

/** List SemesterReport untuk academicYearId. */
export async function listSemesterReports(academicYearId: string): Promise<SemesterReport[]> {
  const all = await db.semesterReports
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all
    .filter((r) => !r.deletedAt)
    .sort((a, b) => a.semester - b.semester) as SemesterReport[];
}

/** Get SemesterReport by id. */
export async function getSemesterReport(id: string): Promise<SemesterReport | undefined> {
  const r = await db.semesterReports.get(id);
  return r && !r.deletedAt ? (r as SemesterReport) : undefined;
}

/** Cari SemesterReport by assignment context (5-tuple).
 *
 * APP-USABLE-RC1B: cari by classId (bukan hanya grade) supaya laporan
 * per Data Mengajar terpisah.
 */
export async function findSemesterReport(args: {
  academicYearId: string;
  teacherId: string;
  subject: string;
  classId: string;
  semester: 1 | 2;
}): Promise<SemesterReport | undefined> {
  const all = await listSemesterReports(args.academicYearId);
  return all.find(
    (r) =>
      r.teacherId === args.teacherId &&
      r.subject === args.subject &&
      r.classId === args.classId &&
      r.semester === args.semester
  );
}

/**
 * Generate dan simpan SemesterReport dari data existing.
 *
 * APP-USABLE-RC1B: wajib accept assignment (TeachingAssignment) untuk
 * filter data sesuai Data Mengajar yang dipilih. Tidak lagi ambil semua
 * sessions/journals semester.
 */
export async function generateAndSaveSemesterReport(args: {
  academicYear: AcademicYear;
  protaProfile: ProtaProfile | null;
  assignment: TeachingAssignment;
}): Promise<{
  success: boolean;
  report?: SemesterReport;
  result?: GenerateSemesterReportResult;
  errors: string[];
}> {
  // Load semua data yang dibutuhkan (filter dilakukan di generator)
  const [sessions, journals, allAttendance] = await Promise.all([
    listLessonSessions(args.academicYear.id, args.assignment.semester),
    listJournals(args.academicYear.id, args.assignment.semester),
    db.attendanceRecords.toArray(),
  ]);

  const result = generateSemesterReport({
    academicYear: args.academicYear,
    protaProfile: args.protaProfile,
    assignment: {
      teacherId: args.assignment.teacherId,
      subject: args.assignment.subject,
      classId: args.assignment.classId,
      classLabel: args.assignment.classLabel,
      semester: args.assignment.semester,
    },
    sessions,
    journals,
    attendanceRecords: allAttendance,
  });

  if (result.errors.length > 0) {
    return { success: false, errors: result.errors };
  }

  // Cek existing report by assignment context
  const existing = await findSemesterReport({
    academicYearId: args.academicYear.id,
    teacherId: args.assignment.teacherId,
    subject: args.assignment.subject,
    classId: args.assignment.classId,
    semester: args.assignment.semester,
  });

  let report: SemesterReport;
  if (existing) {
    report = updateEntityFields(existing, result.report) as SemesterReport;
  } else {
    report = createEntity(result.report) as SemesterReport;
  }

  await saveEntity("semesterReports", report);
  return { success: true, report, result, errors: [] };
}

/** Finalize SemesterReport: set status "final", buat snapshot. */
export async function finalizeSemesterReport(
  id: string
): Promise<{ success: boolean; report?: SemesterReport; errors: string[] }> {
  const existing = await getSemesterReport(id);
  if (!existing) {
    return { success: false, errors: ["Laporan tidak ditemukan"] };
  }
  if (existing.status === "final" || existing.status === "locked") {
    return { success: true, report: existing, errors: [] };
  }

  const academicYear = await db.academicYears.get(existing.academicYearId);
  if (!academicYear) {
    return { success: false, errors: ["Tahun pelajaran tidak ditemukan"] };
  }

  const protaProfiles = await listProtaProfiles(existing.academicYearId);
  const prota = protaProfiles.find(
    (p) => p.subject === existing.subject && p.grade === existing.grade
  );

  const sessions = await listLessonSessions(existing.academicYearId, existing.semester);
  const journals = await listJournals(existing.academicYearId, existing.semester);
  const allAttendance = await db.attendanceRecords.toArray();

  const result = generateSemesterReport({
    academicYear: academicYear as AcademicYear,
    protaProfile: prota ?? null,
    assignment: {
      teacherId: existing.teacherId,
      subject: existing.subject,
      classId: existing.classId,
      classLabel: existing.classLabel,
      semester: existing.semester,
    },
    sessions,
    journals,
    attendanceRecords: allAttendance,
  });

  const check = canFinalizeSemesterReport(result);
  if (!check.canFinalize) {
    return { success: false, errors: check.reasons };
  }

  // Buat snapshot
  const now = nowTimestamp();
  const snapshot: DocumentSnapshot = {
    id: uuid(),
    entityType: "semester_report",
    entityId: existing.id,
    status: "final",
    snapshotData: JSON.stringify(existing),
    snapshotAt: now,
    snapshotBy: existing.teacherId,
    reason: "Finalisasi laporan akhir semester",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "local_only",
  };
  await db.documentSnapshots.put(snapshot);

  const updated = updateEntityFields(existing, {
    ...result.report,
    status: "final",
    finalizedAt: now,
    snapshotId: snapshot.id,
  }) as SemesterReport;
  await saveEntity("semesterReports", updated);

  return { success: true, report: updated, errors: [] };
}

/** Hapus SemesterReport (soft delete). */
export async function deleteSemesterReport(id: string): Promise<void> {
  const existing = await getSemesterReport(id);
  if (!existing) return;
  await saveEntity("semesterReports", softDelete(existing as SemesterReport) as SemesterReport);
}
