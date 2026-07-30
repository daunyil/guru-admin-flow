/**
 * NAV-DAILY-GATE-01: Test kontrak navigasi.
 *
 * Updated Batch 3: Absen & Jurnal di-unified ke KBM.
 * Primary nav = ["Hari Ini", "KBM", "Nilai", "Rekap Semester"] (4 item).
 */
import { describe, it, expect } from "vitest";
import { getPrimaryNavLabels, getMobileNavLabels, GATE_GROUPS } from "../shared/layout/navigation";

describe("NAV-DAILY-GATE-01 — Kontrak menu utama", () => {
  it("Sidebar menampilkan Hari Ini", () => { expect(getPrimaryNavLabels()).toContain("Hari Ini"); });
  it("Sidebar menampilkan KBM Harian (unified)", () => { expect(getPrimaryNavLabels()).toContain("KBM Harian"); });
  it("Sidebar menampilkan Daftar Nilai", () => { expect(getPrimaryNavLabels()).toContain("Daftar Nilai"); });
  it("Sidebar menampilkan Rekap Semester", () => { expect(getPrimaryNavLabels()).toContain("Rekap Semester"); });
  it("Sidebar TIDAK menampilkan Absen/Jurnal terpisah (unified ke KBM)", () => {
    const labels = getPrimaryNavLabels();
    expect(labels).not.toContain("Absen");
    expect(labels).not.toContain("Jurnal");
    expect(labels).not.toContain("Nilai"); // renamed to "Daftar Nilai"
  });
  it("Sidebar TIDAK menampilkan modul besar langsung", () => {
    const labels = getPrimaryNavLabels();
    expect(labels).not.toContain("Prota Resmi");
    expect(labels).not.toContain("Promes");
    expect(labels).not.toContain("RPP / Modul Ajar");
    expect(labels).not.toContain("LKPD");
    expect(labels).not.toContain("Remedial");
    // Guru Piket, Paket Admin, Pusat Laporan are in separate nav groups, not primary
    expect(labels).not.toContain("Guru Piket");
    expect(labels).not.toContain("Paket Admin");
    expect(labels).not.toContain("Pusat Laporan");
  });
  it("Menu utama tepat 4 item (unified KBM)", () => {
    expect(getPrimaryNavLabels()).toEqual(["Hari Ini", "KBM Harian", "Daftar Nilai", "Rekap Semester"]);
  });
  it("Mobile nav maksimal 5 item", () => { expect(getMobileNavLabels().length).toBeLessThanOrEqual(5); });
  it("Mobile nav tidak ada Lainnya", () => { expect(getMobileNavLabels()).not.toContain("Lainnya"); });
});

describe("NAV-DAILY-GATE-01 — Gerbang Paket Admin", () => {
  it("GATE_GROUPS punya 5 kelompok", () => {
    expect(GATE_GROUPS).toHaveLength(5);
    expect(GATE_GROUPS[0].title).toContain("A.");
    expect(GATE_GROUPS[4].title).toContain("E.");
  });
  it("Gerbang punya kartu ke modul tersembunyi", () => {
    const labels = GATE_GROUPS.flatMap((g) => g.cards.map((c) => c.label));
    expect(labels).toContain("Profil Sekolah/Guru");
    expect(labels).toContain("Backup/Restore");
    expect(labels).toContain("Prota");
    expect(labels).toContain("RPP / Modul Ajar");
    expect(labels).toContain("Remedial");
    expect(labels).toContain("Promes");
    expect(labels).toContain("LKPD");
  });
});
