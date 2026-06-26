/**
 * PIKET-HARIAN-MOBILE-01: Domain types untuk modul Piket Harian.
 *
 * Modul terisolasi dari app utama. Tidak menulis ke attendanceRecords.
 * Hanya membaca attendanceRecords untuk rekap kehadiran (read-only).
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export const dutyRecordCategorySchema = z.enum([
  "attendance", "discipline", "health", "permission", "other",
]);
export type DutyRecordCategory = z.infer<typeof dutyRecordCategorySchema>;

export const dutyRecordTypeSchema = z.enum([
  "late", "absent_without_notice", "early_leave", "sick_uks",
  "incomplete_uniform", "class_disruption", "skipping_class",
  "fight", "rude_behavior", "other",
]);
export type DutyRecordType = z.infer<typeof dutyRecordTypeSchema>;

/* ------------------------------------------------------------------ */
/*  DutyRule                                                           */
/* ------------------------------------------------------------------ */

export const dutyRuleSchema = baseEntitySchema.extend({
  category: dutyRecordCategorySchema,
  type: dutyRecordTypeSchema,
  label: z.string().min(1),
  points: z.number().int().nonnegative(),
  active: z.boolean().default(true),
});
export type DutyRule = z.infer<typeof dutyRuleSchema>;

/* ------------------------------------------------------------------ */
/*  DutyReport                                                         */
/* ------------------------------------------------------------------ */

export const dutyReportSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  date: z.string().min(1), // YYYY-MM-DD
  dutyTeacherId: z.string().min(1),
  dutyTeacherName: z.string().min(1),
  note: z.string().optional(),
  finalized: z.boolean().default(false),
  finalizedAt: z.string().nullable().optional(),
});
export type DutyReport = z.infer<typeof dutyReportSchema>;

/* ------------------------------------------------------------------ */
/*  DutyRecord                                                         */
/* ------------------------------------------------------------------ */

export const dutyRecordSchema = baseEntitySchema.extend({
  dutyReportId: z.string().min(1),
  academicYearId: z.string().min(1),
  date: z.string().min(1), // YYYY-MM-DD
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentNumber: z.number().int().positive().optional(),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  category: dutyRecordCategorySchema,
  type: dutyRecordTypeSchema,
  ruleId: z.string().nullable().optional(),
  ruleLabel: z.string().min(1),
  /** PIKET-HARIAN-MOBILE-01A: sumber catatan. "manual" = guru piket input. "attendance" = sinkron dari absen. */
  source: z.enum(["manual", "attendance"]).default("manual"),
  /** PIKET-HARIAN-MOBILE-01A: tipe link ke absen. "absent_auto" = alpa dari absen utama. */
  attendanceLinkType: z.enum(["absent_auto"]).nullable().optional(),
  points: z.number().int().nonnegative(),
  note: z.string().optional(),
  followUp: z.string().optional(),
  recordedByTeacherId: z.string().min(1),
  recordedByTeacherName: z.string().min(1),
});
export type DutyRecord = z.infer<typeof dutyRecordSchema>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export type DutySummary = {
  totalRecords: number;
  totalPoints: number;
  byCategory: Record<DutyRecordCategory, number>;
};

export function summarizeDutyRecords(records: DutyRecord[]): DutySummary {
  const byCategory: Record<DutyRecordCategory, number> = {
    attendance: 0, discipline: 0, health: 0, permission: 0, other: 0,
  };
  let totalPoints = 0;
  for (const r of records) {
    byCategory[r.category]++;
    totalPoints += r.points;
  }
  return { totalRecords: records.length, totalPoints, byCategory };
}

export function getStudentDutyStatus(totalPoints: number): string {
  if (totalPoints <= 24) return "Aman";
  if (totalPoints <= 49) return "Perlu pembinaan ringan";
  if (totalPoints <= 74) return "Perlu perhatian wali kelas";
  if (totalPoints <= 99) return "Panggilan orang tua";
  return "Tindak lanjut kesiswaan/BK";
}

/* ------------------------------------------------------------------ */
/*  Default Rules                                                      */
/* ------------------------------------------------------------------ */

export const DEFAULT_DUTY_RULES: Array<Omit<DutyRule, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">> = [
  { category: "attendance", type: "late", label: "Terlambat", points: 5, active: true },
  { category: "attendance", type: "absent_without_notice", label: "Alpa / tidak masuk tanpa keterangan", points: 10, active: true },
  { category: "permission", type: "early_leave", label: "Izin pulang", points: 0, active: true },
  { category: "health", type: "sick_uks", label: "Sakit / UKS", points: 0, active: true },
  { category: "discipline", type: "incomplete_uniform", label: "Atribut tidak lengkap", points: 10, active: true },
  { category: "discipline", type: "class_disruption", label: "Ribut / mengganggu pembelajaran", points: 10, active: true },
  { category: "discipline", type: "skipping_class", label: "Bolos / keluar kelas tanpa izin", points: 20, active: true },
  { category: "discipline", type: "fight", label: "Berkelahi", points: 25, active: true },
  { category: "discipline", type: "rude_behavior", label: "Berkata tidak sopan", points: 15, active: true },
  { category: "other", type: "other", label: "Lainnya", points: 0, active: true },
];

/* ------------------------------------------------------------------ */
/*  Attendance Summary (read-only)                                     */
/* ------------------------------------------------------------------ */

export interface ClassAttendanceSummary {
  classId: string;
  classLabel: string;
  present: number;
  sick: number;
  excused: number;
  absent: number;
  total: number;
  source: "attendance" | "empty";
}

/**
 * PIKET-REPORT-APPSCRIPT-PARITY-02A: Detail rekap kehadiran per kelas.
 * Sama seperti ClassAttendanceSummary + nama siswa S/I/A.
 * Nama siswa Hadir TIDAK disertakan.
 */
export interface ClassAttendanceDetail {
  classId: string;
  classLabel: string;
  present: number;
  sick: number;
  excused: number;
  absent: number;
  total: number;
  source: "attendance" | "empty";
  sickStudents: string[];
  excusedStudents: string[];
  absentStudents: string[];
}

/** Helper: format daftar siswa S/I/A untuk cetak (contoh: "Ahmad (Sakit), Budi (Alpa)") */
export function formatSIADetail(detail: ClassAttendanceDetail): string {
  const parts: string[] = [];
  for (const name of detail.sickStudents) parts.push(`${name} (Sakit)`);
  for (const name of detail.excusedStudents) parts.push(`${name} (Izin)`);
  for (const name of detail.absentStudents) parts.push(`${name} (Alpa)`);
  return parts.length > 0 ? parts.join(", ") : "—";
}
