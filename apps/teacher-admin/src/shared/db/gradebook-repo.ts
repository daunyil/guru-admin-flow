/**
 * Repository untuk GradeBook (Nilai Ringan v0.6 + V3 UH/UTS/UAS).
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity } from "./crud";
import type { GradeBook, GradeEntry } from "@guru-admin/domain";
import { calculateGradeBookEntries, safeParseGradeBook } from "@guru-admin/domain";

/** SA-07: Validate GradeBook data from IndexedDB via safeParse. Logs warning if data is corrupt. */
function validateBook(raw: unknown): GradeBook | undefined {
  const result = safeParseGradeBook(raw);
  if (!result.success) {
    console.warn("[gradebook-repo] safeParse validation failed for GradeBook:", result.error.issues);
    return undefined;
  }
  return result.data;
}

export async function listGradeBooks(academicYearId: string): Promise<GradeBook[]> {
  const all = await db.gradeBooks
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all
    .filter((book) => !book.deletedAt)
    .map((book) => validateBook(book))
    .filter((b): b is GradeBook => b !== undefined);
}

export async function getGradeBook(id: string): Promise<GradeBook | undefined> {
  const book = await db.gradeBooks.get(id);
  if (!book || book.deletedAt) return undefined;
  return validateBook(book);
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

/** Build calculation options from GradeBook fields. */
function calcOptions(
  book: Partial<Pick<GradeBook, "gradeModel" | "uhCount" | "weightUH" | "weightUTS" | "weightUAS">>
) {
  return {
    gradeModel: book.gradeModel ?? "uh",
    uhCount: book.uhCount ?? 2,
    weightUH: book.weightUH ?? 25,
    weightUTS: book.weightUTS ?? 25,
    weightUAS: book.weightUAS ?? 50,
  };
}

export async function saveGradeBook(
  data: Omit<GradeBook, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus"> & Partial<Pick<GradeBook, "gradeModel" | "uhCount" | "weightUH" | "weightUTS" | "weightUAS">>
): Promise<GradeBook> {
  const options = calcOptions(data);
  const entity = createEntity({
    ...data,
    entries: calculateGradeBookEntries(data.entries, data.passingScore, options),
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
  const merged = { ...existing, ...patch };
  const options = calcOptions(merged);
  const updated = updateEntityFields(existing, {
    ...patch,
    passingScore,
    entries: calculateGradeBookEntries(entries as GradeEntry[], passingScore, options),
  }) as GradeBook;
  await saveEntity("gradeBooks", updated);
  return updated;
}
