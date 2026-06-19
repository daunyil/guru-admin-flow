import { describe, it, expect } from "vitest";
import {
  sumJP,
  validateJPTotal,
  validateAnnualConsistency,
  jpPerWeek,
  formatJP,
} from "../src";

describe("jp — sumJP", () => {
  it("menjumlahkan JP dari daftar unit", () => {
    expect(sumJP([{ jp: 2 }, { jp: 4 }, { jp: 6 }])).toBe(12);
    expect(sumJP([])).toBe(0);
  });

  it("handle JP 0 dan negatif (dikonversi ke 0)", () => {
    expect(sumJP([{ jp: 0 }, { jp: 5 }])).toBe(5);
  });
});

describe("jp — validateJPTotal", () => {
  it("status valid bila target = actual", () => {
    const r = validateJPTotal(36, [{ jp: 18 }, { jp: 18 }]);
    expect(r.status).toBe("valid");
    expect(r.actual).toBe(36);
    expect(r.diff).toBe(0);
  });

  it("status needs_fix bila target ≠ actual", () => {
    const r = validateJPTotal(36, [{ jp: 18 }, { jp: 10 }]);
    expect(r.status).toBe("needs_fix");
    expect(r.actual).toBe(28);
    expect(r.diff).toBe(8); // kurang 8 JP
  });
});

describe("jp — validateAnnualConsistency", () => {
  it("valid bila semester1 + semester2 = annual", () => {
    const r = validateAnnualConsistency(72, 36, 36);
    expect(r.status).toBe("valid");
    expect(r.diff).toBe(0);
  });

  it("warning bila tidak konsisten", () => {
    const r = validateAnnualConsistency(72, 30, 36);
    expect(r.status).toBe("warning");
    expect(r.sum).toBe(66);
    expect(r.diff).toBe(6);
  });
});

describe("jp — jpPerWeek", () => {
  it("hitung rata-rata JP per minggu", () => {
    expect(jpPerWeek(72, 36)).toBe(2);
    expect(jpPerWeek(60, 20)).toBe(3);
  });

  it("pembagian dengan 0 → 0", () => {
    expect(jpPerWeek(72, 0)).toBe(0);
  });
});

describe("jp — formatJP", () => {
  it("format label JP", () => {
    expect(formatJP(2)).toBe("2 JP");
    expect(formatJP(0)).toBe("0 JP");
  });
});
