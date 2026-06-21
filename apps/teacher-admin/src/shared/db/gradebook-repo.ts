/**
 * Repository untuk GradeBook (Nilai Ringan v0.6).
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity } from "./crud";
import type { GradeBook, GradeEntry } from "@guru-admin/domain";
import { calculateGradeBookEntries } from "@guru-admin/domain";

export async function listGradeBooks(academicYearId: string): Promise<GradeBook[]> {
  const all = await db.gradeBooks
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all.filter((book) => !book.deletedAt) as GradeBook[];
}

export async function getGradeBook(id: string): Promise<GradeBook | undefined> {
  const book = await db.gradeBooks.get(id);
  return book && !book.deletedAt ? (book as GradeBook) : undefined;
}

export async function findGradeBook(params: {
  academicYearId: string;
  teacherId: string;
  classId: string;
  semester: 1 | 2;
  subject: string;
}): Promise<GradeBook | undefined> {
  const books = await listGradeBooks(params.academicYearId);
  return books.find(
    (book) =>
      book.teacherId === params.teacherId &&
      book.classId === params.classId &&
      book.semester === params.semester &&
      book.subject === params.subject
  );
}

export async function saveGradeBook(
  data: Omit<GradeBook, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
): Promise<GradeBook> {
  const entity = createEntity({
    ...data,
    entries: calculateGradeBookEntries(data.entries, data.passingScore),
  }) as GradeBook;
  await saveEntity("gradeBooks", entity);
  return entity;
}

export async function updateGradeBook(
  id: string,
  patch: Partial<GradeBook>
): Promise<GradeBook | undefined> {
  const existing = await getGradeBook(id);
  if (!existing) return undefined;
  const passingScore = patch.passingScore ?? existing.passingScore;
  const entries = patch.entries ?? existing.entries;
  const updated = updateEntityFields(existing, {
    ...patch,
    passingScore,
    entries: calculateGradeBookEntries(entries as GradeEntry[], passingScore),
  }) as GradeBook;
  await saveEntity("gradeBooks", updated);
  return updated;
}
