/**
 * Test untuk prota-import.ts — validasi JSON impor Prota.
 */
import { describe, it, expect } from "vitest";
import {
  validateProtaImport,
  protaImportToProfile,
} from "../src/prota-import";

const validImport = {
  $schema: "guru-admin-flow/prota/v1",
  subject: "Pendidikan Pancasila",
  grade: "VII",
  phase: "D",
  annualIntraJP: 72,
  semester1IntraJP: 36,
  semester2IntraJP: 36,
  annualCocurricularJP: 36,
  semester1CocurricularJP: 18,
  semester2CocurricularJP: 18,
  units: [
    {
      semester: 1,
      title: "Budaya Demokrasi",
      jp: 12,
      order: 1,
      code: "PP.7.1",
    },
    {
      semester: 1,
      title: "Keadilan Sosial",
      jp: 24,
      order: 2,
      code: "PP.7.2",
    },
  ],
};

describe("prota-import — schema validation", () => {
  it("valid import → success", () => {
    const r = validateProtaImport(validImport);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.subject).toBe("Pendidikan Pancasila");
      expect(r.data.units.length).toBe(2);
    }
  });

  it("$schema salah → fail", () => {
    const r = validateProtaImport({
      ...validImport,
      $schema: "wrong/v2",
    });
    expect(r.success).toBe(false);
  });

  it("subject kosong → fail", () => {
    const r = validateProtaImport({ ...validImport, subject: "" });
    expect(r.success).toBe(false);
  });

  it("JP negatif → fail", () => {
    const r = validateProtaImport({
      ...validImport,
      units: [{ ...validImport.units[0], jp: -5 }],
    });
    expect(r.success).toBe(false);
  });

  it("JP 0 → fail (positive required)", () => {
    const r = validateProtaImport({
      ...validImport,
      units: [{ ...validImport.units[0], jp: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("semester invalid (3) → fail", () => {
    const r = validateProtaImport({
      ...validImport,
      units: [{ ...validImport.units[0], semester: 3 }],
    });
    expect(r.success).toBe(false);
  });

  it("units kosong → fail", () => {
    const r = validateProtaImport({ ...validImport, units: [] });
    expect(r.success).toBe(false);
  });

  it("duplikat order per semester → fail (logic)", () => {
    const r = validateProtaImport({
      ...validImport,
      units: [
        { ...validImport.units[0], order: 1 },
        { ...validImport.units[1], order: 1 }, // duplikat
      ],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.errors.some((e) => e.includes("duplikat order"))).toBe(true);
    }
  });

  it("semester1+semester2 ≠ annual → warning (fail karena logic)", () => {
    const r = validateProtaImport({
      ...validImport,
      annualIntraJP: 80, // 36+36 ≠ 80
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.errors.some((e) => e.includes("Warning") && e.includes("annualIntraJP"))).toBe(true);
    }
  });
});

describe("prota-import — protaImportToProfile", () => {
  it("konversi import ke profile + units dengan status draft", () => {
    const r = validateProtaImport(validImport);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const { profile, units } = protaImportToProfile(r.data);
    expect(profile.subject).toBe("Pendidikan Pancasila");
    expect(profile.status).toBe("draft");
    expect(profile.sourceYearId).toBeNull();
    expect(units.length).toBe(2);
    expect(units[0].title).toBe("Budaya Demokrasi");
    expect(units[0].jp).toBe(12);
  });

  it("field BaseEntity TIDAK ada di hasil (caller yang assign)", () => {
    const r = validateProtaImport(validImport);
    if (!r.success) return;
    const { profile, units } = protaImportToProfile(r.data);
    expect("id" in profile).toBe(false);
    expect("createdAt" in profile).toBe(false);
    expect("academicYearId" in profile).toBe(false); // caller assign
    expect("teacherId" in profile).toBe(false); // caller assign
    for (const u of units) {
      expect("id" in u).toBe(false);
      expect("protaProfileId" in u).toBe(false);
    }
  });

  it("KO fields optional ikut ter-convert bila ada", () => {
    const r = validateProtaImport(validImport);
    if (!r.success) return;
    const { profile } = protaImportToProfile(r.data);
    expect(profile.annualCocurricularJP).toBe(36);
    expect(profile.semester1CocurricularJP).toBe(18);
    expect(profile.semester2CocurricularJP).toBe(18);
  });
});
