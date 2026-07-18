/**
 * Adversarial / Edge-case tests untuk CBT Import.
 *
 * Audit Pass-3 (CBT-IMPORT-PREVIEW-RC1-PATCH-1).
 * Menguji:
 *   - validateCbtImport: skor 0/100/101, JSON kosong, students kosong
 *   - previewCbtMatch: roster 25/CBT 20, roster 20/CBT 25, NIS prioritas, trim, case-insensitive
 *   - applyCbtToEntries: hanya matched yang diubah, missingRoster tidak diubah, target kolom benar
 */

import { describe, it, expect } from "vitest";
import {
  validateCbtImport,
  previewCbtMatch,
  applyCbtToEntries,
  type CbtImport,
  type GradeEntry,
} from "../src/gradebook";

const baseRoster = [
  { id: "s1", name: "Andi Saputra", number: 1, nis: "2025001" },
  { id: "s2", name: "Budi Pratama", number: 2, nis: "2025002" },
  { id: "s3", name: "Citra Dewi", number: 3, nis: "2025003" },
  { id: "s4", name: "Dewi Lestari", number: 4, nis: "2025004" },
  { id: "s5", name: "Eka Putra", number: 5, nis: "2025005" },
];

const baseEntries: GradeEntry[] = baseRoster.map((s) => ({
  studentId: s.id,
  studentName: s.name,
  studentNumber: s.number,
  kd1: null, kd2: null, kd3: null, kd4: null, kd5: null, kd6: null,
  pts: null, pas: null, finalScore: null, averageKd: null,
  dailyScore: null, assignmentScore: null, summativeScore: null, remedialScore: null,
  averageScore: null, status: "incomplete",
}));

function makeCbt(students: Array<{ nis?: string; name: string; number?: number; score: number }>): CbtImport {
  return { source: "cbt", students };
}

/* ---------- validateCbtImport ---------- */

describe("validateCbtImport", () => {
  it("menerima JSON valid dengan NIS", () => {
    const v = validateCbtImport(makeCbt([{ nis: "001", name: "Andi", score: 85 }]));
    expect(v.success).toBe(true);
    expect(v.data?.students).toHaveLength(1);
  });

  it("menerima skor 0 (tidak dianggap kosong)", () => {
    const v = validateCbtImport(makeCbt([{ name: "Andi", score: 0 }]));
    expect(v.success).toBe(true);
    expect(v.data?.students[0].score).toBe(0);
  });

  it("menerima skor 100", () => {
    const v = validateCbtImport(makeCbt([{ name: "Andi", score: 100 }]));
    expect(v.success).toBe(true);
    expect(v.data?.students[0].score).toBe(100);
  });

  it("menolak skor 101 (di luar batas)", () => {
    const v = validateCbtImport(makeCbt([{ name: "Andi", score: 101 }]));
    expect(v.success).toBe(false);
    expect(v.errors.join("|")).toMatch(/score/i);
  });

  it("menolak skor negatif", () => {
    const v = validateCbtImport(makeCbt([{ name: "Andi", score: -1 }]));
    expect(v.success).toBe(false);
  });

  it("menolak students array kosong", () => {
    const v = validateCbtImport(makeCbt([]));
    expect(v.success).toBe(false);
    expect(v.errors[0]).toMatch(/tidak ada/i);
  });

  it("menolak input bukan object", () => {
    const v = validateCbtImport("not-an-object");
    expect(v.success).toBe(false);
  });

  it("menolak input null", () => {
    const v = validateCbtImport(null);
    expect(v.success).toBe(false);
  });

  it("menolak name kosong", () => {
    const v = validateCbtImport(makeCbt([{ name: "", score: 80 }]));
    expect(v.success).toBe(false);
  });

  it("menolak number 0 (zod positive)", () => {
    const v = validateCbtImport(makeCbt([{ name: "Andi", number: 0, score: 80 }]));
    expect(v.success).toBe(false);
  });

  it("menolak number negatif", () => {
    const v = validateCbtImport(makeCbt([{ name: "Andi", number: -1, score: 80 }]));
    expect(v.success).toBe(false);
  });

  it("menerima number desimal? Tidak — harus int", () => {
    const v = validateCbtImport(makeCbt([{ name: "Andi", number: 1.5, score: 80 }]));
    expect(v.success).toBe(false);
  });
});

/* ---------- previewCbtMatch ---------- */

describe("previewCbtMatch", () => {
  it("roster 25 / CBT 20: 5 missingRoster, 0 unmatchedCbt", () => {
    const roster = Array.from({ length: 25 }, (_, i) => ({
      id: `s${i + 1}`, name: `Siswa ${i + 1}`, number: i + 1, nis: `N${i + 1}`,
    }));
    const cbt = makeCbt(
      Array.from({ length: 20 }, (_, i) => ({ nis: `N${i + 1}`, name: `Siswa ${i + 1}`, score: 80 }))
    );
    const p = previewCbtMatch(cbt, roster);
    expect(p.summary.totalRoster).toBe(25);
    expect(p.summary.totalCbt).toBe(20);
    expect(p.summary.matched).toBe(20);
    expect(p.summary.unmatchedCbt).toBe(0);
    expect(p.summary.missingRoster).toBe(5);
    expect(p.missingRoster).toHaveLength(5);
    expect(p.missingRoster[0].id).toBe("s21");
  });

  it("roster 20 / CBT 25: 0 missingRoster, 5 unmatchedCbt", () => {
    const roster = Array.from({ length: 20 }, (_, i) => ({
      id: `s${i + 1}`, name: `Siswa ${i + 1}`, number: i + 1, nis: `N${i + 1}`,
    }));
    const cbt = makeCbt(
      Array.from({ length: 25 }, (_, i) => ({ nis: `N${i + 1}`, name: `Siswa ${i + 1}`, score: 80 }))
    );
    const p = previewCbtMatch(cbt, roster);
    expect(p.summary.matched).toBe(20);
    expect(p.summary.unmatchedCbt).toBe(5);
    expect(p.summary.missingRoster).toBe(0);
    expect(p.unmatched).toHaveLength(5);
  });

  it("NIS lebih prioritas daripada nama", () => {
    // CBT: name "Salah Nama" tapi NIS "2025001" → harus match Andi (s1) by NIS
    const cbt = makeCbt([{ nis: "2025001", name: "Salah Nama", score: 75 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    expect(p.summary.matched).toBe(1);
    expect(p.matched[0].matchBy).toBe("nis");
    expect(p.matched[0].rosterStudent.id).toBe("s1");
  });

  it("NIS sama, nama beda: tetap match by NIS", () => {
    const cbt = makeCbt([{ nis: "2025001", name: "An Di", score: 80 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    expect(p.summary.matched).toBe(1);
    expect(p.matched[0].matchBy).toBe("nis");
  });

  it("Nama sama persis (case-insensitive) → match by name", () => {
    const cbt = makeCbt([{ name: "ANDI SAPUTRA", score: 80 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    expect(p.summary.matched).toBe(1);
    expect(p.matched[0].matchBy).toBe("name");
  });

  it("Nama dengan spasi ekstra → trim lalu match", () => {
    const cbt = makeCbt([{ name: "  Andi Saputra  ", score: 80 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    expect(p.summary.matched).toBe(1);
    expect(p.matched[0].rosterStudent.id).toBe("s1");
  });

  it("NIS dengan spasi ekstra di roster dan CBT → trim lalu match", () => {
    const roster = [{ id: "s1", name: "Andi", number: 1, nis: "  2025001  " }];
    const cbt = makeCbt([{ nis: "2025001", name: "Andi", score: 80 }]);
    const p = previewCbtMatch(cbt, roster);
    expect(p.summary.matched).toBe(1);
    expect(p.matched[0].matchBy).toBe("nis");
  });

  it("Number sama → match by number", () => {
    const cbt = makeCbt([{ name: "Tidak Dikenal", number: 3, score: 80 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    expect(p.summary.matched).toBe(1);
    expect(p.matched[0].matchBy).toBe("number");
    expect(p.matched[0].rosterStudent.id).toBe("s3");
  });

  it("CBT tanpa NIS, tanpa number, nama cocok → match by name", () => {
    const cbt = makeCbt([{ name: "Budi Pratama", score: 80 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    expect(p.summary.matched).toBe(1);
    expect(p.matched[0].matchBy).toBe("name");
  });

  it("CBT unknown student → unmatched", () => {
    const cbt = makeCbt([{ name: "Mystery Student", number: 999, score: 80 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    expect(p.summary.matched).toBe(0);
    expect(p.summary.unmatchedCbt).toBe(1);
    expect(p.unmatched[0].name).toBe("Mystery Student");
  });

  it("NIS duplikat di CBT: hanya satu yang match (usedRosterIds)", () => {
    // Dua siswa CBT pakai NIS yang sama "2025001" → hanya satu match, satu unmatched
    const cbt = makeCbt([
      { nis: "2025001", name: "Andi Asli", score: 80 },
      { nis: "2025001", name: "Palsu", score: 70 },
    ]);
    const p = previewCbtMatch(cbt, baseRoster);
    expect(p.summary.matched).toBe(1);
    expect(p.summary.unmatchedCbt).toBe(1);
  });

  it("Roster kosong, CBT ada → semua unmatched", () => {
    const cbt = makeCbt([{ name: "Andi", score: 80 }]);
    const p = previewCbtMatch(cbt, []);
    expect(p.summary.totalRoster).toBe(0);
    expect(p.summary.matched).toBe(0);
    expect(p.summary.unmatchedCbt).toBe(1);
    expect(p.summary.missingRoster).toBe(0);
  });

  it("CBT kosong (0 students), roster ada → semua missingRoster", () => {
    // cbtImportSchema menolak students kosong, jadi validateCbtImport akan reject.
    // Tapi previewCbtMatch sendiri menerima CbtImport dengan students kosong (data sudah lolos validasi).
    // Untuk safety, kita cek preview tetap konsisten.
    const p = previewCbtMatch({ source: "cbt", students: [] }, baseRoster);
    expect(p.summary.totalCbt).toBe(0);
    expect(p.summary.matched).toBe(0);
    expect(p.summary.unmatchedCbt).toBe(0);
    expect(p.summary.missingRoster).toBe(5);
  });

  it("summary konsisten: matched + unmatchedCbt = totalCbt", () => {
    const cbt = makeCbt([
      { nis: "2025001", name: "Andi", score: 80 },
      { name: "Unknown", score: 70 },
    ]);
    const p = previewCbtMatch(cbt, baseRoster);
    expect(p.summary.matched + p.summary.unmatchedCbt).toBe(p.summary.totalCbt);
  });

  it("summary konsisten: matched + missingRoster = totalRoster", () => {
    const cbt = makeCbt([
      { nis: "2025001", name: "Andi", score: 80 },
      { name: "Unknown", score: 70 },
    ]);
    const p = previewCbtMatch(cbt, baseRoster);
    expect(p.summary.matched + p.summary.missingRoster).toBe(p.summary.totalRoster);
  });
});

/* ---------- applyCbtToEntries ---------- */

describe("applyCbtToEntries", () => {
  it("hanya matched yang diubah", () => {
    const cbt = makeCbt([
      { nis: "2025001", name: "Andi", score: 85 },
      { name: "Unknown", score: 70 },
    ]);
    const p = previewCbtMatch(cbt, baseRoster);
    const result = applyCbtToEntries(baseEntries, p, "kd1");
    expect(result[0].kd1).toBe(85); // s1 (Andi) → diubah
    expect(result[1].kd1).toBeNull(); // s2 (Budi) → tidak diubah
  });

  it("missingRoster tidak diubah (nilai lama dipertahankan)", () => {
    const cbt = makeCbt([{ nis: "2025001", name: "Andi", score: 90 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    const entriesWithOldScore = baseEntries.map((e, i) =>
      i === 4 ? { ...e, kd1: 60 } : e // s5 (Eka) punya nilai lama 60
    );
    const result = applyCbtToEntries(entriesWithOldScore, p, "kd1");
    expect(result[0].kd1).toBe(90); // Andi → diubah
    expect(result[4].kd1).toBe(60); // Eka → TIDAK diubah (missingRoster)
  });

  it("target kd1 hanya mengisi kd1, kd2 dst tetap", () => {
    const cbt = makeCbt([{ nis: "2025001", name: "Andi", score: 85 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    const entriesWithKd2 = baseEntries.map((e) => ({ ...e, kd2: 70 }));
    const result = applyCbtToEntries(entriesWithKd2, p, "kd1");
    expect(result[0].kd1).toBe(85);
    expect(result[0].kd2).toBe(70); // tetap
  });

  it("target pts mengisi kolom pts", () => {
    const cbt = makeCbt([{ nis: "2025001", name: "Andi", score: 88 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    const result = applyCbtToEntries(baseEntries, p, "pts");
    expect(result[0].pts).toBe(88);
    expect(result[0].kd1).toBeNull(); // tetap null
  });

  it("target pas mengisi kolom pas", () => {
    const cbt = makeCbt([{ nis: "2025001", name: "Andi", score: 92 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    const result = applyCbtToEntries(baseEntries, p, "pas");
    expect(result[0].pas).toBe(92);
  });

  it("apply tidak menyentuh finalScore/averageKd/status (recalc di repo)", () => {
    const cbt = makeCbt([{ nis: "2025001", name: "Andi", score: 85 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    const result = applyCbtToEntries(baseEntries, p, "kd1");
    expect(result[0].finalScore).toBeNull(); // masih null, recalc terjadi di saveGradeBook
    expect(result[0].status).toBe("incomplete"); // tetap
  });

  it("apply dengan preview kosong (matched=0) tidak mengubah entries", () => {
    const cbt = makeCbt([{ name: "Mystery", score: 80 }]);
    const p = previewCbtMatch(cbt, baseRoster);
    const result = applyCbtToEntries(baseEntries, p, "kd1");
    expect(result.every((e) => e.kd1 === null)).toBe(true);
  });
});
