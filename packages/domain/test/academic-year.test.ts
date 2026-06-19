import { describe, it, expect } from "vitest";
import {
  parseAcademicYear,
  safeParseAcademicYear,
  validateAcademicYearLogic,
  type AcademicYear,
} from "../src";

const validYear: AcademicYear = {
  id: "year-1",
  label: "2025/2026",
  startDate: "2025-07-14",
  endDate: "2026-06-13",
  semester1Start: "2025-07-14",
  semester1End: "2025-12-20",
  semester2Start: "2026-01-05",
  semester2End: "2026-06-13",
  active: true,
  sourceYearId: null,
  createdAt: "2025-06-01T00:00:00+07:00",
  updatedAt: "2025-06-01T00:00:00+07:00",
  deletedAt: null,
  syncStatus: "local_only",
};

describe("academicYear — schema validation", () => {
  it("parseAcademicYear: data valid → parse sukses", () => {
    const y = parseAcademicYear(validYear);
    expect(y.label).toBe("2025/2026");
    expect(y.active).toBe(true);
  });

  it("parseAcademicYear: label format invalid → throw", () => {
    expect(() =>
      parseAcademicYear({ ...validYear, label: "2025-2026" })
    ).toThrow();
  });

  it("parseAcademicYear: label format valid YYYY/YYYY", () => {
    expect(() => parseAcademicYear({ ...validYear, label: "2025/2026" })).not.toThrow();
    expect(() => parseAcademicYear({ ...validYear, label: "25/26" })).toThrow();
    expect(() => parseAcademicYear({ ...validYear, label: "invalid" })).toThrow();
  });

  it("safeParseAcademicYear: return success untuk data valid", () => {
    const r = safeParseAcademicYear(validYear);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.label).toBe("2025/2026");
    }
  });

  it("safeParseAcademicYear: return error untuk data invalid", () => {
    const r = safeParseAcademicYear({ ...validYear, label: "bad" });
    expect(r.success).toBe(false);
  });
});

describe("academicYear — logic validation", () => {
  it("validateAcademicYearLogic: rentang tanggal valid → tidak ada error", () => {
    expect(validateAcademicYearLogic(validYear)).toEqual([]);
  });

  it("validateAcademicYearLogic: startDate >= endDate → error", () => {
    const errors = validateAcademicYearLogic({
      ...validYear,
      startDate: "2026-06-13",
      endDate: "2025-07-14",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("startDate"))).toBe(true);
  });

  it("validateAcademicYearLogic: semester overlap → error", () => {
    const errors = validateAcademicYearLogic({
      ...validYear,
      semester1End: "2026-02-01", // lewbat semester2Start
    });
    expect(errors.some((e) => e.includes("semester1End"))).toBe(true);
  });
});

describe("academicYear — safeParseAcademicYear combined logic", () => {
  it("safeParse: reject bila logic invalid walau schema valid", () => {
    const r = safeParseAcademicYear({
      ...validYear,
      semester1Start: "2025-12-20",
      semester1End: "2025-07-14", // terbalik
    });
    expect(r.success).toBe(false);
  });
});
