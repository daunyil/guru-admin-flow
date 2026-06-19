/**
 * Repository untuk modul M02 Kalender (CalendarEvent).
 * Sumber: docs/SPRINT_2_DESIGN.md §3
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, getEntity, softDelete } from "./crud";
import type { CalendarEvent } from "@guru-admin/domain";
import { calendarImportToEvents, validateCalendarImport } from "@guru-admin/domain";
import { uuid, nowTimestamp } from "@guru-admin/shared";

/** List CalendarEvent untuk academicYearId (yang tidak di-soft-delete). */
export async function listCalendarEvents(academicYearId: string): Promise<CalendarEvent[]> {
  const all = await db.calendarEvents
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all.filter((e) => !e.deletedAt).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Get CalendarEvent by id. */
export async function getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
  return getEntity<CalendarEvent>("calendarEvents", id);
}

/** Buat event baru. */
export async function saveCalendarEvent(
  data: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
): Promise<CalendarEvent> {
  const entity = createEntity(data) as CalendarEvent;
  await saveEntity("calendarEvents", entity);
  return entity;
}

/** Update event existing. */
export async function updateCalendarEvent(
  id: string,
  patch: Partial<CalendarEvent>
): Promise<CalendarEvent | undefined> {
  const existing = await getCalendarEvent(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, patch);
  await saveEntity("calendarEvents", updated);
  return updated;
}

/** Soft delete event. */
export async function deleteCalendarEvent(id: string): Promise<void> {
  const existing = await getCalendarEvent(id);
  if (!existing) return;
  await saveEntity("calendarEvents", softDelete(existing));
}

/**
 * Impor kalender dari JSON (format guru-admin-flow/calendar/v1).
 * Mode: REPLACE — soft-delete semua event lama untuk academicYearId, simpan yang baru.
 *
 * Lihat docs/SPRINT_2_DESIGN.md §2.4.
 */
export async function importCalendarFromJSON(
  jsonInput: unknown,
  academicYearId: string
): Promise<{ success: boolean; importedCount: number; errors: string[] }> {
  const validation = validateCalendarImport(jsonInput);
  if (!validation.success) {
    return { success: false, importedCount: 0, errors: validation.errors };
  }

  const newEvents = calendarImportToEvents(validation.data, academicYearId);
  const now = nowTimestamp();

  await db.transaction("rw", db.calendarEvents, async () => {
    // 1. Soft-delete semua event lama untuk academicYearId ini
    const existing = await db.calendarEvents
      .where("academicYearId")
      .equals(academicYearId)
      .toArray();
    for (const e of existing) {
      if (!e.deletedAt) {
        await saveEntity("calendarEvents", softDelete(e));
      }
    }

    // 2. Simpan event baru dengan id + base fields
    for (const eventData of newEvents) {
      const entity: CalendarEvent = {
        ...eventData,
        id: uuid(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: "local_only",
      };
      await saveEntity("calendarEvents", entity);
    }
  });

  return { success: true, importedCount: newEvents.length, errors: [] };
}
