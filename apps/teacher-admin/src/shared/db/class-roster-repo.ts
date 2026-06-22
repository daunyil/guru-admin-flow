/**
 * Repository untuk ClassRoster (daftar siswa per kelas).
 * Sumber: docs/DATA_MODEL_DRAFT.md §8 (ClassRoster)
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type { ClassRoster, StudentEntry } from "@guru-admin/domain";
import { uuid } from "@guru-admin/shared";

/** List ClassRoster untuk academicYearId. */
export async function listClassRosters(academicYearId: string): Promise<ClassRoster[]> {
  const all = await db.classRosters
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all.filter((r) => !r.deletedAt) as ClassRoster[];
}

/** Get ClassRoster by id. */
export async function getClassRoster(id: string): Promise<ClassRoster | undefined> {
  const r = await db.classRosters.get(id);
  return r && !r.deletedAt ? (r as ClassRoster) : undefined;
}

/** Cari ClassRoster by classId + academicYearId. */
export async function findClassRoster(
  academicYearId: string,
  classId: string
): Promise<ClassRoster | undefined> {
  const all = await listClassRosters(academicYearId);
  return all.find((r) => r.classId === classId);
}

/** Buat ClassRoster baru. */
export async function saveClassRoster(
  data: Omit<ClassRoster, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
): Promise<ClassRoster> {
  const entity = createEntity(data) as ClassRoster;
  await saveEntity("classRosters", entity);
  return entity;
}

/** Update ClassRoster (mis. tambah/hapus/edit siswa). */
export async function updateClassRoster(
  id: string,
  patch: Partial<ClassRoster>
): Promise<ClassRoster | undefined> {
  const existing = await getClassRoster(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, patch) as ClassRoster;
  await saveEntity("classRosters", updated);
  return updated;
}

/** Hapus ClassRoster (soft delete). */
export async function deleteClassRoster(id: string): Promise<void> {
  const existing = await getClassRoster(id);
  if (!existing) return;
  await saveEntity("classRosters", softDelete(existing as ClassRoster) as ClassRoster);
}

/** Tambah siswa ke roster. */
export async function addStudent(
  rosterId: string,
  student: Omit<StudentEntry, "id">
): Promise<ClassRoster | undefined> {
  const existing = await getClassRoster(rosterId);
  if (!existing) return undefined;
  const newStudent: StudentEntry = { ...student, id: uuid() };
  return await updateClassRoster(rosterId, {
    students: [...existing.students, newStudent].sort((a, b) => a.number - b.number),
  });
}

/** Hapus siswa dari roster. */
export async function removeStudent(
  rosterId: string,
  studentId: string
): Promise<ClassRoster | undefined> {
  const existing = await getClassRoster(rosterId);
  if (!existing) return undefined;
  return await updateClassRoster(rosterId, {
    students: existing.students.filter((s) => s.id !== studentId),
  });
}

/** Update data siswa. */
export async function updateStudent(
  rosterId: string,
  studentId: string,
  patch: Partial<StudentEntry>
): Promise<ClassRoster | undefined> {
  const existing = await getClassRoster(rosterId);
  if (!existing) return undefined;
  return await updateClassRoster(rosterId, {
    students: existing.students.map((s) =>
      s.id === studentId ? { ...s, ...patch, id: studentId } : s
    ),
  });
}

/**
 * Bulk import siswa (replace semua siswa di roster).
 * Berguna untuk paste dari Excel: "1. Andi\n2. Budi\n3. Cici"
 */
export async function importStudents(
  rosterId: string,
  students: Array<{ name: string; number: number; nis?: string }>
): Promise<ClassRoster | undefined> {
  const existing = await getClassRoster(rosterId);
  if (!existing) return undefined;
  const newStudents: StudentEntry[] = students.map((s) => ({
    id: uuid(),
    name: s.name,
    number: s.number,
    nis: s.nis || undefined,
  }));
  return await updateClassRoster(rosterId, { students: newStudents });
}
