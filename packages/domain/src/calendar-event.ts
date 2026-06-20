/**
 * CalendarEvent — Event kalender pendidikan.
 * Sumber: docs/DATA_MODEL_DRAFT.md §4
 *
 * Sprint 1: schema + parse only. Editor UI & validasi tumpang tindih
 * akan dikerjakan di Sprint 2.
 */

import { z } from "zod";
import { CALENDAR_EVENT_TYPES } from "@guru-admin/shared";
import { baseEntitySchema } from "./base";

export const calendarEventTypeSchema = z.enum(CALENDAR_EVENT_TYPES);

export const calendarScopeSchema = z.union([
  z.literal("ALL"),
  z.array(z.string()),
]);

export const calendarEventSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  type: calendarEventTypeSchema,
  label: z.string().min(1, "Label event wajib diisi"),
  description: z.string().optional(),
  scope: calendarScopeSchema,
  blocksLearning: z.boolean(),
  source: z.enum(["ai_import", "manual"]),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export type CalendarEventType = z.infer<typeof calendarEventTypeSchema>;
export type CalendarScope = z.infer<typeof calendarScopeSchema>;

export function parseCalendarEvent(input: unknown): CalendarEvent {
  return calendarEventSchema.parse(input);
}

export function safeParseCalendarEvent(input: unknown) {
  const result = calendarEventSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  // Validasi logic
  if (result.data.startDate > result.data.endDate) {
    return {
      success: false as const,
      error: new Error("startDate wajib <= endDate"),
    };
  }
  if (result.data.type === "holiday" && !result.data.blocksLearning) {
    return {
      success: false as const,
      error: new Error("Event tipe 'holiday' wajib blocksLearning=true"),
    };
  }
  return { success: true as const, data: result.data };
}
