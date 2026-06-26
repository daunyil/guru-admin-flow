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

/* ------------------------------------------------------------------ */
/*  PIKET-QUICK-INPUT-LIST-02B: Smart Search Helpers                   */
/* ------------------------------------------------------------------ */

/**
 * Normalisasi teks untuk pencarian cerdas.
 * - lowercase
 * - NFD normalization (pisahkan huruf dari diakritik)
 * - hapus diakritik (é → e, ñ → n, dll)
 * - collapse whitespace
 * - trim
 */
export function normalizeSearchText(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Smart match: query dianggap cocok bila SETIAP kata query muncul di target.
 * - Case-insensitive (via normalizeSearchText)
 * - Bisa penggalan nama
 * - Bisa nama tengah/belakang
 * - Bisa beberapa kata (semua kata harus ada)
 * - Query kosong → match semua (true)
 */
export function matchSmartSearch(query: string, target: string): boolean {
  const q = normalizeSearchText(query);
  const t = normalizeSearchText(target);
  if (!q) return true;
  return q.split(" ").every((part) => t.includes(part));
}

/* ------------------------------------------------------------------ */
/*  PIKET-QUICK-INPUT-LIST-02B: Duty Rule Smart Search                 */
/* ------------------------------------------------------------------ */

/**
 * Keyword sinonim per DutyRecordType untuk pencarian pelanggaran.
 * Hanya untuk UI search — TIDAK mengubah schema database.
 */
export const DUTY_RULE_SEARCH_KEYWORDS: Record<DutyRecordType, string[]> = {
  late: ["terlambat", "telat", "datang lambat", "lambat"],
  absent_without_notice: ["alpa", "absen", "tidak hadir", "tidak masuk", "tanpa keterangan"],
  early_leave: ["izin pulang", "pulang cepat", "keluar sekolah"],
  sick_uks: ["sakit", "uks", "kurang sehat"],
  incomplete_uniform: ["seragam", "atribut", "baju", "topi", "dasi", "sepatu"],
  class_disruption: ["ribut", "gaduh", "mengganggu", "berisik"],
  skipping_class: ["bolos", "keluar kelas", "kabur", "tidak ikut pelajaran"],
  fight: ["berkelahi", "kelahi", "berantem", "pukul"],
  rude_behavior: ["tidak sopan", "kasar", "melawan", "berkata kasar"],
  other: ["lainnya", "catatan khusus"],
};

/**
 * Bangun target pencarian untuk DutyRule: gabungan label + category + type + points + keywords.
 */
export function makeRuleSearchTarget(rule: DutyRule): string {
  const keywords = DUTY_RULE_SEARCH_KEYWORDS[rule.type] ?? [];
  return [
    rule.label,
    rule.category,
    rule.type,
    String(rule.points),
    ...keywords,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Filter daftar DutyRule berdasarkan query smart search.
 * Bila query kosong, kembalikan semua rule.
 */
export function searchDutyRules(rules: DutyRule[], query: string): DutyRule[] {
  if (!query.trim()) return rules;
  return rules.filter((rule) => matchSmartSearch(query, makeRuleSearchTarget(rule)));
}

/* ------------------------------------------------------------------ */
/*  PIKET-QUICK-INPUT-LIST-02B: Student Smart Search                   */
/* ------------------------------------------------------------------ */

/**
 * Tipe siswa yang dapat dicari. Hanya berisi field yang relevan untuk pencarian.
 * Saat siswa dipilih, classId/classLabel mengikuti data siswa/roster.
 */
export interface StudentSearchable {
  id: string;
  name: string;
  number?: number;
  nis?: string;
  nisn?: string;
  classId: string;
  classLabel: string;
}

/**
 * Bangun target pencarian untuk siswa: gabungan name + number + nis + nisn + classLabel.
 */
export function makeStudentSearchTarget(student: StudentSearchable): string {
  return [
    student.name,
    student.number != null ? String(student.number) : "",
    student.nis ?? "",
    student.nisn ?? "",
    student.classLabel,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Filter daftar siswa berdasarkan query smart search.
 * Bila query kosong, kembalikan semua siswa.
 */
export function searchStudents<T extends StudentSearchable>(students: T[], query: string): T[] {
  if (!query.trim()) return students;
  return students.filter((s) => matchSmartSearch(query, makeStudentSearchTarget(s)));
}

/* ------------------------------------------------------------------ */
/*  PIKET-QUICK-INPUT-LIST-02B: Validation Helpers                     */
/* ------------------------------------------------------------------ */

/**
 * Validasi input catatan Piket sebelum simpan.
 * Return: { ok: true } atau { ok: false, message }.
 */
export function validateDutyRecordInput(args: {
  selectedStudent: StudentSearchable | null | undefined;
  selectedRule: DutyRule | null | undefined;
  note: string;
}): { ok: true } | { ok: false; message: string } {
  if (!args.selectedStudent) {
    return { ok: false, message: "Pilih siswa terlebih dahulu." };
  }
  if (!args.selectedRule) {
    return { ok: false, message: "Pilih pelanggaran terlebih dahulu." };
  }
  if (args.selectedRule.type === "other" && !args.note.trim()) {
    return { ok: false, message: "Catatan wajib untuk jenis Lainnya." };
  }
  return { ok: true };
}
