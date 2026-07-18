/**
 * Repository untuk RemedialProgram.
 *
 * GENERATOR-COMPLETION-RC1 Phase 2.
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type { RemedialProgram, RemedialStudent, TeachingAssignment } from "@guru-admin/domain";
import {
  filterRemedialStudents,
  finalizeRemedialProgram as finalizeHelper,
} from "@guru-admin/domain";

/** List RemedialProgram untuk academicYearId + teacherId. */
export async function listRemedialPrograms(args: {
  academicYearId: string;
  teacherId: string;
}): Promise<RemedialProgram[]> {
  const all = await db.remedialPrograms
    .where("academicYearId")
    .equals(args.academicYearId)
    .toArray();
  return all
    .filter((r) => !r.deletedAt && r.teacherId === args.teacherId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) as RemedialProgram[];
}

/** Get by id. */
export async function getRemedialProgram(id: string): Promise<RemedialProgram | undefined> {
  const r = await db.remedialPrograms.get(id);
  return r && !r.deletedAt ? (r as RemedialProgram) : undefined;
}

/** Find by assignment context (5-tuple). */
export async function findRemedialProgram(args: {
  academicYearId: string;
  teacherId: string;
  subject: string;
  classId: string;
  semester: 1 | 2;
}): Promise<RemedialProgram | undefined> {
  const all = await listRemedialPrograms({
    academicYearId: args.academicYearId,
    teacherId: args.teacherId,
  });
  return all.find(
    (r) =>
      r.subject === args.subject &&
      r.classId === args.classId &&
      r.semester === args.semester
  );
}

/**
 * Generate RemedialProgram dari GradeBook entries.
 * Filter siswa dengan finalScore < KKTP.
 */
export async function generateRemedialProgram(args: {
  assignment: TeachingAssignment;
  kktp: number;
  gradebookEntries: Array<{
    studentId: string;
    studentName: string;
    studentNumber?: number;
    nis?: string;
    finalScore: number | null;
  }>;
  plan?: string;
  startDate?: string;
  endDate?: string;
}): Promise<RemedialProgram> {
  const students: RemedialStudent[] = filterRemedialStudents(args.gradebookEntries, args.kktp);

  // Cek existing untuk UPSERT
  const existing = await findRemedialProgram({
    academicYearId: args.assignment.academicYearId,
    teacherId: args.assignment.teacherId,
    subject: args.assignment.subject,
    classId: args.assignment.classId,
    semester: args.assignment.semester,
  });

  const data = {
    academicYearId: args.assignment.academicYearId,
    teacherId: args.assignment.teacherId,
    teacherName: args.assignment.teacherName,
    subject: args.assignment.subject,
    classId: args.assignment.classId,
    classLabel: args.assignment.classLabel,
    semester: args.assignment.semester,
    kktp: args.kktp,
    students,
    plan: args.plan,
    startDate: args.startDate,
    endDate: args.endDate,
    status: "draft" as const,
    finalizedAt: null,
  };

  if (existing) {
    // Preserve remedialScore/method/schedule/note bila siswa masih ada
    const oldByStudentId = new Map(existing.students.map((s) => [s.studentId, s]));
    const mergedStudents = students.map((s) => {
      const old = oldByStudentId.get(s.studentId);
      return old
        ? { ...s, remedialScore: old.remedialScore, method: old.method, schedule: old.schedule, note: old.note, tpToImprove: old.tpToImprove }
        : s;
    });
    const updated = updateEntityFields(existing, {
      ...data,
      students: mergedStudents,
      kktp: args.kktp,
    }) as RemedialProgram;
    await saveEntity("remedialPrograms", updated);
    return updated;
  }

  const entity = createEntity(data) as RemedialProgram;
  await saveEntity("remedialPrograms", entity);
  return entity;
}

/** Update program (edit plan, siswa, dll). */
export async function updateRemedialProgram(
  id: string,
  patch: Partial<RemedialProgram>
): Promise<RemedialProgram | undefined> {
  const existing = await getRemedialProgram(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, patch) as RemedialProgram;
  await saveEntity("remedialPrograms", updated);
  return updated;
}

/** Finalize: set status "final" + finalizedAt. */
export async function finalizeRemedialProgram(id: string): Promise<{
  success: boolean;
  program?: RemedialProgram;
  errors: string[];
}> {
  const existing = await getRemedialProgram(id);
  if (!existing) {
    return { success: false, errors: ["Program remedial tidak ditemukan"] };
  }
  const result = finalizeHelper(existing);
  if (!result.success || !result.program) {
    return { success: false, errors: result.errors };
  }
  await saveEntity("remedialPrograms", result.program);
  return { success: true, program: result.program, errors: [] };
}

/** Soft delete. */
export async function deleteRemedialProgram(id: string): Promise<void> {
  const existing = await getRemedialProgram(id);
  if (!existing) return;
  await saveEntity("remedialPrograms", softDelete(existing) as RemedialProgram);
}
