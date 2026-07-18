/**
 * Apps Script Bridge — schema untuk data export dari Apps Script.
 *
 * APPS-SCRIPT-BRIDGE-RC1: jembatan satu arah Apps Script → App Generator.
 * Apps Script = input harian guru (stable, tidak dirombak).
 * App Generator = membaca hasil export untuk menghasilkan dokumen administrasi.
 *
 * Format JSON dari Apps Script:
 *   {
 *     "source": "apps_script",
 *     "exportedAt": "2025-07-14T...",
 *     "schoolName": "...",
 *     "academicYearLabel": "2025/2026",
 *     "semester": 1,
 *     "students": [...],
 *     "gurus": [...],
 *     "absensi": [...],
 *     "jurnal": [...],
 *     "nilai": [...]
 *   }
 *
 * Import bersifat idempotent via externalSource + externalId:
 *   - externalSource = "apps_script"
 *   - externalId = ID dari Apps Script (unik per entitas)
 *   - Import ulang file yang sama → update existing, tidak buat dobel.
 */

import { z } from "zod";

/** Schema identifier untuk impor Apps Script. */
export const APPS_SCRIPT_IMPORT_SCHEMA = "guru-admin-flow/apps-script/v1";

/** Source identifier untuk idempotency tracking. */
export const APPS_SCRIPT_EXTERNAL_SOURCE = "apps_script";

/** Student entry dari Apps Script. */
export const appsScriptStudentSchema = z.object({
  id: z.string().min(1), // externalId dari Apps Script
  name: z.string().min(1),
  number: z.number().int().positive().optional(),
  nis: z.string().optional(),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
});
export type AppsScriptStudent = z.infer<typeof appsScriptStudentSchema>;

/** Guru/mapel/kelas entry dari Apps Script → mapping ke TeachingAssignment. */
export const appsScriptGuruSchema = z.object({
  id: z.string().min(1), // externalId
  teacherName: z.string().min(1),
  teacherNip: z.string().optional(),
  subject: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  academicYearLabel: z.string().min(1),
});
export type AppsScriptGuru = z.infer<typeof appsScriptGuruSchema>;

/** Absensi entry dari Apps Script → mapping ke LessonSession + AttendanceRecord. */
export const appsScriptAbsensiSchema = z.object({
  id: z.string().min(1), // externalId
  date: z.string(), // ISO date
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  teacherName: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  academicYearLabel: z.string().min(1),
  startPeriod: z.number().int().positive().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  /** Daftar kehadiran: studentId (Apps Script) → status. */
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      studentName: z.string().min(1),
      studentNumber: z.number().int().positive().optional(),
      nis: z.string().optional(),
      status: z.enum(["present", "sick", "excused", "absent", "late"]),
      note: z.string().optional(),
    })
  ),
});
export type AppsScriptAbsensi = z.infer<typeof appsScriptAbsensiSchema>;

/** Jurnal entry dari Apps Script → mapping ke LessonSession + TeachingJournal. */
export const appsScriptJurnalSchema = z.object({
  id: z.string().min(1), // externalId
  date: z.string(),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  teacherName: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  academicYearLabel: z.string().min(1),
  startPeriod: z.number().int().positive().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  materialTitle: z.string().optional(),
  realizationStatus: z.enum(["done", "continued", "cancelled"]).default("done"),
  note: z.string().optional(),
  followUp: z.string().optional(),
  /** Ringkasan kehadiran (bisa dari absensi Apps Script). */
  presentCount: z.number().int().nonnegative().optional(),
  sickCount: z.number().int().nonnegative().optional(),
  excusedCount: z.number().int().nonnegative().optional(),
  absentCount: z.number().int().nonnegative().optional(),
  totalStudents: z.number().int().nonnegative().optional(),
});
export type AppsScriptJurnal = z.infer<typeof appsScriptJurnalSchema>;

/** Nilai entry dari Apps Script → mapping ke GradeBook. */
export const appsScriptNilaiSchema = z.object({
  id: z.string().min(1), // externalId
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  teacherName: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  academicYearLabel: z.string().min(1),
  kktp: z.number().int().min(0).max(100).default(75),
  entries: z.array(
    z.object({
      studentId: z.string().min(1),
      studentName: z.string().min(1),
      studentNumber: z.number().int().positive().optional(),
      nis: z.string().optional(),
      dailyScore: z.number().min(0).max(100).nullable().optional(),
      summativeScore: z.number().min(0).max(100).nullable().optional(),
      finalScore: z.number().min(0).max(100).nullable().optional(),
    })
  ),
});
export type AppsScriptNilai = z.infer<typeof appsScriptNilaiSchema>;

/** Root schema untuk file export Apps Script. */
export const appsScriptImportSchema = z.object({
  $schema: z.string().optional(),
  source: z.literal("apps_script"),
  exportedAt: z.string(),
  schoolName: z.string().optional(),
  academicYearLabel: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  students: z.array(appsScriptStudentSchema).default([]),
  gurus: z.array(appsScriptGuruSchema).default([]),
  absensi: z.array(appsScriptAbsensiSchema).default([]),
  jurnal: z.array(appsScriptJurnalSchema).default([]),
  nilai: z.array(appsScriptNilaiSchema).default([]),
});
export type AppsScriptImport = z.infer<typeof appsScriptImportSchema>;

/** Hasil validasi import. */
export type AppsScriptImportValidation = {
  success: boolean;
  data?: AppsScriptImport;
  errors: string[];
  warnings: string[];
};

/** Hasil preview import (sebelum simpan). */
export type AppsScriptImportPreview = {
  valid: boolean;
  counts: {
    students: number;
    gurus: number;
    absensi: number;
    jurnal: number;
    nilai: number;
  };
  /** APPS-SCRIPT-IMPORT-ADAPTER-01: daftar kelas+mapel unik dari data import. */
  uniqueClasses: Array<{ classId: string; classLabel: string; subject: string; teacherName: string }>;
  /** Daftar duplikat terdeteksi (id yang sama muncul lebih dari sekali). */
  duplicateIds: string[];
  /** Daftar data tanpa classId/subject (akan di-skip saat import). */
  missingClassData: Array<{ type: string; id: string; reason: string }>;
  errors: string[];
  warnings: string[];
};

/**
 * Validasi file JSON dari Apps Script.
 * Pure function. Tidak side effect.
 */
export function validateAppsScriptImport(input: unknown): AppsScriptImportValidation {
  const result = appsScriptImportSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      ),
      warnings: [],
    };
  }

  const data = result.data;
  const warnings: string[] = [];

  // Warning: tidak ada data sama sekali
  if (
    data.students.length === 0 &&
    data.gurus.length === 0 &&
    data.absensi.length === 0 &&
    data.jurnal.length === 0 &&
    data.nilai.length === 0
  ) {
    warnings.push("File tidak berisi data apapun (students, gurus, absensi, jurnal, nilai semua kosong).");
  }

  // Warning: academicYearLabel tidak format YYYY/YYYY
  if (!/^\d{4}\/\d{4}$/.test(data.academicYearLabel)) {
    warnings.push(`academicYearLabel "${data.academicYearLabel}" tidak sesuai format YYYY/YYYY (contoh: 2025/2026).`);
  }

  return { success: true, data, errors: [], warnings };
}

/**
 * Generate preview ringkasan dari data yang sudah divalidasi.
 * Pure function.
 *
 * APPS-SCRIPT-IMPORT-ADAPTER-01: enhanced dengan:
 * - uniqueClasses: daftar kelas+mapel unik (supaya guru tahu apa yang akan masuk)
 * - duplicateIds: deteksi ID duplikat di students/gurus
 * - missingClassData: data tanpa classId/subject (akan di-skip)
 */
export function previewAppsScriptImport(data: AppsScriptImport): AppsScriptImportPreview {
  const warnings: string[] = [];

  // Deteksi kelas+mapel unik dari gurus (assignment)
  const classMap = new Map<string, { classId: string; classLabel: string; subject: string; teacherName: string }>();
  for (const g of data.gurus) {
    const key = `${g.classId}|${g.subject}`;
    if (!classMap.has(key)) {
      classMap.set(key, {
        classId: g.classId,
        classLabel: g.classLabel,
        subject: g.subject,
        teacherName: g.teacherName,
      });
    }
  }
  const uniqueClasses = Array.from(classMap.values());

  // Deteksi duplikat ID di students
  const studentIds = new Map<string, number>();
  for (const s of data.students) {
    studentIds.set(s.id, (studentIds.get(s.id) ?? 0) + 1);
  }
  const duplicateIds = Array.from(studentIds.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  if (duplicateIds.length > 0) {
    warnings.push(`${duplicateIds.length} ID siswa duplikat ditemukan. Hanya entry pertama yang akan dipakai.`);
  }

  // Deteksi data tanpa classId/subject (absensi/jurnal/nilai)
  const missingClassData: Array<{ type: string; id: string; reason: string }> = [];
  for (const a of data.absensi) {
    if (!a.classId || !a.subject) {
      missingClassData.push({ type: "absensi", id: a.id ?? "?", reason: "classId atau subject kosong" });
    }
  }
  for (const j of data.jurnal) {
    if (!j.classId || !j.subject) {
      missingClassData.push({ type: "jurnal", id: j.id ?? "?", reason: "classId atau subject kosong" });
    }
  }
  for (const n of data.nilai) {
    if (!n.classId || !n.subject) {
      missingClassData.push({ type: "nilai", id: n.id ?? "?", reason: "classId atau subject kosong" });
    }
  }

  if (missingClassData.length > 0) {
    warnings.push(`${missingClassData.length} data tanpa classId/subject akan di-skip saat import.`);
  }

  // Warning bila kelas+mapel dari absensi/jurnal/nilai tidak ada di gurus
  const guruClassKeys = new Set(uniqueClasses.map((c) => `${c.classId}|${c.subject}`));
  for (const a of data.absensi) {
    if (a.classId && a.subject && !guruClassKeys.has(`${a.classId}|${a.subject}`)) {
      warnings.push(`Absensi untuk ${a.classId} · ${a.subject} tidak punya Data Kelas dan Mapel di file ini. Akan dibuat baru saat import.`);
      break; // satu warning cukup
    }
  }

  return {
    valid: true,
    counts: {
      students: data.students.length,
      gurus: data.gurus.length,
      absensi: data.absensi.length,
      jurnal: data.jurnal.length,
      nilai: data.nilai.length,
    },
    uniqueClasses,
    duplicateIds,
    missingClassData,
    errors: [],
    warnings,
  };
}
