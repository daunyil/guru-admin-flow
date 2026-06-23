/**
 * Repository untuk Apps Script import.
 *
 * APPS-SCRIPT-BRIDGE-RC1: jembatan satu arah Apps Script → App Generator.
 *
 * Idempotency strategy:
 *   - Setiap entitas di-lookup by natural key (classId + date + subject + semester).
 *   - Bila existing → update (data dari Apps Script menimpa).
 *   - Bila tidak → create baru.
 *   - Tabel `syncQueue` dipakai untuk track import history (entityType + externalId).
 *
 * Mapping:
 *   students  → ClassRoster (group by classId)
 *   gurus     → TeachingAssignment (by 5-tuple)
 *   absensi   → LessonSession + AttendanceRecord (by classId + date + subject)
 *   jurnal    → LessonSession + TeachingJournal (by classId + date + subject)
 *   nilai     → GradeBook (by 5-tuple)
 */

import { db } from "./schema";
import {
  saveClassRoster,
  findClassRoster,
  updateClassRoster,
} from "./class-roster-repo";
import {
  saveAssignment,
  findAssignment,
} from "./teaching-assignment-repo";
import {
  getAttendanceBySession,
  clearAttendanceForSession,
  saveDefaultAttendance,
} from "./attendance-repo";
import {
  getJournalBySession,
  initJournalForSession,
  updateJournal,
} from "./journal-repo";
import {
  findGradeBook,
  saveGradeBook,
  updateGradeBook,
} from "./gradebook-repo";
import {
  getActiveAcademicYear,
  getTeacherProfile,
} from "./profile-repo";
import { uuid, nowTimestamp } from "@guru-admin/shared";
import type {
  AppsScriptImport,
  AcademicYear,
  TeacherProfile,
  ClassRoster,
  LessonSession,
  AttendanceRecord,
  GradeEntry,
} from "@guru-admin/domain";
import {
  createManualLessonSession,
} from "@guru-admin/domain";

export type ImportSummary = {
  students: { new: number; updated: number; skipped: number; errors: number };
  gurus: { new: number; updated: number; skipped: number; errors: number };
  absensi: { new: number; updated: number; skipped: number; errors: number };
  jurnal: { new: number; updated: number; skipped: number; errors: number };
  nilai: { new: number; updated: number; skipped: number; errors: number };
  errors: string[];
  warnings: string[];
};

function emptyCategoryCount() {
  return { new: 0, updated: 0, skipped: 0, errors: 0 };
}

/**
 * Find or create ClassRoster for a classId.
 * Group students from Apps Script by classId.
 */
async function importStudentsFromAppsScript(
  data: AppsScriptImport,
  year: AcademicYear,
  summary: ImportSummary
): Promise<Map<string, ClassRoster>> {
  const rosterMap = new Map<string, ClassRoster>();
  const studentsByClass = new Map<string, typeof data.students>();

  for (const s of data.students) {
    if (!studentsByClass.has(s.classId)) {
      studentsByClass.set(s.classId, []);
    }
    studentsByClass.get(s.classId)!.push(s);
  }

  for (const [classId, students] of studentsByClass) {
    try {
      const classLabel = students[0]?.classLabel ?? classId;
      let roster = await findClassRoster(year.id, classId);
      if (roster) {
        // Update existing: merge students (idempotent by studentId from Apps Script)
        // RC1-PATCH-1-V2: pertahankan ID siswa dari Apps Script, jangan generate baru.
        const existingIds = new Set(roster.students.map((s) => s.id));
        let newCount = 0;
        for (const s of students) {
          if (!existingIds.has(s.id)) {
            roster.students.push({
              id: s.id, // pertahankan ID dari Apps Script
              name: s.name,
              number: s.number ?? roster.students.length + 1,
              nis: s.nis,
            });
            newCount++;
          }
        }
        if (newCount > 0) {
          // RC1-PATCH-1-V2: pakai updateClassRoster langsung (bukan importStudents)
          // supaya ID siswa dari Apps Script tetap dipertahankan.
          await updateClassRoster(roster.id, { students: roster.students });
          summary.students.updated += newCount;
        } else {
          summary.students.skipped += students.length;
        }
      } else {
        // Create new roster
        roster = await saveClassRoster({
          classId,
          classLabel,
          academicYearId: year.id,
          students: students.map((s, i) => ({
            id: s.id,
            name: s.name,
            number: s.number ?? i + 1,
            nis: s.nis,
          })),
        });
        summary.students.new += students.length;
      }
      rosterMap.set(classId, roster);
    } catch (e) {
      summary.students.errors++;
      summary.errors.push(`Student class ${classId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return rosterMap;
}

/**
 * Import gurus → TeachingAssignment.
 * Idempotent by 5-tuple (academicYearId + semester + teacherId + subject + classId).
 */
async function importGurusFromAppsScript(
  data: AppsScriptImport,
  year: AcademicYear,
  teacher: TeacherProfile,
  summary: ImportSummary
): Promise<void> {
  for (const g of data.gurus) {
    try {
      // Match teacherId by name (Apps Script mungkin tidak punya teacherId internal)
      // Untuk MVP: semua guru di-assign ke teacher profil aktif
      const existing = await findAssignment({
        academicYearId: year.id,
        semester: g.semester,
        teacherId: teacher.id,
        subject: g.subject,
        classId: g.classId,
      });
      if (existing) {
        summary.gurus.skipped++;
      } else {
        await saveAssignment({
          academicYearId: year.id,
          semester: g.semester,
          teacherId: teacher.id,
          teacherName: teacher.name,
          subject: g.subject,
          classId: g.classId,
          classLabel: g.classLabel,
        });
        summary.gurus.new++;
      }
    } catch (e) {
      summary.gurus.errors++;
      summary.errors.push(`Guru ${g.teacherName} - ${g.subject} - ${g.classLabel}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

/**
 * Find or create LessonSession for a date + classId + subject.
 * Used by both absensi and jurnal import.
 */
async function findOrCreateSession(
  year: AcademicYear,
  teacher: TeacherProfile,
  args: {
    date: string;
    classId: string;
    classLabel: string;
    subject: string;
    semester: 1 | 2;
    startPeriod?: number;
    startTime?: string;
    endTime?: string;
  },
  roster: ClassRoster | null
): Promise<LessonSession | null> {
  // Cari existing session by classId + date + subject
  const allSessions = await db.lessonSessions
    .where("classId")
    .equals(args.classId)
    .toArray();
  const existing = allSessions.find(
    (s) => !s.deletedAt && s.date === args.date && s.subject === args.subject && s.teacherId === teacher.id
  );
  if (existing) return existing as LessonSession;

  // Create new session via manual session helper
  if (!roster) return null;
  const session = createManualLessonSession({
    mode: "manual",
    academicYear: year,
    teacherId: teacher.id,
    roster,
    subject: args.subject,
    date: args.date,
  });
  // Override startPeriod/startTime/endTime bila ada
  if (args.startPeriod) session.startPeriod = args.startPeriod;
  if (args.startTime) session.startTime = args.startTime;
  if (args.endTime) session.endTime = args.endTime;
  await db.lessonSessions.put(session);
  return session;
}

/**
 * Import absensi → LessonSession + AttendanceRecord.
 * Idempotent by classId + date + subject (1 sesi per kombinasi).
 */
async function importAbsensiFromAppsScript(
  data: AppsScriptImport,
  year: AcademicYear,
  teacher: TeacherProfile,
  rosterMap: Map<string, ClassRoster>,
  summary: ImportSummary
): Promise<void> {
  for (const a of data.absensi) {
    try {
      const roster = rosterMap.get(a.classId) ?? null;
      const session = await findOrCreateSession(year, teacher, {
        date: a.date,
        classId: a.classId,
        classLabel: a.classLabel,
        subject: a.subject,
        semester: a.semester,
        startPeriod: a.startPeriod,
        startTime: a.startTime,
        endTime: a.endTime,
      }, roster);
      if (!session) {
        summary.absensi.skipped++;
        continue;
      }

      // Cek apakah absensi sudah ada untuk sesi ini
      const existingAtt = await getAttendanceBySession(session.id);
      if (existingAtt.length > 0) {
        // Update: clear + re-create
        await clearAttendanceForSession(session.id);
        summary.absensi.updated++;
      } else {
        summary.absensi.new++;
      }

      // Create attendance records
      const records: AttendanceRecord[] = a.records.map((r) => ({
        id: uuid(),
        sessionId: session.id,
        studentId: r.studentId,
        studentName: r.studentName,
        studentNumber: r.studentNumber,
        nis: r.nis,
        classId: a.classId,
        classLabel: a.classLabel,
        date: a.date,
        status: r.status as AttendanceRecord["status"],
        note: r.note,
        createdAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
        deletedAt: null,
        syncStatus: "local_only" as const,
      }));
      await saveDefaultAttendance(records);
    } catch (e) {
      summary.absensi.errors++;
      summary.errors.push(`Absensi ${a.date} ${a.classLabel} ${a.subject}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

/**
 * Import jurnal → LessonSession + TeachingJournal.
 * Idempotent by classId + date + subject.
 */
async function importJurnalFromAppsScript(
  data: AppsScriptImport,
  year: AcademicYear,
  teacher: TeacherProfile,
  rosterMap: Map<string, ClassRoster>,
  summary: ImportSummary
): Promise<void> {
  for (const j of data.jurnal) {
    try {
      const roster = rosterMap.get(j.classId) ?? null;
      const session = await findOrCreateSession(year, teacher, {
        date: j.date,
        classId: j.classId,
        classLabel: j.classLabel,
        subject: j.subject,
        semester: j.semester,
        startPeriod: j.startPeriod,
        startTime: j.startTime,
        endTime: j.endTime,
      }, roster);
      if (!session) {
        summary.jurnal.skipped++;
        continue;
      }

      // Cek existing journal
      const existingJournal = await getJournalBySession(session.id);
      if (existingJournal) {
        // Update
        await updateJournal(existingJournal.id, {
          actualMaterialTitle: j.materialTitle,
          realizationStatus: j.realizationStatus,
          note: j.note,
          followUp: j.followUp,
        });
        summary.jurnal.updated++;
      } else {
        // Create new journal
        const result = await initJournalForSession({
          session,
          plannedUnit: null,
          attendanceRecords: [],
        });
        if (result) {
          await updateJournal(result.id, {
            actualMaterialTitle: j.materialTitle,
            realizationStatus: j.realizationStatus,
            note: j.note,
            followUp: j.followUp,
          });
          summary.jurnal.new++;
        }
      }
    } catch (e) {
      summary.jurnal.errors++;
      summary.errors.push(`Jurnal ${j.date} ${j.classLabel} ${j.subject}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

/**
 * Import nilai → GradeBook.
 * Idempotent by 5-tuple (academicYearId + teacherId + classId + semester + subject).
 */
async function importNilaiFromAppsScript(
  data: AppsScriptImport,
  year: AcademicYear,
  teacher: TeacherProfile,
  summary: ImportSummary
): Promise<void> {
  for (const n of data.nilai) {
    try {
      const existing = await findGradeBook({
        academicYearId: year.id,
        teacherId: teacher.id,
        classId: n.classId,
        semester: n.semester,
        subject: n.subject,
      });

      const entries: GradeEntry[] = n.entries.map((e) => ({
        studentId: e.studentId,
        studentName: e.studentName,
        studentNumber: e.studentNumber,
        dailyScore: e.dailyScore ?? null,
        assignmentScore: null,
        summativeScore: e.summativeScore ?? null,
        remedialScore: null,
        averageScore: null,
        finalScore: e.finalScore ?? null,
        status: "incomplete" as const,
      }));

      if (existing) {
        await updateGradeBook(existing.id, {
          passingScore: n.kktp,
          entries,
        });
        summary.nilai.updated++;
      } else {
        await saveGradeBook({
          academicYearId: year.id,
          teacherId: teacher.id,
          classId: n.classId,
          classLabel: n.classLabel,
          subject: n.subject,
          semester: n.semester,
          passingScore: n.kktp,
          entries,
          status: "draft",
        });
        summary.nilai.new++;
      }
    } catch (e) {
      summary.nilai.errors++;
      summary.errors.push(`Nilai ${n.classLabel} ${n.subject}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

/**
 * Main import function. Idempotent.
 *
 * Flow:
 *   1. Validate active year + teacher.
 *   2. Import students → ClassRoster.
 *   3. Import gurus → TeachingAssignment.
 *   4. Import absensi → LessonSession + AttendanceRecord.
 *   5. Import jurnal → LessonSession + TeachingJournal.
 *   6. Import nilai → GradeBook.
 *   7. Return summary.
 */
export async function importFromAppsScript(
  data: AppsScriptImport
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    students: emptyCategoryCount(),
    gurus: emptyCategoryCount(),
    absensi: emptyCategoryCount(),
    jurnal: emptyCategoryCount(),
    nilai: emptyCategoryCount(),
    errors: [],
    warnings: [],
  };

  const year = await getActiveAcademicYear();
  const teacher = await getTeacherProfile();
  if (!year) {
    summary.errors.push("Belum ada tahun pelajaran aktif. Buat di menu Profil dulu.");
    return summary;
  }
  if (!teacher) {
    summary.errors.push("Belum ada profil guru. Buat di menu Profil dulu.");
    return summary;
  }

  // 1. Students → ClassRoster
  const rosterMap = await importStudentsFromAppsScript(data, year, summary);

  // 2. Gurus → TeachingAssignment
  await importGurusFromAppsScript(data, year, teacher, summary);

  // 3. Absensi → LessonSession + AttendanceRecord
  await importAbsensiFromAppsScript(data, year, teacher, rosterMap, summary);

  // 4. Jurnal → LessonSession + TeachingJournal
  await importJurnalFromAppsScript(data, year, teacher, rosterMap, summary);

  // 5. Nilai → GradeBook
  await importNilaiFromAppsScript(data, year, teacher, summary);

  return summary;
}
