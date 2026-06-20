import { describe, it, expect } from "vitest";
import { parseProtaProfile, safeParseProtaProfile, type ProtaProfile } from "../src";

const validProta: ProtaProfile = {
  id: "prota-1",
  academicYearId: "year-1",
  subject: "Pendidikan Pancasila",
  grade: "VII",
  phase: "D",
  teacherId: "teacher-profile",
  annualIntraJP: 72,
  semester1IntraJP: 36,
  semester2IntraJP: 36,
  units: [
    {
      id: "unit-1",
      protaProfileId: "prota-1",
      semester: 1,
      title: "Budaya Demokrasi",
      jp: 12,
      order: 1,
      createdAt: "2025-06-01T00:00:00+07:00",
      updatedAt: "2025-06-01T00:00:00+07:00",
      deletedAt: null,
      syncStatus: "local_only",
    },
    {
      id: "unit-2",
      protaProfileId: "prota-1",
      semester: 1,
      title: "Keadilan Sosial",
      jp: 24,
      order: 2,
      createdAt: "2025-06-01T00:00:00+07:00",
      updatedAt: "2025-06-01T00:00:00+07:00",
      deletedAt: null,
      syncStatus: "local_only",
    },
  ],
  status: "draft",
  sourceYearId: null,
  createdAt: "2025-06-01T00:00:00+07:00",
  updatedAt: "2025-06-01T00:00:00+07:00",
  deletedAt: null,
  syncStatus: "local_only",
};

describe("protaProfile — schema validation", () => {
  it("parse: data valid → sukses", () => {
    const p = parseProtaProfile(validProta);
    expect(p.subject).toBe("Pendidikan Pancasila");
    expect(p.units.length).toBe(2);
    expect(p.units[0].title).toBe("Budaya Demokrasi");
  });

  it("parse: JP negatif → throw", () => {
    expect(() =>
      parseProtaProfile({
        ...validProta,
        units: [{ ...validProta.units[0], jp: -5 }],
      })
    ).toThrow();
  });

  it("parse: JP 0 → throw (positif required)", () => {
    expect(() =>
      parseProtaProfile({
        ...validProta,
        units: [{ ...validProta.units[0], jp: 0 }],
      })
    ).toThrow();
  });

  it("parse: semester invalid → throw", () => {
    expect(() =>
      parseProtaProfile({
        ...validProta,
        units: [{ ...validProta.units[0], semester: 3 as unknown as 1 }],
      })
    ).toThrow();
  });

  it("parse: status dokumen valid", () => {
    ["draft", "ready_for_review", "final", "revised", "locked"].forEach((status) => {
      expect(() =>
        parseProtaProfile({ ...validProta, status: status as ProtaProfile["status"] })
      ).not.toThrow();
    });
  });

  it("parse: status dokumen invalid → throw", () => {
    expect(() =>
      parseProtaProfile({ ...validProta, status: "unknown" as ProtaProfile["status"] })
    ).toThrow();
  });

  it("safeParse: data valid → success", () => {
    const r = safeParseProtaProfile(validProta);
    expect(r.success).toBe(true);
  });

  it("safeParse: data invalid → error", () => {
    const r = safeParseProtaProfile({ ...validProta, subject: "" });
    expect(r.success).toBe(false);
  });
});
