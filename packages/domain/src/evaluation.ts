/**
 * Evaluation domain models for AI-PROMPT-BRIDGE-RC1.
 *
 * 4 entitas: EffectiveWeekDocument, AssessmentPlan, QuestionBlueprint, QuestionCard.
 * Plus pure functions: generateBlueprintPrompt, parseBlueprintAIJson,
 *   generateQuestionCardPrompt, parseQuestionCardAIJson, generateEffectiveWeeks.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

/* ------------------------------------------------------------------ */
/*  1. EffectiveWeekDocument                                           */
/* ------------------------------------------------------------------ */

export const effectiveWeekItemSchema = z.object({
  weekNumber: z.number().int().positive(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string().optional(),
  isEffective: z.boolean().default(true),
  effectiveDays: z.number().int().nonnegative().default(0),
  effectiveJP: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});
export type EffectiveWeekItem = z.infer<typeof effectiveWeekItemSchema>;

export const effectiveWeekDocumentSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  weeks: z.array(effectiveWeekItemSchema),
  summary: z.string().optional(),
  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
});
export type EffectiveWeekDocument = z.infer<typeof effectiveWeekDocumentSchema>;

/* ------------------------------------------------------------------ */
/*  2. AssessmentPlan                                                  */
/* ------------------------------------------------------------------ */

export const assessmentTypeSchema = z.enum(["sumatif", "pts", "pas", "uas"]);
export type AssessmentType = z.infer<typeof assessmentTypeSchema>;

export const assessmentPlanSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  assessmentType: assessmentTypeSchema,
  title: z.string().min(1),
  selectedTpIds: z.array(z.string()),
  multipleChoiceCount: z.number().int().nonnegative().default(0),
  essayCount: z.number().int().nonnegative().default(0),
  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
});
export type AssessmentPlan = z.infer<typeof assessmentPlanSchema>;

/* ------------------------------------------------------------------ */
/*  3. QuestionBlueprint (Kisi-kisi)                                   */
/* ------------------------------------------------------------------ */

export const cognitiveLevelSchema = z.enum(["C1", "C2", "C3", "C4", "C5", "C6"]);
export type CognitiveLevel = z.infer<typeof cognitiveLevelSchema>;

export const questionTypeSchema = z.enum(["pg", "esai"]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const questionBlueprintSchema = baseEntitySchema.extend({
  assessmentPlanId: z.string().min(1),
  tpId: z.string().min(1),
  tpText: z.string(),
  material: z.string().optional(),
  indicator: z.string().optional(),
  cognitiveLevel: cognitiveLevelSchema,
  questionType: questionTypeSchema,
  questionNumbers: z.array(z.number().int().positive()),
});
export type QuestionBlueprint = z.infer<typeof questionBlueprintSchema>;

/* ------------------------------------------------------------------ */
/*  4. QuestionCard (Kartu Soal)                                       */
/* ------------------------------------------------------------------ */

export const questionCardSchema = baseEntitySchema.extend({
  assessmentPlanId: z.string().min(1),
  blueprintId: z.string().min(1),
  questionNumber: z.number().int().positive(),
  questionType: questionTypeSchema,
  material: z.string().optional(),
  indicator: z.string().optional(),
  cognitiveLevel: cognitiveLevelSchema,
  stem: z.string().min(1),
  options: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
  }).optional(),
  answerKey: z.enum(["A", "B", "C", "D"]).optional(),
  essayAnswerGuide: z.string().optional(),
  score: z.number().positive(),
  status: documentStatusSchema,
});
export type QuestionCard = z.infer<typeof questionCardSchema>;

/* ------------------------------------------------------------------ */
/*  Pure functions: Prompt generators + parsers                        */
/* ------------------------------------------------------------------ */

/** Input untuk generateBlueprintPrompt. */
export type BlueprintPromptInput = {
  subject: string;
  classLabel: string;
  semester: 1 | 2;
  assessmentType: AssessmentType;
  title: string;
  multipleChoiceCount: number;
  essayCount: number;
  tps: Array<{ id: string; tp: string; material?: string }>;
};

/**
 * Generate prompt untuk Claude — minta kisi-kisi soal dalam format JSON.
 */
export function generateBlueprintPrompt(input: BlueprintPromptInput): string {
  const tpList = input.tps.map((t, i) => `${i + 1}. ID: ${t.id}\n   TP: ${t.tp}${t.material ? `\n   Materi: ${t.material}` : ""}`).join("\n\n");
  const totalQuestions = input.multipleChoiceCount + input.essayCount;

  return `Anda adalah ahli dalam pembuatan kisi-kisi soal evaluasi pembelajaran Kurikulum Merdeka.

BUATKAN KISI-KISI SOAL dengan detail berikut:

Mata Pelajaran: ${input.subject}
Kelas: ${input.classLabel}
Semester: ${input.semester === 1 ? "Ganjil" : "Genap"}
Jenis Penilaian: ${input.assessmentType.toUpperCase()}
Judul: ${input.title}
Jumlah PG: ${input.multipleChoiceCount}
Jumlah Esai: ${input.essayCount}
Total Soal: ${totalQuestions}

Tujuan Pembelajaran (TP) yang akan diuji:
${tpList}

INSTRUKSI:
1. Distribusikan ${totalQuestions} nomor soal ke TP di atas.
2. Setiap TP minimal dapat 1 soal (bila jumlah TP <= total soal).
3. Tentukan tingkat kognitif Bloom (C1-C6) untuk setiap kelompok soal.
4. Tentukan jenis soal (pg atau esai) sesuai jumlah yang diminta.
5. Nomor soal PG: 1 sampai ${input.multipleChoiceCount}.
6. Nomor soal Esai: ${input.multipleChoiceCount + 1} sampai ${totalQuestions}.

BALAS HANYA dengan JSON valid dalam format berikut (tanpa markdown, tanpa komentar):

{
  "blueprints": [
    {
      "tpId": "id-tp-dari-daftar",
      "tpText": "teks TP lengkap",
      "material": "materi singkat",
      "indicator": "indikator soal",
      "cognitiveLevel": "C1",
      "questionType": "pg",
      "questionNumbers": [1, 2, 3]
    }
  ]
}

Pastikan:
- Semua nomor soal dari 1 sampai ${totalQuestions} terpakai, tidak ada yang dobel.
- tpId harus berasal dari daftar TP di atas.
- cognitiveLevel hanya C1, C2, C3, C4, C5, atau C6.
- questionType hanya "pg" atau "esai".
- JSON harus valid tanpa error.`;
}

/** Hasil parse blueprint AI JSON. */
export type ParseBlueprintResult = {
  success: boolean;
  blueprints?: Array<{
    tpId: string;
    tpText: string;
    material?: string;
    indicator?: string;
    cognitiveLevel: CognitiveLevel;
    questionType: QuestionType;
    questionNumbers: number[];
  }>;
  errors: string[];
};

/**
 * Parse JSON kisi-kisi dari Claude.
 * Validasi: nomor soal terpakai semua, tidak dobel, tpId valid, cognitiveLevel valid.
 *
 * PATCH-2: validasi PG/esai range.
 *   - Nomor 1..multipleChoiceCount wajib questionType "pg".
 *   - Nomor (multipleChoiceCount+1)..total wajib questionType "esai".
 */
export function parseBlueprintAIJson(
  input: string,
  validTpIds: string[],
  multipleChoiceCount: number,
  essayCount: number
): ParseBlueprintResult {
  const expectedTotal = multipleChoiceCount + essayCount;
  // Range PG: 1..multipleChoiceCount
  // Range Esai: (multipleChoiceCount+1)..expectedTotal
  const pgRange = new Set<number>();
  for (let n = 1; n <= multipleChoiceCount; n++) pgRange.add(n);
  const essayRange = new Set<number>();
  for (let n = multipleChoiceCount + 1; n <= expectedTotal; n++) essayRange.add(n);

  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { success: false, errors: ["JSON tidak valid. Pastikan format JSON benar."] };
  }

  const data = parsed as { blueprints?: unknown[] };
  if (!data.blueprints || !Array.isArray(data.blueprints)) {
    return { success: false, errors: ["JSON harus memiliki array 'blueprints'."] };
  }

  const allNumbers: number[] = [];
  const blueprints: ParseBlueprintResult["blueprints"] = [];

  for (let i = 0; i < data.blueprints.length; i++) {
    const bp = data.blueprints[i] as Record<string, unknown>;
    const bpErrors: string[] = [];

    // tpId
    const tpId = String(bp.tpId ?? "");
    if (!tpId) bpErrors.push(`Blueprint ${i + 1}: tpId kosong`);
    else if (!validTpIds.includes(tpId)) bpErrors.push(`Blueprint ${i + 1}: tpId "${tpId}" tidak ada di TP terpilih`);

    // cognitiveLevel
    const cogLevel = String(bp.cognitiveLevel ?? "");
    if (!["C1", "C2", "C3", "C4", "C5", "C6"].includes(cogLevel)) {
      bpErrors.push(`Blueprint ${i + 1}: cognitiveLevel "${cogLevel}" tidak valid (harus C1-C6)`);
    }

    // questionType
    const qType = String(bp.questionType ?? "");
    if (!["pg", "esai"].includes(qType)) {
      bpErrors.push(`Blueprint ${i + 1}: questionType "${qType}" tidak valid (harus pg/esai)`);
    }

    // questionNumbers
    const qNumbers = bp.questionNumbers;
    if (!Array.isArray(qNumbers) || qNumbers.length === 0) {
      bpErrors.push(`Blueprint ${i + 1}: questionNumbers harus array tidak kosong`);
    } else {
      for (const n of qNumbers) {
        if (typeof n !== "number" || n < 1 || n > expectedTotal) {
          bpErrors.push(`Blueprint ${i + 1}: nomor soal ${n} di luar range 1-${expectedTotal}`);
        }
        if (allNumbers.includes(n as number)) {
          bpErrors.push(`Blueprint ${i + 1}: nomor soal ${n} dobel`);
        }
        allNumbers.push(n as number);

        // PATCH-2: validasi PG/esai range
        if (qType === "pg" && essayRange.has(n as number)) {
          bpErrors.push(`Blueprint ${i + 1}: nomor ${n} adalah range esai (${multipleChoiceCount + 1}-${expectedTotal}), bukan PG`);
        }
        if (qType === "esai" && pgRange.has(n as number)) {
          bpErrors.push(`Blueprint ${i + 1}: nomor ${n} adalah range PG (1-${multipleChoiceCount}), bukan esai`);
        }
      }
    }

    if (bpErrors.length > 0) {
      errors.push(...bpErrors);
    } else {
      blueprints!.push({
        tpId,
        tpText: String(bp.tpText ?? ""),
        material: bp.material ? String(bp.material) : undefined,
        indicator: bp.indicator ? String(bp.indicator) : undefined,
        cognitiveLevel: cogLevel as CognitiveLevel,
        questionType: qType as QuestionType,
        questionNumbers: qNumbers as number[],
      });
    }
  }

  // Cek semua nomor terpakai
  for (let n = 1; n <= expectedTotal; n++) {
    if (!allNumbers.includes(n)) {
      errors.push(`Nomor soal ${n} belum terpakai di kisi-kisi`);
    }
  }

  // PATCH-2: cek jumlah PG dan esai sesuai
  const pgCount = allNumbers.filter((n) => pgRange.has(n)).length;
  const essayCountActual = allNumbers.filter((n) => essayRange.has(n)).length;
  if (pgCount !== multipleChoiceCount) {
    errors.push(`Jumlah soal PG: ${pgCount}, seharusnya ${multipleChoiceCount}`);
  }
  if (essayCountActual !== essayCount) {
    errors.push(`Jumlah soal esai: ${essayCountActual}, seharusnya ${essayCount}`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }
  return { success: true, blueprints, errors: [] };
}

/** Input untuk generateQuestionCardPrompt. */
export type QuestionCardPromptInput = {
  subject: string;
  classLabel: string;
  title: string;
  blueprints: Array<{
    tpId: string;
    tpText: string;
    material?: string;
    indicator?: string;
    cognitiveLevel: CognitiveLevel;
    questionType: QuestionType;
    questionNumbers: number[];
  }>;
};

/**
 * Generate prompt untuk Claude — minta kartu soal dari kisi-kisi.
 */
export function generateQuestionCardPrompt(input: QuestionCardPromptInput): string {
  const bpList = input.blueprints.map((bp) => {
    const nums = bp.questionNumbers.join(", ");
    return `Nomor ${nums}: ${bp.questionType.toUpperCase()} | ${bp.cognitiveLevel} | TP: ${bp.tpText}${bp.material ? ` | Materi: ${bp.material}` : ""}${bp.indicator ? ` | Indikator: ${bp.indicator}` : ""}`;
  }).join("\n");

  return `Anda adalah ahli dalam pembuatan soal evaluasi Kurikulum Merdeka.

BUATKAN KARTU SOAL berdasarkan kisi-kisi berikut:

Mata Pelajaran: ${input.subject}
Kelas: ${input.classLabel}
Judul: ${input.title}

Kisi-kisi:
${bpList}

INSTRUKSI:
1. Untuk soal PG: buat stem pertanyaan, 4 opsi (A, B, C, D), dan kunci jawaban.
2. Untuk soal Esai: buat stem pertanyaan dan pedoman jawaban.
3. Setiap soal harus sesuai dengan TP, materi, dan tingkat kognitif di kisi-kisi.
4. Bahasa Indonesia yang baik dan benar, sesuai konteks siswa SMP.

BALAS HANYA dengan JSON valid (tanpa markdown, tanpa komentar):

{
  "questions": [
    {
      "questionNumber": 1,
      "questionType": "pg",
      "material": "materi singkat",
      "indicator": "indikator",
      "cognitiveLevel": "C1",
      "stem": "Pertanyaan lengkap di sini",
      "options": { "A": "opsi A", "B": "opsi B", "C": "opsi C", "D": "opsi D" },
      "answerKey": "A",
      "score": 2
    },
    {
      "questionNumber": 6,
      "questionType": "esai",
      "material": "materi singkat",
      "indicator": "indikator",
      "cognitiveLevel": "C4",
      "stem": "Pertanyaan esai di sini",
      "essayAnswerGuide": "Pedoman jawaban lengkap",
      "score": 10
    }
  ]
}

Pastikan:
- Semua nomor soal dari kisi-kisi terpakai.
- PG wajib punya options A-D dan answerKey.
- Esai wajib punya essayAnswerGuide.
- score harus angka positif.
- JSON harus valid tanpa error.`;
}

/** Hasil parse question card AI JSON. */
export type ParseQuestionCardResult = {
  success: boolean;
  questions?: Array<{
    questionNumber: number;
    questionType: QuestionType;
    material?: string;
    indicator?: string;
    cognitiveLevel: CognitiveLevel;
    stem: string;
    options?: { A: string; B: string; C: string; D: string };
    answerKey?: "A" | "B" | "C" | "D";
    essayAnswerGuide?: string;
    score: number;
  }>;
  errors: string[];
};

/**
 * Parse JSON kartu soal dari Claude.
 * Validasi: nomor sesuai blueprint, PG wajib opsi A-D + answerKey, esai wajib pedoman.
 *
 * PATCH-2: validasi PG/esai type match.
 *   - Jika questionNumber ada di pgNumbers, questionType wajib "pg".
 *   - Jika questionNumber ada di essayNumbers, questionType wajib "esai".
 */
export function parseQuestionCardAIJson(
  input: string,
  expectedNumbers: number[],
  pgNumbers: number[],
  essayNumbers: number[]
): ParseQuestionCardResult {
  const pgSet = new Set(pgNumbers);
  const essaySet = new Set(essayNumbers);
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { success: false, errors: ["JSON tidak valid."] };
  }

  const data = parsed as { questions?: unknown[] };
  if (!data.questions || !Array.isArray(data.questions)) {
    return { success: false, errors: ["JSON harus memiliki array 'questions'."] };
  }

  const foundNumbers = new Set<number>();
  const questions: ParseQuestionCardResult["questions"] = [];

  for (let i = 0; i < data.questions.length; i++) {
    const q = data.questions[i] as Record<string, unknown>;
    const qErrors: string[] = [];

    const qNum = Number(q.questionNumber);
    if (!qNum || qNum < 1) {
      qErrors.push(`Soal ${i + 1}: questionNumber tidak valid`);
    } else if (!expectedNumbers.includes(qNum)) {
      qErrors.push(`Soal ${i + 1}: nomor ${qNum} tidak ada di kisi-kisi`);
    } else if (foundNumbers.has(qNum)) {
      qErrors.push(`Soal ${i + 1}: nomor ${qNum} dobel`);
    }
    foundNumbers.add(qNum);

    const qType = String(q.questionType ?? "");
    if (!["pg", "esai"].includes(qType)) {
      qErrors.push(`Soal ${i + 1}: questionType "${qType}" tidak valid`);
    }

    const cogLevel = String(q.cognitiveLevel ?? "");
    if (!["C1", "C2", "C3", "C4", "C5", "C6"].includes(cogLevel)) {
      qErrors.push(`Soal ${i + 1}: cognitiveLevel "${cogLevel}" tidak valid`);
    }

    const stem = String(q.stem ?? "");
    if (!stem) qErrors.push(`Soal ${i + 1}: stem kosong`);

    const score = Number(q.score);
    if (!score || score <= 0) {
      qErrors.push(`Soal ${i + 1}: score harus angka positif`);
    }

    // PATCH-2: validasi PG/esai type match
    if (pgSet.has(qNum) && qType !== "pg") {
      qErrors.push(`Soal ${i + 1}: nomor ${qNum} adalah PG, tetapi questionType "${qType}" (harus "pg")`);
    }
    if (essaySet.has(qNum) && qType !== "esai") {
      qErrors.push(`Soal ${i + 1}: nomor ${qNum} adalah esai, tetapi questionType "${qType}" (harus "esai")`);
    }

    // PG validation
    if (qType === "pg") {
      const opts = q.options as Record<string, unknown> | undefined;
      if (!opts || !opts.A || !opts.B || !opts.C || !opts.D) {
        qErrors.push(`Soal ${i + 1}: PG wajib punya opsi A, B, C, D`);
      }
      const ansKey = String(q.answerKey ?? "");
      if (!["A", "B", "C", "D"].includes(ansKey)) {
        qErrors.push(`Soal ${i + 1}: PG wajib punya answerKey (A/B/C/D)`);
      }
    }

    // Esai validation
    if (qType === "esai") {
      const guide = String(q.essayAnswerGuide ?? "");
      if (!guide) {
        qErrors.push(`Soal ${i + 1}: Esai wajib punya essayAnswerGuide`);
      }
    }

    if (qErrors.length > 0) {
      errors.push(...qErrors);
    } else {
      questions!.push({
        questionNumber: qNum,
        questionType: qType as QuestionType,
        material: q.material ? String(q.material) : undefined,
        indicator: q.indicator ? String(q.indicator) : undefined,
        cognitiveLevel: cogLevel as CognitiveLevel,
        stem,
        options: q.options as { A: string; B: string; C: string; D: string } | undefined,
        answerKey: q.answerKey as "A" | "B" | "C" | "D" | undefined,
        essayAnswerGuide: q.essayAnswerGuide ? String(q.essayAnswerGuide) : undefined,
        score,
      });
    }
  }

  // Cek semua nomor terpakai
  for (const n of expectedNumbers) {
    if (!foundNumbers.has(n)) {
      errors.push(`Nomor soal ${n} belum ada di kartu soal`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }
  return { success: true, questions, errors: [] };
}

/* ------------------------------------------------------------------ */
/*  Effective weeks generator                                          */
/* ------------------------------------------------------------------ */

/** Input untuk generateEffectiveWeeks. */
export type GenerateEffectiveWeeksInput = {
  semesterStart: string;
  semesterEnd: string;
  /** Calendar events yang blocksLearning = true (libur). */
  blockingEvents: Array<{ startDate: string; endDate: string; label: string }>;
  /** JP per minggu untuk hitung effectiveJP. */
  jpPerWeek: number;
};

/**
 * Generate daftar minggu efektif dari rentang semester + kalender.
 * Pure function. Tidak crash bila kalender kosong.
 */
export function generateEffectiveWeeks(input: GenerateEffectiveWeeksInput): EffectiveWeekItem[] {
  const { semesterStart, semesterEnd, blockingEvents, jpPerWeek } = input;
  const weeks: EffectiveWeekItem[] = [];

  // Parse dates
  const start = new Date(semesterStart + "T00:00:00");
  const end = new Date(semesterEnd + "T00:00:00");

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return weeks; // tanggal tidak valid → return kosong
  }

  // Enumerasi minggu (Senin sampai Minggu)
  let weekStart = new Date(start);
  // Set ke hari Senin dari minggu ini
  const dayOfWeek = weekStart.getDay(); // 0=Minggu, 1=Senin
  if (dayOfWeek !== 1) {
    weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  }

  let weekNumber = 1;
  while (weekStart <= end) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Hitung hari efektif (Senin-Jumat yang dalam semester dan tidak diblokir)
    let effectiveDays = 0;
    let blockingLabel = "";

    for (let d = new Date(weekStart); d <= weekEnd && d <= end; d.setDate(d.getDate() + 1)) {
      const dateISO = d.toISOString().slice(0, 10);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue; // weekend

      // Cek blocking event
      const blocked = blockingEvents.find(
        (e) => e.startDate <= dateISO && e.endDate >= dateISO
      );
      if (blocked) {
        if (!blockingLabel) blockingLabel = blocked.label;
        continue;
      }

      // Cek apakah tanggal dalam semester
      if (dateISO >= semesterStart && dateISO <= semesterEnd) {
        effectiveDays++;
      }
    }

    const isEffective = effectiveDays > 0;
    const effectiveJP = isEffective ? jpPerWeek : 0;

    weeks.push({
      weekNumber,
      startDate: weekStart.toISOString().slice(0, 10),
      endDate: Math.min(weekEnd.getTime(), end.getTime()) > 0
        ? new Date(Math.min(weekEnd.getTime(), end.getTime())).toISOString().slice(0, 10)
        : weekEnd.toISOString().slice(0, 10),
      description: blockingLabel || (isEffective ? "Minggu efektif" : "Tidak efektif"),
      isEffective,
      effectiveDays,
      effectiveJP,
      notes: blockingLabel ? `Diliburkan: ${blockingLabel}` : undefined,
    });

    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
    weekNumber++;
  }

  return weeks;
}
