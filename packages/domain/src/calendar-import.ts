/**
 * Schema impor JSON kalender dari AI eksternal.
 * Sumber: docs/SPRINT_2_DESIGN.md §2
 *
 * Format: guru-admin-flow/calendar/v1
 * AI prompt: guru meng-upload kalender resmi (PDF/DOCX) ke AI, copy-paste JSON hasilnya.
 */

import { z } from "zod";
import { CALENDAR_IMPORT_SCHEMA } from "@guru-admin/shared";
import { calendarEventTypeSchema, calendarScopeSchema } from "./calendar-event";

/** Schema event dalam JSON impor kalender. */
export const calendarImportEventSchema = z.object({
  startDate: z.string().min(1, "startDate wajib diisi"),
  endDate: z.string().min(1, "endDate wajib diisi"),
  type: calendarEventTypeSchema,
  label: z.string().min(1, "label event wajib diisi"),
  scope: calendarScopeSchema,
  blocksLearning: z.boolean(),
  description: z.string().optional(),
});

/** Schema JSON impor kalender lengkap. */
export const calendarImportSchema = z.object({
  $schema: z.literal(CALENDAR_IMPORT_SCHEMA),
  academicYearLabel: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, "academicYearLabel wajib format YYYY/YYYY, contoh: 2025/2026"),
  source: z.string().optional(),
  events: z.array(calendarImportEventSchema).min(1, "Minimal 1 event wajib diisi"),
});

export type CalendarImport = z.infer<typeof calendarImportSchema>;
export type CalendarImportEvent = z.infer<typeof calendarImportEventSchema>;

/** Hasil validasi impor kalender. */
export type CalendarImportValidation =
  | { success: true; data: CalendarImport }
  | { success: false; errors: string[] };

/**
 * Validasi JSON impor kalender.
 * Mengembalikan daftar error yang user-friendly (bukan ZodError mentah).
 */
export function validateCalendarImport(input: unknown): CalendarImportValidation {
  const result = calendarImportSchema.safeParse(input);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    });
    return { success: false, errors };
  }

  // Validasi logic tambahan
  const data = result.data;
  const logicErrors: string[] = [];

  data.events.forEach((event, idx) => {
    if (event.startDate > event.endDate) {
      logicErrors.push(
        `events[${idx}]: startDate (${event.startDate}) wajib <= endDate (${event.endDate})`
      );
    }
    if (event.type === "holiday" && !event.blocksLearning) {
      logicErrors.push(
        `events[${idx}]: event tipe 'holiday' wajib blocksLearning=true (akan di-auto-fix saat impor)`
      );
    }
  });

  if (logicErrors.length > 0) {
    return { success: false, errors: logicErrors };
  }

  return { success: true, data };
}

/**
 * Konversi CalendarImport menjadi CalendarEvent[] (siap simpan ke Dexie).
 * Auto-fix: holiday wajib blocksLearning=true.
 * Caller wajib assign id, academicYearId, createdAt, updatedAt, syncStatus.
 */
export function calendarImportToEvents(
  imp: CalendarImport,
  academicYearId: string
): Array<Omit<CalendarEvent, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">> {
  return imp.events.map((e) => ({
    academicYearId,
    startDate: e.startDate,
    endDate: e.endDate,
    type: e.type,
    label: e.label,
    description: e.description,
    scope: e.scope,
    blocksLearning: e.type === "holiday" ? true : e.blocksLearning, // auto-fix
    source: "ai_import" as const,
  }));
}

// Import type untuk return type
import type { CalendarEvent } from "./calendar-event";
