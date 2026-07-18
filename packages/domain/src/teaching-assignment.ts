/**
 * TeachingAssignment — "Data Mengajar".
 *
 * Sumber: PATCH-FLOW-RC2C (senior audit recommendation)
 *
 * Filosofi: guru TIDAK memilih kelas+mapel secara terpisah. Guru memilih
 * satu paket "Data Mengajar" yang sudah ditetapkan di awal tahun pelajaran.
 * Satu assignment = 1 baris (guru, mapel, kelas, semester, tahun pelajaran).
 *
 * Setelah assignment dipilih, semua flow (Absensi, Jurnal, Nilai, Laporan)
 * otomatis terikat ke assignmentId — tidak bercampur antar guru/mapel/kelas.
 *
 * Key: (academicYearId, semester, teacherId, subject, classId) — unik.
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

export const teachingAssignmentSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1),
  subject: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  /** JP per minggu untuk assignment ini (intra). Default 2. */
  jpPerWeek: z.number().int().positive().optional(),
  /** Catatan opsional. */
  notes: z.string().optional(),
});

export type TeachingAssignment = z.infer<typeof teachingAssignmentSchema>;

export function parseTeachingAssignment(input: unknown): TeachingAssignment {
  return teachingAssignmentSchema.parse(input);
}

export function safeParseTeachingAssignment(input: unknown) {
  const result = teachingAssignmentSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

/**
 * Composite key untuk identifikasi unik assignment.
 * Dipakai untuk cek duplikat dan find-or-create.
 */
export function assignmentCompositeKey(args: {
  academicYearId: string;
  semester: 1 | 2;
  teacherId: string;
  subject: string;
  classId: string;
}): string {
  return [
    args.academicYearId,
    `S${args.semester}`,
    args.teacherId,
    args.subject,
    args.classId,
  ].join("|");
}

/**
 * Cek apakah dua assignment mewakili paket mengajar yang sama.
 */
export function isSameAssignmentContext(
  a: { academicYearId: string; semester: 1 | 2; teacherId: string; subject: string; classId: string },
  b: { academicYearId: string; semester: 1 | 2; teacherId: string; subject: string; classId: string }
): boolean {
  return (
    a.academicYearId === b.academicYearId &&
    a.semester === b.semester &&
    a.teacherId === b.teacherId &&
    a.subject === b.subject &&
    a.classId === b.classId
  );
}

/**
 * Label user-friendly untuk assignment.
 * Contoh: "VII A · Pendidikan Pancasila · Emi Ramdani"
 */
export function assignmentLabel(a: {
  classLabel: string;
  subject: string;
  teacherName: string;
}): string {
  return `${a.classLabel} · ${a.subject} · ${a.teacherName}`;
}

/**
 * Label singkat tanpa nama guru (untuk konteks single-teacher).
 * Contoh: "VII A · Pendidikan Pancasila"
 */
export function assignmentShortLabel(a: {
  classLabel: string;
  subject: string;
}): string {
  return `${a.classLabel} · ${a.subject}`;
}
