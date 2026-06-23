/**
 * GradeBook — Nilai per kelas dengan KD1-KD6, PTS, PAS.
 *
 * V2 (GRADEBOOK-V2-KD-IMPORT-RC1):
 *   - Field nilai: KD1, KD2, KD3, KD4, KD5, KD6, PTS, PAS, Nilai Akhir.
 *   - KD = nilai per bab (KD1 = Bab 1, dst).
 *   - Nilai Akhir dihitung dari rata-rata KD + PTS + PAS (bobot configurable).
 *   - Field lama (dailyScore, assignmentScore, summativeScore) tetap ada
 *     untuk backward compat, tapi UI V2 pakai KD1-KD6.
 */

import { z } from "zod";
import { GRADE_ENTRY_STATUSES } from "@guru-admin/shared";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const gradeEntryStatusSchema = z.enum(GRADE_ENTRY_STATUSES);

const scoreSchema = z.number().min(0).max(100).nullable().optional();

export const gradeEntrySchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentNumber: z.number().int().positive().optional(),
  /** V2: Nilai per KD (bab). KD1 = Bab 1, dst. */
  kd1: scoreSchema,
  kd2: scoreSchema,
  kd3: scoreSchema,
  kd4: scoreSchema,
  kd5: scoreSchema,
  kd6: scoreSchema,
  /** V2: Penilaian Tengah Semester. */
  pts: scoreSchema,
  /** V2: Penilaian Akhir Semester. */
  pas: scoreSchema,
  /** V2: Nilai Akhir (dihitung dari KD + PTS + PAS). */
  finalScore: scoreSchema,
  /** V2: Rata-rata KD. */
  averageKd: scoreSchema,
  /** Legacy fields (backward compat, tidak dipakai di UI V2). */
  dailyScore: scoreSchema,
  assignmentScore: scoreSchema,
  summativeScore: scoreSchema,
  remedialScore: scoreSchema,
  averageScore: scoreSchema,
  status: gradeEntryStatusSchema,
  note: z.string().optional(),
});

export const gradeBookSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  passingScore: z.number().min(0).max(100),
  entries: z.array(gradeEntrySchema),
  status: documentStatusSchema,
});

export type GradeEntryStatus = z.infer<typeof gradeEntryStatusSchema>;
export type GradeEntry = z.infer<typeof gradeEntrySchema>;
export type GradeBook = z.infer<typeof gradeBookSchema>;

export type GradeBookSummary = {
  totalStudents: number;
  completeCount: number;
  remedialCount: number;
  incompleteCount: number;
  classAverage: number | null;
};

function normalizeScore(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

/**
 * Hitung Nilai Akhir.
 *
 * Strategi:
 *   1. Jika ada KD/PTS/PAS → pakai rumus V2 (avg KD 40% + PTS 25% + PAS 35%).
 *   2. Jika tidak ada KD/PTS/PAS tapi ada finalScore lama → gunakan finalScore lama.
 *   3. Jika tidak ada finalScore lama tapi ada daily/summative/assignment → pakai rata-rata legacy.
 *   4. Jika semua kosong → incomplete.
 */
export function calculateGradeEntry(
  entry: GradeEntry,
  passingScore: number
): GradeEntry {
  // Normalize V2 scores
  const kd1 = normalizeScore(entry.kd1);
  const kd2 = normalizeScore(entry.kd2);
  const kd3 = normalizeScore(entry.kd3);
  const kd4 = normalizeScore(entry.kd4);
  const kd5 = normalizeScore(entry.kd5);
  const kd6 = normalizeScore(entry.kd6);
  const pts = normalizeScore(entry.pts);
  const pas = normalizeScore(entry.pas);

  // Normalize legacy scores
  const dailyScore = normalizeScore(entry.dailyScore);
  const assignmentScore = normalizeScore(entry.assignmentScore);
  const summativeScore = normalizeScore(entry.summativeScore);
  const remedialScore = normalizeScore(entry.remedialScore);
  const legacyFinalScore = normalizeScore(entry.finalScore);

  // Hitung rata-rata KD
  const kdScores = [kd1, kd2, kd3, kd4, kd5, kd6].filter(
    (s): s is number => s !== null
  );
  const averageKd = kdScores.length > 0
    ? Math.round((kdScores.reduce((sum, s) => sum + s, 0) / kdScores.length) * 100) / 100
    : null;

  // Coba V2: KD + PTS + PAS
  const hasV2Data = averageKd !== null || pts !== null || pas !== null;

  if (hasV2Data) {
    // Bobot: KD avg 40%, PTS 25%, PAS 35%
    const components: Array<{ score: number | null; weight: number }> = [
      { score: averageKd, weight: 40 },
      { score: pts, weight: 25 },
      { score: pas, weight: 35 },
    ];
    const availableComponents = components.filter((c) => c.score !== null);
    const totalWeight = availableComponents.reduce((sum, c) => sum + c.weight, 0);
    const finalScore = Math.round(
      (availableComponents.reduce((sum, c) => sum + (c.score as number) * c.weight, 0) / totalWeight) * 100
    ) / 100;
    const status: GradeEntryStatus = finalScore >= passingScore ? "complete" : "remedial";

    return {
      ...entry,
      kd1, kd2, kd3, kd4, kd5, kd6,
      pts, pas,
      averageKd,
      finalScore,
      averageScore: averageKd,
      status,
    };
  }

  // Fallback 1: finalScore lama (dari Apps Script import)
  if (legacyFinalScore !== null) {
    const status: GradeEntryStatus = legacyFinalScore >= passingScore ? "complete" : "remedial";
    return {
      ...entry,
      kd1, kd2, kd3, kd4, kd5, kd6,
      pts, pas,
      averageKd: null,
      finalScore: legacyFinalScore,
      averageScore: null,
      status,
    };
  }

  // Fallback 2: rata-rata legacy (daily + assignment + summative)
  const legacyScores = [dailyScore, assignmentScore, summativeScore].filter(
    (s): s is number => s !== null
  );
  if (legacyScores.length > 0) {
    const legacyAvg = Math.round((legacyScores.reduce((sum, s) => sum + s, 0) / legacyScores.length) * 100) / 100;
    const finalScore = remedialScore !== null ? Math.max(legacyAvg, remedialScore) : legacyAvg;
    const status: GradeEntryStatus = finalScore >= passingScore ? "complete" : "remedial";
    return {
      ...entry,
      kd1, kd2, kd3, kd4, kd5, kd6,
      pts, pas,
      averageKd: null,
      finalScore,
      averageScore: legacyAvg,
      status,
    };
  }

  // Semua kosong → incomplete
  return {
    ...entry,
    kd1, kd2, kd3, kd4, kd5, kd6,
    pts, pas,
    averageKd: null,
    finalScore: null,
    averageScore: null,
    status: "incomplete",
  };
}

export function calculateGradeBookEntries(
  entries: GradeEntry[],
  passingScore: number
): GradeEntry[] {
  return entries.map((entry) => calculateGradeEntry(entry, passingScore));
}

export function summarizeGradeBook(gradeBook: GradeBook): GradeBookSummary {
  const entries = calculateGradeBookEntries(gradeBook.entries, gradeBook.passingScore);
  const finalScores = entries
    .map((entry) => entry.finalScore)
    .filter((score): score is number => typeof score === "number");

  return {
    totalStudents: entries.length,
    completeCount: entries.filter((entry) => entry.status === "complete").length,
    remedialCount: entries.filter((entry) => entry.status === "remedial").length,
    incompleteCount: entries.filter((entry) => entry.status === "incomplete").length,
    classAverage: finalScores.length > 0
      ? Math.round((finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length) * 100) / 100
      : null,
  };
}

export function parseGradeBook(input: unknown): GradeBook {
  return gradeBookSchema.parse(input);
}

export function safeParseGradeBook(input: unknown) {
  const result = gradeBookSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

/**
 * Parse paste Excel multi-kolom (KD1-KD6, PTS, PAS).
 * Format: satu siswa per baris, kolom dipisah tab/koma.
 * Kolom: No, Nama (opsional), KD1, KD2, KD3, KD4, KD5, KD6, PTS, PAS
 *
 * Return array of partial GradeEntry (studentId kosong, perlu match by roster).
 */
export function parseExcelPaste(
  text: string,
  roster: Array<{ id: string; name: string; number: number }>
): { matched: Array<{ rosterStudent: typeof roster[0]; scores: Partial<GradeEntry> }>; unmatched: string[] } {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const matched: Array<{ rosterStudent: typeof roster[0]; scores: Partial<GradeEntry> }> = [];
  const unmatched: string[] = [];

  // Cek apakah baris pertama adalah header
  const firstLine = lines[0]?.toLowerCase() ?? "";
  const hasHeader = firstLine.includes("kd1") || firstLine.includes("no") || firstLine.includes("nama");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (const line of dataLines) {
    const parts = line.split(/\t|,|;|\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    // Coba parse: No, Nama, KD1-KD6, PTS, PAS
    // Atau: Nama, KD1-KD6, PTS, PAS (tanpa No)
    let studentNumber: number | undefined;
    let studentName: string;
    let scoreStartIdx: number;

    const firstPart = parts[0];
    const firstNum = Number(firstPart);
    if (!isNaN(firstNum) && firstNum > 0 && firstNum < 100) {
      // Format: No, Nama, KD1...
      studentNumber = firstNum;
      studentName = parts[1];
      scoreStartIdx = 2;
    } else {
      // Format: Nama, KD1...
      studentName = firstPart;
      scoreStartIdx = 1;
    }

    // Match siswa by name atau number
    let rosterStudent = roster.find((s) =>
      s.name.toLowerCase().includes(studentName.toLowerCase()) ||
      studentName.toLowerCase().includes(s.name.toLowerCase())
    );
    if (!rosterStudent && studentNumber) {
      rosterStudent = roster.find((s) => s.number === studentNumber);
    }

    if (!rosterStudent) {
      unmatched.push(line);
      continue;
    }

    // Parse scores: KD1, KD2, KD3, KD4, KD5, KD6, PTS, PAS
    const scoreKeys: Array<keyof GradeEntry> = ["kd1", "kd2", "kd3", "kd4", "kd5", "kd6", "pts", "pas"];
    const scores: Partial<GradeEntry> = {};
    for (let i = 0; i < scoreKeys.length && (scoreStartIdx + i) < parts.length; i++) {
      const val = Number(parts[scoreStartIdx + i]);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        (scores as Record<string, unknown>)[scoreKeys[i]] = val;
      }
    }

    matched.push({ rosterStudent, scores });
  }

  return { matched, unmatched };
}
