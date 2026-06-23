/**
 * Tests untuk evaluation.ts (AI-PROMPT-BRIDGE-RC1)
 */
import { describe, it, expect } from "vitest";
import {
  generateBlueprintPrompt,
  parseBlueprintAIJson,
  generateQuestionCardPrompt,
  parseQuestionCardAIJson,
  generateEffectiveWeeks,
  type BlueprintPromptInput,
  type QuestionCardPromptInput,
} from "../src/evaluation";

const tps = [
  { id: "tp1", tp: "Peserta didik mampu mengidentifikasi norma", material: "Norma" },
  { id: "tp2", tp: "Peserta didik mampu menganalisis dampak pelanggaran", material: "Dampak" },
];

const blueprintInput: BlueprintPromptInput = {
  subject: "PPKn",
  classLabel: "VII A",
  semester: 1,
  assessmentType: "sumatif",
  title: "Sumatif Bab 1",
  multipleChoiceCount: 5,
  essayCount: 2,
  tps,
};

describe("evaluation — generateBlueprintPrompt", () => {
  it("prompt berisi data wajib (subject, class, title, jumlah)", () => {
    const prompt = generateBlueprintPrompt(blueprintInput);
    expect(prompt).toContain("PPKn");
    expect(prompt).toContain("VII A");
    expect(prompt).toContain("Sumatif Bab 1");
    expect(prompt).toContain("5");
    expect(prompt).toContain("2");
    expect(prompt).toContain("JSON");
  });

  it("prompt berisi daftar TP", () => {
    const prompt = generateBlueprintPrompt(blueprintInput);
    expect(prompt).toContain("tp1");
    expect(prompt).toContain("mengidentifikasi norma");
  });
});

describe("evaluation — parseBlueprintAIJson", () => {
  it("parse JSON kisi-kisi valid", () => {
    const json = JSON.stringify({
      blueprints: [
        { tpId: "tp1", tpText: "TP1", cognitiveLevel: "C1", questionType: "pg", questionNumbers: [1, 2, 3] },
        { tpId: "tp2", tpText: "TP2", cognitiveLevel: "C4", questionType: "pg", questionNumbers: [4, 5] },
        { tpId: "tp2", tpText: "TP2", cognitiveLevel: "C5", questionType: "esai", questionNumbers: [6, 7] },
      ],
    });
    const result = parseBlueprintAIJson(json, ["tp1", "tp2"], 7);
    expect(result.success).toBe(true);
    expect(result.blueprints!.length).toBe(3);
  });

  it("tolak nomor soal dobel", () => {
    const json = JSON.stringify({
      blueprints: [
        { tpId: "tp1", tpText: "TP1", cognitiveLevel: "C1", questionType: "pg", questionNumbers: [1, 2] },
        { tpId: "tp2", tpText: "TP2", cognitiveLevel: "C2", questionType: "pg", questionNumbers: [2, 3] },
      ],
    });
    const result = parseBlueprintAIJson(json, ["tp1", "tp2"], 3);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("dobel"))).toBe(true);
  });

  it("tolak nomor soal kurang (tidak semua terpakai)", () => {
    const json = JSON.stringify({
      blueprints: [
        { tpId: "tp1", tpText: "TP1", cognitiveLevel: "C1", questionType: "pg", questionNumbers: [1, 2] },
      ],
    });
    const result = parseBlueprintAIJson(json, ["tp1"], 5);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("belum terpakai"))).toBe(true);
  });

  it("tolak cognitiveLevel selain C1-C6", () => {
    const json = JSON.stringify({
      blueprints: [
        { tpId: "tp1", tpText: "TP1", cognitiveLevel: "C7", questionType: "pg", questionNumbers: [1] },
      ],
    });
    const result = parseBlueprintAIJson(json, ["tp1"], 1);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("C7"))).toBe(true);
  });

  it("tolak tpId yang tidak dipilih", () => {
    const json = JSON.stringify({
      blueprints: [
        { tpId: "tp-lain", tpText: "TP", cognitiveLevel: "C1", questionType: "pg", questionNumbers: [1] },
      ],
    });
    const result = parseBlueprintAIJson(json, ["tp1", "tp2"], 1);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("tp-lain"))).toBe(true);
  });

  it("tolak JSON tidak valid", () => {
    const result = parseBlueprintAIJson("bukan json", ["tp1"], 1);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("JSON tidak valid");
  });
});

describe("evaluation — generateQuestionCardPrompt", () => {
  it("prompt berisi nomor soal dan tipe dari blueprint", () => {
    const input: QuestionCardPromptInput = {
      subject: "PPKn",
      classLabel: "VII A",
      title: "Sumatif 1",
      blueprints: [
        { tpId: "tp1", tpText: "TP1", cognitiveLevel: "C1", questionType: "pg", questionNumbers: [1, 2] },
        { tpId: "tp2", tpText: "TP2", cognitiveLevel: "C4", questionType: "esai", questionNumbers: [3] },
      ],
    };
    const prompt = generateQuestionCardPrompt(input);
    expect(prompt).toContain("Nomor 1, 2");
    expect(prompt).toContain("PG");
    expect(prompt).toContain("Esai");
    expect(prompt).toContain("JSON");
  });
});

describe("evaluation — parseQuestionCardAIJson", () => {
  const expectedNumbers = [1, 2, 3];
  const pgNumbers = [1, 2];
  const essayNumbers = [3];

  it("parse kartu soal PG valid", () => {
    const json = JSON.stringify({
      questions: [
        { questionNumber: 1, questionType: "pg", cognitiveLevel: "C1", stem: "Apa norma?", options: { A: "a", B: "b", C: "c", D: "d" }, answerKey: "A", score: 2 },
        { questionNumber: 2, questionType: "pg", cognitiveLevel: "C2", stem: "Apa hukum?", options: { A: "a", B: "b", C: "c", D: "d" }, answerKey: "B", score: 2 },
        { questionNumber: 3, questionType: "esai", cognitiveLevel: "C4", stem: "Jelaskan!", essayAnswerGuide: "Jawaban lengkap", score: 10 },
      ],
    });
    const result = parseQuestionCardAIJson(json, expectedNumbers, pgNumbers, essayNumbers);
    expect(result.success).toBe(true);
    expect(result.questions!.length).toBe(3);
  });

  it("tolak PG tanpa opsi A-D", () => {
    const json = JSON.stringify({
      questions: [
        { questionNumber: 1, questionType: "pg", cognitiveLevel: "C1", stem: "Apa?", options: { A: "a", B: "b" }, answerKey: "A", score: 2 },
        { questionNumber: 2, questionType: "pg", cognitiveLevel: "C2", stem: "Apa?", options: { A: "a", B: "b", C: "c", D: "d" }, answerKey: "B", score: 2 },
        { questionNumber: 3, questionType: "esai", cognitiveLevel: "C4", stem: "Jelaskan!", essayAnswerGuide: "Guide", score: 10 },
      ],
    });
    const result = parseQuestionCardAIJson(json, expectedNumbers, pgNumbers, essayNumbers);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("opsi A, B, C, D"))).toBe(true);
  });

  it("tolak PG tanpa answerKey", () => {
    const json = JSON.stringify({
      questions: [
        { questionNumber: 1, questionType: "pg", cognitiveLevel: "C1", stem: "Apa?", options: { A: "a", B: "b", C: "c", D: "d" }, score: 2 },
        { questionNumber: 2, questionType: "pg", cognitiveLevel: "C2", stem: "Apa?", options: { A: "a", B: "b", C: "c", D: "d" }, answerKey: "B", score: 2 },
        { questionNumber: 3, questionType: "esai", cognitiveLevel: "C4", stem: "Jelaskan!", essayAnswerGuide: "Guide", score: 10 },
      ],
    });
    const result = parseQuestionCardAIJson(json, expectedNumbers, pgNumbers, essayNumbers);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("answerKey"))).toBe(true);
  });

  it("parse kartu soal esai valid", () => {
    const json = JSON.stringify({
      questions: [
        { questionNumber: 1, questionType: "pg", cognitiveLevel: "C1", stem: "Apa?", options: { A: "a", B: "b", C: "c", D: "d" }, answerKey: "A", score: 2 },
        { questionNumber: 2, questionType: "pg", cognitiveLevel: "C2", stem: "Apa?", options: { A: "a", B: "b", C: "c", D: "d" }, answerKey: "B", score: 2 },
        { questionNumber: 3, questionType: "esai", cognitiveLevel: "C4", stem: "Jelaskan norma!", essayAnswerGuide: "Norma adalah aturan...", score: 10 },
      ],
    });
    const result = parseQuestionCardAIJson(json, expectedNumbers, pgNumbers, essayNumbers);
    expect(result.success).toBe(true);
    expect(result.questions![2].essayAnswerGuide).toContain("Norma adalah");
  });

  it("tolak esai tanpa pedoman jawaban", () => {
    const json = JSON.stringify({
      questions: [
        { questionNumber: 1, questionType: "pg", cognitiveLevel: "C1", stem: "Apa?", options: { A: "a", B: "b", C: "c", D: "d" }, answerKey: "A", score: 2 },
        { questionNumber: 2, questionType: "pg", cognitiveLevel: "C2", stem: "Apa?", options: { A: "a", B: "b", C: "c", D: "d" }, answerKey: "B", score: 2 },
        { questionNumber: 3, questionType: "esai", cognitiveLevel: "C4", stem: "Jelaskan!", score: 10 },
      ],
    });
    const result = parseQuestionCardAIJson(json, expectedNumbers, pgNumbers, essayNumbers);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("essayAnswerGuide"))).toBe(true);
  });
});

describe("evaluation — generateEffectiveWeeks", () => {
  it("tidak crash saat kalender kosong", () => {
    const weeks = generateEffectiveWeeks({
      semesterStart: "2025-07-14",
      semesterEnd: "2025-07-20",
      blockingEvents: [],
      jpPerWeek: 2,
    });
    expect(weeks.length).toBeGreaterThan(0);
  });

  it("minggu dengan blocking event → isEffective false", () => {
    const weeks = generateEffectiveWeeks({
      semesterStart: "2025-07-14",
      semesterEnd: "2025-07-27",
      blockingEvents: [
        { startDate: "2025-07-14", endDate: "2025-07-19", label: "MPLS" },
      ],
      jpPerWeek: 2,
    });
    const week1 = weeks.find((w) => w.weekNumber === 1);
    expect(week1).toBeDefined();
    expect(week1!.isEffective).toBe(false);
    expect(week1!.notes).toContain("MPLS");
  });

  it("tanggal tidak valid → return kosong", () => {
    const weeks = generateEffectiveWeeks({
      semesterStart: "invalid",
      semesterEnd: "also-invalid",
      blockingEvents: [],
      jpPerWeek: 2,
    });
    expect(weeks.length).toBe(0);
  });

  it("hitung effectiveJP untuk minggu efektif", () => {
    const weeks = generateEffectiveWeeks({
      semesterStart: "2025-07-21",
      semesterEnd: "2025-07-27",
      blockingEvents: [],
      jpPerWeek: 3,
    });
    const effectiveWeeks = weeks.filter((w) => w.isEffective);
    expect(effectiveWeeks.length).toBeGreaterThan(0);
    expect(effectiveWeeks[0].effectiveJP).toBe(3);
  });
});
