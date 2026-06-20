import { describe, it, expect } from "vitest";
import {
  slugify,
  idFromLabel,
  todayISODate,
  toISODate,
  parseISODate,
  isValidISODate,
  formatLongDateID,
  formatShortDateID,
  getDayOfWeek,
  dateRangesOverlap,
  enumerateDateRange,
  getISOWeekNumber,
} from "../src";

describe("slug", () => {
  it("slugify: konversi string Indonesia ke slug", () => {
    expect(slugify("VII A — Pendidikan Pancasila")).toBe("vii-a-pendidikan-pancasila");
    expect(slugify("  Hello   World  ")).toBe("hello-world");
    expect(slugify("Kelas VII-A")).toBe("kelas-vii-a");
  });

  it("slugify: hapus diacritics", () => {
    expect(slugify("Pendidikan Pancasila")).toBe("pendidikan-pancasila");
  });

  it("idFromLabel: sama dengan slugify", () => {
    expect(idFromLabel("VII A")).toBe("vii-a");
  });
});

describe("date — format & parse", () => {
  it("isValidISODate: format YYYY-MM-DD valid", () => {
    expect(isValidISODate("2025-08-18")).toBe(true);
    expect(isValidISODate("2025-13-01")).toBe(false); // bulan invalid
    expect(isValidISODate("2025-08-32")).toBe(false); // tanggal invalid
    expect(isValidISODate("18-08-2025")).toBe(false); // format salah
    expect(isValidISODate("not-a-date")).toBe(false);
  });

  it("parseISODate: parse YYYY-MM-DD ke Date", () => {
    const d = parseISODate("2025-08-18");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(7); // Agustus = 7 (0-indexed)
    expect(d.getDate()).toBe(18);
  });

  it("toISODate: Date → YYYY-MM-DD round-trip", () => {
    const d = new Date(2025, 7, 18); // 18 Agustus 2025 lokal
    expect(toISODate(d)).toBe("2025-08-18");
  });

  it("todayISODate: format YYYY-MM-DD", () => {
    const today = todayISODate();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("formatLongDateID: format Indonesia panjang", () => {
    // 18 Agustus 2025 = Senin
    expect(formatLongDateID("2025-08-18")).toBe("Senin, 18 Agustus 2025");
    // 17 Agustus 1945 = Jumat
    expect(formatLongDateID("1945-08-17")).toBe("Jumat, 17 Agustus 1945");
  });

  it("formatShortDateID: format Indonesia pendek", () => {
    const short = formatShortDateID("2025-08-18");
    expect(short).toMatch(/18.*2025/); // tanggal 18, tahun 2025
  });
});

describe("date — day of week & range", () => {
  it("getDayOfWeek: 1=Senin, 7=Minggu", () => {
    expect(getDayOfWeek("2025-08-18")).toBe(1); // Senin
    expect(getDayOfWeek("2025-08-24")).toBe(7); // Minggu
  });

  it("dateRangesOverlap: deteksi overlap", () => {
    expect(dateRangesOverlap("2025-08-01", "2025-08-10", "2025-08-05", "2025-08-15")).toBe(true);
    expect(dateRangesOverlap("2025-08-01", "2025-08-10", "2025-08-11", "2025-08-20")).toBe(false);
    expect(dateRangesOverlap("2025-08-01", "2025-08-10", "2025-08-10", "2025-08-20")).toBe(true); // batas inklusif
  });

  it("enumerateDateRange: daftar tanggal dalam rentang", () => {
    const dates = enumerateDateRange("2025-08-18", "2025-08-20");
    expect(dates).toEqual(["2025-08-18", "2025-08-19", "2025-08-20"]);
  });

  it("enumerateDateRange: rentang terbalik → array kosong", () => {
    expect(enumerateDateRange("2025-08-20", "2025-08-18")).toEqual([]);
  });

  it("getISOWeekNumber: nomor minggu ISO", () => {
    // 1 Januari 2025 = minggu 1
    expect(getISOWeekNumber("2025-01-01")).toBe(1);
    // 18 Agustus 2025 = minggu 34
    expect(getISOWeekNumber("2025-08-18")).toBe(34);
  });
});
