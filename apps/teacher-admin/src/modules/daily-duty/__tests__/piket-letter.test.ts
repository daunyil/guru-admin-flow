import { describe, expect, it } from "vitest";
import type { DutyRecord } from "@guru-admin/domain";
import { buildPiketLetter } from "../piket-letter";

function record(overrides: Partial<DutyRecord> = {}): DutyRecord {
  return {
    id: "r1",
    dutyReportId: "dr1",
    academicYearId: "ay1",
    date: "2026-06-26",
    studentId: "s1",
    studentName: "Budi",
    studentNumber: 2,
    classId: "7A",
    classLabel: "7A",
    category: "discipline",
    type: "class_disruption",
    ruleId: "rule1",
    ruleLabel: "Ribut / mengganggu pembelajaran",
    source: "manual",
    attendanceLinkType: null,
    points: 10,
    note: "Mengganggu teman saat belajar",
    followUp: undefined,
    recordedByTeacherId: "t1",
    recordedByTeacherName: "Pak Guru",
    createdAt: "2026-06-26T00:00:00Z",
    updatedAt: "2026-06-26T00:00:00Z",
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

const baseInput = {
  schoolName: "SMP Negeri 8 Bantan",
  schoolAddress: "Jl. Pendidikan",
  principalName: "Kepala Sekolah",
  principalNip: "123456789012345678",
  date: "2026-06-26",
  place: "Bantan",
  studentName: "Budi",
  studentNumber: 2,
  classLabel: "7A",
  totalPoints: 55,
  totalRecords: 3,
  statusLabel: "Panggilan orang tua",
  records: [
    record({ id: "r-old", date: "2026-06-20", points: 5, ruleLabel: "Terlambat" }),
    record({ id: "r-new", date: "2026-06-26", points: 10, ruleLabel: "Ribut" }),
  ],
  dutyTeacherName: "Pak Guru",
};

describe("PIKET-LETTER-GENERATOR-04B — buildPiketLetter", () => {
  it("membuat Surat Panggilan Orang Tua", () => {
    const letter = buildPiketLetter({ ...baseInput, letterType: "parent_summons" });
    expect(letter.title).toBe("SURAT PANGGILAN ORANG TUA/WALI SISWA");
    expect(letter.letterType).toBe("parent_summons");
  });

  it("membuat Surat Pernyataan Siswa", () => {
    const letter = buildPiketLetter({ ...baseInput, letterType: "student_statement" });
    expect(letter.title).toBe("SURAT PERNYATAAN SISWA");
    expect(letter.letterType).toBe("student_statement");
  });

  it("memuat identitas siswa, kelas, total poin, dan status", () => {
    const letter = buildPiketLetter({ ...baseInput, letterType: "parent_summons" });
    expect(letter.studentIdentity).toContainEqual({ label: "Nama Siswa", value: "Budi" });
    expect(letter.studentIdentity).toContainEqual({ label: "Kelas", value: "7A" });
    expect(letter.studentIdentity).toContainEqual({ label: "Total Poin", value: "55 poin" });
    expect(letter.studentIdentity).toContainEqual({ label: "Status Pembinaan", value: "Panggilan orang tua" });
  });

  it("surat pernyataan memuat janji memperbaiki sikap", () => {
    const letter = buildPiketLetter({ ...baseInput, letterType: "student_statement" });
    expect(letter.bodyParagraphs.join(" ")).toContain("memperbaiki sikap");
  });

  it("record rows diurutkan tanggal terbaru dulu", () => {
    const letter = buildPiketLetter({ ...baseInput, letterType: "parent_summons" });
    expect(letter.recordRows[0].date).toBe("2026-06-26");
    expect(letter.recordRows[1].date).toBe("2026-06-20");
  });

  it("record rows maksimal 10 item dan memberi catatan tambahan", () => {
    const records = Array.from({ length: 12 }, (_, i) => record({ id: `r${i}`, date: `2026-06-${String(i + 1).padStart(2, "0")}` }));
    const letter = buildPiketLetter({ ...baseInput, letterType: "parent_summons", records });
    expect(letter.recordRows).toHaveLength(10);
    expect(letter.additionalNote).toContain("Catatan lainnya");
  });

  it("surat panggilan memuat tanda tangan guru dan kepala sekolah", () => {
    const letter = buildPiketLetter({ ...baseInput, letterType: "parent_summons" });
    expect(letter.signatureBlocks.map((s) => s.role)).toContain("Guru Piket / Wali Kelas");
    expect(letter.signatureBlocks.map((s) => s.role)).toContain("Kepala Sekolah");
  });

  it("surat pernyataan memuat tanda tangan siswa, orang tua, dan guru", () => {
    const letter = buildPiketLetter({ ...baseInput, letterType: "student_statement" });
    const roles = letter.signatureBlocks.map((s) => s.role).join(" ");
    expect(roles).toContain("Siswa");
    expect(roles).toContain("Orang Tua/Wali");
    expect(roles).toContain("Guru Piket");
  });
});
