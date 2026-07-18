/**
 * Repository untuk EnrichmentProgram.
 *
 * GENERATOR-COMPLETION-RC1 Phase 3.
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type { EnrichmentProgram, EnrichmentStudent, TeachingAssignment } from "@guru-admin/domain";
import {
  filterEnrichmentStudents,
  finalizeEnrichmentProgram as finalizeHelper,
  DEFAULT_ENRICHMENT_THRESHOLD,
} from "@guru-admin/domain";

/** List EnrichmentProgram untuk academicYearId + teacherId. */
export async function listEnrichmentPrograms(args: {
  academicYearId: string;
  teacherId: string;
}): Promise<EnrichmentProgram[]> {
  const all = await db.enrichmentPrograms
    .where("academicYearId")
    .equals(args.academicYearId)
    .toArray();
  return all
    .filter((r) => !r.deletedAt && r.teacherId === args.teacherId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) as EnrichmentProgram[];
}

/** Get by id. */
export async function getEnrichmentProgram(id: string): Promise<EnrichmentProgram | undefined> {
  const r = await db.enrichmentPrograms.get(id);
  return r && !r.deletedAt ? (r as EnrichmentProgram) : undefined;
}

/** Find by assignment context (5-tuple). */
export async function findEnrichmentProgram(args: {
  academicYearId: string;
  teacherId: string;
  subject: string;
  classId: string;
  semester: 1 | 2;
}): Promise<EnrichmentProgram | undefined> {
  const all = await listEnrichmentPrograms({
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
 * Generate EnrichmentProgram dari GradeBook entries.
 * Filter siswa dengan finalScore >= threshold (default 90).
 */
export async function generateEnrichmentProgram(args: {
  assignment: TeachingAssignment;
  threshold?: number;
  gradebookEntries: Array<{
    studentId: string;
    studentName: string;
    studentNumber?: number;
    nis?: string;
    finalScore: number | null;
  }>;
  plan?: string;
}): Promise<EnrichmentProgram> {
  const threshold = args.threshold ?? DEFAULT_ENRICHMENT_THRESHOLD;
  const students: EnrichmentStudent[] = filterEnrichmentStudents(args.gradebookEntries, threshold);

  const existing = await findEnrichmentProgram({
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
    threshold,
    students,
    plan: args.plan,
    status: "draft" as const,
    finalizedAt: null,
  };

  if (existing) {
    // Preserve activity/material/note bila siswa masih ada
    const oldByStudentId = new Map(existing.students.map((s) => [s.studentId, s]));
    const mergedStudents = students.map((s) => {
      const old = oldByStudentId.get(s.studentId);
      return old
        ? { ...s, activity: old.activity, material: old.material, note: old.note }
        : s;
    });
    const updated = updateEntityFields(existing, {
      ...data,
      students: mergedStudents,
      threshold,
    }) as EnrichmentProgram;
    await saveEntity("enrichmentPrograms", updated);
    return updated;
  }

  const entity = createEntity(data) as EnrichmentProgram;
  await saveEntity("enrichmentPrograms", entity);
  return entity;
}

/** Update program. */
export async function updateEnrichmentProgram(
  id: string,
  patch: Partial<EnrichmentProgram>
): Promise<EnrichmentProgram | undefined> {
  const existing = await getEnrichmentProgram(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, patch) as EnrichmentProgram;
  await saveEntity("enrichmentPrograms", updated);
  return updated;
}

/** Finalize. */
export async function finalizeEnrichmentProgram(id: string): Promise<{
  success: boolean;
  program?: EnrichmentProgram;
  errors: string[];
}> {
  const existing = await getEnrichmentProgram(id);
  if (!existing) {
    return { success: false, errors: ["Program pengayaan tidak ditemukan"] };
  }
  const result = finalizeHelper(existing);
  if (!result.success || !result.program) {
    return { success: false, errors: result.errors };
  }
  await saveEntity("enrichmentPrograms", result.program);
  return { success: true, program: result.program, errors: [] };
}

/** Soft delete. */
export async function deleteEnrichmentProgram(id: string): Promise<void> {
  const existing = await getEnrichmentProgram(id);
  if (!existing) return;
  await saveEntity("enrichmentPrograms", softDelete(existing) as EnrichmentProgram);
}
