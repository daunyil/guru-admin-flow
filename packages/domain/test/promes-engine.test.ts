/**
 * Test untuk engine Promes — 16 test cases sesuai docs/SPRINT_2_DESIGN.md §5.5.
 *
 * Penting: test #13 (KO row terpisah verification) WAJIB pass — verifikasi §0 CRITICAL PROMES RULE.
 */
import { describe, it, expect } from "vitest";
import { generatePromes } from "../src/promes-engine";
import type { PromesOptions } from "../src/promes-types";
import {
  makeAcademicYear,
  makeProtaProfile,
  makeProtaUnit,
  makeCalendar,
  defaultPPKnOptions,
} from "./promes-fixtures";

describe("promes-engine — Test #1: Happy path PPKn", () => {
  it("18 minggu efektif, 30 JP materi, status valid, allocation tepat", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      semester1IntraJP: 36,
      units: [
        makeProtaUnit({ semester: 1, jp: 12, title: "Budaya Demokrasi", order: 1 }),
        makeProtaUnit({ semester: 1, jp: 18, title: "Keadilan Sosial", order: 2 }),
      ],
    });
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: defaultPPKnOptions,
    });

    // 18 minggu × 2 JP intra - 6 cadangan = 30 JP materialCapacity
    expect(result.summary.effectiveWeeks).toBe(18);
    expect(result.summary.intraCapacityJP).toBe(36);
    expect(result.summary.cadanganJP).toBe(6);
    expect(result.summary.materialCapacityJP).toBe(30);
    expect(result.summary.totalUnitJP).toBe(30); // 12 + 18
    expect(result.summary.distributedJP).toBe(30);
    expect(result.summary.undistributedJP).toBe(0);
    expect(result.summary.koTotalJP).toBe(18); // 18 minggu × 1 JP KO
    expect(result.summary.allocationStatus).toBe("tepat");
    expect(result.status).toBe("valid");
    expect(result.errors).toEqual([]);
  });
});

describe("promes-engine — Test #2: Allocation cukup (sisa JP)", () => {
  it("totalUnitJP < materialCapacityJP, status valid, ada sisa", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      semester1IntraJP: 36,
      units: [makeProtaUnit({ semester: 1, jp: 20, title: "Materi Ringan", order: 1 })],
    });
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: defaultPPKnOptions,
    });

    // materialCapacity = 30, totalUnit = 20, sisa = 10
    expect(result.summary.materialCapacityJP).toBe(30);
    expect(result.summary.totalUnitJP).toBe(20);
    expect(result.summary.distributedJP).toBe(20);
    expect(result.summary.undistributedJP).toBe(0);
    expect(result.summary.allocationStatus).toBe("cukup");
    expect(result.status).toBe("valid");
  });
});

describe("promes-engine — Test #3: Allocation kurang (materi tidak muat)", () => {
  it("totalUnitJP > materialCapacityJP, status needs_fix", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      semester1IntraJP: 36,
      units: [makeProtaUnit({ semester: 1, jp: 40, title: "Materi Berat", order: 1 })],
    });
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: defaultPPKnOptions,
    });

    // materialCapacity = 30, totalUnit = 40, kurang 10
    expect(result.summary.materialCapacityJP).toBe(30);
    expect(result.summary.totalUnitJP).toBe(40);
    expect(result.summary.distributedJP).toBe(30);
    expect(result.summary.undistributedJP).toBe(10);
    expect(result.summary.allocationStatus).toBe("kurang");
    expect(result.status).toBe("needs_fix");
    expect(result.distribution[0].status).toBe("partially_distributed");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("promes-engine — Test #4: Cadangan 0", () => {
  it("cadangan=0, semua intra capacity untuk materi", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      semester1IntraJP: 36,
      units: [makeProtaUnit({ semester: 1, jp: 36, title: "Materi Full", order: 1 })],
    });
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: { ...defaultPPKnOptions, cadanganJP: 0 },
    });

    // materialCapacity = 36 - 0 = 36
    expect(result.summary.cadanganJP).toBe(0);
    expect(result.summary.materialCapacityJP).toBe(36);
    expect(result.summary.distributedJP).toBe(36);
    expect(result.summary.koTotalJP).toBe(18); // KO tetap 18 JP
    expect(result.status).toBe("valid");
  });
});

describe("promes-engine — Test #5: Cadangan > total intra capacity → ERROR", () => {
  it("cadangan=40, intraCapacity=36, error", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      semester1IntraJP: 36,
      units: [makeProtaUnit({ semester: 1, jp: 10, title: "Materi", order: 1 })],
    });
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: { ...defaultPPKnOptions, cadanganJP: 40 },
    });

    expect(result.status).toBe("needs_fix");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Cadangan 40 JP melebihi total kapasitas intra 36 JP");
  });
});

describe("promes-engine — Test #6: Kalender tanpa event learning → error", () => {
  it("kalender hanya berisi holiday, status needs_fix", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile();
    const calendar = makeCalendar({
      holidays: [{ start: "2025-07-14", end: "2025-12-20", label: "Libur Full Semester" }],
    });
    // Hapus event learning default, ganti dengan holiday saja
    calendar.splice(0, 1); // hapus learning event

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: defaultPPKnOptions,
    });

    expect(result.status).toBe("needs_fix");
    expect(result.errors.length).toBeGreaterThan(0);
    // Bisa error "kalender kosong" atau "tidak ada minggu efektif" tergantung logic
  });
});

describe("promes-engine — Test #7: Unit lebih besar dari 1 minggu → auto-split", () => {
  it("unit 12 JP dengan intraJpPerWeek=2 → didistribusikan ke 6 minggu", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      semester1IntraJP: 36,
      units: [makeProtaUnit({ semester: 1, jp: 12, title: "Materi Besar", order: 1 })],
    });
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: { ...defaultPPKnOptions, cadanganJP: 0 },
    });

    // unit 12 JP, intra 2 JP/minggu, cadangan 0 → 6 minggu
    expect(result.distribution[0].distributedJP).toBe(12);
    expect(result.distribution[0].weeks.length).toBe(6);
    expect(result.distribution[0].status).toBe("fully_distributed");
  });
});

describe("promes-engine — Test #8: Reserve dari belakang (cadangan di minggu terakhir)", () => {
  it("cadangan=6, intraJpPerWeek=2: minggu 16,17,18 full cadangan", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      semester1IntraJP: 36,
      units: [makeProtaUnit({ semester: 1, jp: 30, title: "Materi", order: 1 })],
    });
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: defaultPPKnOptions, // cadangan=6, intraJpPerWeek=2
    });

    // Minggu 16, 17, 18 harusnya full cadangan (2+2+2=6)
    const week16 = result.weeks.find((w) => w.weekNumber === 16);
    const week17 = result.weeks.find((w) => w.weekNumber === 17);
    const week18 = result.weeks.find((w) => w.weekNumber === 18);

    expect(week16?.reservedForCadangan).toBe(2);
    expect(week16?.availableForMaterial).toBe(0);
    expect(week17?.reservedForCadangan).toBe(2);
    expect(week17?.availableForMaterial).toBe(0);
    expect(week18?.reservedForCadangan).toBe(2);
    expect(week18?.availableForMaterial).toBe(0);

    // Minggu 1-15 harusnya availableForMaterial = 2
    const week1 = result.weeks.find((w) => w.weekNumber === 1);
    expect(week1?.reservedForCadangan).toBe(0);
    expect(week1?.availableForMaterial).toBe(2);
  });
});

describe("promes-engine — Test #9: Holiday di tengah semester", () => {
  it("holiday 1 minggu di tengah, minggu itu not effective", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      semester1IntraJP: 36,
      units: [makeProtaUnit({ semester: 1, jp: 20, title: "Materi", order: 1 })],
    });
    // Holiday di minggu 5 (11-17 Agustus 2025)
    const calendar = makeCalendar({
      holidays: [{ start: "2025-08-11", end: "2025-08-17", label: "Libur HUT RI" }],
    });

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: { ...defaultPPKnOptions, cadanganJP: 0 },
    });

    // Cari minggu yang contains 2025-08-11
    const holidayWeek = result.weeks.find(
      (w) => w.startDate <= "2025-08-11" && w.endDate >= "2025-08-11"
    );
    expect(holidayWeek).toBeDefined();
    expect(holidayWeek?.isEffective).toBe(false);
    expect(holidayWeek?.blockReason).toBe("Libur HUT RI");
    expect(holidayWeek?.intraCapacityJP).toBe(0);
    expect(holidayWeek?.koJP).toBe(0);
  });
});

describe("promes-engine — Test #10: Prota status final ditolak", () => {
  it("prota.status=final, return error", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({ status: "final" });
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: defaultPPKnOptions,
    });

    expect(result.status).toBe("needs_fix");
    expect(result.errors[0]).toContain('Prota berstatus "final"');
  });
});

describe("promes-engine — Test #11: Semester 2 dengan kalender semester 1 → error", () => {
  it("generate semester 2 tapi kalender hanya semester 1", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      units: [
        makeProtaUnit({ semester: 2, jp: 20, title: "Materi S2", order: 1 }),
      ],
    });
    // Calendar default hanya mencakup semester 1 (14 Jul - 20 Des 2025)
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 2,
      options: defaultPPKnOptions,
    });

    // Semester 2 rentang: 5 Jan - 13 Jun 2026, kalender tidak ada event di rentang ini
    expect(result.status).toBe("needs_fix");
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("promes-engine — Test #12: Empty calendar → error", () => {
  it("calendar kosong, status needs_fix", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile();
    const calendar: never[] = [];

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: defaultPPKnOptions,
    });

    expect(result.status).toBe("needs_fix");
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("promes-engine — Test #13 (KRITIS): KO row terpisah verification", () => {
  it("KO TIDAK mengurangi materialCapacityJP (verifikasi §0 CRITICAL PROMES RULE)", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      semester1IntraJP: 36,
      units: [makeProtaUnit({ semester: 1, jp: 30, title: "Materi", order: 1 })],
    });
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: defaultPPKnOptions, // intra=2, KO=1, cadangan=6
    });

    // KRITIS: koRows.length === effectiveWeeks (18)
    expect(result.koRows.length).toBe(18);

    // KRITIS: setiap koRow.jp === 1
    for (const ko of result.koRows) {
      expect(ko.jp).toBe(1);
      expect(ko.mode).toBe("daily_block");
      expect(ko.label).toContain("Alokasi kokurikuler");
    }

    // KRITIS: materialCapacityJP === 30 (BUKAN 48 = 18×3-6)
    expect(result.summary.materialCapacityJP).toBe(30); // 18×2 - 6
    expect(result.summary.intraCapacityJP).toBe(36); // 18×2

    // KRITIS: koTotalJP === 18
    expect(result.summary.koTotalJP).toBe(18);

    // KRITIS: koTotalJP TIDAK mengurangi materialCapacityJP
    // Bila KO dihitung sebagai materi (SALAH), materialCapacity akan = 18×3-6 = 48
    // Tapi yang benar (§0): materialCapacity = 18×2-6 = 30
    expect(result.summary.materialCapacityJP).not.toBe(48);
    expect(result.summary.materialCapacityJP).toBe(30);

    // KRITIS: per minggu, intra + KO = 3 JP total, tapi terpisah
    const week1 = result.weeks.find((w) => w.weekNumber === 1);
    expect(week1?.intraCapacityJP).toBe(2);
    expect(week1?.koJP).toBe(1);
    // Total intra+KO = 3, tapi BUKAN didistribusikan sebagai 3 JP materi
    expect(week1?.availableForMaterial).toBe(2); // bukan 3
  });
});

describe("promes-engine — Test #14: Mapel tanpa KO (koJpPerWeek=0)", () => {
  it("koJpPerWeek=0, koRows kosong, material distribusi normal", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      subject: "Matematika", // mapel tanpa KO
      semester1IntraJP: 36,
      units: [makeProtaUnit({ semester: 1, jp: 30, title: "Materi Matematika", order: 1 })],
    });
    const calendar = makeCalendar();

    const options: PromesOptions = {
      intraJpPerWeek: 4, // Matematika 4 JP/minggu
      koJpPerWeek: 0, // tanpa KO
      cadanganJP: 6,
      reserveFromEnd: true,
      koMode: "daily_block",
    };

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options,
    });

    expect(result.koRows).toEqual([]);
    expect(result.summary.koTotalJP).toBe(0);
    // materialCapacity = 18 × 4 - 6 = 66
    expect(result.summary.intraCapacityJP).toBe(72);
    expect(result.summary.materialCapacityJP).toBe(66);
    expect(result.status).toBe("valid");
  });
});

describe("promes-engine — Test #15: Cadangan boundary (materialCapacity=0)", () => {
  it("cadangan=36 (sama dengan intraCapacity), materialCapacity=0, needs_fix", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      semester1IntraJP: 36,
      units: [makeProtaUnit({ semester: 1, jp: 5, title: "Materi Sedikit", order: 1 })],
    });
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: { ...defaultPPKnOptions, cadanganJP: 36 }, // sama dengan intraCapacity
    });

    // cadangan=36 = intraCapacity=36 → materialCapacity=0 (boundary, tidak error)
    expect(result.summary.materialCapacityJP).toBe(0);
    expect(result.status).toBe("needs_fix");
    expect(result.summary.distributedJP).toBe(0);
    // KO tetap dihasilkan
    expect(result.koRows.length).toBe(18);
  });
});

describe("promes-engine — Test #16: KO mode end_of_semester", () => {
  it("koMode=end_of_semester, semua koRow pakai mode ini", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile({
      semester1IntraJP: 36,
      units: [makeProtaUnit({ semester: 1, jp: 30, title: "Materi", order: 1 })],
    });
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: { ...defaultPPKnOptions, koMode: "end_of_semester" },
    });

    expect(result.koRows.length).toBe(18);
    for (const ko of result.koRows) {
      expect(ko.mode).toBe("end_of_semester");
      expect(ko.label).toContain("end_of_semester");
    }
    // koRow.jp tetap 1 per minggu (mode hanya catatan, tidak affect perhitungan)
    expect(result.koRows[0].jp).toBe(1);
    expect(result.summary.koTotalJP).toBe(18);
  });
});

describe("promes-engine — Defensive: intraJpPerWeek=0 → error", () => {
  it("intraJpPerWeek=0, return error", () => {
    const academicYear = makeAcademicYear();
    const prota = makeProtaProfile();
    const calendar = makeCalendar();

    const result = generatePromes({
      prota,
      academicYear,
      calendar,
      semester: 1,
      options: { ...defaultPPKnOptions, intraJpPerWeek: 0 },
    });

    expect(result.status).toBe("needs_fix");
    expect(result.errors[0]).toContain("intraJpPerWeek harus > 0");
  });
});
