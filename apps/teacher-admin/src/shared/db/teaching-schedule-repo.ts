/**
 * Repository untuk modul M05 Jadwal Guru (TeachingSchedule).
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M05), docs/DATA_MODEL_DRAFT.md §6
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type { TeachingSchedule } from "@guru-admin/domain";
import { validateScheduleImport, scheduleImportToSchedules } from "@guru-admin/domain";
import { uuid, nowTimestamp, DEFAULT_PERIOD_TIMES } from "@guru-admin/shared";

/** List TeachingSchedule untuk academicYearId. */
export async function listTeachingSchedules(academicYearId: string): Promise<TeachingSchedule[]> {
  const all = await db.teachingSchedules
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all
    .filter((s) => !s.deletedAt)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startPeriod - b.startPeriod) as TeachingSchedule[];
}

/** Get TeachingSchedule by id. */
export async function getTeachingSchedule(id: string): Promise<TeachingSchedule | undefined> {
  const s = await db.teachingSchedules.get(id);
  return s && !s.deletedAt ? (s as TeachingSchedule) : undefined;
}

/** Buat schedule baru. */
export async function saveTeachingSchedule(
  data: Omit<TeachingSchedule, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
): Promise<TeachingSchedule> {
  const entity = createEntity(data) as TeachingSchedule;
  await saveEntity("teachingSchedules", entity);
  return entity;
}

/** Update schedule. */
export async function updateTeachingSchedule(
  id: string,
  patch: Partial<TeachingSchedule>
): Promise<TeachingSchedule | undefined> {
  const existing = await getTeachingSchedule(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, patch) as TeachingSchedule;
  await saveEntity("teachingSchedules", updated);
  return updated;
}

/** Hapus schedule (soft delete). */
export async function deleteTeachingSchedule(id: string): Promise<void> {
  const existing = await getTeachingSchedule(id);
  if (!existing) return;
  await saveEntity("teachingSchedules", softDelete(existing as TeachingSchedule) as TeachingSchedule);
}

/** Hapus semua schedule untuk academicYearId + semester (sebelum re-generate). */
export async function clearTeachingSchedules(
  academicYearId: string,
  semester?: 1 | 2
): Promise<void> {
  const all = await db.teachingSchedules
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  await db.transaction("rw", db.teachingSchedules, async () => {
    for (const s of all) {
      if (!s.deletedAt && (semester === undefined || s.semester === semester)) {
        await saveEntity("teachingSchedules", softDelete(s as TeachingSchedule) as TeachingSchedule);
      }
    }
  });
}

/**
 * Impor jadwal dari JSON (format guru-admin-flow/schedule/v1) — dari Smart Roster.
 * Mode: REPLACE — soft-delete schedule lama untuk academicYearId+semester, simpan yang baru.
 */
export async function importScheduleFromJSON(
  jsonInput: unknown,
  academicYearId: string,
  teacherId: string
): Promise<{ success: boolean; importedCount: number; errors: string[] }> {
  const validation = validateScheduleImport(jsonInput);
  if (!validation.success) {
    return { success: false, importedCount: 0, errors: validation.errors };
  }

  // Fallback untuk startTime/endTime bila tidak ada di entry
  const fallbackTimes = (period: number, durationJP: number) => {
    const startIdx = Math.max(0, Math.min(DEFAULT_PERIOD_TIMES.length - 1, period - 1));
    const start = DEFAULT_PERIOD_TIMES[startIdx];
    const endIdx = Math.min(DEFAULT_PERIOD_TIMES.length - 1, startIdx + durationJP - 1);
    const end = DEFAULT_PERIOD_TIMES[endIdx];
    return { startTime: start.start, endTime: end.end };
  };

  const newSchedules = scheduleImportToSchedules(validation.data, fallbackTimes);
  const now = nowTimestamp();

  await db.transaction("rw", db.teachingSchedules, async () => {
    // Soft-delete semua schedule lama untuk academicYearId
    const existing = await db.teachingSchedules
      .where("academicYearId")
      .equals(academicYearId)
      .toArray();
    for (const s of existing) {
      if (!s.deletedAt) {
        await saveEntity("teachingSchedules", softDelete(s as TeachingSchedule) as TeachingSchedule);
      }
    }

    // Simpan schedule baru
    for (const scheduleData of newSchedules) {
      const entity: TeachingSchedule = {
        ...scheduleData,
        id: uuid(),
        academicYearId,
        teacherId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: "local_only",
      };
      await saveEntity("teachingSchedules", entity);
    }
  });

  return { success: true, importedCount: newSchedules.length, errors: [] };
}
