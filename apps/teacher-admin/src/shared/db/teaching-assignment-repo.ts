/**
 * Repository untuk TeachingAssignment (Data Mengajar).
 *
 * PATCH-FLOW-RC2C: assignment = (academicYearId, semester, teacherId, subject, classId).
 * Unique by composite key. Auto-generatable dari TeachingSchedule.
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type {
  TeachingAssignment,
  TeachingSchedule,
  TeacherProfile,
  AcademicYear,
} from "@guru-admin/domain";
import {
  isSameAssignmentContext,
} from "@guru-admin/domain";

/** List semua assignment untuk academicYearId (+ optional semester). */
export async function listAssignments(
  academicYearId: string,
  semester?: 1 | 2
): Promise<TeachingAssignment[]> {
  const all = await db.teachingAssignments
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all
    .filter((a) => !a.deletedAt && (semester === undefined || a.semester === semester))
    .sort((a, b) => {
      // Sort: classLabel, then subject
      if (a.classLabel !== b.classLabel) return a.classLabel.localeCompare(b.classLabel);
      return a.subject.localeCompare(b.subject);
    }) as TeachingAssignment[];
}

/** List assignment untuk guru tertentu. */
export async function listAssignmentsByTeacher(
  teacherId: string,
  academicYearId: string,
  semester?: 1 | 2
): Promise<TeachingAssignment[]> {
  const all = await listAssignments(academicYearId, semester);
  return all.filter((a) => a.teacherId === teacherId);
}

/** Get assignment by id. */
export async function getAssignment(id: string): Promise<TeachingAssignment | undefined> {
  const a = await db.teachingAssignments.get(id);
  return a && !a.deletedAt ? (a as TeachingAssignment) : undefined;
}

/** Find assignment by composite context (5-tuple). */
export async function findAssignment(args: {
  academicYearId: string;
  semester: 1 | 2;
  teacherId: string;
  subject: string;
  classId: string;
}): Promise<TeachingAssignment | undefined> {
  const all = await listAssignments(args.academicYearId, args.semester);
  return all.find((a) =>
    isSameAssignmentContext(a, {
      academicYearId: args.academicYearId,
      semester: args.semester,
      teacherId: args.teacherId,
      subject: args.subject,
      classId: args.classId,
    })
  );
}

/** Create new assignment. */
export async function saveAssignment(
  data: Omit<TeachingAssignment, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
): Promise<TeachingAssignment> {
  // Cek duplikat
  const existing = await findAssignment({
    academicYearId: data.academicYearId,
    semester: data.semester,
    teacherId: data.teacherId,
    subject: data.subject,
    classId: data.classId,
  });
  if (existing) {
    throw new Error(
      `Assignment sudah ada: ${data.classLabel} · ${data.subject} · ${data.teacherName} (semester ${data.semester})`
    );
  }
  const entity = createEntity(data) as TeachingAssignment;
  await saveEntity("teachingAssignments", entity);
  return entity;
}

/** Update assignment. */
export async function updateAssignment(
  id: string,
  patch: Partial<TeachingAssignment>
): Promise<TeachingAssignment | undefined> {
  const existing = await getAssignment(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, patch) as TeachingAssignment;
  await saveEntity("teachingAssignments", updated);
  return updated;
}

/** Soft delete assignment. */
export async function deleteAssignment(id: string): Promise<void> {
  const existing = await getAssignment(id);
  if (!existing) return;
  await saveEntity("teachingAssignments", softDelete(existing) as TeachingAssignment);
}

/**
 * Auto-generate assignments dari TeachingSchedule.
 *
 * Untuk setiap (academicYearId, semester, teacherId, subject, classId) yang
 * unik di teachingSchedules, buat assignment bila belum ada.
 *
 * Return: { created, skipped, errors }
 */
export async function autoGenerateFromSchedules(args: {
  academicYear: AcademicYear;
  teacher: TeacherProfile;
  schedules: TeachingSchedule[];
  semester: 1 | 2;
}): Promise<{
  created: TeachingAssignment[];
  skipped: number;
  errors: string[];
}> {
  const { academicYear, teacher, schedules, semester } = args;
  const errors: string[] = [];
  const created: TeachingAssignment[] = [];
  let skipped = 0;

  // Filter schedule untuk semester ini + teacher ini
  const relevant = schedules.filter(
    (s) => s.semester === semester && s.teacherId === teacher.id && !s.deletedAt
  );

  // Group by (subject, classId) — setiap combo unik = 1 assignment
  const seen = new Set<string>();
  const uniqueCombos: Array<{ subject: string; classId: string; classLabel: string }> = [];
  for (const s of relevant) {
    const key = `${s.subject}|${s.classId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueCombos.push({
      subject: s.subject,
      classId: s.classId,
      classLabel: s.classLabel,
    });
  }

  for (const combo of uniqueCombos) {
    try {
      const existing = await findAssignment({
        academicYearId: academicYear.id,
        semester,
        teacherId: teacher.id,
        subject: combo.subject,
        classId: combo.classId,
      });
      if (existing) {
        skipped++;
        continue;
      }
      const assignment = await saveAssignment({
        academicYearId: academicYear.id,
        semester,
        teacherId: teacher.id,
        teacherName: teacher.name,
        subject: combo.subject,
        classId: combo.classId,
        classLabel: combo.classLabel,
        jpPerWeek: 2, // default; bisa di-edit nanti
      });
      created.push(assignment);
    } catch (e) {
      errors.push(
        e instanceof Error
          ? `${combo.classLabel} · ${combo.subject}: ${e.message}`
          : `${combo.classLabel} · ${combo.subject}: unknown error`
      );
    }
  }

  return { created, skipped, errors };
}
