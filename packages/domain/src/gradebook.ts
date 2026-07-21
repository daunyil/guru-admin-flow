/**
 * GradeBook — Nilai per kelas.
 *
 * V2 (GRADEBOOK-V2-KD-IMPORT-RC1):
 *   - Field nilai: KD1, KD2, KD3, KD4, KD5, KD6, PTS, PAS, Nilai Akhir.
 *   - KD = nilai per bab (KD1 = Bab 1, dst).
 *   - Nilai Akhir dihitung dari rata-rata KD + PTS + PAS (bobot configurable).
 *   - Field lama (dailyScore, assignmentScore, summativeScore) tetap ada
 *     untuk backward compat, tapi UI V2 pakai KD1-KD6.
 *
 * V3 (GRADEBOOK-V3-UH-UTS-UAS):
 *   - gradeModel: "kd" | "uh" — model penilaian.
 *   - Model UH: kd1-uhCount dipakai sebagai UH1-UHn,
 *     pts → UTS, pas → UAS.
 *   - Bobot configurable: weightUH, weightUTS, weightUAS.
 *   - Rumus: avg(UH) × weightUH% + UTS × weightUTS% + UAS × weightUAS%.
 *   - uhCount: jumlah kolom UH yang ditampilkan (2-6, default 2).
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
  /** V3: Model penilaian — "uh" (Ulangan Harian) atau "kd" (Kompetensi Dasar). Default "uh". */
  gradeModel: z.enum(["uh", "kd"]).default("uh"),
  /** V3: Jumlah kolom UH yang ditampilkan (2-6). Default 2. Hanya relevan jika gradeModel="uh". */
  uhCount: z.number().int().min(2).max(6).default(2),
  /** V3: Bobot UH (0-100). Default 25. Hanya relevan jika gradeModel="uh". */
  weightUH: z.number().min(0).max(100).default(25),
  /** V3: Bobot UTS (0-100). Default 25. */
  weightUTS: z.number().min(0).max(100).default(25),
  /** V3: Bobot UAS (0-100). Default 50. */
  weightUAS: z.number().min(0).max(100).default(50),
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
 * V3: Mendukung dua model:
 *   - gradeModel="kd": rumus V2 (avg KD 40% + PTS 25% + PAS 35%).
 *   - gradeModel="uh": rumus V3 (avg UH × weightUH% + UTS × weightUTS% + UAS × weightUAS%).
 *
 * Strategi fallback:
 *   1. Jika ada komponen sesuai model → pakai rumus model.
 *   2. Jika tidak ada komponen model tapi ada finalScore lama → gunakan finalScore lama.
 *   3. Jika tidak ada finalScore lama tapi ada daily/summative/assignment → pakai rata-rata legacy.
 *   4. Jika semua kosong → incomplete.
 */
export function calculateGradeEntry(
  entry: GradeEntry,
  passingScore: number,
  options?: { gradeModel?: "kd" | "uh"; uhCount?: number; weightUH?: number; weightUTS?: number; weightUAS?: number }
): GradeEntry {
  const gradeModel = options?.gradeModel ?? "uh";
  const uhCount = options?.uhCount ?? 2;

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

  // Hitung rata-rata KD (semua 6 kolom)
  const allKdScores = [kd1, kd2, kd3, kd4, kd5, kd6].filter(
    (s): s is number => s !== null
  );
  const averageKd = allKdScores.length > 0
    ? Math.round((allKdScores.reduce((sum, s) => sum + s, 0) / allKdScores.length) * 100) / 100
    : null;

  // Hitung rata-rata UH (hanya uhCount kolom pertama)
  const uhScores = [kd1, kd2, kd3, kd4, kd5, kd6].slice(0, uhCount).filter(
    (s): s is number => s !== null
  );
  const averageUh = uhScores.length > 0
    ? Math.round((uhScores.reduce((sum, s) => sum + s, 0) / uhScores.length) * 100) / 100
    : null;

  // Model UH: avg UH × weightUH% + UTS(pts) × weightUTS% + UAS(pas) × weightUAS%
  if (gradeModel === "uh") {
    const weightUH = options?.weightUH ?? 25;
    const weightUTS = options?.weightUTS ?? 25;
    const weightUAS = options?.weightUAS ?? 50;
    const hasUHData = averageUh !== null || pts !== null || pas !== null;

    if (hasUHData) {
      const components: Array<{ score: number | null; weight: number }> = [
        { score: averageUh, weight: weightUH },
        { score: pts, weight: weightUTS },
        { score: pas, weight: weightUAS },
      ];
      const availableComponents = components.filter((c) => c.score !== null);
      const totalWeight = availableComponents.reduce((sum, c) => sum + c.weight, 0);
      const finalScore = totalWeight > 0
        ? Math.round(
            (availableComponents.reduce((sum, c) => sum + (c.score as number) * c.weight, 0) / totalWeight) * 100
          ) / 100
        : null;
      const status: GradeEntryStatus = finalScore !== null
        ? (finalScore >= passingScore ? "complete" : "remedial")
        : "incomplete";

      return {
        ...entry,
        kd1, kd2, kd3, kd4, kd5, kd6,
        pts, pas,
        averageKd,
        finalScore,
        averageScore: averageUh,
        remedialScore,
        status,
      };
    }
  } else {
    // Model KD: avg KD 40% + PTS 25% + PAS 35% (V2 original)
    const hasV2Data = averageKd !== null || pts !== null || pas !== null;

    if (hasV2Data) {
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
  passingScore: number,
  options?: { gradeModel?: "kd" | "uh"; uhCount?: number; weightUH?: number; weightUTS?: number; weightUAS?: number }
): GradeEntry[] {
  return entries.map((entry) => calculateGradeEntry(entry, passingScore, options));
}

export function summarizeGradeBook(gradeBook: GradeBook): GradeBookSummary {
  const options = {
    gradeModel: gradeBook.gradeModel ?? "uh",
    uhCount: gradeBook.uhCount ?? 2,
    weightUH: gradeBook.weightUH ?? 25,
    weightUTS: gradeBook.weightUTS ?? 25,
    weightUAS: gradeBook.weightUAS ?? 50,
  };
  const entries = calculateGradeBookEntries(gradeBook.entries, gradeBook.passingScore, options);
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

/* ------------------------------------------------------------------ */
/*  CBT JSON Import                                                    */
/* ------------------------------------------------------------------ */

/** Target kolom untuk import CBT. */
export type CbtImportTarget = "kd1" | "kd2" | "kd3" | "kd4" | "kd5" | "kd6" | "pts" | "pas";

/** Label untuk target CBT sesuai model penilaian. */
export function getCbtTargetLabels(gradeModel: "kd" | "uh", uhCount: number): Array<{ value: CbtImportTarget; label: string }> {
  if (gradeModel === "uh") {
    const uhLabels: Array<{ value: CbtImportTarget; label: string }> = [];
    for (let i = 1; i <= Math.min(uhCount, 6); i++) {
      uhLabels.push({ value: `kd${i}` as CbtImportTarget, label: `UH${i}` });
    }
    uhLabels.push({ value: "pts", label: "UTS" });
    uhLabels.push({ value: "pas", label: "UAS" });
    return uhLabels;
  }
  return [
    { value: "kd1", label: "KD1" }, { value: "kd2", label: "KD2" },
    { value: "kd3", label: "KD3" }, { value: "kd4", label: "KD4" },
    { value: "kd5", label: "KD5" }, { value: "kd6", label: "KD6" },
    { value: "pts", label: "PTS" }, { value: "pas", label: "PAS" },
  ];
}

/** Format JSON CBT yang diterima. */
export const cbtImportSchema = z.object({
  source: z.literal("cbt").optional(),
  assessmentName: z.string().optional(),
  students: z.array(
    z.object({
      nis: z.string().optional(),
      name: z.string().min(1),
      number: z.number().int().positive().optional(),
      score: z.number().min(0).max(100),
    })
  ),
});
export type CbtImport = z.infer<typeof cbtImportSchema>;

/** Hasil validasi CBT import. */
export type CbtImportValidation = {
  success: boolean;
  data?: CbtImport;
  errors: string[];
};

/** Hasil preview match CBT ke roster. */
export type CbtMatchPreview = {
  matched: Array<{
    rosterStudent: { id: string; name: string; number: number; nis?: string };
    cbtStudent: { nis?: string; name: string; number?: number; score: number };
    matchBy: "nis" | "name" | "number";
  }>;
  unmatched: Array<{ nis?: string; name: string; number?: number; score: number }>;
  /** PATCH-1: siswa roster yang tidak ditemukan di data CBT. */
  missingRoster: Array<{ id: string; name: string; number: number; nis?: string }>;
  summary: {
    totalCbt: number;
    totalRoster: number;
    matched: number;
    unmatchedCbt: number;
    missingRoster: number;
  };
};

/** Validasi JSON CBT. */
export function validateCbtImport(input: unknown): CbtImportValidation {
  const result = cbtImportSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  if (result.data.students.length === 0) {
    return { success: false, errors: ["Tidak ada data siswa di JSON CBT."] };
  }
  return { success: true, data: result.data, errors: [] };
}

/**
 * Preview match siswa CBT ke roster.
 * Prioritas match: NIS > exact name > number.
 *
 * PATCH-1: juga track siswa roster yang tidak ditemukan di CBT (missingRoster).
 * NIS dan nama di-trim() sebelum match.
 */
export function previewCbtMatch(
  cbtData: CbtImport,
  roster: Array<{ id: string; name: string; number: number; nis?: string }>
): CbtMatchPreview {
  const matched: CbtMatchPreview["matched"] = [];
  const unmatched: CbtMatchPreview["unmatched"] = [];
  const usedRosterIds = new Set<string>();

  // Helper: trim string
  const trim = (s: string | undefined) => (s ?? "").trim();

  // Pass 1: match by NIS (trimmed)
  for (const cbtStudent of cbtData.students) {
    const cbtNis = trim(cbtStudent.nis);
    if (!cbtNis) continue;
    const rosterStudent = roster.find(
      (r) => trim(r.nis) === cbtNis && !usedRosterIds.has(r.id)
    );
    if (rosterStudent) {
      matched.push({ rosterStudent, cbtStudent, matchBy: "nis" });
      usedRosterIds.add(rosterStudent.id);
    }
  }

  // Pass 2: match by exact name (case-insensitive, trimmed)
  for (const cbtStudent of cbtData.students) {
    if (matched.some((m) => m.cbtStudent === cbtStudent)) continue;
    const cbtName = trim(cbtStudent.name).toLowerCase();
    const rosterStudent = roster.find(
      (r) => trim(r.name).toLowerCase() === cbtName && !usedRosterIds.has(r.id)
    );
    if (rosterStudent) {
      matched.push({ rosterStudent, cbtStudent, matchBy: "name" });
      usedRosterIds.add(rosterStudent.id);
    }
  }

  // Pass 3: match by number
  for (const cbtStudent of cbtData.students) {
    if (matched.some((m) => m.cbtStudent === cbtStudent)) continue;
    if (!cbtStudent.number) continue;
    const rosterStudent = roster.find(
      (r) => r.number === cbtStudent.number && !usedRosterIds.has(r.id)
    );
    if (rosterStudent) {
      matched.push({ rosterStudent, cbtStudent, matchBy: "number" });
      usedRosterIds.add(rosterStudent.id);
    }
  }

  // Sisa CBT = unmatched (CBT data yang tidak cocok roster)
  for (const cbtStudent of cbtData.students) {
    if (!matched.some((m) => m.cbtStudent === cbtStudent)) {
      unmatched.push(cbtStudent);
    }
  }

  // PATCH-1: siswa roster yang tidak ada di CBT = missingRoster
  const missingRoster = roster
    .filter((r) => !usedRosterIds.has(r.id))
    .map((r) => ({ id: r.id, name: r.name, number: r.number, nis: r.nis }));

  return {
    matched,
    unmatched,
    missingRoster,
    summary: {
      totalCbt: cbtData.students.length,
      totalRoster: roster.length,
      matched: matched.length,
      unmatchedCbt: unmatched.length,
      missingRoster: missingRoster.length,
    },
  };
}

/**
 * Apply CBT match ke entries — isi target kolom dengan score dari CBT.
 */
export function applyCbtToEntries(
  entries: GradeEntry[],
  matchPreview: CbtMatchPreview,
  target: CbtImportTarget
): GradeEntry[] {
  const scoreByStudentId = new Map<string, number>();
  for (const m of matchPreview.matched) {
    scoreByStudentId.set(m.rosterStudent.id, m.cbtStudent.score);
  }

  return entries.map((e) => {
    const score = scoreByStudentId.get(e.studentId);
    if (score === undefined) return e;
    return { ...e, [target]: score };
  });
}
