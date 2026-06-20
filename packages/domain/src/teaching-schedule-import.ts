/**
 * Schema impor JSON jadwal dari Smart Roster.
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M05), docs/DATA_MODEL_DRAFT.md §6
 *
 * Smart Roster (aplikasi Waka Kurikulum) menghasilkan JSON jadwal guru.
 * Guru Admin Flow mengimpor JSON tersebut untuk mendapatkan jadwal mengajar.
 */

import { z } from "zod";
import { SCHEDULE_IMPORT_SCHEMA } from "@guru-admin/shared";

/** Schema entri jadwal dalam JSON impor. */
export const scheduleImportEntrySchema = z.object({
  subject: z.string().min(1, "subject wajib diisi"),
  classId: z.string().min(1, "classId wajib diisi"),
  classLabel: z.string().min(1, "classLabel wajib diisi"),
  dayOfWeek: z.number().int().min(1).max(7, "dayOfWeek wajib 1-7 (1=Senin, 7=Minggu)"),
  startPeriod: z.number().int().positive("startPeriod wajib bilangan bulat positif"),
  durationJP: z.number().int().positive("durationJP wajib bilangan bulat positif"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime wajib format HH:mm").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime wajib format HH:mm").optional(),
  semester: z.union([z.literal(1), z.literal(2)]).optional(),
  notes: z.string().optional(),
});

/** Schema JSON impor jadwal lengkap. */
export const scheduleImportSchema = z.object({
  $schema: z.literal(SCHEDULE_IMPORT_SCHEMA),
  academicYearLabel: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, "academicYearLabel wajib format YYYY/YYYY"),
  teacherName: z.string().optional(),
  source: z.string().optional(),
  entries: z.array(scheduleImportEntrySchema).min(1, "Minimal 1 entri jadwal wajib diisi"),
});

export type ScheduleImport = z.infer<typeof scheduleImportSchema>;
export type ScheduleImportEntry = z.infer<typeof scheduleImportEntrySchema>;

/** Hasil validasi impor jadwal. */
export type ScheduleImportValidation =
  | { success: true; data: ScheduleImport }
  | { success: false; errors: string[] };

/**
 * Validasi JSON impor jadwal.
 */
export function validateScheduleImport(input: unknown): ScheduleImportValidation {
  const result = scheduleImportSchema.safeParse(input);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    });
    return { success: false, errors };
  }

  // Validasi logic: startTime < endTime bila keduanya ada
  const data = result.data;
  const logicErrors: string[] = [];

  data.entries.forEach((entry, idx) => {
    if (entry.startTime && entry.endTime && entry.startTime >= entry.endTime) {
      logicErrors.push(
        `entries[${idx}]: startTime (${entry.startTime}) wajib < endTime (${entry.endTime})`
      );
    }
  });

  if (logicErrors.length > 0) {
    return { success: false, errors: logicErrors };
  }

  return { success: true, data };
}

/**
 * Konversi ScheduleImport menjadi TeachingSchedule[] (siap simpan ke Dexie).
 * Caller wajib assign id, academicYearId, teacherId, createdAt, updatedAt, syncStatus.
 *
 * Catatan: bila entry tidak punya startTime/endTime, akan diisi dari DEFAULT_PERIOD_TIMES
 * di app layer (bukan di domain, agar domain tetap pure).
 */
export function scheduleImportToSchedules(
  imp: ScheduleImport,
  fallbackStartTime: (period: number, durationJP: number) => { startTime: string; endTime: string }
): Array<Omit<
  import("./teaching-schedule").TeachingSchedule,
  "id" | "academicYearId" | "teacherId" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus"
>> {
  return imp.entries.map((e) => {
    const times = e.startTime && e.endTime
      ? { startTime: e.startTime, endTime: e.endTime }
      : fallbackStartTime(e.startPeriod, e.durationJP);
    return {
      subject: e.subject,
      classId: e.classId,
      classLabel: e.classLabel,
      dayOfWeek: e.dayOfWeek,
      startPeriod: e.startPeriod,
      durationJP: e.durationJP,
      startTime: times.startTime,
      endTime: times.endTime,
      semester: e.semester ?? 1, // default semester 1 bila tidak dispesifikasi
      source: "smart_roster_import" as const,
      notes: e.notes,
    };
  });
}
