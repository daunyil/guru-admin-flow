/**
 * Repository untuk SemesterReport.
 * Sumber: docs/DATA_MODEL_DRAFT.md §10, docs/PROJECT_CONTRACT.md §4.1 (M08)
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type { SemesterReport, AcademicYear, ProtaProfile, DocumentSnapshot } from "@guru-admin/domain";
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

/** Cari SemesterReport by (academicYearId, teacherId, subject, grade, semester). */
export async function findSemesterReport(
  academicYearId: string,
  teacherId: string,
  subject: string,
  grade: string,
  semester: 1 | 2
): Promise<SemesterReport | undefined> {
  const all = await listSemesterReports(academicYearId);
  return all.find(
    (r) =>
      r.teacherId === teacherId &&
      r.subject === subject &&
      r.grade === grade &&
      r.semester === semester
  );
}

/**
 * Generate dan simpan SemesterReport dari data existing.
 * Mode: UPSERT — bila sudah ada report untuk (year+teacher+subject+grade+semester), update; bila belum, buat baru.
 */
export async function generateAndSaveSemesterReport(args: {
  academicYear: AcademicYear;
  protaProfile: ProtaProfile | null;
  semester: 1 | 2;
  teacherId: string;
}): Promise<{
  success: boolean;
  report?: SemesterReport;
  result?: GenerateSemesterReportResult;
  errors: string[];
}> {
  // Load semua data yang dibutuhkan
  const [sessions, journals, allAttendance] = await Promise.all([
    listLessonSessions(args.academicYear.id, args.semester),
    listJournals(args.academicYear.id, args.semester),
    db.attendanceRecords.toArray(),
  ]);

  // Filter attendance untuk semester ini (yang sessionId ada di sessions)
  const sessionIds = new Set(sessions.map((s) => s.id));
  const attendance = allAttendance.filter((a) => sessionIds.has(a.sessionId) && !a.deletedAt);

  const result = generateSemesterReport({
    academicYear: args.academicYear,
    protaProfile: args.protaProfile,
    sessions,
    journals,
    attendanceRecords: attendance,
    semester: args.semester,
    teacherId: args.teacherId,
  });

  if (result.errors.length > 0) {
    return { success: false, errors: result.errors };
  }

  // Cek existing report
  const existing = args.protaProfile
    ? await findSemesterReport(
        args.academicYear.id,
        args.teacherId,
        args.protaProfile.subject,
        args.protaProfile.grade,
        args.semester
      )
    : undefined;

  let report: SemesterReport;
  if (existing) {
    // Update existing
    report = updateEntityFields(existing, result.report) as SemesterReport;
  } else {
    // Buat baru
    report = {
      ...createEntity(result.report),
    } as SemesterReport;
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

  // Re-generate untuk cek completeness
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
  const sessionIds = new Set(sessions.map((s) => s.id));
  const attendance = allAttendance.filter((a) => sessionIds.has(a.sessionId) && !a.deletedAt);

  const result = generateSemesterReport({
    academicYear: academicYear as AcademicYear,
    protaProfile: prota ?? null,
    sessions,
    journals,
    attendanceRecords: attendance,
    semester: existing.semester,
    teacherId: existing.teacherId,
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

  // Update report
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
