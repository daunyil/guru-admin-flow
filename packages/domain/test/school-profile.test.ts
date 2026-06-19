import { describe, it, expect } from "vitest";
import { parseSchoolProfile, safeParseSchoolProfile } from "../src";

const validSchool = {
  id: "school-profile",
  name: "SMPN 8 Bantan",
  npsn: "12345678",
  address: "Jl. Contoh No. 1",
  village: "Bantan",
  district: "Bantan",
  regency: "Bengkalis",
  province: "Riau",
  headmasterName: "Drs. Budi Santoso, M.Pd.",
  createdAt: "2025-06-01T00:00:00+07:00",
  updatedAt: "2025-06-01T00:00:00+07:00",
  deletedAt: null,
  syncStatus: "local_only" as const,
};

describe("schoolProfile — schema validation", () => {
  it("parse: data valid → sukses", () => {
    const s = parseSchoolProfile(validSchool);
    expect(s.name).toBe("SMPN 8 Bantan");
    expect(s.npsn).toBe("12345678");
  });

  it("parse: NPSN bukan 8 digit → throw", () => {
    expect(() => parseSchoolProfile({ ...validSchool, npsn: "123" })).toThrow();
    expect(() => parseSchoolProfile({ ...validSchool, npsn: "1234567" })).toThrow(); // 7 digit
    expect(() => parseSchoolProfile({ ...validSchool, npsn: "123456789" })).toThrow(); // 9 digit
    expect(() => parseSchoolProfile({ ...validSchool, npsn: "abcdefgh" })).toThrow(); // bukan digit
  });

  it("parse: nama kosong → throw", () => {
    expect(() => parseSchoolProfile({ ...validSchool, name: "" })).toThrow();
  });

  it("parse: headmasterName kosong → throw", () => {
    expect(() => parseSchoolProfile({ ...validSchool, headmasterName: "" })).toThrow();
  });

  it("parse: NIP kepala sekwalid 18 digit → sukses", () => {
    expect(() =>
      parseSchoolProfile({ ...validSchool, headmasterNip: "196512121986031005" })
    ).not.toThrow();
  });

  it("parse: NIP kepala sekolah bukan 18 digit → throw", () => {
    expect(() =>
      parseSchoolProfile({ ...validSchool, headmasterNip: "123" })
    ).toThrow();
  });

  it("safeParse: data valid → success", () => {
    const r = safeParseSchoolProfile(validSchool);
    expect(r.success).toBe(true);
  });

  it("safeParse: data invalid → error", () => {
    const r = safeParseSchoolProfile({ ...validSchool, npsn: "bad" });
    expect(r.success).toBe(false);
  });
});
