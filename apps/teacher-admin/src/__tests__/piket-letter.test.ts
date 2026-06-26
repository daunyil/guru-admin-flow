import { describe, expect, it } from "vitest";
import type { DutyRecord } from "@guru-admin/domain";
import { buildPiketLetter } from "../modules/daily-duty/piket-letter";

function makeRecord(overrides: Partial<DutyRecord> = {}): DutyRecord {
  return {
    id: overrides.id ?? "r1",
    dutyReportId: "dr1",
    academicYearId: "ay-2026",
    date: overrides.date ?? "2026-06-26",
    studentId: "s1",
    studentName: "Ahmad Rizki",
    studentNumber: 7,
    classId: "7A",
    classLabel: "7A",
    category: overrides.category ?? "discipline",
    type: overrides.type ?? "class_disruption",
    ruleId: "rule1",
    ruleLabel: overrides.ruleLabel ?? "Ribut / mengganggu pembelajaran",
    source: "manual",
    attendanceLinkType: null,
    points: overrides.points ?? 10,
    note: overrides.note,
    followUp: overrides.followUp,
    recordedByTeacherId: "t1",
    recordedByTeacherName: "Bu Guru Piket",
    createdAt: "2026-06-26T00:00:00Z",
    updatedAt: "2026-06-26T00:00:00Z",
    deletedAt: overrides.deletedAt ?? null,
    syncStatus: "local_only",
    ...overrides,
  } as DutyRecord;
}

const baseInput = {
  schoolName: "SMPN 8 Bantan",
  schoolAddress: "Jl. Pendidikan, Bantan",
  principalName: "Kepala Sekolah",
  principalNip: "196801011990011001",
  date: "2026-06-26",
  place: "Bengkalis",
  studentName: "Ahmad Rizki",
  studentNumber: 7,
  classLabel: "7A",
  totalPoints: 55,
  totalRecords: 3,
  statusLabel: "Panggilan orang tua",
  dutyTeacherName: "Bu Guru Piket",
  records: [
    makeRecord({ id: "r1", date: "2026-06-20", ruleLabel: "Terlambat", points: 5 }),
    makeRecord({ id: "r2", date: "2026-06-26", ruleLabel: "Bolos / keluar kelas tanpa izin", points: 20, note: "Keluar saat jam pelajaran." }),
    makeRecord({ id: "r3", date: "2026-06-25", ruleLabel: "Atribut tidak lengkap", points: 10 }),
  ],
};

describe("PIKET-CALL-LETTER-04B — buildPiketLetter", () => {
  it("membuat surat panggilan orang tua dengan identitas, ringkasan poin, dan tanda tangan", () => {
    const letter = buildPiketLetter({ ...baseInput, letterType: "parent_summons" });

    expect(letter.letterType).toBe("parent_summons");
    expect(letter.title).toBe("SURAT PANGGILAN ORANG TUA/WALI SISWA");
    expect(letter.schoolName).toBe("SMPN 8 Bantan");
    expect(letter.studentIdentity).toContainEqual({ label: "Nama Siswa", value: "Ahmad Rizki" });
    expect(letter.studentIdentity).toContainEqual({ label: "Total Poin", value: "55 poin" });
    expect(letter.studentIdentity).toContainEqual({ label: "Status Pembinaan", value: "Panggilan orang tua" });
    expect(letter.signatureBlocks).toEqual([
      { role: "Guru Piket / Wali Kelas", name: "Bu Guru Piket" },
      { role: "Kepala Sekolah", name: "Kepala Sekolah", nip: "196801011990011001" },
    ]);
  });

  it("mengurutkan catatan terbaru dulu dan tidak memasukkan record yang deletedAt", () => {
    const letter = buildPiketLetter({
      ...baseInput,
      letterType: "parent_summons",
      records: [
        makeRecord({ id: "old", date: "2026-06-10", ruleLabel: "Terlambat", points: 5 }),
        makeRecord({ id: "deleted", date: "2026-06-30", ruleLabel: "Seharusnya tidak muncul", points: 50, deletedAt: "2026-07-01T00:00:00Z" }),
        makeRecord({ id: "new", date: "2026-06-28", ruleLabel: "Berkata tidak sopan", points: 15 }),
      ],
    });

    expect(letter.recordRows).toHaveLength(2);
    expect(letter.recordRows[0]).toMatchObject({ date: "2026-06-28", violation: "Berkata tidak sopan" });
    expect(letter.recordRows[1]).toMatchObject({ date: "2026-06-10", violation: "Terlambat" });
    expect(letter.recordRows.some((row) => row.violation === "Seharusnya tidak muncul")).toBe(false);
  });

  it("membatasi ringkasan catatan maksimal 10 baris dan memberi catatan tambahan", () => {
    const records = Array.from({ length: 12 }, (_, index) => makeRecord({
      id: `r${index + 1}`,
      date: `2026-06-${String(index + 1).padStart(2, "0")}`,
      ruleLabel: `Catatan ${index + 1}`,
      points: 5,
    }));

    const letter = buildPiketLetter({ ...baseInput, letterType: "parent_summons", records });

    expect(letter.recordRows).toHaveLength(10);
    expect(letter.recordRows[0].date).toBe("2026-06-12");
    expect(letter.additionalNote).toBe("Catatan lainnya tersimpan dalam rekap piket sekolah.");
  });

  it("tidak memberi catatan tambahan jika hanya record deletedAt yang membuat jumlah mentah lebih dari 10", () => {
    const activeRecords = Array.from({ length: 10 }, (_, index) => makeRecord({
      id: `active-${index + 1}`,
      date: `2026-06-${String(index + 1).padStart(2, "0")}`,
      ruleLabel: `Catatan aktif ${index + 1}`,
      points: 5,
    }));
    const deletedRecords = Array.from({ length: 3 }, (_, index) => makeRecord({
      id: `deleted-${index + 1}`,
      date: `2026-07-${String(index + 1).padStart(2, "0")}`,
      ruleLabel: `Catatan deleted ${index + 1}`,
      points: 50,
      deletedAt: "2026-07-05T00:00:00Z",
    }));

    const letter = buildPiketLetter({
      ...baseInput,
      letterType: "parent_summons",
      records: [...activeRecords, ...deletedRecords],
    });

    expect(letter.recordRows).toHaveLength(10);
    expect(letter.additionalNote).toBeUndefined();
    expect(letter.recordRows.some((row) => row.violation.includes("deleted"))).toBe(false);
  });

  it("membuat surat pernyataan siswa dengan blok tanda tangan siswa dan orang tua", () => {
    const letter = buildPiketLetter({ ...baseInput, letterType: "student_statement" });

    expect(letter.letterType).toBe("student_statement");
    expect(letter.title).toBe("SURAT PERNYATAAN SISWA");
    expect(letter.opening).toBe("Saya yang bertanda tangan di bawah ini:");
    expect(letter.signatureBlocks).toEqual([
      { role: "Mengetahui, Guru Piket / Wali Kelas", name: "Bu Guru Piket" },
      { role: "Siswa yang Membuat Pernyataan", name: "Ahmad Rizki" },
      { role: "Orang Tua/Wali" },
    ]);
  });
});
