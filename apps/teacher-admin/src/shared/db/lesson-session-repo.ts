/**
 * Repository untuk LessonSession (generated dari Jadwal + Kalender).
 * Sumber: docs/DATA_MODEL_DRAFT.md §7
 */

import { db } from "./schema";
import { updateEntityFields, saveEntity, softDelete } from "./crud";
import type { LessonSession, AcademicYear, TeachingSchedule, CalendarEvent } from "@guru-admin/domain";
import { generateLessonSessions } from "@guru-admin/domain";
import { uuid, nowTimestamp } from "@guru-admin/shared";

/** List LessonSession untuk academicYearId + semester. */
export async function listLessonSessions(
  academicYearId: string,
  semester?: 1 | 2
): Promise<LessonSession[]> {
  const all = await db.lessonSessions
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all
    .filter((s) => !s.deletedAt && (semester === undefined || s.semester === semester))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod) as LessonSession[];
}

/** Get LessonSession by id. */
export async function getLessonSession(id: string): Promise<LessonSession | undefined> {
  const s = await db.lessonSessions.get(id);
  return s && !s.deletedAt ? (s as LessonSession) : undefined;
}

/** Get LessonSession untuk tanggal tertentu. */
export async function getLessonSessionsByDate(
  teacherId: string,
  dateISO: string
): Promise<LessonSession[]> {
  const all = await db.lessonSessions
    .where("teacherId")
    .equals(teacherId)
    .toArray();
  return all
    .filter((s) => !s.deletedAt && s.date === dateISO)
    .sort((a, b) => a.startPeriod - b.startPeriod) as LessonSession[];
}

/** Update LessonSession (mis. set plannedUnitId, status, dll). */
export async function updateLessonSession(
  id: string,
  patch: Partial<LessonSession>
): Promise<LessonSession | undefined> {
  const existing = await getLessonSession(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, patch) as LessonSession;
  await saveEntity("lessonSessions", updated);
  return updated;
}

/** Bulk update LessonSession (untuk apply hasil linker). */
export async function bulkUpdateLessonSessions(
  updates: Array<{ id: string; patch: Partial<LessonSession> }>
): Promise<void> {
  await db.transaction("rw", db.lessonSessions, async () => {
    for (const { id, patch } of updates) {
      const existing = await db.lessonSessions.get(id);
      if (existing && !existing.deletedAt) {
        const updated = updateEntityFields(existing as LessonSession, patch) as LessonSession;
        await db.lessonSessions.put(updated);
      }
    }
  });
}

/** Hapus semua LessonSession untuk academicYearId + semester (sebelum re-generate). */
export async function clearLessonSessions(
  academicYearId: string,
  semester?: 1 | 2
): Promise<void> {
  const all = await db.lessonSessions
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  await db.transaction("rw", db.lessonSessions, async () => {
    for (const s of all) {
      if (!s.deletedAt && (semester === undefined || s.semester === semester)) {
        await saveEntity("lessonSessions", softDelete(s as LessonSession) as LessonSession);
      }
    }
  });
}

/**
 * Generate dan simpan LessonSession untuk satu semester.
 * Menggunakan generateLessonSessions pure function dari domain.
 *
 * Mode: REPLACE — hapus sesi lama untuk academicYearId+semester, simpan yang baru.
 */
export async function generateAndSaveLessonSessions(args: {
  academicYear: AcademicYear;
  schedules: TeachingSchedule[];
  calendar: CalendarEvent[];
  semester: 1 | 2;
  teacherId: string;
}): Promise<{
  success: boolean;
  summary?: ReturnType<typeof generateLessonSessions>["summary"];
  warnings: string[];
  errors: string[];
}> {
  const result = generateLessonSessions(args);

  if (result.errors.length > 0) {
    return { success: false, warnings: result.warnings, errors: result.errors };
  }

  await db.transaction("rw", db.lessonSessions, async () => {
    // 1. Hapus sesi lama untuk academicYearId + semester
    await clearLessonSessions(args.academicYear.id, args.semester);

    // 2. Simpan sesi baru
    for (const session of result.sessions) {
      // Pastikan id baru (pure function sudah generate, tapi pastikan unik)
      const entity: LessonSession = {
        ...session,
        id: uuid(),
        createdAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
        syncStatus: "local_only",
      };
      await db.lessonSessions.put(entity);
    }
  });

  return {
    success: true,
    summary: result.summary,
    warnings: result.warnings,
    errors: result.errors,
  };
}

/**
 * Apply hasil linkPromesToLessons ke LessonSession di Dexie.
 * Update plannedUnitId untuk setiap sesi.
 */
export async function applyPromesLink(
  linkedSessions: Array<{ id: string; plannedUnitId: string | null }>
): Promise<void> {
  const updates = linkedSessions.map((s) => ({
    id: s.id,
    patch: { plannedUnitId: s.plannedUnitId } as Partial<LessonSession>,
  }));
  await bulkUpdateLessonSessions(updates);
}
